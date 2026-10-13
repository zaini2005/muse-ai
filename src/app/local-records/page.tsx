/* eslint-disable @next/next/no-img-element -- museum images are served directly from the museum's image server */
import Link from "next/link";
import { LocalDataError, datasetSize, getManifest, sampleRecords } from "@/lib/local-collection";

// Test page: shows real records straight from the local dataset (data/aic/).
export const dynamic = "force-dynamic";

export const metadata = { title: "Local Records · Thematic Curator" };

export default function LocalRecordsPage() {
  let records;
  let total = 0;
  let error: string | null = null;
  try {
    records = sampleRecords(20);
    total = datasetSize();
  } catch (e) {
    error = e instanceof LocalDataError ? e.message : "The local dataset could not be loaded.";
  }
  const manifest = getManifest();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground">
        ← Thematic Curator
      </Link>
      <h1 className="mt-6 font-serif text-5xl font-medium">Local dataset test</h1>
      <p className="mt-4 max-w-2xl text-muted">
        The first 20 records from the local Art Institute of Chicago dataset,
        read from <code>data/aic/artworks.json</code> on this computer. No
        museum API is called to build this list. Images and record links point
        to the museum&apos;s website.
      </p>

      {manifest && (
        <dl className="mt-8 grid gap-x-6 gap-y-2 border border-rule bg-surface p-5 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Records</dt>
          <dd>
            {total.toLocaleString()} ({manifest.selection.public_domain_with_image.toLocaleString()} public domain
            with an image, {manifest.selection.with_description.toLocaleString()} with a museum description)
          </dd>
          <dt className="text-muted">Source</dt>
          <dd>
            <a href={manifest.repository} className="text-accent underline-offset-4 hover:underline">
              {manifest.repository}
            </a>{" "}
            — dump published {manifest.dump_last_modified ?? "date unknown"}
          </dd>
          <dt className="text-muted">License</dt>
          <dd>{manifest.license_text}</dd>
          <dt className="text-muted">Images</dt>
          <dd>{manifest.image_license_note}</dd>
          <dt className="text-muted">Selection</dt>
          <dd>{manifest.selection.rule}</dd>
        </dl>
      )}

      {error && (
        <div role="alert" className="mt-8 border-l-2 border-accent bg-surface px-5 py-4">
          <p className="font-medium">Could not load the local dataset</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}

      {records && (
        <ol className="mt-10 space-y-4">
          {records.map((o, i) => (
            <li key={o.id} className="grid gap-5 border border-rule bg-surface p-5 sm:grid-cols-[8rem_1fr]">
              <div className="flex aspect-square items-center justify-center bg-rule/30 text-center text-[10px] uppercase tracking-[0.12em] text-muted">
                {o.image ? (
                  <img src={o.image} alt={o.imageAlt ?? o.title} className="h-full w-full object-contain" />
                ) : (
                  "No image in this record"
                )}
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted">
                  {i + 1}. AIC record {o.sourceId} · {o.department ?? "No department"} ·{" "}
                  {o.isPublicDomain ? "Public domain" : "Not public domain"}
                </p>
                <h2 className="mt-1 font-serif text-xl">{o.title}</h2>
                <p>
                  {o.artist ?? "Artist not recorded"}
                  {o.date ? <span className="text-muted">, {o.date}</span> : <span className="text-muted">, date not recorded</span>}
                </p>
                {o.description ? (
                  <p className="mt-2 line-clamp-3 leading-relaxed text-foreground/80">{o.description}</p>
                ) : (
                  <p className="mt-2 text-muted">No museum description in this record.</p>
                )}
                <p className="mt-2 text-xs text-muted">{o.license?.image}</p>
                <p className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-accent">
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Museum record ↗
                  </a>
                  {o.image && (
                    <a href={o.image} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Image ↗
                    </a>
                  )}
                  <a href={o.apiLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    API record ↗
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
