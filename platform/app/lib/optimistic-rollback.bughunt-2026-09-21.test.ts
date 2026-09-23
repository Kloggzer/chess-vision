import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/** Wer eine Karte VOR dem POST ausblendet, holt sie beim Fehlschlag zurueck — sonst zeigt die Lane einen Erfolg ohne Urteil. */
const HIDERS = ["setThrown", "setDropped", "setReported", "setCommitted"] as const;

/** Beide Stroeme, nicht nur der gelabelte: `zuege/stream.tsx` trug dieselbe Form auf `throwOut`. */
const STREAMS = ["labeln", "zuege"] as const;

/** Auf die FORM, nicht die Schreibweise: `post<{ dequeued: boolean }>(…)` traegt kein `post(`. */
const POST = /\bpost\s*(?:<[^(]*>)?\(/;

function functions(source: string): { name: string; body: string }[] {
  const head = /^ {2}(?:(?:async )?function (\w+)|const (\w+) = useCallback)/gm;
  const marks = [...source.matchAll(head)].map((m) => ({ at: m.index, name: m[1] ?? m[2] }));
  return marks.map((m, i) => ({ name: m.name, body: source.slice(m.at, marks[i + 1]?.at ?? source.length) }));
}

function offencesIn(source: string): string[] {
  const offences: string[] = [];
  for (const { name, body } of functions(source)) {
    const tryAt = body.indexOf("try {");
    const catchAt = body.indexOf("catch (");
    if (tryAt < 0 || catchAt < tryAt) continue;
    if (!POST.test(body.slice(tryAt, catchAt))) continue;
    for (const setter of HIDERS) {
      if (!body.slice(0, tryAt).includes(setter)) continue;
      if (!body.slice(catchAt).includes(setter)) offences.push(`${name}: ${setter} ohne Ruecknahme im catch`);
    }
  }
  return offences;
}

/** Gegenprobe: `includes("post(")` sah den generischen Aufruf bis 2026-09-21 nicht, und `back()` stand genau so da. */
test("der Erkenner sieht die Form auch bei `post<T>(…)`", () => {
  const planted = [
    "  async function back() {",
    "    setCommitted((c) => without(c, i));",
    "    try {",
    "      await post<{ dequeued: boolean }>(`/api/x`, {});",
    "    } catch (error) {",
    "      setNote(String(error));",
    "    }",
    "  }",
  ].join("\n");
  expect(offencesIn(planted)).toEqual(["back: setCommitted ohne Ruecknahme im catch"]);
});

test.each(STREAMS)("jede optimistische Ausblendung in %s/stream.tsx rollt im catch zurueck", async (lane) => {
  const source = await readFile(path.join(process.cwd(), "app", "strom", lane, "stream.tsx"), "utf8");
  expect(offencesIn(source), lane).toEqual([]);
});
