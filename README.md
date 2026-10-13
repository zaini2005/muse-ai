# Thematic Curator

A web app that helps museum curators develop exhibitions around themes,
questions, and ideas, rather than starting with individual objects.

## Tech stack

- [Next.js](https://nextjs.org/) (React framework, App Router)
- TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Running it locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install      # first time only: downloads dependencies
npm run dev      # starts the development server
```

Then open <http://localhost:3000> in your browser. Saved changes reload automatically.

## Project layout

```
src/
  app/
    layout.tsx       # Shared page shell: fonts, page title
    page.tsx         # The homepage
    globals.css      # Colour palette and global styles
  components/
    ThemeForm.tsx    # The theme text box and "Develop Theme" button
```
