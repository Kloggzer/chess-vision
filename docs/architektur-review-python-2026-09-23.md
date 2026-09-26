# Architektur-Review Python: fuenf Hypothesen, was davon offen ist (2026-09-23)

Quelle: externes Review (Codex). Jeder Befund wurde am Code belegt und mit einem Test festgehalten
(`tests/test_bug_hunt_20260923_architektur.py`, `tests/test_bug_hunt_20260923_mattestand.py`;
die Web-Seite rechnet seit `docs/web-ruft-python.md` Schritt 2 in `chain_state`). Entscheidungen: `docs/offene-entscheidungen.md`,
A1–A5.
Die Zahlen sind vom 2026-09-23, gezaehlt auf der Platte.

| # | Befund | Stand |
|---|---|---|
| H2 | Settle-Daten ueberleben eine Geometrie-Reparatur | **offen**, geparkt (0 Faelle) |
| H3 | vier Aktualitaets-Uhren | Matte/Profil behoben; Altbestand und Gegenrichtung offen |
| H4 | Zellregel vor dem Training kopiert | behoben (`cell_rule.py`); A5 offen |
| H5 | Schreibschutz pro Datei, nicht pro Sessionzustand | behoben (`908b6f78`) |
| H6 | Temporal-Reihenfolge nur in `cli/session.py` | behoben; 63 Frames warten auf einen neuen Pass |

## H2 — Settle-Daten liegen in der Datei, die ihre eigene Quelle veraendert

**Offen** (`test_rewritten_boards_drop_the_settle_measurement`, `xfail`). Nur
`settle_scan_session` raeumt `settle_dev`/`settle_seen`/`settle_left`; `write_boards_session`,
`fit_mesh_session`, `rewarp_boards_session`, `straighten_boards_session` und `adopt_corners` lassen
sie stehen. `chain_state` (`settled`) haelt die Sprosse `settle-scan` fuer erledigt, sobald EINE
Zeile `settle_dev` traegt — nach einer Geometrie-Reparatur wird sie also uebersprungen. Ein
Re-Export ist sauber (`REPAIRED_KEYS` traegt die Settle-Felder nicht).

Auf der Platte: 0 von 27 Aufnahmen betroffen, keine Geometrie-Reparatur nach einem Settle-Lauf in
der Geschichte der Backups. Geparkt; `fit_mesh_session` schreibt keinen Zeitstempel, eine Reparatur
darueber waere nur im Backup-Vergleich sichtbar.

## H3 — vier Aktualitaets-Mechanismen beantworten dieselbe Frage verschieden

`provenance.session_stamp` (nur `log.jsonl`) stempelt Matte-Zeilen, `pass.json`,
`model-reads.jsonl`; `temporal_flags.source_stamp` (Log, `session.yaml`, Bretter, Profil) stempelt
Scan und Vorschlaege; `training/packs.py` hat eigene Fingerabdruecke fuer Packs.

- **Behoben:** `pass.json` traegt `_inputs` (`temporal_matte.pass_inputs`): `matte` als `ms:bytes`
  der `matte.jsonl` und `scan` = `source_stamp`. Getrennter Schluessel, damit `_source` seine Form
  behaelt. Eine Profil-Aenderung macht den Pass jetzt stale wie seinen Scan.
- **Zusammengefuehrt (2026-09-24):** `provenance` ist die EINE Rechenschicht: `version`
  (`(mtime_ns, Groesse)`, privat), `memo` (Prozess-Caches in `chain_state`, `stream_admission`,
  `corpus_pool`, `manifest_cache`), `file_stamp`/`ms_stamp`/`same_file` (gespeichertes `ms:bytes`,
  auch `ledgers.json` der Packs) und `inputs_moved`. `check` und die Kette (`chain_state.pass_state`)
  urteilen ueber `_inputs` jetzt gleich: Bretter werden nicht ge-`stat`et, das Log deckt sie
  (`tests/test_freshness.py`). Vorher prueften sie verschieden, `ioutil.mtime_size` ist weg.
- **Bewusst getrennt, weil sie anderes messen:**

  | Mechanismus | misst | gespeichert | Vergleich |
  |---|---|---|---|
  | `_source.log`, `_inputs.matte`, `ledgers.json` | mtime (ms) + Bytes | `ms:bytes` | ms +-1, Bytes exakt |
  | `temporal_flags.source_stamp` | Log, `session.yaml`, JEDES Brett, Profil: Bytes + mtime_ns | `[name, Bytes, ns]` | Liste exakt |
  | Pack-`crop_fingerprint` | 256 Stichproben-Crops: `st_mtime` (float s) + Bytes; Altpacks: mtime der Memmap | `{pfad: [s, Bytes]}` | exakt bzw. Uhrvergleich |
  | Prozess-Caches (`memo`) | `(mtime_ns, Bytes)` | nie | exakt |
  | `ioutil.stamp_of` (`Contested`) | Bytes + SHA-256 des Inhalts | nie | exakt |

  Der Scan-Stempel muss Bretter tragen (die Flags messen sie); der Pack-Fingerabdruck steht als
  float-Sekunden in jedem alten Pack, eine Umrechnung aus ns ist nicht bitgleich; `Contested`
  braucht den Inhalt, weil zwei Schreiber im selben Takt dieselbe mtime tragen.
- **Offen, Altbestand:** 0 von 8 554 wirksamen Matte-Zeilen tragen `_source`, kein `pass.json`
  traegt `_inputs` — die Kette meldet "Temporal-Pass: Stand unbekannt"
  (`ChainState.passInputsUnknown`), die Drift-Erkennung der Matte ist fuer den Bestand tot. Hebel:
  `recut-coverage --all` stempelt jede Zeile, ein neuer Pass stempelt `_inputs`.
- **Offen, Gegenrichtung:** jedes Log-Schreiben ohne Geometrie-Aenderung (Web-`unusable`,
  `realgames adopt-dirty`) kippt `session_stamp` und oeffnet `temporal` und `model-read` wieder.
  Kostet Rechenzeit, keine Labels. Ebenso oeffnet jede `matte.jsonl`-Aenderung `temporal`.

## H4 — die Zellregel ist im Training zentral, davor nicht

**Behoben:** `chesslab/cell_rule.py` (torch-frei) haelt `PIECE_VISIBLE_MAX`, `CELL_DARK_MIN` und
`classification_eligible`; `matte.py` importiert nichts mehr aus `training/`.

**Offen als Entscheidung (A5):** die Leser vor dem Training (Slice, Position-/Audit-Flags,
Temporal) begruenden "ohnehin maskiert" nur fuer die Vorgabe `hard`. Unter `--coverage-weight soft`
lernt der Kopf 26 357 Matte-Zellen im Band (0,15; 0,6] mit mittlerem Gewicht 0,355, fuer die keine
Karte entsteht; und `PIECE_VISIBLE_MAX` kennt die Helligkeitsmaske des Verlusts nicht.

## H5 — Schreibschutz pro Datei, nicht pro Sessionzustand

**Behoben** (`908b6f78`): Stempel-Riegel in `_write_log`, `write_session` und
`_filter_matte_frames` — ein langer Lauf, der sein Minuten altes Log ueber ein menschliches
`unusable` schreiben wuerde, bekommt `Contested`. Ein Re-Export traegt `unusable` mit und verweigert,
wenn ein Urteil wegfiele (`--drop-verdicts`). `upsert_proposals` stagt wie `close_seams`; seit
`fce9821d` ueber `matte_publish` (`docs/session-mattes.md` §3).
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
