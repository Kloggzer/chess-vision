# Architektur-Review Python: fuenf Codex-Hypothesen am Code geprueft (2026-09-23)

Quelle: externes Review (Codex, "Astra"). Jeder Befund war eine Hypothese, bis er am Code belegt
war. Der sechste Befund (Session-Packs gegen `unusable`) liegt bei einem anderen Agenten und ist
hier nicht gedoppelt. Nichts unter `data/` wurde geschrieben; alle Zahlen sind Lesen und Zaehlen.

Tests: `tests/test_bug_hunt_20260923_architektur.py` — 6 `xfail(strict=True)` (belegte Befunde,
jeder mit `--runxfail` aus dem RICHTIGEN Grund rot gesehen), 2 gruene Waechter.
Entscheidungen: `docs/offene-entscheidungen.md`, Abschnitte A1–A5.

| # | Urteil | Zahl von der Platte |
|---|---|---|
| H2 Settle in der eigenen Quelle | **BELEGT im Code, 0 Faelle** | 0 von 27 Aufnahmen; 9 Logs nach dem Settle neu geschrieben, keines an der Geometrie |
| H3 vier Aktualitaets-Uhren | **BELEGT** | 0 von 8 554 wirksamen Matte-Zeilen gestempelt; 23 von 27 `pass.json` ungestempelt |
| H4 Zellregel vor dem Training | **TEILS** | `MATTE_DIRTY` ist eine Kopie, heute gleich; 26 357 Matte-Zellen im Band (0,15; 0,6] |
| H5 Schreibschutz pro Datei | **BELEGT** (drei Teile, einer davon schwach) | 16 `_write_log`-Aufrufe plus 2 Umgehungen, kein Riegel; 0 verlorene Urteile bisher |
| H6 Temporal-Reihenfolge nur in `cli.py` | **BELEGT** | 63 Frames in 18 Aufnahmen, die ein Upsert heute naehme; 21 von 27 `pass.json` von Hand zusammengesetzt |

---

## H2 — Settle-Daten liegen in der Datei, die ihre eigene Quelle veraendert

**Urteil: BELEGT im Code, heute 0 Faelle auf der Platte.**

*Im Code gesehen:*
- `sessions.settle_scan_session` ist der einzige Schreiber, der `settle_dev`/`settle_seen`/
  `settle_left` wegraeumt (`sessions.py` ~898). `write_corner_rows` (und damit `adopt_corners`)
  raeumt nur `align_worst_px`, `autofix_corners` setzt `align_worst_px` neu, `write_boards_session`
  raeumt `BOARD_KEYS`, `fit_mesh_session` raeumt `grid_lines*`, `rewarp_boards_session` und
  `straighten_boards_session` raeumen gar nichts. Die Settle-Felder bleiben ueberall stehen.
- `chain.ts::exportedSession`: `settled = !measurable || rows.some(row => row.settle_dev !== undefined)`.
  Eine Zeile reicht, die Sprosse `settle-scan` wird nach einer Geometrie-Reparatur **uebersprungen**.
- Ein Re-Export ist sauber: `realgames.REPAIRED_KEYS` traegt die Settle-Felder nicht weiter.

*Gemessen:* alle 27 Aufnahmen tragen `settle_dev` (13 260 Zeilen). In keiner liegt ein
`corners_set_at` oder ein `boards/*.webp` spaeter als die `interval-check.jsonl` des Settle-Laufs.
9 Logs wurden danach noch neu geschrieben; gegen den Schnappschuss direkt nach dem Settle-Lauf
(`log.jsonl.bak.*` mit derselben mtime) unterscheiden sie sich nur in `dirty` (17 Zeilen), dem
`board`-Pfad (3, `boards/` -> `dirty/`) und einem `unusable` — **0 Aenderungen an `corners` oder
`grid_lines`**, alle 6 268 Settle-Zeilen dieser Logs unveraendert.

*Daraus geschlossen:* die Luecke ist real und die Kette haelt die Sprosse zu, aber sie wurde nie
betreten. Neuer Test fuer die Pixel-Seite: `test_rewritten_boards_drop_the_settle_measurement`
(neben dem bestehenden `test_a_new_quad_drops_the_settle_measurement`).

