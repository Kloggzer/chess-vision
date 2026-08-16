/**
 * Frame timing: hand leaving the last move or the next one arriving.
 * Two moments need different scepticism — after commit the FEN is true, before it is not.
 */
export type FramePhaseInfo = {
  phase?: "settled" | "after" | "before";
  sinceS?: number;
  toS?: number;
  unknown?: string[];
};

export function PhaseChip({ frame }: { frame: FramePhaseInfo }) {
  if (!frame.phase) return null;
  const after = frame.phase === "after";
  const seconds = after ? frame.sinceS : frame.toS;
  const gap = seconds === undefined || !Number.isFinite(seconds) ? "" : ` ${seconds.toFixed(1)} s`;
  const [tone, text, why] =
    frame.phase === "settled"
      ? ["bg-muted text-muted-foreground", "ruhig — keine Hand", "weit weg von beiden Commits; der FEN stimmt einfach"]
      : after
        ? [
            "bg-emerald-950 text-emerald-300",
            `${gap} nach dem Zug`,
            "die Hand verlässt den gerade gelandeten Zug — der FEN stimmt hier",
          ]
        : [
            "bg-amber-950 text-amber-300",
            `${gap} vor dem nächsten Zug`,
            "der nächste Zug kommt an — eine Figur kann schon bewegt sein, während der FEN es noch nicht ist",
          ];
  return (
    <span className="flex items-center gap-2">
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`} title={why}>
        {text}
      </span>
      {frame.unknown?.length ? (
        <span className="text-muted-foreground text-xs" title="the exporter vouches for no label here">
          FEN unklar auf {frame.unknown.join(" ")}
        </span>
      ) : null}
    </span>
  );
}
