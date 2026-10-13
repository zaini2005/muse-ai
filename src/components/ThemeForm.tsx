"use client";

import { useState } from "react";

interface ThemeFormProps {
  onSubmit: (theme: string) => void;
  loading: boolean;
}

export default function ThemeForm({ onSubmit, loading }: ThemeFormProps) {
  const [theme, setTheme] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = theme.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
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
        maxLength={500}
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        placeholder="e.g. What does it mean to belong to a place?"
        className="w-full resize-none border border-rule bg-surface px-5 py-4 font-serif text-xl leading-relaxed text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={!theme.trim() || loading}
          className="bg-accent px-8 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Searching…" : "Develop Theme"}
        </button>
      </div>
    </form>
  );
}