*Widerlegen koennte mich:* eine Reparatur ueber einen Weg, der weder `corners_set_at` noch eine
Brett-mtime hinterlaesst — `fit_mesh_session` schreibt keinen Zeitstempel. Der Backup-Vergleich
deckt ihn fuer die 9 nachtraeglich geschriebenen Logs ab (`grid_lines` unveraendert), fuer die
18 anderen ist die Log-mtime gleich der Settle-mtime, dort lief also danach gar nichts.

---

## H3 — vier Aktualitaets-Mechanismen beantworten dieselbe Frage verschieden

**Urteil: BELEGT.** Beide Teilbehauptungen stimmen; die Profil-Luecke hat heute 0 Faelle.

*Im Code gesehen:*
- `provenance.session_stamp`: nur `log.jsonl`, `ms:bytes`. Stempelt `matte.jsonl`-Zeilen,
  `pass.json`, `model-reads.jsonl`.
- `temporal_flags.source_stamp`: Log, `session.yaml`, jedes Brett, Profil-YAML, `ns`+Groesse.
  Stempelt den Scan-Report und `proposals.meta.json`; `propose_session`/`adopt_proposals`/
  `upsert_proposals` verweigern bei Abweichung.
- `training.pack._manifest_digest` (Pfad/Label/`out_size`) und `_crop_fingerprint` (256 Stichproben
  mtime/Groesse) — beide urteilen nur ueber Packs gegen ihr Manifest; `mm://`-Zeilen haben keinen
  Fingerabdruck. Sie beurteilen nie dasselbe Artefakt wie die ersten beiden; ihr Verhaeltnis zum
  Sessionzustand ist der sechste Befund (anderer Agent).
- Derselbe Lauf, zwei Uhren: `session temporal-pass` legt den Scan unter `source_stamp` ab, schreibt
  aber `pass.json` unter `session_stamp`. Nach einer Profil-Aenderung verweigert `propose_session`
  ("Temporal scan is stale"), waehrend `chain.ts` die Sprosse `temporal` fuer erledigt haelt —
  `test_a_profile_edit_stales_the_pass_like_its_scan`. `coverage_of` schneidet unter dem Profil,
  dieselbe Luecke gilt also fuer die Matte-Coverage.
- Die Gegenrichtung: jedes Log-Schreiben ohne Geometrie-Aenderung (Web-`unusable`,
  `realgames adopt-dirty`, das die Kette selbst ohne Knopf anstoesst) kippt `session_stamp` und
  oeffnet damit `temporal` und `model-read` wieder, obwohl sich kein Pixel bewegt hat.

*Gemessen:*
- **0 von 8 554 wirksamen, gemessenen Matte-Zeilen** (27 Aufnahmen, 10 490 Zeilen) tragen `_source`.
  `chain.ts::staleMatte` vergleicht nur gestempelte Zeilen — fuer den ganzen Bestand ist die
  Drift-Erkennung also tot; die dokumentierte Drift (13 von 24, 2026-09-16) kann die Kette nicht sehen.
- `pass.json`: 4 von 27 gestempelt, 0 davon veraltet. `model-reads.jsonl`: 4 von 27 gestempelt, 0 veraltet.
- Profil: alle 27 Aufnahmen nutzen `data/calibration/desktop.yaml`, es ist aelter als jedes Log und
  jede Matte — **0 Faelle**. Aber: eine einzige Aenderung daran machte alle 27 Scans stale und
  keinen einzigen `_source`-Stempel.

*Widerlegen koennte mich:* wenn `recut-coverage --all` inzwischen gelaufen waere (es stempelt
jede Zeile neu) — die Zaehlung ist von heute. Oder wenn die Profil-YAML als unveraenderlich gilt;
dann gehoert das in ihren Kopf, nicht in eine Annahme.

---

## H4 — die Zellregel ist im Training zentral, davor nicht

**Urteil: TEILS.** `MATTE_DIRTY` ist fachlich DIESELBE Groesse — also eine Kopie, die auseinander-
laufen kann; heute sind beide 0,15. Die Begruendung der Leser stimmt aber nur fuer die Vorgabe.

*Im Code gesehen:*
- `labeling.py`: "A square this covered is no longer a piece example
  (`training/occlusion.PIECE_VISIBLE_MAX`)" — die Kopie ist gewollt, weil `training.occlusion` torch
  laedt (`matte.recut_coverage`/`close_seams` importieren es deshalb lokal). Leser: Slice
  (`labeling` ~590), `position_flags` (2x, "was die Coverage ohnehin maskiert"), `audit_flags.covered_cells`,
  `temporal_flags`, `temporal_matte` (adopt/upsert/prune als "SAM fand eine Hand"), `sensor_audit`,
  `realgames.settle_for_ply` (`covered_max`), dazu zwei Skripte.
