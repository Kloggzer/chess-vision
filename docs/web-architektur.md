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
| Kern | `lib/*.ts` | Politik und reine Helfer: `atomic`, `jsonl`, `measurement`, `serialize`, `warp`, `fen`, `classes`, `query`, ... |
| py | `lib/py/` | der warme Python-Worker (`worker.ts`) und seine reinen Ops (`ops.ts`) |

Abhaengigkeiten laufen abwaerts, festgeschrieben seit Runde 3 (`lib/service-deps.test.ts`):
**Kern <- py (Python-Worker, `docs/web-ruft-python.md`) <- session-store <- {ingest, reports} <- label <- corpus <- chain <- app.** Ein Modul
importiert aus seinem eigenen Ordner oder aus einer tieferen Schicht; `ingest` und `reports` sind
Geschwister und kennen einander nicht; `lib/` importiert nichts aus `app/`/`components/`; ein
neuer Ordner unter `lib/` braucht eine Schicht. Derselbe Waechter verbietet Importzyklen in `lib/`,
seit Runde 4 auch ueber `app/` und `components/` (samt dem, was sie aus `lib/` ziehen).

**Fachregeln rechnet Python, nicht die Web-App** (`docs/web-ruft-python.md`, Stand Schritt 3): LCS,
Referenz und Bestaetigung, Kettenstand (`chain_status`: Export, Matte-Census, Herkunftsstempel,
`confirmedAgainst`), Zulassung im Strom (`admission`: `frame_dirty`, `classification_eligible`) und der
Korpus-Pool. Die Services lesen dafuer nicht selbst, sie fragen den Worker — gebuendelt je Seite.

## Regeln und ihre Waechter

- **Dateinamen einer Aufnahme nennt nur `lib/session-store/`** — `RECORDING_FILES` und
  `recordingFile(name, "log")` in `recordings.ts`. Waechter: `lib/recording-files.test.ts`
  (fand beim Anlegen 16 Stellen in `chain`, `crops`, `pool`, `provenance`, `audit-flags`,
  `jobs` und der Board-Route; alle umgestellt). Seit Runde 2 auch `session.yaml` und die Ordner
  `boards/`, `mattes/` (als Pfad, nicht als Schluessel), und `recordingFile(…, "candidate"|"reference")`
  gilt ausserhalb des Stores als Verstoss: die Lesepolitik steht in `peekCandidate`,
  `hasCandidateFile`, `readReferenceBytes`, `hasReferenceFile`, `writeReferenceOnce`.
- **Abwaerts und zyklenfrei**: die Schichtfolge oben, gelesen mit `ts.preProcessFile` (statisch,
  `import type`, Re-Export, dynamisch; Kommentar und Text nicht). Gegenprobe im Test: eine
  eingepflanzte Rueckkante, ein Geschwister-Import, Kern -> Service, `lib` -> `components`, ein
  Ordner ohne Schicht und ein Zyklus schlagen je an (`lib/service-deps.test.ts`).
- **Der Store meldet, die Kette startet**: `session-store/` importiert nichts aus `chain/`. Der Stift fragt den Slot in `chain/matte-edit.ts`, der Store legt
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

## Runde 3 (2026-09-23)

- Rueckkanten `label -> chain` aufgeloest: `recordedAt` (ein Name, keine Kette) nach
  `session-store/recordings.ts`; `JobStep`/`JOB_STEPS`/`isJobStep`/`DrainTarget` in den Kern
  (`lib/job-steps.ts`, rein, client-tauglich — `step-lane` fuehrt damit keine Kopie der
  Reihenfolge mehr); `referenceOrigin` samt Typ `ReferenceOrigin` in `session-store/reference.ts`
  (liest nur die Aufnahme). `chain -> label` (`backlog` -> `zuege#EXPORT_HOLD_MS`) und
  `corpus -> label` (`liveGames`) sind erlaubt und bleiben.
