"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STREAM_PALETTE } from "@/components/board-paint";
import { CROP, CropGrid, PAGE } from "@/components/crop-grid";
import { Notice } from "@/components/notice";
import { PaletteRow } from "@/components/palette-row";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Correction, Ledger } from "@/lib/corrections";
import { changeText, revertsTo, type Change } from "@/lib/history";

/**
 * HISTORIE — jede geschriebene Zeile, jüngste zuerst, rückwärts blätterbar (CONCEPT.md 4.2.4).
 * Dieselben Griffe wie im Strom: Pinsel laden, Karte klicken, ⏎ schreibt die Seite. Neu ist der
 * Rechtsklick — er nimmt die Zeile zurück, statt eine neue Meinung darüber zu legen.
 */
const keyOf = (c: Change) => `${c.sessionId}|${c.frame}|${c.square}`;
/** Die ZEILE, nicht die Zelle: dieselbe Zelle steht mehrfach in der Historie, und eine Marke auf
 *  der Zelle klebte sonst auf jedem ihrer Auftritte. */
const rowOf = (c: Change) => `${keyOf(c)}|${c.ts}`;
const TOUCH = "max-sm:h-11 max-sm:px-3";

async function post(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
}

export function HistoryView({ changes }: { changes: Change[] }) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [brush, setBrush] = useState("");
  const [pick, setPick] = useState<Record<number, string>>({});
  const [taking, setTaking] = useState<ReadonlySet<number>>(new Set<number>());
  /** Was DIESE Sitzung auf die Zeile geschrieben hat — die Liste selbst ist danach von gestern. */
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [seen, setSeen] = useState(changes);
  const [cursor, setCursor] = useState(0);
  const [note, setNote] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  // Nach dem Neuladen stehen die Schreibungen als eigene Zeilen in der Liste; die Marke daneben
  // wäre dann eine zweite Stimme über dasselbe. Im Render, nicht im Effekt (React: „adjusting
  // state when props change").
  if (seen !== changes) {
    setSeen(changes);
    setApplied({});
  }

  const pages = Math.max(1, Math.ceil(changes.length / PAGE));
  const at = Math.min(page, pages - 1);
  const slice = useMemo(() => changes.slice(at * PAGE, at * PAGE + PAGE), [at, changes]);
  const index = (i: number) => at * PAGE + i;

  const clear = () => {
    setPick({});
    setTaking(new Set<number>());
    setCursor(0);
  };

  const put = (i: number, label: string) =>
    setPick((p) => {
      const next = { ...p };
      if (next[index(i)] === label) delete next[index(i)];
      else next[index(i)] = label;
      return next;
    });

  const takeBack = (i: number) =>
    setTaking((t) => {
      const next = new Set(t);
      if (!next.delete(index(i))) next.add(index(i));
      return next;
    });

  /**
   * Die Seite schreiben. Ein Übermalen ist eine gewöhnliche `corrections`-Zeile (last-wins), ein
   * Rücknehmen der Grabstein aus 4.2.2 — mit dem Vorgänger als `label`, damit Python beim Slice
   * genau dorthin zurückfällt, und im Ledger der Zeile, sonst bliebe die Zelle beurteilt.
   */
  const write = useCallback(async () => {
    const byLedger = new Map<Ledger, Correction[]>();
    const add = (ledger: Ledger, row: Correction) =>
      byLedger.set(ledger, [...(byLedger.get(ledger) ?? []), row]);
    const done: Record<string, string> = {};
    for (const [key, label] of Object.entries(pick)) {
      const c = changes[Number(key)];
      if (!c) continue;
      add("corrections", { session_id: c.sessionId, frame: c.frame, square: c.square, label });
      done[rowOf(c)] = label;
    }
    for (const i of taking) {
      const c = changes[i];
      if (!c) continue;
      const label = revertsTo(c);
      add(c.ledger, { session_id: c.sessionId, frame: c.frame, square: c.square, label, retract: true });
      done[rowOf(c)] = `${label} (zurückgenommen)`;
    }
    if (byLedger.size === 0) return;
    try {
      for (const [ledger, rows] of byLedger) await post("/api/corrections", { rows, ledger });
      setApplied((a) => ({ ...a, ...done }));
      setNote({ tone: "info", text: `${Object.keys(done).length} Zellen geschrieben` });
      clear();
    } catch (error) {
      setNote({ tone: "error", text: String(error) });
    }
  }, [changes, pick, taking]);

  const now = useRef({ write, brush, cursor, slice });
  useEffect(() => {
    now.current = { write, brush, cursor, slice };
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "Enter") {
        event.preventDefault();
        void now.current.write();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setCursor((i) => Math.max(0, Math.min(now.current.slice.length - 1, i + (event.key === "ArrowRight" ? 1 : -1))));
        return;
      }
      const hit = STREAM_PALETTE.find(([k]) => k === event.key);
      if (!hit) return;
      event.preventDefault();
      setBrush((b) => (b === hit[1] ? "" : hit[1]));
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (changes.length === 0) {
    return <p className="text-muted-foreground text-sm">Noch nichts geschrieben — die Ledger sind leer.</p>;
  }

  const marked = Object.keys(pick).length + taking.size;
  const when = (ts: string) => new Date(ts).toLocaleString("de-DE");
  const recordings = [...new Set(slice.map((c) => c.sessionId))];

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="bg-background rounded border px-2 py-0.5 font-mono text-lg font-bold">
          Seite {at + 1}/{pages}
        </span>
        <span className="text-muted-foreground">
          {changes.length} Änderungen, jüngste zuerst · {when(slice[slice.length - 1].ts)} –{" "}
          {when(slice[0].ts)} · Klick malt den Pinsel · Rechtsklick nimmt die Zeile zurück
        </span>
        <Button className={`ml-auto ${TOUCH}`} disabled={marked === 0} onClick={() => void write()} size="sm">
          ⏎ {marked} schreiben
        </Button>
        <Button className={TOUCH} disabled={at === 0} onClick={() => { setPage(at - 1); clear(); }} size="sm" variant="outline">
          ← neuer
        </Button>
        <Button className={TOUCH} disabled={at + 1 >= pages} onClick={() => { setPage(at + 1); clear(); }} size="sm" variant="outline">
          älter →
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className={TOUCH} onClick={() => router.refresh()} size="sm" variant="outline">
              ↻
            </Button>
          </TooltipTrigger>
          <TooltipContent>Neu laden — was diese Sitzung schreibt, steht noch nicht in der Liste</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <PaletteRow active={brush} onPick={(label) => setBrush((b) => (b === label ? "" : label))} />
        <span className="text-muted-foreground ml-auto truncate font-mono text-xs">{recordings.join(" · ")}</span>
      </div>

      {note ? note.tone === "error" ? <Notice tone="error">{note.text}</Notice> : <p className="text-muted-foreground text-sm">{note.text}</p> : null}

      <CropGrid
        cells={slice.map((c, i) => ({
          key: `${rowOf(c)}|${i}`,
          src: `/api/cell/${c.name}/${c.frame}/${c.square}?size=${CROP}`,
          alt: `${c.square} @ ${c.frame}`,
          caption: `${c.square} · ${c.frame}`,
          note: applied[rowOf(c)] ? `✓ ${applied[rowOf(c)]}` : changeText(c),
          ...(pick[index(i)] ? { paint: pick[index(i)] } : {}),
        }))}
        cursor={cursor}
        erasing={(i, mode) => (mode === "right" ? taking.has(index(i)) : pick[index(i)] === brush)}
        marked={new Set<number>()}
        onContextPick={(i) => {
          setCursor(i);
          takeBack(i);
        }}
        onPick={(i) => {
          setCursor(i);
          if (brush) put(i, brush);
        }}
        paintable
        wrong={new Set(slice.flatMap((_, i) => (taking.has(index(i)) ? [i] : [])))}
      />
    </div>
  );
}
