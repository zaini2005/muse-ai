import ThemeForm from "@/components/ThemeForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-serif text-lg tracking-wide">
            Thematic Curator
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted">
            Exhibition Studio
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-accent">
            Ideas first, objects second
          </p>
          <h1 className="font-serif text-6xl font-medium leading-[1.05] sm:text-7xl">
            Thematic Curator
          </h1>
          <div className="my-10 h-px w-24 bg-accent" />
          <p className="max-w-2xl text-lg leading-relaxed text-muted">
            A studio for curators who begin with a question. Enter a theme,
            idea, or provocation, and Thematic Curator helps you shape it into
            an exhibition — framing the narrative, structuring galleries, and
            suggesting the kinds of objects that could bring it to life.
          </p>

          <div className="mt-14">
            <ThemeForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs tracking-wide text-muted">
          Thematic Curator — a tool for thematic exhibition development
        </div>
      </footer>
    </div>
  );
}
