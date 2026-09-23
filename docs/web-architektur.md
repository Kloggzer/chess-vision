# Web-App: Services statt verstreuter Plattenzugriffe (2026-09-23)

`platform/app/lib/` war eine flache Liste von ~120 Modulen. Wer eine Datei einer Aufnahme las oder
schrieb, baute sich den Pfad selbst, und zwei Seiten/Routen gingen direkt an `node:fs`. Ziel:
**jede Datei auf der Platte hat EINEN Besitzer im Code, Routen reden nur mit Services.**

## Schnitt

| Service | Ordner | Besitzt |
|---|---|---|
| SessionStore | `lib/session-store/` | alles unter `data/recordings/<name>/`: `log.jsonl`, `matte.jsonl`, `candidate.json`, `reference.pgn`, `model-reads.jsonl`, `ui-meta.json`, `useless.json`, Bretter/Rasters (`crops`, `stored`, `matte-fix`), die Ledger `corrections`/`reviewed`/`unusable-cells`, dazu `data/labels/review-notes.jsonl` |
| ChainService | `lib/chain/` | die Kette und ihre Jobs: `chain`, `steps`, `run`, `queues`, `drain`, `progress`, `jobs`, `heavy-lock`, `intake`, `backlog`, `adopt-dirty`, `session-delete` |
| Ingest | `lib/ingest/` | Handy-Eingang: `ingest` (Inbox, Staging, `transfers.jsonl`), `mp4`, `capture-plan` |
| LabelService | `lib/label/` | Lanes, Strom, Seiten, Karten, Historie — fast alles rein (Client-tauglich) |
| Corpus | `lib/corpus/` | Datensaetze, Pool, Packs, Perf, Provenienz |
| Reports | `lib/reports/` | die READ-ONLY-Berichte unter `data/reports/` (`audit-flags`, `hand-flags`, ...) |
| Kern | `lib/*.ts` | Politik und reine Helfer: `atomic`, `jsonl`, `measurement`, `serialize`, `warp`, `fen`, `classes`, `lcs`, `pgn`, `query`, ... |

Abhaengigkeiten laufen abwaerts: `label`/`corpus`/`reports`/`ingest` -> `session-store` -> Kern;
`chain` darf alle Services lesen. Einzige Rueckkante heute: `session-store/matte-fix.ts` startet
einen Job ueber `chain/jobs` (siehe offene Punkte).

## Regeln und ihre Waechter

- **Dateinamen einer Aufnahme nennt nur `lib/session-store/`** — `RECORDING_FILES` und
  `recordingFile(name, "log")` in `recordings.ts`. Waechter: `lib/recording-files.test.ts`
  (fand beim Anlegen 16 Stellen in `chain`, `crops`, `pool`, `provenance`, `audit-flags`,
  `jobs` und der Board-Route; alle umgestellt).
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

## Offen fuer die naechste Runde

- `session-store/matte-fix.ts` ruft `chain/jobs` — der Job-Start gehoert in `chain`, der Store
  nur das Ablegen der `.fixed.webp`.
- `chain/chain.ts` liest `candidate.json`/`reference.pgn` noch selbst (ueber `recordingFile`);
  die Lesepolitik dafuer sollte als Funktion im Store stehen (`readCandidateText`, ...).
- Ein Service-Eingang je Ordner (`lib/session-store/index.ts`) erst, wenn die Waechter auf den
  Ordner statt auf Dateien zeigen koennen — heute pruefen sie Dateipfade.
- Die Ratschen-Listen tragen weiter Einzeldateien; nach dem Umzug lohnt eine Zaehlung je Service.
- Nicht-JSON-Dateien der Aufnahme (`session.yaml`, `boards/`, `mattes/`) sind noch nicht im
  Namens-Waechter; `chain/progress.ts` liest das `session.yaml` der Handy-Sitzung selbst.
- `docs/` ausserhalb dieser Datei nennt vereinzelt alte Pfade (`lib/data.ts`, `lib/lanes.ts` ...).
