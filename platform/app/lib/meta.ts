/**
 * `data/realgames/<name>/ui-meta.json` — what the UI knows about a game that the pipeline does
 * not: a human-readable title and the archived flag.
 *
 * A separate file ON PURPOSE: `candidate.json` is rewritten wholesale by the desktop `label`
 * verb, so any extra key stored there would be silently dropped on the next replay. Nothing on
 * the Python side reads this file; archiving here hides a game from the UI's lists, it moves no
 * data (that is `data/_parked/`'s job, and a human decision).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gameDir } from "@/lib/data";

export type UiMeta = { title?: string; archived?: boolean };

const FILE = "ui-meta.json";
const TITLE_MAX = 120;

export async function loadMeta(name: string): Promise<UiMeta> {
  try {
    return JSON.parse(await readFile(path.join(gameDir(name), FILE), "utf8")) as UiMeta;
  } catch {
    return {};
  }
}

/** Merge [patch] into the stored meta. An empty title deletes it — the dir name is the fallback. */
export async function saveMeta(name: string, patch: UiMeta): Promise<UiMeta> {
  const next: UiMeta = { ...(await loadMeta(name)) };
  if ("title" in patch) {
    const title = (patch.title ?? "").trim();
    if (title.length > TITLE_MAX) throw new Error(`title longer than ${TITLE_MAX} characters`);
    if (title) next.title = title;
    else delete next.title;
  }
  if ("archived" in patch) {
    if (typeof patch.archived !== "boolean") throw new Error("archived must be a boolean");
    if (patch.archived) next.archived = true;
    else delete next.archived;
  }
  await writeFile(path.join(gameDir(name), FILE), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}
