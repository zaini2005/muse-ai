# Thematic Curator

A web app that helps museum curators develop exhibitions around themes,
questions, and ideas, rather than starting with individual objects.

Enter a theme. The app searches **The Metropolitan Museum of Art's Open
Access collection** for real objects. You choose which objects to include,
and the app drafts an exhibition proposal from them: an argument, a narrative,
gallery sections, and connections and tensions between the objects.

## Tech stack

- [Next.js](https://nextjs.org/) (React framework, App Router) and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [The Met Collection API](https://metmuseum.github.io/), which is free and needs no key
- [Claude](https://docs.claude.com/) via the Anthropic SDK, for search terms
  and the exhibition proposal (optional, needs an API key)

## Running it locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install                 # first time only
cp .env.example .env.local  # then paste your Anthropic API key into .env.local
npm run dev
```

Open <http://localhost:3000>.

### About the API key

`ANTHROPIC_API_KEY` lives in `.env.local`. Git never commits this file, and
the app reads it only on the server, so it is never sent to the browser.

- **Without a key:** museum search still works. Search terms are taken from
  the words in your theme, and the "Propose Exhibition" button stays off.
- **With a key:** AI suggests better search terms and writes the proposal.

## Trying it out

1. Enter `Currency and the Self` and click **Develop Theme**.
2. Check the search terms used and the Met records found. Each card shows the
   image, title, maker or culture, date, medium, dimensions, department,
   public-domain status, more record details, and a link to the object's page
   on metmuseum.org.
3. Select 3–30 objects. The strongest 12 are selected for you.
4. Click **Propose Exhibition**.

## How the research stays honest

- Every object comes from the Met API. The server fetches each record again
  before writing a proposal and never trusts object data sent by the browser.
- The AI receives only those records and is told not to add outside facts.
- Any object ID in the AI's reply that wasn't retrieved is removed, and the
  removal is shown to the user.
- The interface labels **Met record** facts separately from **AI
  interpretation**.
- If the API returns nothing, the app says so. When the objects don't
  support the theme well, the proposal says that too.
- The Met API does not provide label or description text. Cards show the
  structured record fields and link to the full entry on metmuseum.org.

## Commands

```bash
npm run dev     # development server
npm test        # unit tests
npm run lint    # code style checks
npm run build   # production build
```

## Project layout

```
src/
  app/
    page.tsx                 # Homepage
    api/search/route.ts      # Theme → search terms → Met search → records
    api/exhibition/route.ts  # Selected records → exhibition proposal
  components/
    CuratorStudio.tsx        # Page flow: search, select, propose
    ThemeForm.tsx            # Theme box and "Develop Theme" button
    ObjectCard.tsx           # A single Met object
    ExhibitionProposal.tsx   # The proposal view
  lib/
    met.ts                   # Met API client
    keywords.ts              # Search-term generation
    exhibition.ts            # Proposal prompt and record checks
    anthropic.ts             # Claude client (server only)
```
