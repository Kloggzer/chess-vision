import { ReactNode, SelectHTMLAttributes, ButtonHTMLAttributes, MouseEvent, useState } from "react";
import { Loader2 } from "lucide-react";

// Uniform, COLORED pieces: same (filled) glyph for both colors, colored white/black
// with outline so white shows on light and black shows on dark backgrounds.
const SOLID: Record<string, string> = {
  K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟",
};
export function Glyph({ label, className = "" }: { label: string; className?: string }) {
  if (label === "empty") return <span className={`text-zinc-500 ${className}`}>·</span>;
  if (label === "occluded") return <span className={`text-amber-300 ${className}`}>▦</span>;
  const ch = SOLID[label?.[1]] ?? label;
  const white = label?.[0] === "w";
  return (
    <span className={className} style={{
      color: white ? "#fafafa" : "#0a0a0a",
      textShadow: white ? "0 0 1px #000, 0 1px 2px #000" : "0 0 1px #fff, 0 1px 2px #fff",
    }}>{ch}</span>
  );
}

export function Card({ title, right, children, className = "" }: {
  title?: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// Button with automatic busy state: if onClick returns a Promise, the button
// disables itself and shows a spinner until done (prevents double-clicks
// and provides clear feedback for all async actions — applies to all tabs).
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  variant?: "primary" | "ghost";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
};

export function Button({ children, variant = "ghost", className = "", onClick, disabled, ...p }: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const styles = variant === "primary"
    ? "bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium"
    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700";

  async function handle(e: MouseEvent<HTMLButtonElement>) {
    if (!onClick) return;
    const r = onClick(e);
    if (r && typeof (r as any).then === "function") {   // async Handler -> Busy bis fertig
      setBusy(true);
      try { await r; } finally { setBusy(false); }
    }
  }

  return (
    <button {...p} onClick={handle} disabled={disabled || busy}
      className={`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}>
      <span className={`inline-flex items-center gap-2 ${busy ? "invisible" : ""}`}>{children}</span>
      {busy && <Loader2 className="absolute h-4 w-4 animate-spin" />}
    </button>
  );
}

export function Select({ label, children, ...p }:
  SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-400">
      {label}
      <select {...p}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500">
        {children}
      </select>
    </label>
  );
}
