/**
 * Die Flags sind eine Messung, und ihr Alter ist die zweite. `newestInput` machte aus jedem
 * `readdir`/`stat`-Fehler „keine Eingaben" (0), also galten die Flags NIE als veraltet — genau
 * der Befund vom 2026-08-26, nur diesmal lautlos statt fuenf Tage alt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: "stat" | "readdir", file: string, rest: unknown[]) => {
    try {
      fail.on?.(String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
  };
});

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (!file.includes(needle)) return;
    throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

async function fixture(prefix: string): Promise<void> {
  const root = await tempDataRoot(prefix);
  await mkdir(path.join(root, "reports"), { recursive: true });
  await writeFile(
    path.join(root, "reports", "audit-flags.jsonl"),
    JSON.stringify({ session_id: "g", frame: "000001", square: "e4", fen_label: "wP", predicted: "empty", prob: 0.9, margin: 0.5 }) + "\n",
    "utf8",
  );
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  await writeFile(path.join(root, "recordings", "g", "matte.jsonl"), "{}\n", "utf8");
}

async function freshFlags() {
  const { clearMeasurementCache } = await import("@/lib/measurement");
  clearMeasurementCache();
  return (await import("@/lib/audit-flags")).loadAuditFlags();
}

test("ein I/O-Fehler am Aufnahme-Verzeichnis ist kein „keine Eingaben\"", async () => {
  await fixture("auditdir");
  blowUpOn("recordings", "EACCES");
  await expect(freshFlags()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("ein I/O-Fehler auf einer matte.jsonl macht die Flags nicht jung", async () => {
  await fixture("auditstat");
  blowUpOn("matte.jsonl", "EMFILE");
  await expect(freshFlags()).rejects.toThrow(/EMFILE/);
  fail.on = null;
});

test("ein I/O-Fehler auf der Flag-Datei selbst ist keine ungelaufene Messung", async () => {
  await fixture("auditown");
  blowUpOn("audit-flags.jsonl", "EACCES");
  await expect(freshFlags()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("und ohne Aufnahmen bleiben die Flags eine gelaufene Messung", async () => {
  await fixture("auditok");
  fail.on = null;
  const flags = await freshFlags();
  expect(flags.measured && flags.value.rows.length).toBe(1);
});
