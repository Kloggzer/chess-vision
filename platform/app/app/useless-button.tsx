"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { readAnswer } from "@/lib/answer";

/**
 * "nutzlos" / "doch brauchbar" — the one control that takes a game out of every queue.
 *
 * The reason is asked for once, on the way in, and a cancelled prompt cancels the whole flag; the
 * undo asks nothing, because a flag that costs a dialog to take back is a flag nobody sets.
 */
export function UselessButton({ name, flagged }: { name: string; flagged: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function click() {
    let reason: string | undefined;
    if (!flagged) {
      const answer = window.prompt(`${name} als nutzlos markieren — Grund (optional)`);
      if (answer === null) return;
      reason = answer;
    }
    setBusy(true);
    setNote(null);
    void fetch(`/api/useless/${name}`, {
      method: "POST",
      body: JSON.stringify({ useless: !flagged, reason }),
    })
      .then(async (res) => {
        await readAnswer(res);
        router.refresh();
      })
      .catch((error: unknown) => setNote(String(error)))
      .finally(() => setBusy(false));
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <button
              className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
              disabled={busy}
              onClick={click}
              type="button"
            >
              {flagged ? "doch brauchbar" : "nutzlos"}
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {flagged
            ? "Flag zurücknehmen — die Kette läuft wieder, die Datei behält beide Zeitstempel"
            : "aus allen Queues nehmen; nichts wird gelöscht (useless.json)"}
        </TooltipContent>
      </Tooltip>
      {note ? <span className="text-destructive">{note}</span> : null}
    </>
  );
}
