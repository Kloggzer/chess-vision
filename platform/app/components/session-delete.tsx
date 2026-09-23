"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { num } from "@/app/corpus/format";
import { Button } from "@/components/ui/button";
import type { DeletionCost } from "@/lib/chain/session-delete";

async function post(id: string, body: unknown) {
  const res = await fetch(`/api/session/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
  return answer;
}

/**
 * Delete one exported session, in two steps: `--dry-run` says what would go, the same verb then
 * does it. The numbers on screen are the tool's, never counted again here.
 */
export function SessionDelete({ sessionId, className = "" }: { sessionId: string; className?: string }) {
  const router = useRouter();
  const [cost, setCost] = useState<DeletionCost | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCost(null);
    setTyped("");
    setError(null);
  };

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      setCost((await post(sessionId, { dryRun: true })) as DeletionCost);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const answer = (await post(sessionId, { confirm: sessionId })) as { deleted?: string };
      setDone(answer.deleted ?? "gelöscht");
      close();
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-muted-foreground font-mono text-xs">{done}</span>;

  // Corrections are hand work and the delete takes them with it, so that case has to be typed out.
  const risky = (cost?.corrections ?? 0) > 0;
  const armed = !risky || typed.trim() === sessionId;

  return (
    <>
      <button
        className={`text-destructive cursor-pointer underline underline-offset-4 disabled:opacity-50 max-sm:inline-flex max-sm:h-11 max-sm:items-center ${className}`}
        disabled={busy}
        onClick={() => void ask()}
        type="button"
      >
        {busy && !cost ? "zähle…" : "Session löschen"}
      </button>
      {error && !cost ? <span className="text-destructive ml-2 text-xs">{error}</span> : null}

      {cost ? (
        <div className="bg-background/95 fixed inset-0 z-50 overflow-y-auto p-4" role="dialog">
          <div className="border-border bg-background mx-auto mt-16 max-w-xl space-y-3 rounded-lg border p-4 text-sm">
            <h2 className="font-semibold">
              <code className="font-mono">{cost.session_id}</code> endgültig löschen?
            </h2>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 tabular-nums">
              <dt className="text-muted-foreground">Log-Zeilen</dt>
              <dd className="font-mono">{num(cost.frames)}</dd>
              <dt className="text-muted-foreground">Crops (Manifest-Zeilen)</dt>
              <dd className="font-mono">{num(cost.crops)}</dd>
              <dt className="text-muted-foreground">Korrekturen</dt>
              <dd className={`font-mono ${risky ? "text-destructive font-bold" : ""}`}>{num(cost.corrections)}</dd>
            </dl>

            <p className="text-muted-foreground text-xs">
              Gezählt von <code>chesslab session delete --dry-run</code>. Der Löschlauf ist derselbe
              Befehl — dieselben Zahlen, keine zweite Rechnung.
            </p>

            <ul className="space-y-1 text-xs">
              <li>
                <strong>Kommt wieder:</strong> Crops und Manifest-Zeilen entstehen bei einem Re-Slice
                neu, solange die Aufnahme noch da ist.
              </li>
              <li className={risky ? "text-destructive" : "text-muted-foreground"}>
                {risky ? (
                  <>
                    <strong>Kommt nicht wieder:</strong> die {num(cost.corrections)} Korrektur-Zeilen
                    sind das Urteil eines Menschen. Kein Re-Slice stellt sie her.
                  </>
                ) : (
                  <>Keine Korrekturen an dieser Session — es geht kein menschliches Urteil verloren.</>
                )}
              </li>
              <li className="text-muted-foreground">
                Reversibel wäre <code>archive</code> — das hier ist die Tür ohne Rückweg.
              </li>
            </ul>

            {cost.crops > cost.frames * 64 ? (
              <p className="text-xs text-amber-500">
                Deutlich mehr Crops als {num(cost.frames)} Frames × 64 tragen könnten: das Manifest
                führt unter dieser Session-ID noch eine frühere Korpus-Generation. Sie geht mit.
              </p>
            ) : null}

            {risky ? (
              <label className="block space-y-1">
                <span className="text-xs">
                  Zum Bestätigen die Session-ID tippen: <code className="font-mono">{cost.session_id}</code>
                </span>
                <input
                  autoFocus
                  className="border-border bg-background w-full rounded border px-2 py-1 font-mono text-xs max-sm:h-11"
                  onChange={(event) => setTyped(event.target.value)}
                  spellCheck={false}
                  value={typed}
                />
              </label>
            ) : null}

            {error ? <p className="text-destructive text-xs">{error}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!armed || busy} onClick={() => void confirm()} size="sm" variant="destructive">
                {busy ? "lösche…" : risky ? "endgültig löschen" : "löschen"}
              </Button>
              <Button className="max-sm:h-11" onClick={close} size="sm" variant="outline">
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
