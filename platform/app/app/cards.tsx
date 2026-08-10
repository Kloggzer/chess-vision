"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      className={`border-border space-y-2 rounded-lg border p-3 ${game.archived ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="border-border bg-background min-w-56 rounded border px-2 py-1 font-medium"
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
        <span className="text-muted-foreground font-mono text-xs">{game.name}</span>
        {game.archived ? <Badge variant="secondary">archiviert</Badge> : null}
        {game.source === "fixture" ? <Badge variant="destructive">fixture</Badge> : null}
        <Button
          className="ml-auto"
          onClick={act(() =>
            post(`/api/meta/${game.name}`, JSON.stringify({ archived: !game.archived })),
          )}
          size="sm"
          variant="outline"
        >
          {game.archived ? "wiederherstellen" : "archivieren"}
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {game.createdAt ? <span>aufgenommen {when(game.createdAt)}</span> : null}
        <span>{game.plies} plies</span>
        <span>
          {game.confirmed
            ? `bestätigt ${when(game.confirmedAt) ?? ""} · ${game.reviewed} reviewed`
            : "unbestätigt"}
        </span>
        {game.pgnPlies !== null ? (
          <span className="text-foreground">PGN ✓ {game.pgnPlies} Züge</span>
        ) : (
          <span>kein PGN</span>
        )}
        <label className="cursor-pointer underline underline-offset-4">
          {game.pgnPlies !== null ? "PGN ersetzen…" : "PGN hochladen…"}
          <input accept=".pgn,.txt" className="hidden" onChange={uploadPgn} type="file" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="underline underline-offset-4" href={`/confirm/${game.name}`}>
          confirm
        </Link>
        {game.total > 0 ? (
          <>
            <Link className="underline underline-offset-4" href={`/relabel/${game.name}`}>
              relabel
            </Link>
            <span className="text-muted-foreground">
              {game.done} von {game.total} proposals entschieden
            </span>
            <span className="bg-muted h-2 w-40 overflow-hidden rounded">
              <span
                className="bg-primary block h-full"
                style={{ width: `${Math.round((game.done / game.total) * 100)}%` }}
              />
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">keine occluded proposals</span>
        )}
        {note ? <Badge variant="destructive">{note}</Badge> : null}
      </div>
    </li>
  );
}
