/**
 * The phone's inbox — a recording arrives over the LAN in the exact shape the USB path produced.
 *
 * The bridge is the LAYOUT, nothing else: what lands here is `filesDir/` off the phone, so a
 * transferred session is byte-for-byte the tree that `adb ... tar cf - files` used to write
 * (`data/recordings/<name>/files/{sessions,games}/...`). Everything downstream — `training-video-pack`,
 * the confirm views, `chesslab slice` — keeps reading what it already read.
 *
 * Transfers are RESUMABLE because the payload is a QHD video: the 2026-08-13 session was 1.0 GB,
 * and a phone that walks out of Wi-Fi mid-upload must not restart it. Every file grows in its own
 * `.partial` inside a staging directory; only a complete, size-checked tree is moved into
 * `recordings/`, so a consumer never sees a half-written session.
 */
import { createWriteStream } from "node:fs";
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, truncate, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { appendRows, writeFileAtomic } from "@/lib/atomic";
import { readJsonl } from "@/lib/jsonl";
import { absentOnly } from "@/lib/measurement";
import { checkName, dataDir } from "@/lib/data";
import { serialize } from "@/lib/serialize";

/** 8 MiB. Big enough that the per-request overhead disappears, small enough to lose little on a drop. */
export const CHUNK_BYTES = 8 * 1024 * 1024;

type IncomingFile = { path: string; bytes: number };
export type Manifest = {
  sessionId: string;
  device?: string;
  files: IncomingFile[];
  /** Free-form note from the phone (game id, result) — recorded in the ledger, never acted on. */
  note?: string;
};

export type TransferRow = {
  ts: string;
  name: string;
  sessionId: string;
  device: string;
  files: number;
  bytes: number;
  /** `landed` = moved into recordings/. `held` = the target already existed, kept in the inbox. */
  status: "landed" | "held";
  target: string;
};

export function inboxDir(): string {
  return path.join(dataDir(), "inbox");
}

function ledgerPath(): string {
  return path.join(inboxDir(), "transfers.jsonl");
}

/**
 * `20260813-193423` -> `2026-08-13-19-34-23`.
 *
 * The recording's own id is the phone's (`collect.py::generate_session_id`), the directory name is
 * what `data/recordings/` has always used. Both survive: the id names the session subtree, the
 * dashed form names the game directory, exactly as the USB copies did.
 */
