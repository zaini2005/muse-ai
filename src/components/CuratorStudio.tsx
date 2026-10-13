"use client";

import { useRef, useState } from "react";
import type {
  ApiError,
  FoundObject,
  ProposalResponse,
  SearchResponse,
} from "@/lib/types";
import ExhibitionProposal from "./ExhibitionProposal";
import ObjectCard from "./ObjectCard";
import ThemeForm from "./ThemeForm";
import { ErrorNotice, Eyebrow, Spinner } from "./ui";

const MIN_SELECTED = 3;
const MAX_SELECTED = 30;
const DEFAULT_SELECTED = 12;

type Filter = "all" | "public" | "images";

type Status<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "done"; data: T };

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok || !data) {
    throw new Error((data as ApiError | null)?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export default function CuratorStudio({ intro }: { intro: React.ReactNode }) {
  const [theme, setTheme] = useState("");
  const [search, setSearch] = useState<Status<SearchResponse>>({ state: "idle" });
  const [proposal, setProposal] = useState<Status<ProposalResponse>>({ state: "idle" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const searchAbort = useRef<AbortController | null>(null);
  const proposalAbort = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const proposalRef = useRef<HTMLDivElement>(null);

  async function runSearch(newTheme: string) {
    searchAbort.current?.abort();
    proposalAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;

    setTheme(newTheme);
    setSearch({ state: "loading" });
    setProposal({ state: "idle" });
    setFilter("all");
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

    try {
      const data = await postJson<SearchResponse>(
        "/api/search",
        { theme: newTheme },
        controller.signal,
      );
      // Start with the strongest candidates (public domain, with images) selected.
      setSelected(
        new Set(
          data.objects
            .filter((o) => o.isPublicDomain && o.image)
            .slice(0, DEFAULT_SELECTED)
            .map((o) => o.objectID),
        ),
      );
      setSearch({ state: "done", data });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearch({
        state: "error",
        message: error instanceof Error ? error.message : "The search failed.",
      });
    }
  }

  async function runProposal() {
    proposalAbort.current?.abort();
    const controller = new AbortController();
    proposalAbort.current = controller;
    setProposal({ state: "loading" });
    requestAnimationFrame(() =>
      proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    try {
      const data = await postJson<ProposalResponse>(
        "/api/exhibition",
        { theme, objectIds: [...selected] },
        controller.signal,
      );
      setProposal({ state: "done", data });
    } catch (error) {
      if (controller.signal.aborted) return;
      setProposal({
        state: "error",
        message: error instanceof Error ? error.message : "The proposal could not be written.",
      });
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECTED) next.add(id);
      return next;
    });
  }

  const objects: FoundObject[] = search.state === "done" ? search.data.objects : [];
  const visible = objects.filter((o) =>
    filter === "public" ? o.isPublicDomain : filter === "images" ? Boolean(o.image) : true,
  );
  const publicCount = objects.filter((o) => o.isPublicDomain).length;
  const aiAvailable = search.state === "done" && search.data.aiAvailable;
  const canPropose =
    aiAvailable && selected.size >= MIN_SELECTED && proposal.state !== "loading";

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        {intro}
        <div className="mt-14">
          <ThemeForm onSubmit={runSearch} loading={search.state === "loading"} />
        </div>
      </div>

      <div ref={resultsRef} className="mx-auto w-full max-w-6xl scroll-mt-6 px-6">
        {search.state === "loading" && (
          <div className="border-t border-rule py-16">
            <Spinner label="Generating search terms and searching The Met's collection… this can take up to a minute." />
          </div>
        )}

        {search.state === "error" && (
          <div className="border-t border-rule py-16">
            <ErrorNotice
              title="The museum search did not complete"
              message={search.message}
              onRetry={() => runSearch(theme)}
            />
          </div>
        )}

        {search.state === "done" && (
          <section className="border-t border-rule py-16" aria-labelledby="results-title">
            <Eyebrow>From The Met collection</Eyebrow>
            <h2 id="results-title" className="font-serif text-4xl font-medium">
              Objects for “{search.data.theme}”
            </h2>

            <div className="mt-6 text-sm text-muted">
              <p>
                {search.data.keywordSource === "ai"
                  ? "AI-suggested search terms"
                  : "Search terms"}{" "}
                (Met matches in brackets):
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {search.data.keywords.map((k) => (
                  <li key={k.keyword} className="border border-rule bg-surface px-3 py-1 text-foreground">
                    {k.keyword}{" "}
                    <span className="text-muted">
                      ({k.matches === null ? "search failed" : k.matches.toLocaleString()})
                    </span>
                  </li>
                ))}
              </ul>
              {search.data.keywordNote && <p className="mt-3">{search.data.keywordNote}</p>}
            </div>

            {objects.length === 0 ? (
              <div className="mt-10 border border-rule bg-surface px-6 py-10 text-center">
                <p className="font-serif text-2xl">No matching objects found</p>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  The Met&apos;s API returned no records for these search terms,
                  so there is nothing real to build an exhibition from. Try
                  rephrasing your theme with more concrete subjects, materials,
                  or object types.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-muted">
                    {objects.length} records retrieved · {publicCount} public domain
                  </p>
                  <div className="flex gap-1 text-xs" role="group" aria-label="Filter objects">
                    {(
                      [
                        ["all", "All"],
                        ["public", "Public domain"],
                        ["images", "With images"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        aria-pressed={filter === value}
                        className={`px-3 py-1.5 uppercase tracking-[0.12em] ${
                          filter === value
                            ? "bg-foreground text-background"
                            : "border border-rule text-muted hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {visible.length === 0 ? (
                  <p className="mt-8 text-sm text-muted">No objects match this filter.</p>
                ) : (
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((o) => (
                      <ObjectCard
                        key={o.objectID}
                        object={o}
                        selected={selected.has(o.objectID)}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                )}

                {/* Selection bar */}
                <div className="sticky bottom-0 z-10 -mx-6 mt-10 border-t border-rule bg-background/95 px-6 py-4 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm">
                      <p>
                        <span className="font-medium">{selected.size}</span> selected for
                        the exhibition{" "}
                        <span className="text-muted">
                          (choose {MIN_SELECTED}–{MAX_SELECTED})
                        </span>
                      </p>
                      {!aiAvailable && (
                        <p className="mt-1 text-xs text-muted">
                          Writing a proposal needs an Anthropic API key. See the
                          README for how to add one.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {selected.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelected(new Set())}
                          className="text-xs uppercase tracking-[0.15em] text-muted hover:text-foreground"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={runProposal}
                        disabled={!canPropose}
                        className="bg-accent px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {proposal.state === "loading" ? "Writing…" : "Propose Exhibition"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        <div ref={proposalRef} className="scroll-mt-6">
          {proposal.state === "loading" && (
            <div className="border-t border-rule py-16">
              <Spinner label="Re-checking the selected records with The Met and drafting the exhibition… this usually takes one to two minutes." />
            </div>
          )}
          {proposal.state === "error" && (
            <div className="border-t border-rule py-16">
              <ErrorNotice
                title="The exhibition proposal could not be written"
                message={proposal.message}
                onRetry={runProposal}
              />
            </div>
          )}
          {proposal.state === "done" && (
            <div className="border-t border-rule py-16">
              <ExhibitionProposal
                proposal={proposal.data.proposal}
                objects={proposal.data.objects}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
