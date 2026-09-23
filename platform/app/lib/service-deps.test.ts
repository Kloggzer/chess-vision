/** Die erlaubte Richtung zwischen den Services unter `lib/` (`docs/web-architektur.md`): ein
 *  Modul importiert nur aus seinem eigenen Ordner oder aus einer TIEFEREN Schicht, und der
 *  Importgraph hat keinen Zyklus. Importe liest `ts.preProcessFile` — die Form, nicht der Text. */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

const ROOT = path.join(__dirname, "..");

/** Kern <- py <- session-store <- {ingest, reports} <- label <- corpus <- chain. Gleiche Zahl heisst
 *  Geschwister: die duerfen einander NICHT importieren. Ein neuer Ordner muss hier eingetragen werden.
 *  `py` (der Python-Worker) liegt direkt ueber dem Kern: jede Schicht darf Python fragen. */
const RANK: Record<string, number> = {
  kern: 0, py: 1, "session-store": 2, ingest: 3, reports: 3, label: 4, corpus: 5, chain: 6,
};

type Graph = Map<string, string[]>;

const serviceOf = (mod: string) => (mod.split("/").length > 2 ? mod.split("/")[1] : "kern");

function importsIn(text: string): string[] {
  return ts.preProcessFile(text, true, true).importedFiles.map((f) => f.fileName);
}

function graphOf(roots: string[]): Graph {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(rel);
    }
  };
  roots.forEach(walk);
  const mods = new Set(files.map((f) => f.replace(/\.tsx?$/, "")));
  const graph: Graph = new Map();
  for (const file of files) {
    const me = file.replace(/\.tsx?$/, "");
    const targets = importsIn(readFileSync(path.join(ROOT, file), "utf8")).flatMap((spec) => {
      const raw = spec.startsWith("@/") ? spec.slice(2)
        : spec.startsWith(".") ? path.posix.normalize(path.posix.join(path.posix.dirname(me), spec)) : null;
      if (raw === null) return [];
      const mod = raw.replace(/\.tsx?$/, "");
      if (mods.has(mod)) return [mod];
      if (mods.has(`${mod}/index`)) return [`${mod}/index`];
      return !roots.includes(mod.split("/")[0]) && /^(app|components)\//.test(mod) ? [mod] : [];
    });
    graph.set(me, targets);
  }
  return graph;
}

const libGraph = () => graphOf(["lib"]);
/** Die Oberflaeche samt allem, was sie zieht: Seiten und Komponenten importieren nur abwaerts. */
const uiGraph = () => graphOf(["app", "components", "lib"]);

function wrongWay(graph: Graph): string[] {
  const out: string[] = [];
  for (const [from, targets] of graph) {
    const a = serviceOf(from);
    if (!(a in RANK)) out.push(`${from}: Ordner ${a} hat keine Schicht`);
    for (const to of targets) {
      if (!to.startsWith("lib/")) { out.push(`${from} -> ${to}`); continue; }
      const b = serviceOf(to);
      if (a !== b && !(RANK[a] > RANK[b])) out.push(`${from} -> ${to}`);
    }
  }
  return out;
}

/** Tarjan: jede stark zusammenhaengende Komponente mit mehr als einem Modul (oder Selbstschleife). */
function cycles(graph: Graph): string[][] {
  let next = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const out: string[][] = [];
  const visit = (v: string) => {
    index.set(v, next);
    low.set(v, next++);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) !== index.get(v)) return;
    const scc: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      scc.push(w);
    } while (w !== v);
    if (scc.length > 1 || (graph.get(v) ?? []).includes(v)) out.push(scc.sort());
  };
  for (const v of graph.keys()) if (!index.has(v)) visit(v);
  return out;
}

test("lib/ importiert nur abwaerts: Kern <- py <- session-store <- {ingest, reports} <- label <- corpus <- chain", () => {
  expect(wrongWay(libGraph()), "Funktion an den tieferen Ort ziehen, Typ in den gemeinsamen").toEqual([]);
});

test("lib/ hat keinen Importzyklus", () => {
  expect(cycles(libGraph())).toEqual([]);
});

test("der Graph sieht die Service-Ordner und ihre Kanten", () => {
  const graph = libGraph();
  expect(graph.get("lib/chain/queues")).toContain("lib/session-store/recordings");
  expect(new Set([...graph.keys()].map(serviceOf))).toEqual(new Set(Object.keys(RANK)));
});

test("Gegenprobe: statischer, Typ-, Re-Export- und dynamischer Import zaehlen, Kommentar und Text nicht", () => {
  expect(importsIn('import { busy } from "@/lib/chain/slot";')).toEqual(["@/lib/chain/slot"]);
  expect(importsIn("import type { Job } from '@/lib/chain/slot';")).toEqual(["@/lib/chain/slot"]);
  expect(importsIn('export { x } from "@/lib/chain/slot";')).toEqual(["@/lib/chain/slot"]);
  expect(importsIn('const m = await import("@/lib/chain/jobs");')).toEqual(["@/lib/chain/jobs"]);
  expect(importsIn('// import { a } from "@/lib/chain/jobs";\nconst s = "from \'@/lib/chain/x\'";')).toEqual([]);
});

test("Gegenprobe: eine eingepflanzte Rueckkante und ein Zyklus schlagen an", () => {
  const graph = libGraph();
  const plant = (from: string, to: string) => new Map(graph).set(from, [...(graph.get(from) ?? []), to]);
  expect(wrongWay(plant("lib/session-store/recordings", "lib/chain/chain"))).toEqual([
    "lib/session-store/recordings -> lib/chain/chain",
  ]);
  expect(wrongWay(plant("lib/ingest/ingest", "lib/reports/audit-flags"))).toHaveLength(1);
  expect(wrongWay(plant("lib/fen", "lib/label/lanes"))).toHaveLength(1);
  expect(wrongWay(plant("lib/label/lanes", "components/x"))).toHaveLength(1);
  expect(wrongWay(new Map(graph).set("lib/neu/x", []))).toHaveLength(1);
  expect(cycles(plant("lib/session-store/recordings", "lib/chain/queues"))).toHaveLength(1);
  expect(cycles(new Map([["a", ["a"]]]))).toEqual([["a"]]);
});

test("app/ und components/ haben keinen Importzyklus", () => {
  expect(cycles(uiGraph()), "gemeinsame Typen in eine eigene Datei, Komponenten nur abwaerts").toEqual([]);
});

test("Gegenprobe: der Oberflaechen-Graph sieht relative Kanten, und ein eingepflanzter Zyklus schlaegt an", () => {
  const graph = uiGraph();
  expect(graph.get("app/strom/labeln/stream")).toContain("app/strom/labeln/lane-types");
  expect(graph.get("app/strom/labeln/stream")).toContain("components/notice");
  expect(graph.get("app/strom/matte/review")).toContain("app/strom/matte/frame");
  const plant = (from: string, to: string) => new Map(graph).set(from, [...(graph.get(from) ?? []), to]);
  expect(cycles(plant("app/strom/matte/frame", "app/strom/matte/review"))).toHaveLength(1);
  expect(cycles(plant("app/strom/labeln/lane-types", "app/strom/labeln/stream"))).toHaveLength(1);
  expect(cycles(plant("components/notice", "app/strom/labeln/stream"))).toHaveLength(1);
});