export function transferName(sessionId: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(sessionId);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}-${m[6]}` : checkName(sessionId, "session id");
}

/**
 * A relative path from the phone, proved to stay inside the tree.
 *
 * The client is an app on the same Wi-Fi, i.e. anything that reached the port. Every segment goes
 * through the same check the rest of the app uses, so a path can neither walk up nor turn absolute.
 */
export function checkRelPath(value: string): string {
  const parts = value.split("/");
  if (parts.length < 2 || parts.length > 4) throw new Error(`bad path depth: ${value}`);
  if (parts[0] !== "sessions" && parts[0] !== "games") throw new Error(`bad path root: ${value}`);
  parts.forEach((part) => checkName(part, "path segment"));
  return parts.join("/");
}

export function validateManifest(body: unknown): Manifest {
  const m = body as Partial<Manifest>;
  if (!m || typeof m !== "object") throw new Error("manifest is not an object");
  const sessionId = checkName(String(m.sessionId), "session id");
  if (!Array.isArray(m.files) || m.files.length === 0) throw new Error("manifest has no files");
  const files = m.files.map((f) => {
    const bytes = Number((f as IncomingFile)?.bytes);
    if (!Number.isInteger(bytes) || bytes < 0) throw new Error(`bad size for ${(f as IncomingFile)?.path}`);
    return { path: checkRelPath(String((f as IncomingFile)?.path)), bytes };
  });
  return { sessionId, device: m.device ? String(m.device).slice(0, 64) : undefined, files, note: m.note ? String(m.note).slice(0, 200) : undefined };
}

function stagingDir(name: string): string {
  return path.join(inboxDir(), checkName(name, "transfer name"));
}

export function targetDir(name: string): string {
  return path.join(dataDir(), "recordings", checkName(name, "transfer name"), "files");
}

/** Groesse, `null` nur wenn die Datei FEHLT. Ein `-1` fuer jeden Fehler liess ein EACCES wie
 *  „nichts da" aussehen, und das Handy lud das Gigabyte neu hoch. */
async function sizeOrAbsent(file: string): Promise<number | null> {
  return (await stat(file).catch(absentOnly))?.size ?? null;
}

async function present(file: string): Promise<boolean> {
  return (await stat(file).catch(absentOnly)) !== null;
}

/**
 * How much of each declared file this machine already holds.
 *
 * The final tree counts as well as the staging one: a session copied over USB, or transferred once
 * already, must not cost a second gigabyte over Wi-Fi. A file only counts when its size MATCHES the
 * declaration — a shorter file is a resume point, a longer one is a different file and the transfer
 * restarts it.
 */
export async function declare(manifest: Manifest): Promise<{ name: string; have: Record<string, number>; chunk: number }> {
  const name = transferName(manifest.sessionId);
  const staging = stagingDir(name);
  await mkdir(staging, { recursive: true });
  await writeFileAtomic(path.join(staging, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const have: Record<string, number> = {};
  for (const file of manifest.files) {
    const landed = await sizeOrAbsent(path.join(targetDir(name), file.path));
    have[file.path] = landed === file.bytes ? file.bytes : await resumePoint(path.join(staging, file.path + ".partial"), file.bytes);
  }
  return { name, have, chunk: CHUNK_BYTES };
}

/**
 * Where a resumed file continues — 0 when the staged bytes OVERSHOOT the declaration.
 * A partial longer than its file is not a resume point but a dead end: the phone seeks past the
 * end, sends nothing, and `complete` refuses the session on every retry, forever.
 */
async function resumePoint(partial: string, bytes: number): Promise<number> {
  const have = await sizeOrAbsent(partial);
  if (have === null || have <= bytes) return have ?? 0;
  await truncate(partial, 0);
  return 0;
}


async function loadManifest(name: string): Promise<Manifest> {
  return validateManifest(JSON.parse(await readFile(path.join(stagingDir(name), "manifest.json"), "utf8")));
}

/**
 * Append one chunk at [offset]. A mismatch is answered with the truth rather than a write:
 * the client seeks to what the server actually has, which is what makes a resume self-correcting.
 */
export async function appendChunk(
  name: string,
  relPath: string,
  offset: number,
  body: ReadableStream<Uint8Array> | null,
): Promise<{ have: number }> {
  const partial = path.join(stagingDir(name), checkRelPath(relPath) + ".partial");
  return serialize(partial, async () => {
    const have = (await sizeOrAbsent(partial)) ?? 0;
    if (offset !== have) throw Object.assign(new Error(`offset ${offset} != ${have}`), { have, conflict: true });
    await mkdir(path.dirname(partial), { recursive: true });
    // Ohne Rumpf entstuende die Datei nie: eine erklaerte 0-Byte-Datei fehlte weiter und `complete`
    // verweigerte die Sitzung auf jedem Versuch.
    await appendFile(partial, "");
    if (body) await pipeline(Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(partial, { flags: "a" }));
    return { have: (await stat(partial)).size };
  });
}

/**
 * Seal the transfer: every declared file at its declared size, `.partial` dropped, tree moved.
 *
 * An existing target is never written into. A session that is already on this machine is a
 * DUPLICATE, and the copy stays in the inbox under its own name — the user's rule is to park, not
 * to delete, and silently merging two trees would produce a session nobody can account for.
 */
export async function complete(name: string): Promise<TransferRow> {
  const manifest = await loadManifest(name);
  const staging = stagingDir(name);
  const missing: { path: string; have: number; want: number }[] = [];
  for (const file of manifest.files) {
    const landed = await sizeOrAbsent(path.join(targetDir(name), file.path));
    if (landed === file.bytes) continue;
    const partial = path.join(staging, file.path + ".partial");
    // Auch die fertige Datei zaehlt: der erste Abschluss benennt jedes `.partial` um, ein
    // Wiederholungsversuch fand danach nichts und meldete "unvollstaendig" — 409 fuer immer,
    // und das Handy laedt alles neu hoch.
    const have = await sizeOrAbsent(partial);
    const done = have === file.bytes ? have : await sizeOrAbsent(path.join(staging, file.path));
    if (done !== file.bytes) missing.push({ path: file.path, have: have ?? 0, want: file.bytes });
  }
  if (missing.length > 0) throw Object.assign(new Error("incomplete transfer"), { missing, conflict: true });

  for (const file of manifest.files) {
    const partial = path.join(staging, file.path + ".partial");
    if ((await sizeOrAbsent(partial)) === file.bytes) await rename(partial, path.join(staging, file.path));
  }

  const target = targetDir(name);
  const exists = await present(target);
  if (!exists) {
    await mkdir(path.dirname(target), { recursive: true });
    await rename(staging, target);
    await rm(path.join(target, "manifest.json"), { force: true });
  }
  const row: TransferRow = {
    ts: new Date().toISOString(),
    name,
    sessionId: manifest.sessionId,
    device: manifest.device ?? "unknown",
    files: manifest.files.length,
    bytes: manifest.files.reduce((sum, f) => sum + f.bytes, 0),
    status: exists ? "held" : "landed",
    target: exists ? staging : target,
  };
  await appendRows(ledgerPath(), [row]);
  return row;
}

export async function transfers(limit = 50): Promise<TransferRow[]> {
  // Nur das FEHLEN der Datei ist harmlos. Eine kaputte Zeile MITTENDRIN still zu
  // ueberspringen verschwiege einen Transfer, den jemand wirklich angestossen hat —
  // und ein `catch` um das ganze Lesen machte daraus "gar keine Transfers".
  const text = (await readFile(ledgerPath(), "utf8").catch(absentOnly)) ?? "";
  const read = readJsonl(text);
  if (read.corrupt > 0) throw new Error(`${read.corrupt} kaputte Zeile(n) im Transfer-Ledger`);
  return (read.rows as unknown as TransferRow[]).slice(-limit).reverse();
}

/**
 * The shared secret, in the file the user can read off the transfers page.
 *
 * Generated on first use rather than demanded up front: an unset token would either lock the phone
 * out of a feature that is supposed to need no attention, or — the worse half — tempt the endpoint
 * into accepting anonymous writes. `CHESSLAB_INGEST_TOKEN` overrides it for a scripted setup.
 */
export async function ingestToken(): Promise<string> {
  const fromEnv = process.env.CHESSLAB_INGEST_TOKEN;
  if (fromEnv) return fromEnv;
  const file = path.join(inboxDir(), "token");
  // Ein unlesbares Token ist kein erster Start: daraus wuerde ein zweites geprägt, das Handy
  // haelt noch das erste, und die Transfers-Seite zeigt keins von beiden.
  const text = (await readFile(file, "utf8").catch(absentOnly))?.trim();
  if (text) return text;
  const token = randomBytes(8).toString("hex");
  await mkdir(inboxDir(), { recursive: true });
  // `wx`: wer zuerst schreibt, gewinnt. Lesen-dann-Schreiben liess zwei gleichzeitige Aufrufer je
  // einen Token erzeugen, der zweite ueberschrieb den ersten — das Handy hielt dann einen, den
  // die Transfers-Seite nicht mehr zeigt.
  try {
    await writeFile(file, token + "\n", { encoding: "utf8", flag: "wx" });
    return token;
  } catch {
    return (await readFile(file, "utf8")).trim();
  }
}

export async function authorized(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const offered = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return offered.length > 0 && offered === (await ingestToken());
}

/**
 * Staging trees that were declared but never completed — what the transfers page calls "in flight".
 *
 * A tree with no `.partial` left is NOT in flight: it is either a parked duplicate (a `held`
 * transfer keeps its copy here on purpose) or a finished one whose files have been renamed. Both
 * showed as "in flight" forever on the first live run, which makes the one number on that page that
 * has to mean something mean nothing.
 */
export async function pending(): Promise<{ name: string; bytes: number; files: number }[]> {
  const entries = (await readdir(inboxDir(), { withFileTypes: true }).catch(absentOnly)) ?? [];
  const names = entries.filter((e) => e.isDirectory() && e.name !== "jobs").map((e) => e.name);
  const out = [];
  for (const name of names) {
    const manifest = await loadManifest(name).catch(absentOnly);
    if (!manifest) continue;
    let bytes = 0;
    let partials = 0;
    for (const file of manifest.files) {
      const have = await sizeOrAbsent(path.join(stagingDir(name), file.path + ".partial"));
      if (have === null) continue;
      partials++;
      bytes += have;
    }
    if (partials > 0) out.push({ name, bytes, files: manifest.files.length });
  }
  return out;
}
