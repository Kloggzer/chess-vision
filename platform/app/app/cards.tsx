"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChainActions } from "@/app/chain-actions";
import { ListRow } from "@/components/list-row";
import { Notice } from "@/components/notice";
import { SessionDelete } from "@/components/session-delete";
import { UselessButton } from "@/app/useless-button";
import type { GameInfo } from "@/lib/chain/game-info";
import { when as localWhen } from "@/lib/when";

/** ISO timestamps rendered deterministically (no locale) so SSR and client agree. */
const when = (iso: string | null) => localWhen(iso) || null;

/**
 * A game the human called useless: the flag, its reason, and the way back.
 *
 * Collapsed on purpose — every control on it would run work on a recording that was judged not
 * worth any, and the one thing that must stay reachable is the undo.
 */
function UselessCard({ game }: { game: GameInfo }) {
  const flag = game.chain.useless;
  return (
    <ListRow dim>
      <span className="font-medium">{game.title ?? game.name}</span>
      {game.title ? (
        <span className="text-muted-foreground font-mono text-xs">
          {game.name}
        </span>
      ) : null}
      <Badge variant="secondary">nutzlos</Badge>
      <span className="text-muted-foreground text-xs" suppressHydrationWarning>
        {when(flag?.at ?? null) ?? "?"}
        {flag?.reason ? ` · ${flag.reason}` : ""}
      </span>
      <span className="text-muted-foreground ml-auto text-xs">
        <UselessButton flagged name={game.name} />
      </span>
    </ListRow>
  );
}

/** Bretter sind die Einheit, die ein Mensch abarbeitet; die Zellen stehen im Tooltip (CONCEPT.md 6.2). */
function BoardProgress({ game }: { game: GameInfo }) {
  if (!game.modelRead) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground text-xs">
            noch nicht vom Modell gelesen
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Der Fortschritt zählt Bretter, in denen das Modell falsch lag. Ohne
          „Modell prüfen lassen“ gibt es nichts zu zählen — nicht gemessen,
          nicht null.
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Progress
      done={game.boardsDone}
      title={`${game.cellsDone}/${game.cells} Zellen, die das Modell falsch las und ein Mensch prüft`}
      total={game.boards}
      unit="Bretter"
    />
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
    void work().then(
      () => {
        setNote("");
        router.refresh();
      },
      (e) => setNote(String(e)),
    );

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
    <ListRow dim={game.archived} id={game.name}>
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <input
              className="hover:border-border focus:border-border w-52 border-b border-transparent bg-transparent font-medium outline-none"
              defaultValue={game.title ?? ""}
              onBlur={(e) => {
                if ((game.title ?? "") !== e.target.value.trim())
                  saveTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder={game.name}
            />
          </TooltipTrigger>
          <TooltipContent>
            Anzeigename — leer lassen für den Verzeichnisnamen
          </TooltipContent>
        </Tooltip>
        {game.title ? (
          <span className="text-muted-foreground font-mono text-xs">
            {game.name}
          </span>
        ) : null}
        <ChainActions
          name={game.name}
          state={game.chain}
          lastJob={game.lastJob}
          showWhat={false}
        />
        <span className="ml-auto flex items-center gap-3">
          <BoardProgress game={game} />
        </span>
      </div>
      <div className="text-muted-foreground flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="tabular-nums" suppressHydrationWarning>
              {when(game.createdAt) ?? "?"} · {game.plies} Halbzüge
              {game.confirmed ? " ✓" : ""} ·{" "}
              {game.pgnPlies !== null ? `PGN ${game.pgnPlies}` : "kein PGN"}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {game.confirmed
              ? `bestätigt · ${game.reviewed} von ${game.plies} Halbzügen geprüft`
              : "unbestätigt"}
          </TooltipContent>
        </Tooltip>
        {game.chain.step !== "confirm" && game.chain.hasCandidate ? (
          <Link
            className="hover:text-foreground"
            href={`/confirm/${game.name}`}
          >
            Züge prüfen
          </Link>
        ) : null}
        {game.cells > 0 && game.chain.step !== "labeln" ? (
          <Link className="hover:text-foreground" href="/strom/labeln">
            Zellen labeln
          </Link>
        ) : null}
        {/* Ruhig, bis die Karte gebraucht wird: drei Textlinks je Zeile sind auf zwölf Karten eine Wand. */}
        <span className="ml-auto flex items-center gap-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
          <label className="hover:text-foreground cursor-pointer">
            {game.pgnPlies !== null ? "PGN ersetzen…" : "PGN hochladen…"}
            <input
              accept=".pgn,.txt"
              className="hidden"
              onChange={uploadPgn}
              type="file"
            />
          </label>
          <UselessButton flagged={false} name={game.name} />
          <button
            className="hover:text-foreground cursor-pointer"
            onClick={act(() =>
              post(
                `/api/meta/${game.name}`,
                JSON.stringify({ archived: !game.archived }),
              ),
            )}
            type="button"
          >
            {game.archived ? "wiederherstellen" : "archivieren"}
          </button>
          {game.chain.hasSession ? (
            <SessionDelete sessionId={game.sessionId} />
          ) : null}
        </span>
      </div>
      {note ? <Notice tone="error">{note}</Notice> : null}
    </ListRow>
  );
}
