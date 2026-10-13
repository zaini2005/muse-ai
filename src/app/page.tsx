import CuratorStudio from "@/components/CuratorStudio";
import MuseumConnectionTest from "@/components/MuseumConnectionTest";

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

      <main className="flex-1">
        <CuratorStudio
          intro={
            <>
              <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-accent">
                Ideas first, objects second
              </p>
              <h1 className="font-serif text-6xl font-medium leading-[1.05] sm:text-7xl">
                Thematic Curator
              </h1>
              <div className="my-10 h-px w-24 bg-accent" />
              <p className="max-w-2xl text-lg leading-relaxed text-muted">
                A studio for curators who begin with a question. Enter a theme,
                idea, or provocation, and Thematic Curator searches The
                Metropolitan Museum of Art&apos;s open collection for real
                objects, then helps you shape them into an exhibition — framing
                the argument, structuring galleries, and explaining why each
                object belongs.
              </p>
            </>
          }
        />
        <MuseumConnectionTest />
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs tracking-wide text-muted">
          Thematic Curator — collection data from{" "}
          <a href="https://metmuseum.github.io/" className="underline underline-offset-4 hover:text-foreground">
            The Met Collection API
          </a>{" "}
          (Open Access)
        </div>
      </footer>
    </div>
  );
}
