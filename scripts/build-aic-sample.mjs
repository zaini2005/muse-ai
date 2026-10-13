#!/usr/bin/env node
// Builds a local sample of real Art Institute of Chicago artwork records from
// the museum's official public data dump, so the app can search without
// calling a live API.
//
// Source: https://github.com/art-institute-of-chicago/api-data
//   → full dump: https://artic-api-data.s3.amazonaws.com/artic-api-data.tar.bz2
//
// Usage:
//   npm run data:aic                       # download the dump, then build
//   npm run data:aic -- path/to/dump.tar.bz2   # use an already-downloaded dump
//
// Output:
//   data/aic/artworks.json  - selected records (original API field names/values,
//                             plus museum_url, source and license per record)
//   data/aic/manifest.json  - where the data came from, licenses, selection rule

import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import tar from "tar-stream";
import unbzip2 from "unbzip2-stream";

const DUMP_URL = "https://artic-api-data.s3.amazonaws.com/artic-api-data.tar.bz2";
const REPO_URL = "https://github.com/art-institute-of-chicago/api-data";
const TARGET = 8000;
const PUBLIC_DOMAIN_SHARE = 0.9; // at most 90% public-domain-with-image records
const OUT_DIR = path.resolve("data/aic");
const CACHE = path.resolve(".cache/artic-api-data.tar.bz2");

// Original API fields kept for each record (values are copied unchanged).
const KEEP = [
  "id", "api_link", "title", "alt_titles", "artist_display", "artist_title",
  "date_display", "date_start", "date_end", "medium_display", "dimensions",
  "department_title", "classification_title", "artwork_type_title",
  "place_of_origin", "style_title", "credit_line", "main_reference_number",
  "is_public_domain", "copyright_notice", "is_on_view", "gallery_title",
  "image_id", "thumbnail", "short_description", "description",
  "subject_titles", "term_titles", "theme_titles", "is_boosted", "boost_rank",
  "updated_at", "source_updated_at",
];

async function download() {
  mkdirSync(path.dirname(CACHE), { recursive: true });
  console.log(`Downloading ${DUMP_URL} …`);
  const res = await fetch(DUMP_URL);
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(CACHE));
  console.log(`Saved ${(statSync(CACHE).size / 1e6).toFixed(1)} MB to ${CACHE}`);
  return { file: CACHE, lastModified: res.headers.get("last-modified") };
}

/** Decompresses with the system bzip2 when available (fast), otherwise in JS. */
function decompress(file) {
  return new Promise((resolve) => {
    const child = spawn("bzip2", ["-dc", file], { stdio: ["ignore", "pipe", "inherit"] });
    child.once("spawn", () => resolve(child.stdout));
    child.once("error", () => {
      console.log("System bzip2 not found; decompressing in JavaScript (slower) …");
      resolve(createReadStream(file).pipe(unbzip2()));
    });
  });
}

const ARTWORK_FILE = /\/json\/artworks\/\d+\.json$/;

async function readArchive(file, onArtwork, onFile) {
  const extract = tar.extract();
  extract.on("entry", (header, stream, next) => {
    const wanted =
      ARTWORK_FILE.test(header.name) ||
      header.name.endsWith("/json/info.json") ||
      header.name.endsWith("/json/config.json");
    if (!wanted) {
      stream.on("end", next);
      stream.resume();
      return;
    }
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => {
      const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (ARTWORK_FILE.test(header.name)) onArtwork(json);
      else onFile(path.basename(header.name), json);
      next();
    });
  });
  await pipeline(await decompress(file), extract);
}

const has = (v) => typeof v === "string" && v.trim().length > 0;

function rankKey(r) {
  // Records with museum descriptions and museum highlights first.
  return [
    has(r.description) ? 0 : 1,
    r.is_boosted ? 0 : 1,
    has(r.short_description) ? 0 : 1,
    r.boost_rank ?? Number.MAX_SAFE_INTEGER,
    r.id,
  ];
}

