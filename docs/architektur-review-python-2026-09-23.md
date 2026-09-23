# Architektur-Review Python: fuenf Hypothesen, was davon offen ist (2026-09-23)

Quelle: externes Review (Codex). Jeder Befund wurde am Code belegt und mit einem Test festgehalten
(`tests/test_bug_hunt_20260923_architektur.py`, `tests/test_bug_hunt_20260923_mattestand.py`,
`platform/app/lib/chain-mattestand.test.ts`). Entscheidungen: `docs/offene-entscheidungen.md`,
A1–A5.
Die Zahlen sind vom 2026-09-23, gezaehlt auf der Platte.

| # | Befund | Stand |
|---|---|---|
| H2 | Settle-Daten ueberleben eine Geometrie-Reparatur | **offen**, geparkt (0 Faelle) |
| H3 | vier Aktualitaets-Uhren | Matte/Profil behoben; Altbestand und Gegenrichtung offen |
| H4 | Zellregel vor dem Training kopiert | behoben (`cell_rule.py`) |
| H5 | Schreibschutz pro Datei, nicht pro Sessionzustand | behoben (`908b6f78`) |
| H6 | Temporal-Reihenfolge nur in `cli/session.py` | behoben; 63 Frames warten auf einen neuen Pass |

## H2 — Settle-Daten liegen in der Datei, die ihre eigene Quelle veraendert

**Offen** (`test_rewritten_boards_drop_the_settle_measurement`, `xfail`). Nur
`settle_scan_session` raeumt `settle_dev`/`settle_seen`/`settle_left`; `write_boards_session`,
`fit_mesh_session`, `rewarp_boards_session`, `straighten_boards_session` und `adopt_corners` lassen
sie stehen. `chain.ts::exportedSession` haelt die Sprosse `settle-scan` fuer erledigt, sobald EINE
Zeile `settle_dev` traegt — nach einer Geometrie-Reparatur wird sie also uebersprungen. Ein
Re-Export ist sauber (`REPAIRED_KEYS` traegt die Settle-Felder nicht).

Auf der Platte: 0 von 27 Aufnahmen betroffen, keine Geometrie-Reparatur nach einem Settle-Lauf in
der Geschichte der Backups. Geparkt; `fit_mesh_session` schreibt keinen Zeitstempel, eine Reparatur
darueber waere nur im Backup-Vergleich sichtbar.

## H3 — vier Aktualitaets-Mechanismen beantworten dieselbe Frage verschieden

`provenance.session_stamp` (nur `log.jsonl`) stempelt Matte-Zeilen, `pass.json`,
`model-reads.jsonl`; `temporal_flags.source_stamp` (Log, `session.yaml`, Bretter, Profil) stempelt
Scan und Vorschlaege; `training.pack` hat eigene Fingerabdruecke fuer Packs.

- **Behoben:** `pass.json` traegt `_inputs` (`temporal_matte.pass_inputs`): `matte` als `ms:bytes`
  der `matte.jsonl` und `scan` = `source_stamp`. `provenance.check` prueft beides,
  `chain.ts::inputsMoved` prueft `matte`, `session.yaml` und Profil. Getrennter Schluessel, damit
  `_source` seine Form behaelt. Eine Profil-Aenderung macht den Pass jetzt stale wie seinen Scan.
- **Offen, Altbestand:** 0 von 8 554 wirksamen Matte-Zeilen tragen `_source`, kein `pass.json`
  traegt `_inputs` — die Kette meldet "Temporal-Pass: Stand unbekannt"
  (`ChainState.passInputsUnknown`), die Drift-Erkennung der Matte ist fuer den Bestand tot. Hebel:
  `recut-coverage --all` stempelt jede Zeile, ein neuer Pass stempelt `_inputs`.
- **Offen, Gegenrichtung:** jedes Log-Schreiben ohne Geometrie-Aenderung (Web-`unusable`,
  `realgames adopt-dirty`) kippt `session_stamp` und oeffnet `temporal` und `model-read` wieder.
  Kostet Rechenzeit, keine Labels. Ebenso oeffnet jede `matte.jsonl`-Aenderung `temporal`.

## H4 — die Zellregel ist im Training zentral, davor nicht

**Behoben:** `chesslab/cell_rule.py` (torch-frei) haelt `PIECE_VISIBLE_MAX`, `CELL_DARK_MIN` und
`classification_eligible`; `training.occlusion` re-exportiert, `labeling.MATTE_DIRTY` ist dasselbe
Objekt. **Offen, klein:** `matte.close_seams`/`recut_coverage` importieren weiter lokal aus
`training.occlusion`; der torch-Import koennte dort entfallen.

**Offen als Entscheidung (A5):** die Leser vor dem Training (Slice, Position-/Audit-Flags,
Temporal) begruenden "ohnehin maskiert" nur fuer die Vorgabe `hard`. Unter `--coverage-weight soft`
lernt der Kopf 26 357 Matte-Zellen im Band (0,15; 0,6] mit mittlerem Gewicht 0,355, fuer die keine
Karte entsteht; und `MATTE_DIRTY` kennt die Helligkeitsmaske des Verlusts nicht.

## H5 — Schreibschutz pro Datei, nicht pro Sessionzustand

**Behoben** (`908b6f78`): Stempel-Riegel in `_write_log`, `write_session` und
`_filter_matte_frames` — ein langer Lauf, der sein Minuten altes Log ueber ein menschliches
`unusable` schreiben wuerde, bekommt `Contested`. Ein Re-Export traegt `unusable` mit und verweigert,
wenn ein Urteil wegfiele (`--drop-verdicts`). `upsert_proposals` stagt wie `close_seams`: neue
Alphas als `<stem>.tmp.webp`, veroeffentlicht erst nach bestaetigtem Ledger (`_publish_upserts`).
Verloren ging vorher nachweislich kein Urteil.

## H6 — die Temporal-Reihenfolge lebt nur in `cli/session.py`

`cli.session.session_temporal_pass` ist die einzige Stelle, die Scan -> Proposal -> Adopt -> SAM -> Upsert
-> Prune -> Flags -> `pass.json` kennt. **Behoben:** der Pass stempelt seine Eingaben (H3), eine
SAM-Zeile nach dem Pass oeffnet die Temporal-Sprosse wieder.

**Offen, Daten:** 21 von 27 `pass.json` sind von Hand aus den Batch-Logs vom 2026-09-11
zusammengesetzt. **63 Frames in 18 Aufnahmen** tragen in `proposals.jsonl` ein Alpha mit Coverage
ueber 0,15, SAM findet dort nichts, und es gibt keine Upsert-Zeile — genau der Fall, fuer den der
Upsert existiert. Sie gehen heute mit Coverage ~0 ins Training (Coverage-Matte-Falle). Ein neuer
Pass holt sie; verweigert `require_fresh_proposals`, ist erst neu vorzuschlagen.