- Zyklen: `lib/` hatte keinen (Tarjan ueber alle Nicht-Test-Module), der Waechter haelt es so.
- Logik aus `app/` in Services: `gameInfo` stand zweimal (`app/page.tsx`, `app/game/[name]`),
  jetzt `lib/chain/game-info.ts` mit dem Typ `GameInfo` — die Kopie auf `/game/<name>` las nur
  `ui-meta.json` und zeigte einen von Python archivierten Lauf als aktiv (roter Test in
  `lib/page-services.test.ts`, jetzt `isArchived` wie `/`). LCS + Karten + Galerie standen in
  `/confirm/<name>` und `/strom/zuege`: jetzt `review-cards.ts#reviewOf` (rein) und
  `label/review-read.ts` (`confirmReview`, `streamGame`); der Strom verwirft das Handy-PGN weiter,
  die Confirm-Seite nicht. Die Props der Seiten sind vor dem Umzug in `lib/page-services.test.ts`
  festgehalten worden.

## Runde 4 (2026-09-23)

- Zyklen in `app/` aufgeloest: `Verdict`/`Flush`/`LaneActions` stehen in
  `app/strom/labeln/lane-types.ts`, von dem `stream` und die vier Renderer abhaengen — `stream`
  importiert die Renderer, keiner mehr `stream`. `matte/frame` holt `MatteVerdict` aus
  `lib/label/matte-page.ts` statt ueber den Re-Export von `review`. Waechter:
  `lib/service-deps.test.ts` (Tarjan ueber `app/`+`components/`+`lib/`; Gegenprobe: je ein
  eingepflanzter Zyklus in `matte`, `labeln` und `components -> app` schlaegt an; gegen den alten
  Stand rot mit genau den zwei Zyklen).
- Doppelte Client-Helfer zu einem, je mit Paritaetstest gegen die woertlich kopierte alte Fassung:
  `postJson` in `lib/answer.ts` (sechs gleiche `post`-Kopien in `labeln/stream`, `matte/frame`,
  `matte/review`, `zuege/stream`, `historie/history-view`, `session-delete`; `cards` und
  `useless-button` lesen ueber `readAnswer`) — `lib/post-json.test.ts`. `inField`/`pageKey` in
  `lib/keys.ts` (der Eingabefeld- und Modifier-Waechter aus fuenf Tastatur-Handlern) —
  `lib/keys.test.ts`. `components/square-ring.tsx` (Ring um ein Feld, Handy-Sortierung und
  Brett-Lupe) — `lib/square-ring.test.ts` vergleicht das Markup per `renderToStaticMarkup`.
  `laneCellKey` in `lib/label/lanes.ts` (Zelllane, Handy-Sortierung) — `lib/lane-cell-key.test.ts`.
- `gameInfo` faengt `loadCandidate` weiter blank ab: kein Befund. Den Knopf setzt `chainState`, das
  `candidate.json` ueber `peekCandidate` liest — EACCES wirft die ganze Karte, halb geschrieben
  heisst `confirm`, nie `label`; `runLabel` prueft `hasCandidateFile` selbst und ueberschreibt nie.
  Festgehalten in `lib/chain/game-info.test.ts` (Gegenprobe: `peekCandidate` mit blankem Fang -> rot).

## Offen fuer die naechste Runde

- Die Tastatur-Registrierung ueber einen Ref (`labeln/stream`, `zuege/stream`) steht zweimal;
  ohne DOM-Testbibliothek nicht absicherbar, deshalb geblieben. `FailureLine`, `MissingBox` und
  `JobBadge` sind je EINE Komponente (`components/`); `crop-grid.tsx` hat noch einen eigenen
  "Crop fehlt"-Kasten, die Kopfleisten in `app/strom/**` sind leicht auseinandergelaufen.
- `chain/chain.ts` nennt `log`/`matte`/`modelReads` weiter ueber `recordingFile` zum Stempeln.
- Ein Service-Eingang je Ordner (`lib/session-store/index.ts`) erst, wenn die Waechter auf den
  Ordner statt auf Dateien zeigen koennen — heute pruefen sie Dateipfade.
- Die Ratschen-Listen tragen weiter Einzeldateien; nach dem Umzug lohnt eine Zaehlung je Service.
- `docs/` ausserhalb dieser Datei nennt vereinzelt alte Pfade (`lib/data.ts`, `lib/lanes.ts`,
  `lib/jobs.ts::packArgs` in `phone-transfer.md` — heute `lib/chain/cli-args.ts`).
