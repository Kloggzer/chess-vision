/** `ui-meta.json` — title and archived flag, a separate file ON PURPOSE: the desktop `label` verb
 *  rewrites `candidate.json` wholesale and would drop any extra key. Archiving here only hides a
 *  game from the UI's lists; it moves no data. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomic";
import { BadRequest } from "@/lib/http-error";
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
      if (title.length > TITLE_MAX) throw new BadRequest(`title longer than ${TITLE_MAX} characters`);
      if (title) next.title = title;
      else delete next.title;
    }
    if ("archived" in patch) {
      if (typeof patch.archived !== "boolean") throw new BadRequest("archived must be a boolean");
      if (patch.archived) next.archived = true;
      else delete next.archived;
    }
    await writeFileAtomic(file, JSON.stringify(next, null, 2) + "\n");
    return next;
  });
}

/** The PIPELINE's own archive stamp, `session.yaml`'s `archived_at`. Read as text: one top-level
 *  scalar, and the app carries no YAML parser. */
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

/** Two files, two owners, and EITHER retires a game — reading only the UI flag let a Python-archived
 *  recording keep feeding the Stichprobe 404 crops. */
export async function isArchived(name: string): Promise<boolean> {
  const [meta, at] = await Promise.all([loadMeta(name), archivedAt(name)]);
  return meta.archived === true || at !== null;
}
