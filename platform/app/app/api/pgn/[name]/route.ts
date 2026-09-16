import { constants } from "node:fs";
import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";
import { Contested, stampOf, writeFileAtomicGuarded } from "@/lib/atomic";
import { gameDir } from "@/lib/data";

function backupName(stamp: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `reference.pgn.bak.${stamp.getFullYear()}${p(stamp.getMonth() + 1)}${p(stamp.getDate())}-` +
    `${p(stamp.getHours())}${p(stamp.getMinutes())}${p(stamp.getSeconds())}`;
}

/** Sicherung wie `lib/frame-flag.ts`: nie ueber eine vorhandene: zwei Ersetzungen in derselben
 *  Sekunde sind einen Klick auseinander, und die ueberschriebene ist die einzige menschliche. */
async function keepCopy(file: string): Promise<string> {
  const base = backupName(new Date());
  let name = base;
  for (let n = 1; n <= 99; n++) {
    const taken = await stat(path.join(path.dirname(file), name)).then(() => true, () => false);
    if (!taken) break;
    name = `${base}-${n}`;
  }
  await copyFile(file, path.join(path.dirname(file), name), constants.COPYFILE_EXCL);
  return name;
}

/** Ein Schreiber je Datei. Zwei Tabs haben sonst beide die Pruefung bestanden und der letzte
 *  gewinnt lautlos — das Urteil des anderen waere weg, ohne dass ihm jemand widersprochen hat. */
const writing = new Set<string>();

/**
 * Upload `reference.pgn` — die Wahrheit, gegen die der Confirm-View urteilt.
 *
 * Geprueft VOR dem Landen, ersetzt nur mit `?replace=1`, gesichert, und erst per tmp+rename
 * umgelegt: ein Abbruch mittendrin liesse sonst die einzige menschliche Referenz halb geschrieben.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const replace = new URL(request.url).searchParams.get("replace") === "1";
  let held: string | null = null;
  try {
    const file = path.join(gameDir(name), "reference.pgn");
    if (writing.has(file)) {
      return Response.json({ error: "reference.pgn is being replaced right now" }, { status: 409 });
    }
    writing.add(file);
    held = file;

    const text = await request.text();
    const chess = new Chess();
    chess.loadPgn(text);
    const plies = chess.history().length;
    if (plies === 0) throw new Error("the PGN holds no moves");

    const before = await stampOf(file);
    if (before !== null && !replace) {
      return Response.json({ error: "reference.pgn exists — replace must be explicit" }, { status: 409 });
    }
    const backup = before === null ? null : await keepCopy(file);
    // Revisionswaechter: der Set oben sieht nur Schreiber DIESES Prozesses, ein Terminal daneben
    // nicht. Was sich seit der Pruefung bewegt hat, wird nicht ueberrannt.
    await writeFileAtomicGuarded(file, text.endsWith("\n") ? text : text + "\n", before,
      "reference.pgn changed under this write");
    return Response.json({ plies, replaced: before !== null, backup });
  } catch (error) {
    if (error instanceof Contested) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: String(error) }, { status: 400 });
  } finally {
    if (held !== null) writing.delete(held);
  }
}
