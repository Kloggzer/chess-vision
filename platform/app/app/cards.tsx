"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChainActions } from "@/app/chain-actions";
import { UselessButton } from "@/app/useless-button";
import type { ChainState } from "@/lib/chain";
import type { Job } from "@/lib/jobs";

export type GameInfo = {
  name: string;
  title: string | null;
  archived: boolean;
  /** Review PNGs on disk — only counted for bundles with neither video nor candidate. */
  frames: number;
  createdAt: string | null;
  confirmed: boolean;
  confirmedAt: string | null;
  plies: number;
  reviewed: number;
  /** Mainline length of `reference.pgn`, or null — no reference on disk. */
  pgnPlies: number | null;
  /** Boards with proposals and how many carry a human verdict — the primary figure (CONCEPT.md 6.2). */
  boards: number;
  boardsDone: number;
  /** The same in cells, second line: it moves with the producer's thresholds, a board does not. */
  cells: number;
  /** `null` when the sidecar answered: it carries counts, and this figure needs the cell keys. */
  cellsDone: number | null;
  source: "pack" | "fixture" | "none";
  /** Where the board total came from — `fallback` means the sidecar is missing and we counted. */
  read: "sidecar" | "fallback" | "none";
  /** Where this game sits on the label → confirm → export → propose → relabel ladder. */
  chain: ChainState;
  /** The last job this game ran, so a reload still shows what failed and what answers it. */
  lastJob: Job | null;
};

/** ISO timestamps rendered deterministically (no locale) so SSR and client agree. */
const when = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : null);

/**
 * A game the human called useless: the flag, its reason, and the way back.
 *
 * Collapsed on purpose — every control on it would run work on a recording that was judged not
 * worth any, and the one thing that must stay reachable is the undo.
 */
function UselessCard({ game }: { game: GameInfo }) {
  const flag = game.chain.useless;
  return (
    <li className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm opacity-60">
      <span className="font-medium">{game.title ?? game.name}</span>
      {game.title ? <span className="text-muted-foreground font-mono text-xs">{game.name}</span> : null}
      <Badge variant="secondary">nutzlos</Badge>
      <span className="text-muted-foreground text-xs">
        {when(flag?.at ?? null) ?? "?"}
        {flag?.reason ? ` · ${flag.reason}` : ""}
      </span>
      <span className="text-muted-foreground ml-auto text-xs">
        <UselessButton flagged name={game.name} />
      </span>
    </li>
  );
}

/**
 * Bretter oben, Zellen klein darunter — die 57,9-%-Zahl statt der 8,3-%-Zahl (CONCEPT.md 6.2).
 *
 * Jede Zahl trägt ihre Einheit: ein nackter Mischwert aus Brettern und Zellen ist genau der
 * Fehler, den D1 diagnostiziert.
 */
function BoardProgress({ game }: { game: GameInfo }) {
  const pct = Math.round((game.boardsDone / game.boards) * 100);
  return (
    <>
      <span className="text-muted-foreground flex flex-col leading-tight">
        <span>
          {game.boardsDone}/{game.boards} Bretter · {pct} %
        </span>
        <span
          className="text-[11px]"
          title={
            game.read === "fallback"
              ? "aus occluded-proposals.jsonl gezählt — der Producer hat noch keine summary.json geschrieben"
              : "aus occluded-proposals.summary.json — entschiedene Zellen stehen dort nicht drin, Bretter schon"
          }
        >
          {game.cellsDone === null ? game.cells : `${game.cellsDone}/${game.cells}`} Zellen
          {game.read === "fallback" ? " · nachgezählt" : ""}
        </span>
      </span>
      <span className="bg-muted h-1.5 w-28 overflow-hidden rounded">
        <span className="bg-primary block h-full" style={{ width: `${pct}%` }} />
      </span>
    </>
  );
}

export function GameCard({ game }: { game: GameInfo }) {
  const router = useRouter();
  const [note, setNote] = useState("");

  async function post(url: string, body?: string) {
    const res = await fetch(url, { method: "POST", body });
    const answer = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(answer.error ?? res.statusText);
  }

  const act = (work: () => Promise<void>) => () =>
    void work().then(() => {
      setNote("");
      router.refresh();
    }, (e) => setNote(String(e)));

  const saveTitle = (title: string) =>
    act(() => post(`/api/meta/${game.name}`, JSON.stringify({ title })))();

  function uploadPgn(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    act(async () => {
      const replace = game.pgnPlies !== null ? "?replace=1" : "";
      await post(`/api/pgn/${game.name}${replace}`, await file.text());
      input.value = "";
    })();
  }

  if (game.chain.useless) return <UselessCard game={game} />;

  return (
    <li
      className={`border-border flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm ${
        game.archived ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <input
          className="hover:border-border focus:border-border w-52 border-b border-transparent bg-transparent font-medium outline-none"
          defaultValue={game.title ?? ""}
          onBlur={(e) => {
            if ((game.title ?? "") !== e.target.value.trim()) saveTitle(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={game.name}
          title="Anzeigename — leer lassen für den Verzeichnisnamen"
        />
        {game.title ? <span className="text-muted-foreground font-mono text-xs">{game.name}</span> : null}
        <ChainActions name={game.name} state={game.chain} lastJob={game.lastJob} />
        <span className="ml-auto flex items-center gap-3">
          {game.boards > 0 ? <BoardProgress game={game} /> : null}
        </span>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          {when(game.createdAt) ?? "?"} · {game.plies} Halbzüge ·{" "}
          {game.confirmed ? `bestätigt (${game.reviewed} geprüft)` : "unbestätigt"} ·{" "}
          {game.pgnPlies !== null ? `PGN ✓ ${game.pgnPlies}` : "kein PGN"}
        </span>
        {game.chain.step !== "confirm" && game.chain.hasCandidate ? (
          <Link className="underline underline-offset-4" href={`/confirm/${game.name}`}>
            Sichtprüfung
          </Link>
        ) : null}
        {game.cells > 0 && game.chain.step !== "relabel" ? (
          <Link className="underline underline-offset-4" href={`/relabel/${game.name}`}>
            Bretter
          </Link>
        ) : null}
        {game.source === "fixture" ? <Badge variant="destructive">fixture</Badge> : null}
        {note ? <Badge variant="destructive">{note}</Badge> : null}
        <span className="ml-auto flex items-center gap-3">
          <label className="cursor-pointer underline underline-offset-4">
            {game.pgnPlies !== null ? "PGN ersetzen…" : "PGN hochladen…"}
            <input accept=".pgn,.txt" className="hidden" onChange={uploadPgn} type="file" />
          </label>
          <UselessButton flagged={false} name={game.name} />
          <button
            className="cursor-pointer underline underline-offset-4"
            onClick={act(() =>
              post(`/api/meta/${game.name}`, JSON.stringify({ archived: !game.archived })),
            )}
            type="button"
          >
            {game.archived ? "wiederherstellen" : "archivieren"}
          </button>
        </span>
      </div>
    </li>
  );
}