- `train._occlusion_diagnostics` baut `(cov <= visible_max) & (bright >= CELL_DARK_MIN)` nach —
  heute deckungsgleich mit `classification_eligible` (gruener Waechter
  `test_the_metric_mask_is_classification_eligible`).
- Wo die Begruendung "ohnehin maskiert" nicht traegt: (1) `--coverage-weight soft` trainiert den
  Klassenkopf bis 0,6; (2) `--visible-max` verschiebt die harte Kante je Lauf; (3) der Verlust
  maskiert zusaetzlich `brightness < 25`, `MATTE_DIRTY` kennt keine Helligkeit — die Lane zeigt also
  Karten fuer Zellen, die der Verlust nie lernt.

*Gemessen:* 547 456 gemessene Matte-Zellen, 81 285 ueber 0,15, davon **26 357 im Band (0,15; 0,6]**
mit mittlerem `soft`-Gewicht 0,355. Diese Zellen bekommen keine Karte (Position-/Audit-Flags) und
steuern den Slice, obwohl ein `soft`-Lauf sie mit gut einem Drittel Gewicht lernt.

*Daraus geschlossen:* kein Bug unter der Vorgabe `hard`, sondern eine Kopie ohne Waechter. Waechter
jetzt gruen: `test_matte_dirty_is_the_piece_visible_cut`. Ob `soft` je Vorgabe wird, ist die
eigentliche Entscheidung (A5).

*Widerlegen koennte mich:* wenn `MATTE_DIRTY` bewusst eine SAM-Detektionsschwelle sein soll
(so benutzt es `temporal_matte`) — dann ist sie eine eigene Groesse und braucht einen eigenen Namen.

---

## H5 — Schreibschutz pro Datei, nicht pro Sessionzustand

**Urteil: BELEGT fuer alle drei Teile; der `adopt`-Teil ist harmlos, der `upsert`-Teil nicht.**

*Im Code gesehen:*
- `matte.jsonl` hat acht schreibende Symbole: `alpha_worker` (anhaengen), `recut_coverage`,
  `recut_fixed`, `close_seams`, `adopt_proposals`, `upsert_proposals`, `prune_dead_rows` (alle
  `write_rows_guarded`) — und `sessions._filter_matte_frames` (`write_rows`, **unbewacht**, aus
  `trim_session`). `test_trim_keeps_a_matte_row_appended_meanwhile`. Unter Windows haelt der
  offene Anhaenge-Griff des Alpha-Workers das `replace` meist auf (dann stirbt `trim` mitten im
  Aufraeumen); verloren geht die Zeile im Fenster zwischen dem letzten Anhaengen und dem Schliessen.
- `log.jsonl`: `_write_log` hat **16 Aufrufe in 13 Funktionen** (12 in `sessions.py`, eine in
  `realgames` fuer `adopt-dirty`), dazu zwei Schreiber daneben: `realgames.write_session` (Export)
  und `platform/app/lib/frame-flag.ts` (Web-`unusable`, nur prozessintern serialisiert). Keiner
  prueft einen Stempel. Lange Laeufe (`settle_scan`, `fit_mesh`, `write_boards`, `rewarp`) lesen am
  Anfang und schreiben nach Minuten — ein menschliches `unusable` von dazwischen ist weg.
  `test_a_log_rewrite_keeps_a_verdict_set_meanwhile`. Das ist die Regel "nie ein menschliches
  Urteil ueberschreiben".
- `upsert_proposals` benennt ALLE `*.sam.webp` sofort auf `*.webp` zurueck und ueberschreibt Alphas,
  bevor `write_rows_guarded` bestaetigt. Nach einem `Contested` (oder einem Absturz in der Schleife,
  z.B. `cv2.imread` = `None`) traegt der Ledger die Upsert-Coverage, die Datei aber SAMs Alpha.
  `test_a_refused_upsert_leaves_the_alphas_alone`. `adopt_proposals` schreibt nur Alphas fuer
  Frames OHNE Messung; nach einem Abbruch liegen Waisen ohne Zeile, die der naechste Lauf
  ueberschreibt — harmlos. `close_seams` hat das richtige Muster (stagen, Ledger, dann umhaengen).

