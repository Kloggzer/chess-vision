"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** The reference PGN, editable in place: a wrong recognised move is corrected HERE, not on a card. */
export function ReferenceEditor({
  name,
  text,
}: {
  name: string;
  text: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(text);
  const [note, setNote] = useState("");

  async function save() {
    setNote("schreibe…");
    const res = await fetch(`/api/pgn/${name}?replace=1`, {
      method: "POST",
      body: draft,
    });
    const body = await res.json();
    if (!res.ok) {
      setNote(`Fehler: ${body.error}`);
      return;
    }
    setNote(
      `${body.plies} Halbzüge gespeichert — die Karten oben zeigen jetzt den Vergleich dagegen`,
    );
    router.refresh();
  }

  return (
    <details className="border-border rounded-lg border px-3 py-2">
      <summary
        className="cursor-pointer text-sm font-medium"
        title="reference.pgn dieser Aufnahme; python-chess prüft die Züge, bevor sie gespeichert werden"
      >
        Referenz korrigieren — die Züge, die wirklich gespielt wurden
      </summary>
      <p className="text-muted-foreground mt-2 text-xs">
        Hat der Tracker einen Zug falsch erkannt, steht der falsche Zug auch in
        dieser Datei, wenn sie vom Handy übernommen wurde. Trage die wirklich
        gespielten Züge ein: der falsche Halbzug landet dann oben bei den
        offenen Karten (verwerfen), der richtige bei {"„fehlend“"}.
      </p>
      <textarea
        className="border-border bg-background mt-2 h-40 w-full rounded-md border p-2 font-mono text-xs"
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        value={draft}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button
          disabled={draft.trim() === text.trim() || draft.trim() === ""}
          onClick={save}
          size="sm"
        >
          reference.pgn speichern
        </Button>
        {note ? (
          <span className="text-muted-foreground text-xs">{note}</span>
        ) : null}
      </div>
    </details>
  );
}
