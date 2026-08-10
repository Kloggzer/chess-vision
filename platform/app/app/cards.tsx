"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export type GameInfo = {
  name: string;
  title: string | null;
  archived: boolean;
  createdAt: string | null;
  confirmed: boolean;
  confirmedAt: string | null;
  plies: number;
  reviewed: number;
  /** Mainline length of `reference.pgn`, or null — no reference on disk. */
  pgnPlies: number | null;
  total: number;
  done: number;
  source: "pack" | "fixture" | "none";
};

/** ISO timestamps rendered deterministically (no locale) so SSR and client agree. */
const when = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : null);

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

  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm ${
        game.archived ? "opacity-60" : ""
      }`}
    >
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
      <Link className="underline underline-offset-4" href={`/confirm/${game.name}`}>
        confirm
      </Link>
      {game.total > 0 ? (
        <Link className="underline underline-offset-4" href={`/relabel/${game.name}`}>
          relabel
        </Link>
      ) : null}
      <span className="text-muted-foreground">
        {when(game.createdAt) ?? "?"} · {game.plies} plies ·{" "}
        {game.confirmed ? `bestätigt (${game.reviewed} reviewed)` : "unbestätigt"} ·{" "}
        {game.pgnPlies !== null ? `PGN ✓ ${game.pgnPlies}` : "kein PGN"}
      </span>
      {game.total > 0 ? (
        <>
          <span className="text-muted-foreground">
            {game.done}/{game.total}
          </span>
          <span className="bg-muted h-1.5 w-28 overflow-hidden rounded">
            <span
              className="bg-primary block h-full"
              style={{ width: `${Math.round((game.done / game.total) * 100)}%` }}
            />
          </span>
        </>
      ) : null}
      {game.source === "fixture" ? <Badge variant="destructive">fixture</Badge> : null}
      {note ? <Badge variant="destructive">{note}</Badge> : null}
      <span className="text-muted-foreground ml-auto flex items-center gap-3 text-xs">
        <label className="cursor-pointer underline underline-offset-4">
          {game.pgnPlies !== null ? "PGN ersetzen…" : "PGN hochladen…"}
          <input accept=".pgn,.txt" className="hidden" onChange={uploadPgn} type="file" />
        </label>
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
    </li>
  );
}
