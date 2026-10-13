/* eslint-disable @next/next/no-img-element -- Met images are served directly from images.metmuseum.org */
import type { FoundObject } from "@/lib/types";

interface ObjectCardProps {
  object: FoundObject;
  selected: boolean;
  onToggle: (id: number) => void;
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

export function makerLine(o: {
  artist: string | null;
  culture: string | null;
}): string {
  return o.artist ?? o.culture ?? "Maker unrecorded";
}

export default function ObjectCard({ object: o, selected, onToggle }: ObjectCardProps) {
  return (
    <article
      className={`flex flex-col border bg-surface transition-colors ${
        selected ? "border-accent ring-1 ring-accent" : "border-rule"
      }`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-rule/30">
        {o.image ? (
          <img
            src={o.image}
            alt={o.title}
            loading="lazy"
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <p className="px-6 text-center text-xs uppercase tracking-[0.15em] text-muted">
            No image available{o.isPublicDomain ? "" : " — image rights may be restricted"}
          </p>
        )}
        <span
          className={`absolute left-3 top-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${
            o.isPublicDomain ? "bg-foreground text-background" : "border border-rule bg-surface text-muted"
          }`}
        >
          {o.isPublicDomain ? "Public domain" : "Not public domain"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl leading-snug">{o.title}</h3>
        <p className="mt-1 text-sm text-foreground">
          {makerLine(o)}
          {o.date && <span className="text-muted">, {o.date}</span>}
        </p>
        {o.artist && o.culture && <p className="text-sm text-muted">{o.culture}</p>}

        <dl className="mt-4 space-y-1.5 text-xs">
          <Field label="Medium" value={o.medium} />
          <Field label="Dimensions" value={o.dimensions} />
          <Field label="Department" value={o.department} />
        </dl>

        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground">
            More from the museum record
          </summary>
          <dl className="mt-3 space-y-1.5">
            <Field label="Object type" value={o.objectName} />
            <Field label="Classification" value={o.classification} />
            <Field label="Period" value={o.period} />
            <Field label="Place" value={o.geography} />
            <Field label="Artist" value={o.artistBio ? `${o.artist ?? ""} (${o.artistBio})` : null} />
            <Field label="Subjects" value={o.tags.length ? o.tags.join(", ") : null} />
            <Field label="Credit line" value={o.creditLine} />
            <Field label="Accession no." value={o.accessionNumber} />
            <Field label="On view" value={o.galleryNumber ? `Gallery ${o.galleryNumber}` : null} />
          </dl>
          <p className="mt-3 text-muted">
            The Met&apos;s API does not include label or description text; read
            the full entry on the museum&apos;s website.
          </p>
        </details>

        {o.matchedKeywords.length > 0 && (
          <p className="mt-4 text-[11px] text-muted">
            Found by searching: {o.matchedKeywords.map((k) => `“${k}”`).join(", ")}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <a
            href={o.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            View on metmuseum.org ↗
          </a>
          <button
            type="button"
            onClick={() => onToggle(o.objectID)}
            aria-pressed={selected}
            className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
              selected
                ? "bg-accent text-white hover:bg-accent-hover"
                : "border border-rule text-foreground hover:border-accent hover:text-accent"
            }`}
          >
            {selected ? "✓ Selected" : "Select"}
          </button>
        </div>
      </div>
    </article>
  );
}
