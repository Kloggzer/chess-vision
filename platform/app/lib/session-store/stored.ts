/** Android "Stored" recordings: `files/sessions/<id>/` inside a bundle. Ihre Pixel schneidet Python
 *  (`web_cuts.py`); hier bleibt die Dauer, die das Telefon neben das Video schrieb. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { absentOnly } from "@/lib/measurement";
import { gameDir } from "@/lib/session-store/recordings";

const NS_PER_S = 1e9;

/** The duration the phone recorded beside the video (`session.yaml`, newest session that states
 *  one) — the only honest denominator a job's progress has. */
export async function phoneSessionSeconds(name: string): Promise<number | null> {
  const sessions = path.join(gameDir(name), "files", "sessions");
  const entries = await readdir(sessions, { withFileTypes: true }).catch(absentOnly);
  if (entries === null) return null;
  const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  for (const id of ids.sort().reverse()) {
    const text = await readFile(path.join(sessions, id, "session.yaml"), "utf8").catch(absentOnly);
    const ns = /video_duration_ns:\s*(\d+)/.exec(text ?? "");
    if (ns && Number(ns[1]) > 0) return Number(ns[1]) / NS_PER_S;
  }
  return null;
}
