// Small shared presentation pieces.

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-accent">
      {children}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-sm text-muted">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorNotice({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="border-l-2 border-accent bg-surface px-5 py-4">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-accent hover:text-accent-hover"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Marks text as coming from the museum record vs written by AI. */
export function SourceTag({ kind }: { kind: "met" | "ai" }) {
  return kind === "met" ? (
    <span className="inline-block border border-rule px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted">
      Met record
    </span>
  ) : (
    <span className="inline-block bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-accent">
      AI interpretation
    </span>
  );
}