*Nebenbefund (nicht Teil der Hypothese):* ein Re-Export (`realgames.write_session`) ersetzt das
Log ganz, und `carry_repaired_geometry` traegt nur `REPAIRED_KEYS` — **`unusable` faellt dabei
still weg**, nur die `.bak`-Datei behaelt es. Das Web setzt `unusable` ausschliesslich im Log;
es gibt kein Ledger, aus dem es wiederkaeme.

*Gemessen:* ueber alle Log-Historien (Backups nach mtime, dann das Live-Log) ging **0 Mal** ein
`unusable: true` ohne spaeteres `false` verloren. Exposition heute: **1** gesetztes `unusable`
(`2026-09-15-16-54-44`). Kein Schaden, aber auch fast keine Urteile, an denen er sich zeigen koennte.

*Widerlegen koennte mich:* ein Heavy-Lock, der Web-Urteile waehrend Python-Laeufen sperrt — ich
finde keinen (`locks.py` kennt `heavy.lock` und `.pool.lock`, `frame-flag.ts` fragt keinen).

---

## H6 — die Temporal-Reihenfolge lebt nur in `cli.py`

**Urteil: BELEGT.**

*Im Code gesehen:*
- `cli.session_temporal_pass` ist die einzige Stelle, die Scan -> Proposal -> Adopt -> SAM ->
  Upsert -> Prune -> Flags -> `pass.json` kennt; jeder Schritt existiert auch als eigener Befehl
  (`temporal-scan|mattes|adopt|upsert|prune`). `write_pass_report` stempelt nur den Log-Stand zum
  Schluss, keine Schritte und nicht die `matte.jsonl`, auf der Adopt/Upsert entschieden.
- `chain.ts`: `hasTemporalPass = freshPass` — Datei da und Log-Stempel passt (oder fehlt).
- Die Matte-Sprosse kann nach dem Pass wieder aufgehen (`reportedOpen`, `wanted`); neue SAM-Zeilen
  kommen dazu, die Temporal-Sprosse bleibt zu. `test_a_sam_row_after_the_pass_reopens_it`.

*Gemessen:*
- **21 von 27 `pass.json` sind von Hand zusammengesetzt** (`"note": "assembled from the 2026-09-11
  batch logs ..."`), 23 ungestempelt — die Kette liest sie als abgeschlossene Laeufe.
- Bei 24 von 27 ist die `matte.jsonl` juenger als `finished` des Passes; hinter der letzten
  Temporal-/Upsert-Zeile stehen bis zu 1 135 SAM-Zeilen (obere Schranke).
- Schaerfer: **63 Frames in 18 Aufnahmen**, auf denen SAM heute NICHTS findet (max <= 0,15), die
  `proposals.jsonl` ein Alpha traegt, dessen Coverage unter der heutigen Geometrie ueber 0,15 liegt,
  und die keine Upsert-Zeile haben (360 Kandidaten vor dem Coverage-Schnitt). Genau das ist der Fall,
  fuer den der Upsert existiert — sie gehen heute mit Coverage ~0 ins Training (Coverage-Matte-Falle).

*Widerlegen koennte mich:* wenn `require_fresh_proposals` fuer diese Aufnahmen verweigerte (die
Vorschlaege sind aelter als der Log-Stand) — dann haette ein Wiederholungslauf erst neu
vorzuschlagen, der Befund bleibt, nur die 63 werden zur Schaetzung. Die Coverage ist gegen die
heutige Geometrie gerechnet, nicht gegen die zum Vorschlagszeitpunkt.

---

## Reihenfolge nach Hebel

Gewichtet danach, wie oft das Projekt an genau dieser Stelle schon falsch lag:

1. **H6 + der Matte-Teil von H3 — der Zustand der `matte.jsonl` ist fuer die Kette unsichtbar.**
   Die haeufigste Fehlerfamilie des Projekts: Coverage-Matte-Falle, Punkt 28 (zweimal), SAMs Absage
   als "nichts gefunden" (zweimal), `recut_coverage` las das falsche Alpha (68 Zeilen), Coverage-Drift
   13 von 24. Heute: 63 Frames mit Hand und Coverage ~0, 0 von 8 554 Zeilen gestempelt, 21 Paesse
   von Hand. Hebel: ein Stempel, der auch die `matte.jsonl` (und das Profil) umfasst, und
   `recut-coverage --all`, das nebenbei den ganzen Bestand stempelt.
