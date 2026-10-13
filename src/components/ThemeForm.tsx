"use client";

import { useState } from "react";

export default function ThemeForm() {
  const [theme, setTheme] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = theme.trim();
    if (!trimmed) return;
    // Placeholder: theme development will be built in a later step.
    setSubmitted(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label
        htmlFor="theme"
        className="mb-3 block text-xs font-medium uppercase tracking-[0.2em] text-muted"
      >
        Your theme or question
      </label>
      <textarea
        id="theme"
        name="theme"
        rows={3}
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        placeholder="e.g. What does it mean to belong to a place?"
        className="w-full resize-none border border-rule bg-surface px-5 py-4 font-serif text-xl leading-relaxed text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={!theme.trim()}
          className="bg-accent px-8 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          Develop Theme
        </button>
      </div>

      {submitted && (
        <p
          role="status"
          className="mt-8 border-l-2 border-accent pl-4 text-sm text-muted"
        >
          Theme received: <span className="font-serif text-base italic text-foreground">“{submitted}”</span>
          <br />
          Theme development is coming in the next step.
        </p>
      )}
    </form>
  );
}
