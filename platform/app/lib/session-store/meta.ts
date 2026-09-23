/**
 * `data/recordings/<name>/ui-meta.json` — what the UI knows about a game that the pipeline does
 * not: a human-readable title and the archived flag.
 *
 * A separate file ON PURPOSE: `candidate.json` is rewritten wholesale by the desktop `label`
 * verb, so any extra key stored there would be silently dropped on the next replay. Nothing on
 * the Python side reads this file; archiving here hides a game from the UI's lists, it moves no
 * data (that is `data/_parked/`'s job, and a human decision).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomic";
import { gameDir, recordingFile } from "@/lib/session-store/recordings";
import { serialize } from "@/lib/serialize";

export type UiMeta = { title?: string; archived?: boolean };

const FILE = "ui-meta.json";
const TITLE_MAX = 120;
const ARCHIVED_AT = /^archived_at:\s*(\S.*)$/m;

export async function loadMeta(name: string): Promise<UiMeta> {
  try {
    return JSON.parse(await readFile(path.join(gameDir(name), FILE), "utf8")) as UiMeta;
  } catch (e) {
    // NUR "nicht da" ist leer. Eine kaputte Datei als `{}` zu lesen liess `saveMeta` darauf
    // schreiben und nahm dabei ein gesetztes `archived` mit.
    if ((e as { code?: string })?.code === "ENOENT") return {};
    throw e;
  }
}

/** Merge [patch] into the stored meta. An empty title deletes it — the dir name is the fallback. */
export async function saveMeta(name: string, patch: UiMeta): Promise<UiMeta> {
  const file = path.join(gameDir(name), FILE);
  // Riegel um lesen-aendern-schreiben: Titel und Archiv-Haken gleichzeitig gesetzt liessen den
  // Zweiten den Ersten zurueckdrehen, beide mit 200.
  return serialize(file, async () => {
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
    await writeFileAtomic(file, JSON.stringify(next, null, 2) + "\n");
    return next;
  });
}

/**
 * The PIPELINE's own archive stamp — `session.yaml`'s `archived_at`, written by Python when a
 * recording is retired (2026-08-30-14-33-02: wrong FENs from ply 8). Read as text: the file is
 * YAML, this is one top-level scalar, and the app carries no YAML parser for it.
 */
export async function archivedAt(name: string): Promise<string | null> {
  try {
    const yaml = await readFile(recordingFile(name, "session"), "utf8");
    return ARCHIVED_AT.exec(yaml)?.[1]?.trim() ?? null;
  } catch (e) {
    // Nur ENOENT ist „nie archiviert"; ein EACCES gab eine ausgemusterte Aufnahme wieder zum Labeln frei.
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
    return null;
  }
}

/**
 * Archived at all: two files, two owners, and EITHER retires a game. The UI only ever read its
 * own flag, so a Python-archived recording kept feeding the Stichprobe its 404 crops (2026-09-07).
 */
export async function isArchived(name: string): Promise<boolean> {
  const [meta, at] = await Promise.all([loadMeta(name), archivedAt(name)]);
  return meta.archived === true || at !== null;
}
