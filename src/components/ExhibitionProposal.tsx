/* eslint-disable @next/next/no-img-element -- Met images are served directly from images.metmuseum.org */
import type { ExhibitionProposal as Proposal, MetObject } from "@/lib/types";
import { makerLine } from "./ObjectCard";
import { Eyebrow, SourceTag } from "./ui";

interface Props {
  proposal: Proposal;
  objects: MetObject[];
}

function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className={className}>
            {p.trim()}
          </p>
        ))}
    </>
  );
}

export default function ExhibitionProposal({ proposal, objects }: Props) {
  const byId = new Map(objects.map((o) => [o.objectID, o]));
  const unplaced = proposal.unplacedObjectIds
    .map((id) => byId.get(id))
    .filter((o): o is MetObject => Boolean(o));

  return (
    <section aria-labelledby="proposal-title" className="space-y-14">
      <div className="border border-rule bg-surface px-5 py-4 text-sm text-muted">
        <p>
          <SourceTag kind="ai" /> Text marked this way was written by AI, using
          only the {objects.length} Met records you selected. It is a starting
          point for curatorial judgement, not research to cite.{" "}
          <SourceTag kind="met" /> Object details marked this way come directly
          from The Met&apos;s collection records.
        </p>
      </div>

      {!proposal.sufficient && proposal.insufficiencyNote && (
        <div role="alert" className="border-l-2 border-accent bg-surface px-5 py-4">
          <p className="font-medium">These objects only partly support the theme</p>
          <p className="mt-1 text-sm text-muted">{proposal.insufficiencyNote}</p>
        </div>
      )}

      {proposal.warnings.length > 0 && (
        <div className="border-l-2 border-rule bg-surface px-5 py-4 text-sm text-muted">
          <p className="font-medium text-foreground">Checked against museum records</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {proposal.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <header>
        <div className="mb-3 flex items-center gap-3">
          <Eyebrow>Exhibition proposal</Eyebrow>
        </div>
        <h2 id="proposal-title" className="font-serif text-5xl font-medium leading-tight">
          {proposal.title}
        </h2>
        <div className="my-8 h-px w-24 bg-accent" />
        <div className="mb-2">
          <SourceTag kind="ai" />
        </div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Central argument
        </h3>
        <p className="max-w-3xl font-serif text-2xl leading-relaxed">{proposal.argument}</p>
        <h3 className="mb-3 mt-10 text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Curatorial narrative
        </h3>
        <div className="max-w-3xl space-y-4 leading-relaxed text-foreground/90">
          <Paragraphs text={proposal.narrative} />
        </div>
      </header>

      {proposal.sections.map((section, index) => (
        <section key={index} className="border-t border-rule pt-10">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Gallery {index + 1}
          </p>
          <h3 className="mt-2 font-serif text-3xl font-medium">{section.title}</h3>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">{section.summary}</p>

          <ol className="mt-8 space-y-6">
            {section.objects.map((entry) => {
              const o = byId.get(entry.objectId)!;
              return (
                <li
                  key={entry.objectId}
                  className="grid gap-6 border border-rule bg-surface p-5 md:grid-cols-[10rem_1fr_1.4fr]"
                >
                  <div className="flex aspect-square items-center justify-center bg-rule/30">
                    {o.image ? (
                      <img src={o.image} alt={o.title} className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="px-3 text-center text-[10px] uppercase tracking-[0.15em] text-muted">
                        No image
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <SourceTag kind="met" />
                    <p className="mt-2 font-serif text-lg leading-snug">{o.title}</p>
                    <p className="mt-1">{makerLine(o)}</p>
                    {o.date && <p className="text-muted">{o.date}</p>}
                    {o.medium && <p className="mt-2 text-xs text-muted">{o.medium}</p>}
                    {o.department && <p className="text-xs text-muted">{o.department}</p>}
                    <p className="mt-2 text-xs text-muted">
                      {o.isPublicDomain ? "Public domain" : "Not public domain"}
                    </p>
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-accent underline-offset-4 hover:underline"
                    >
                      View on metmuseum.org ↗
                    </a>
                  </div>
                  <div className="space-y-3 text-sm leading-relaxed">
                    <SourceTag kind="ai" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                        Why it belongs
                      </p>
                      <p className="mt-1">{entry.whyItBelongs}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                        Contribution to the argument
                      </p>
                      <p className="mt-1">{entry.contribution}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {section.objects.length === 0 && (
            <p className="mt-6 text-sm text-muted">
              No retrieved objects could be verified for this section.
            </p>
          )}
        </section>
      ))}

      {proposal.connections.length > 0 && (
        <section className="border-t border-rule pt-10">
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-3xl font-medium">Connections &amp; tensions</h3>
            <SourceTag kind="ai" />
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {proposal.connections.map((c, i) => (
              <li key={i} className="border border-rule bg-surface p-5 text-sm">
                <p
                  className={`text-[10px] font-medium uppercase tracking-[0.2em] ${
                    c.kind === "tension" ? "text-accent" : "text-muted"
                  }`}
                >
                  {c.kind}
                </p>
                <p className="mt-2 font-serif text-base italic">
                  {c.objectIds.map((id) => byId.get(id)?.title).join(" · ")}
                </p>
                <p className="mt-2 leading-relaxed">{c.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(proposal.caveats.length > 0 || unplaced.length > 0) && (
        <section className="border-t border-rule pt-10 text-sm">
          <h3 className="font-serif text-2xl font-medium">Limitations of this selection</h3>
          {proposal.caveats.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">
              {proposal.caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {unplaced.length > 0 && (
            <p className="mt-4 text-muted">
              Selected but not placed in any gallery:{" "}
              {unplaced.map((o) => o.title).join("; ")}.
            </p>
          )}
        </section>
      )}
    </section>
  );
}
