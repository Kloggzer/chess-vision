const TONE = {
  error: "border-destructive/60 bg-destructive/10 text-destructive",
  warn: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  info: "border-border bg-muted/30 text-muted-foreground",
} as const;

/** A message with room of its own — full width, its tone on the box, never a word in a corner. */
export function Notice({ tone = "info", children }: { tone?: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm break-words ${TONE[tone]}`} role={tone === "error" ? "alert" : undefined}>
      {children}
    </p>
  );
}
