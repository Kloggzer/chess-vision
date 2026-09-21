/**
 * Jede Kommandozeile, die die Web-App an `chesslab` schickt, gegen `src/chesslab/cli.py` gehalten.
 *
 * Ein falsch buchstabiertes Verb oder Flag faellt sonst erst im Lauf auf, und der kostet Stunden.
 * Gelesen wird die CLI-Quelle, nicht `--help`: der Test darf nichts starten.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { chesslabArgs, positionFlagsArgs, retimeArgs } from "@/lib/jobs";

const CLI = readFileSync(path.join(__dirname, "../../../src/chesslab/cli.py"), "utf8");

/** `app.add_typer(session_app, name="session")` — das Praefix, unter dem die Verben haengen. */
function groups(): Map<string, string> {
  const found = new Map<string, string>([["app", ""]]);
  for (const m of CLI.matchAll(/app\.add_typer\((\w+),\s*name="([^"]+)"/g)) found.set(m[1], m[2]);
  return found;
}

/** Verb -> die Flags, die seine Signatur deklariert. */
function commands(): Map<string, Set<string>> {
  const prefix = groups();
  const lines = CLI.split(/\r?\n/);
  const out = new Map<string, Set<string>>();
  for (const [index, line] of lines.entries()) {
    const dec = /^@(\w+)\.command\((?:"([^"]+)")?\)/.exec(line);
    if (!dec) continue;
    const group = prefix.get(dec[1]);
    if (group === undefined) continue;
    const def = /^def (\w+)\(/.exec(lines[index + 1] ?? "");
    const verb = dec[2] ?? (def ? def[1].replace(/_/g, "-") : null);
    if (verb === null) continue;
    const flags = new Set<string>();
    for (let i = index + 1; i < lines.length && !/^\) ->/.test(lines[i]); i++) {
      for (const f of lines[i].matchAll(/"(--[a-z0-9][a-z0-9-]*)"/g)) flags.add(f[1]);
    }
    out.set(group ? `${group} ${verb}` : verb, flags);
  }
  return out;
}

const CMDS = commands();

/** `["run", "chesslab", "realgames", "model-read", name, "--model", run]` -> Verb + Flags. */
function parse(args: string[]): { verb: string; flags: string[] } {
  expect(args.slice(0, 2)).toEqual(["run", "chesslab"]);
  const rest = args.slice(2);
  const words = rest.filter((a) => !a.startsWith("--"));
  const known = [2, 1].map((n) => words.slice(0, n).join(" ")).find((v) => CMDS.has(v));
  return { verb: known ?? words.slice(0, 2).join(" "), flags: rest.filter((a) => a.startsWith("--")) };
}

const NAME = "2026-09-21-08-00-00";
const LINES: string[][] = [
  chesslabArgs("export", [NAME]),
  chesslabArgs("adopt-dirty", [NAME]),
  chesslabArgs("settle-scan", [NAME]),
  chesslabArgs("temporal", [NAME]),
  chesslabArgs("model-read", [NAME], { model: "data/runs/p4a-80-clahe" }),
  chesslabArgs("matte", [NAME, "b"], { matte: "reported" }),
  chesslabArgs("matte", [NAME], { matte: "wanted" }),
  chesslabArgs("matte", [NAME], { matte: "limit", limit: 80 }),
  retimeArgs(NAME),
  positionFlagsArgs(),
  // `runChesslabCapture`s eigene Aufrufer — dieselbe CLI, derselbe Preis fuer einen Tippfehler.
  ["run", "chesslab", "occluders", "recut", NAME],
  ["run", "chesslab", "session", "delete", `rg-${NAME}`, "--dry-run"],
  ["run", "chesslab", "session", "delete", `rg-${NAME}`, "--yes"],
];

test("die CLI-Quelle wurde wirklich gelesen", () => {
  expect(CMDS.size).toBeGreaterThan(40);
  expect(CMDS.get("occluders alpha-worker")).toContain("--reported");
});

test("jedes Verb und jedes Flag der Web-App existiert in cli.py", () => {
  for (const args of LINES) {
    const { verb, flags } = parse(args);
    expect(CMDS.has(verb), `${verb} fehlt in cli.py`).toBe(true);
    for (const flag of flags) expect([...(CMDS.get(verb) ?? [])], `${verb} ${flag}`).toContain(flag);
  }
});

test("Gegenprobe: erfundenes Verb und erfundenes Flag fallen durch", () => {
  expect(CMDS.has("realgames export-sessions")).toBe(false);
  expect([...(CMDS.get("occluders alpha-worker") ?? [])]).not.toContain("--report");
});
