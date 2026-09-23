# Web-App: Services statt verstreuter Plattenzugriffe (2026-09-23)

`platform/app/lib/` war eine flache Liste von ~120 Modulen. Wer eine Datei einer Aufnahme las oder
schrieb, baute sich den Pfad selbst, und zwei Seiten/Routen gingen direkt an `node:fs`. Ziel:
**jede Datei auf der Platte hat EINEN Besitzer im Code, Routen reden nur mit Services.**

## Schnitt

| Service | Ordner | Besitzt |
|---|---|---|
| SessionStore | `lib/session-store/` | alles unter `data/recordings/<name>/`: `log.jsonl`, `matte.jsonl`, `candidate.json`, `reference.pgn`, `model-reads.jsonl`, `ui-meta.json`, `useless.json`, Bretter/Rasters (`crops`, `stored`, `matte-fix`), die Ledger `corrections`/`reviewed`/`unusable-cells`, dazu `data/labels/review-notes.jsonl` |
| ChainService | `lib/chain/` | die Kette und ihre Jobs: `chain`, `steps`, `run`, `queues`, `drain`, `progress`, `heavy-lock`, `intake`, `backlog`, `adopt-dirty`, `session-delete`, `matte-edit`; die Job-Schlange als `jobs` (Einreihen, Stopp, Ledger-Sicht) mit `slot`, `ledger`, `runners`, `spawn`, `job-log`, `cli-args`, `pack` |
| Ingest | `lib/ingest/` | Handy-Eingang: `ingest` (Inbox, Staging, `transfers.jsonl`), `mp4`, `capture-plan` |
| LabelService | `lib/label/` | Lanes, Strom, Seiten, Karten, Historie — fast alles rein (Client-tauglich) |
| Corpus | `lib/corpus/` | Datensaetze, Pool, Packs, Perf, Provenienz |
| Reports | `lib/reports/` | die READ-ONLY-Berichte unter `data/reports/` (`audit-flags`, `hand-flags`, ...) |
| Kern | `lib/*.ts` | Politik und reine Helfer: `atomic`, `jsonl`, `measurement`, `serialize`, `warp`, `fen`, `classes`, `lcs`, `pgn`, `query`, ... |

Abhaengigkeiten laufen abwaerts: `label`/`corpus`/`reports`/`ingest` -> `session-store` -> Kern;
`chain` darf alle Services lesen. Der Store haengt nicht an der Kette (`lib/service-deps.test.ts`);
`label` tut es noch (`label-stream` -> `chain/queues#recordedAt`, Typen aus `backlog`/`drain`/`chain`).

## Regeln und ihre Waechter

- **Dateinamen einer Aufnahme nennt nur `lib/session-store/`** — `RECORDING_FILES` und
  `recordingFile(name, "log")` in `recordings.ts`. Waechter: `lib/recording-files.test.ts`
  (fand beim Anlegen 16 Stellen in `chain`, `crops`, `pool`, `provenance`, `audit-flags`,
  `jobs` und der Board-Route; alle umgestellt). Seit Runde 2 auch `session.yaml` und die Ordner
  `boards/`, `mattes/` (als Pfad, nicht als Schluessel), und `recordingFile(…, "candidate"|"reference")`
  gilt ausserhalb des Stores als Verstoss: die Lesepolitik steht in `peekCandidate`,
  `hasCandidateFile`, `readReferenceBytes`, `hasReferenceFile`, `writeReferenceOnce`.
- **Der Store meldet, die Kette startet**: `session-store/` importiert nichts aus `chain/`
  (`lib/service-deps.test.ts`). Der Stift fragt den Slot in `chain/matte-edit.ts`, der Store legt
  nur die `.fixed.webp` ab.
- **`app/` greift nicht auf die Platte**: kein `node:fs`, aus `atomic`/`measurement`/`jsonl` nur
  die Fehlerklassen (`Contested`, `isMissing`, `absentOnly`). Waechter: `lib/route-boundary.test.ts`.
  Umgestellt: `POST /api/pgn` (Logik jetzt `session-store/reference.ts#saveReference`), die
  Confirm-Seite (`readReferenceBytes`), die Board-Route (`hasExport`).
- Lesen weiter ueber `lib/jsonl.ts`, Schreiben ueber `lib/atomic.ts` mit Stempel-Riegel,
  ENOENT ueber `lib/measurement.ts` — die Ratschen (`*.txt`) zogen beim Umzug nur die Pfade mit.
- `lib/client-boundary.test.ts` kennt Module jetzt am Pfad unter `lib/` statt am Dateinamen —
  sonst waeren alle Service-Ordner fuer ihn unsichtbar gewesen.

## Wie umgezogen wurde

Umzug, nicht Neuschreiben: Datei verschieben, jeden Import `@/lib/<alt>` und jede Erwaehnung
`lib/<alt>.ts` (Ratschen, Kommentare, Quelltext-Tests) mechanisch umbiegen, keine Re-Export-Schicht.
Tests `<modul>.test.ts` wandern mit, Querschnitts- und Bughunt-Tests bleiben in `lib/`.
Je Schritt `npx vitest run` gruen, je Service eine Gegenprobe (Regel aushebeln -> rot -> zurueck).

## Runde 2 (2026-09-23)

- `chain/jobs.ts` (1106 Zeilen) nach Aufgaben geteilt: `slot` (der gepinnte Slot, `busy`,
  `runningJob`, `whenIdle`, Typ `Job`), `ledger` (`jobs.jsonl` schreiben/lesen, `jobHistory`),
  `runners` (je Job-Art ein Lauf, die zwei Spawner mit `queue.live`), `spawn` (`spawnTool`,
  `killTree`, `runChesslabCapture`), `job-log` (Log-Senke, `refusalOf`, `lastRunOf`, `jobLogTail`),
  `cli-args` (Binaries und Kommandozeilen, von `cli-parity` gehalten), `pack` (`packInputs`,
  `verifyPack`); `jobs` bleibt Einreihen, Stopp und die Ledger-Sicht (187 Zeilen).
- `matte-fix` ohne Kette (`chain/matte-edit.ts`), `chain.ts` liest `candidate.json`/`reference.pgn`
  ueber den Store, `progress.ts` das Handy-`session.yaml` ueber `stored.phoneSessionSeconds`.
- `label/lanes.ts` und `label-stream.ts` bleiben ungeteilt: `lanes` beantwortet eine Frage (was
  zeigt eine Lane), `label-stream` baut einen Strom; ein Schnitt waere kosmetisch.

## Offen fuer die naechste Runde

- `label/` liest aus `chain/` (siehe oben) — `recordedAt` gehoert eher in den Store.
- `chain/chain.ts` nennt `log`/`matte`/`modelReads` weiter ueber `recordingFile` zum Stempeln.
- Ein Service-Eingang je Ordner (`lib/session-store/index.ts`) erst, wenn die Waechter auf den
  Ordner statt auf Dateien zeigen koennen — heute pruefen sie Dateipfade.
- Die Ratschen-Listen tragen weiter Einzeldateien; nach dem Umzug lohnt eine Zaehlung je Service.
- `docs/` ausserhalb dieser Datei nennt vereinzelt alte Pfade (`lib/data.ts`, `lib/lanes.ts`,
  `lib/jobs.ts::packArgs` in `phone-transfer.md` — heute `lib/chain/cli-args.ts`).
