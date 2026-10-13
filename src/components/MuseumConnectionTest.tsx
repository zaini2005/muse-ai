"use client";

// TEMPORARY: a button to check the live connection to a museum API.
import { useState } from "react";
import type { MuseumTestResult } from "@/app/api/museum-test/route";
import { ErrorNotice, Spinner } from "./ui";

type State =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; result: MuseumTestResult }
  | { state: "error"; message: string };

export default function MuseumConnectionTest() {
  const [test, setTest] = useState<State>({ state: "idle" });

  async function run() {
    setTest({ state: "loading" });
    try {
      const res = await fetch("/api/museum-test", { cache: "no-store" });
      const result = (await res.json()) as MuseumTestResult;
      setTest({ state: "done", result });
    } catch (error) {
      setTest({
        state: "error",
        message: `The app's own server did not respond (${
          error instanceof Error ? error.message : "unknown error"
        }). Is "npm run dev" still running?`,
      });
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-16">
      <div className="border border-dashed border-rule px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Temporary diagnostic
            </p>
            <p className="mt-1 text-sm text-muted">
              Asks the Art Institute of Chicago API for three artworks matching “currency”.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={test.state === "loading"}
            className="border border-foreground px-5 py-2 text-xs font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            Test Museum Connection
          </button>
        </div>

        <div className="mt-5 empty:mt-0">
          {test.state === "loading" && <Spinner label="Contacting api.artic.edu…" />}

          {test.state === "error" && (
            <ErrorNotice title="Connection test could not run" message={test.message} />
          )}

          {test.state === "done" && !test.result.ok && (
            <ErrorNotice
              title="Connection failed"
              message={`${test.result.error ?? "Unknown error."}${
                test.result.status ? "" : " No response was received from the museum."
              }`}
            />
          )}

          {test.state === "done" && test.result.ok && (
            <div role="status" className="border-l-2 border-foreground bg-surface px-5 py-4 text-sm">
              <p className="font-medium">
                Connected — HTTP {test.result.status}.{" "}
                {test.result.totalMatches !== undefined &&
                  `${test.result.totalMatches.toLocaleString()} artworks match “currency”.`}
              </p>
              {test.result.artworks?.length ? (
                <ul className="mt-3 space-y-2">
                  {test.result.artworks.map((a) => (
                    <li key={a.id}>
                      <span className="font-serif text-base">{a.title}</span>
                      <span className="text-muted">
                        {[a.artist?.split("\n")[0], a.date].filter(Boolean).length
                          ? ` — ${[a.artist?.split("\n")[0], a.date].filter(Boolean).join(", ")}`
                          : ""}
                        {` · ${a.isPublicDomain ? "public domain" : "not public domain"}`}
                        {` · id ${a.id}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted">The API connected but returned no artworks.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
