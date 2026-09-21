/**
 * Pythons `locks._claim` legt `heavy.lock` mit `O_EXCL` LEER an und schreibt den Inhalt erst
 * danach. In diesem Fenster las `readLockSync` sie als unlesbar — und unlesbar galt als
 * verwaist: die Datei wurde geloescht und der Slot dem LAUFENDEN Prozess weggenommen. Genau
 * die drei SAM-Worker auf einer GPU (2026-08-19), die das Lock verhindern soll.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import { claimHeavyLock, heavyLockPath, releaseHeavyLock } from "@/lib/heavy-lock";
import { tempDataRoot } from "@/lib/test-fixtures";

beforeEach(async () => {
  await tempDataRoot("lock-unreadable");
  await mkdir(path.dirname(heavyLockPath()), { recursive: true });
});

describe.each([
  ["die leer angelegte Datei im O_EXCL-Fenster", ""],
  ["eine halb geschriebene Zeile", '{"pid": 4242, "job": "ma'],
  ["etwas, das kein Lock-Objekt ist", "[1, 2, 3]"],
])("%s", (_what, content) => {
  test("haelt den Slot und wird nicht weggeraeumt", async () => {
    await writeFile(heavyLockPath(), content, "utf8");

    const claim = await claimHeavyLock("matte", "meine-partie");

    expect("held" in claim).toBe(false);
    // Der Grund gehoert in die Absage: ohne ihn steht der Nutzer vor einem 409 ohne Datei-Namen.
    expect("blocked" in claim && claim.blocked).toContain("heavy.lock");
    expect(await readFile(heavyLockPath(), "utf8")).toBe(content);
  });

  test("release raeumt nur weg, was es zuordnen kann", async () => {
    await writeFile(heavyLockPath(), content, "utf8");
    await releaseHeavyLock();
    expect(existsSync(heavyLockPath())).toBe(true);
  });
});