2. **H5 — Schreiben ohne Riegel am `log.jsonl`, samt Re-Export ohne `unusable`.** Wenige Faelle
   heute (1 Urteil), aber die Regel "nie ein menschliches Urteil ueberschreiben" hat schon einen
   Vorfall, und unbewachte bzw. ungestagte Schreiber wurden in dieser Codebasis fuenfmal einzeln
   nachgeruestet (Temporal-Schreiber, `_filter_matte_frames` stagen, `write_interval_checks`,
   `trim`, `frame-flag`-Serialisierung). `_write_log` ist EIN Sink — dort wirkt ein Riegel auf 16 Stellen.
   Der Upsert-Staging-Fix folgt dem vorhandenen `close_seams`-Muster.
3. **H4 — `MATTE_DIRTY` als Kopie.** Die Klassengewichte lagen schon einmal neben dem Verlust
   (Dunkel-Maske, 2026-09-22), und "bewertet wird, was der Verlust lernt" kostete einmal 8 Punkte.
   Heute keine Abweichung; der Waechter ist gruen. Umzug der Konstante in ein torch-freies Modul
   (`config`) ist verhaltensgleich.
4. **H3, Profil- und Gegenrichtung.** 0 Faelle, ein einziges Profil; die Uebersensibilitaet (jedes
   `unusable` oeffnet `temporal` und `model-read`) kostet Rechenzeit, keine Labels.
5. **H2 — Settle.** 0 von 27, keine einzige Geometrie-Reparatur nach einem Settle-Lauf in der
   Geschichte der Backups. Bleibt geparkt.

---

## Nachtrag 2026-09-23 — behoben: H6/H3-Matte, H5-Upsert, H4

- **`pass.json` traegt `_inputs`** (`temporal_matte.pass_inputs`): `matte` als `ms:bytes` der
  `matte.jsonl` und `scan` = `temporal_flags.source_stamp` (Log, `session.yaml`, Bretter, Profil) —
  derselbe Mechanismus wie Scan und Vorschlaege, kein neuer. `session temporal-pass` nimmt ihn
  direkt nach `prune`, also nach dem letzten eigenen Schreiben und vor `position_flags`.
  `provenance.check` prueft beides; `chain.ts::inputsMoved` prueft `matte`, `session.yaml` und
  Profil (die Bretter nur Python — jedes Brett-Schreiben schreibt auch das Log). Getrennter Schluessel
  statt `_source`, damit `_source` die Form behaelt, die `model-reads.jsonl` und die Matte-Zeilen tragen.
- **Altbestand** (`pass.json` ohne `_inputs`, heute alle 27) gilt wie bisher; `ChainState.passInputsUnknown`
  meldet ihn, die Spielseite zeigt "Temporal-Pass: Stand unbekannt". Erst ein neuer Pass stempelt.
- **Kosten:** jede Aenderung an der `matte.jsonl` (auch ein Stift-Fix aus `matte-fix.ts`) oeffnet
  `temporal` wieder — Rechenzeit, keine Labels; der Upsert laesst `.fixed.webp`-Frames ohnehin stehen.
- **`upsert_proposals` stagt** wie `close_seams`: neue Alphas als `<stem>.tmp.webp`, Rueckbenennen
  und Umhaengen erst nach bestaetigtem Ledger (`_publish_upserts`), bei jedem Abbruch werden die
  Nebendateien geraeumt.
- **H4:** `chesslab/cell_rule.py` (torch-frei) haelt `PIECE_VISIBLE_MAX`, `CELL_DARK_MIN` und
  `classification_eligible`; `training.occlusion` re-exportiert sie, `labeling.MATTE_DIRTY` ist
  dasselbe Objekt. `matte.close_seams`/`recut_coverage` importieren weiter lokal aus `training.occlusion`
  (nicht angefasst, anderer Bereich) — dort koennte der torch-Import jetzt entfallen.
- Tests: die drei xfails H3/H5-Upsert/H6 sind entparkt; neu `tests/test_bug_hunt_20260923_mattestand.py`
  und `platform/app/lib/chain-mattestand.test.ts`.
