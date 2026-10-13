# Thematic Curator

A web app that helps museum curators develop exhibitions around themes,
questions, and ideas, rather than starting with individual objects.

Enter a theme, and the app searches **real Art Institute of Chicago
artwork records** stored in the project, so it works without calling a live
museum API. You then choose which objects to include in your exhibition.

## Tech stack

- [Next.js](https://nextjs.org/) (React framework, App Router) and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- A local sample of the [Art Institute of Chicago public data dump](https://github.com/art-institute-of-chicago/api-data)

## The local dataset

`data/aic/artworks.json` holds **8,000 real artwork records** taken from the
museum's official full data dump
(`https://artic-api-data.s3.amazonaws.com/artic-api-data.tar.bz2`).

- **How they were chosen:** up to 90% are public domain with an image, so
  their images can legally be reused. The rest are records that aren't public
  domain or have no image but do have museum description text. Records with
  descriptions and museum highlights come first, rotating across departments.
- **What each record keeps:** 33 of the original API fields, with names and
  values unchanged (except `thumbnail`, which keeps only its alt text and size),
  plus `museum_url`, `source` and `license`.
- **Licenses:** metadata is CC0. Museum description text is CC BY 4.0 (credit
  the Art Institute of Chicago). Images are not in the dump. They load from the
  museum's image server, and only public-domain images may be reused (see
  https://www.artic.edu/open-access).
- **The summary file:** `data/aic/manifest.json` records the dump date, the
  full license text, the selection rule and counts.

To rebuild the sample from the latest monthly dump (about 130 MB to download;
takes a few minutes):

```bash
npm run data:aic
```

## Running it locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install    # first time only
npm run dev
```

Open <http://localhost:3000>.

## Trying it out

1. Enter `Currency and the Self` and click **Develop Theme**.
2. Results come from the local dataset. Each card shows the image (when there
   is one), title, artist or culture, date, the museum description (when there
   is one), rights and source details, and links to the museum record and the
   image.
3. Select the objects you want for the exhibition.
4. To see 20 records straight from the dataset, open
   <http://localhost:3000/local-records>.

## Commands

```bash
npm run dev     # development server
npm test        # unit tests
npm run lint    # code style checks
npm run build   # production build
npm run data:aic  # rebuild data/aic/ from the museum's latest data dump
```

## Project layout

```
data/aic/
  artworks.json              # 8,000 real Art Institute of Chicago records
  manifest.json              # source, licenses, selection rule
scripts/
  build-aic-sample.mjs       # builds data/aic/ from the official dump
src/
  app/
    page.tsx                 # Homepage
    local-records/page.tsx   # Test page: 20 records from the local dataset
    api/search/route.ts      # Theme → search terms → local search
  components/
    CuratorStudio.tsx        # Page flow: search, view, select
    ThemeForm.tsx            # Theme box and "Develop Theme" button
    ObjectCard.tsx           # A single artwork record
  lib/
    local-collection.ts      # Loads and searches the local dataset
    artic.ts                 # Art Institute record fields → app format
```

Not used yet (kept for later steps): `src/lib/met.ts`,
`src/lib/exhibition.ts`, `src/lib/anthropic.ts`, `src/app/api/exhibition/`
and `src/components/ExhibitionProposal.tsx`, from the earlier Met and AI work.