function compare(a, b) {
  const ka = rankKey(a);
  const kb = rankKey(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return 0;
}

/** Takes `count` records, rotating across departments for variety. */
function pickAcrossDepartments(records, count) {
  const byDept = new Map();
  for (const r of [...records].sort(compare)) {
    const d = r.department_title ?? "(no department)";
    if (!byDept.has(d)) byDept.set(d, []);
    byDept.get(d).push(r);
  }
  const queues = [...byDept.values()];
  const picked = [];
  for (let i = 0; picked.length < count; i++) {
    let any = false;
    for (const q of queues) {
      if (i < q.length && picked.length < count) {
        picked.push(q[i]);
        any = true;
      }
    }
    if (!any) break;
  }
  return picked;
}

function project(r) {
  const out = {};
  for (const key of KEEP) {
    if (!(key in r)) continue;
    // From the thumbnail, keep only the alt text and size (not the inline preview image).
    out[key] =
      key === "thumbnail" && r.thumbnail
        ? { alt_text: r.thumbnail.alt_text ?? null, width: r.thumbnail.width ?? null, height: r.thumbnail.height ?? null }
        : r[key];
  }
  return out;
}

async function main() {
  const given = process.argv[2];
  const { file, lastModified } = given
    ? { file: path.resolve(given), lastModified: null }
    : existsSync(CACHE)
      ? { file: CACHE, lastModified: null }
      : await download();

  console.log(`Reading ${file} (this takes a few minutes) …`);
  const stats = { total: 0, publicDomain: 0, withImage: 0, publicDomainWithImage: 0, withDescription: 0 };
  const pdWithImage = [];
  const others = [];
  const meta = {};

  await readArchive(
    file,
    (r) => {
      stats.total++;
      const pd = r.is_public_domain === true;
      const img = has(r.image_id);
      if (pd) stats.publicDomain++;
      if (img) stats.withImage++;
      if (has(r.description)) stats.withDescription++;
      if (!has(r.title)) return; // skip untitled stubs
      if (pd && img) {
        stats.publicDomainWithImage++;
        pdWithImage.push(project(r));
      } else if (has(r.description) || has(r.short_description)) {
        others.push(project(r));
      }
      if (stats.total % 20000 === 0) console.log(`  …${stats.total} artwork records read`);
    },
    (name, json) => (meta[name] = json),
  );

  const pdCount = Math.min(pdWithImage.length, Math.round(TARGET * PUBLIC_DOMAIN_SHARE));
  const selected = [
    ...pickAcrossDepartments(pdWithImage, pdCount),
    ...pickAcrossDepartments(others, TARGET - pdCount),
  ];

  const license = meta["info.json"]?.artworks ?? {};
  const dumpDate = lastModified ? new Date(lastModified).toISOString().slice(0, 10) : null;
  const source = `Art Institute of Chicago public API data dump (${DUMP_URL}${dumpDate ? `, published ${dumpDate}` : ""})`;

  const records = selected.map((r) => ({
    ...r,
    museum_url: `https://www.artic.edu/artworks/${r.id}`,
    source,
    license: {
      metadata: "CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/",
      description: has(r.description)
        ? "CC BY 4.0 — credit: Art Institute of Chicago"
        : null,
      image: !has(r.image_id)
        ? "No image in this record"
        : r.is_public_domain
          ? "Public domain — reusable under the museum's Open Access policy (CC0): https://www.artic.edu/open-access"
          : "Not public domain — image may be protected by copyright; do not reuse without permission",
    },
  }));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    path.join(OUT_DIR, "artworks.json"),
    `[\n${records.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`,
  );

  const summary = {
    museum: "Art Institute of Chicago",
    repository: REPO_URL,
    dump_url: DUMP_URL,
    dump_last_modified: lastModified,
    built_at: new Date().toISOString(),
    api_version: license.version ?? null,
    license_text: license.license_text ?? null,
    license_links: license.license_links ?? [],
    image_license_note:
      "Images are not part of the dump. Public-domain images are served by the museum's IIIF server under its Open Access policy (https://www.artic.edu/open-access).",
    iiif_url: meta["config.json"]?.iiif_url ?? null,
    selection: {
      rule: `Up to ${Math.round(PUBLIC_DOMAIN_SHARE * 100)}% public-domain records with an image, the rest records that are not public domain or have no image but do have museum description text. Within each group, records with descriptions and museum highlights come first, rotating across departments.`,
      target: TARGET,
      selected: records.length,
      public_domain_with_image: records.filter((r) => r.is_public_domain && has(r.image_id)).length,
      with_description: records.filter((r) => has(r.description)).length,
    },
    full_dump_counts: stats,
  };
  writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log("Full dump:", stats);
  console.log("Selected:", summary.selection);
  console.log(`Wrote ${records.length} records to ${path.join(OUT_DIR, "artworks.json")}`);
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
