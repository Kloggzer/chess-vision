# 04 — Gezielte Erfassung: ein Modus in `:app`, kein zweites Programm

Material fuer die gemessenen Korpusluecken aufnehmen. `data/reports/coverage-gaps.json`
(`scripts/coverage_gaps.py`) nennt **58 von 120 Zellen** (Figur x Feldfarbe x Helligkeitsband) mit
unter 200 sichtbaren Belegen, **27 davon null**: 34 ueber eine Stellung erreichbar, 24 nur ueber
anderes Licht.

**Warum ein Modus in `:app` und kein eigenes Programm.** Die Aufnahme braucht Video — beim Drehen
entsteht so ein durchgehender Schwenk statt acht Standbildern, und genau die Zwischenwinkel sind
der Zweck. Video heisst auf diesem Geraet den ganzen Kamera-Stack: `CameraVideo.kt` ist ein
handgeschriebener MediaCodec-Encoder (489 Zeilen, „this phone exposes no CameraX QHD Recorder
profile"), dazu `PreRollRing` und die Verdrahtung in `TrackerCamera`. Ein zweites APK muesste das
duplizieren oder aus der ausgelieferten App herausoperieren. **Ein Modus dupliziert nichts.**

**Warum trotzdem eine Python-Phase.** `export-session` macht aus einer Aufnahme Bretter, verlangt
aber eine BESTAETIGTE Zugfolge (`realgames.py:1559` ohne `confirmed`, `:1611` ohne
`reviewed_plies`) und dafuer eine `reference.pgn`. Eine Erfassung hat keine Partie. Diese
Maschinerie existiert nur, um je Frame zu bestimmen, WELCHES FEN gilt — bei einem gezielten Aufbau
ist das per Konstruktion bekannt. Phase 01 ist deshalb ein eigener Einstieg, der `rewarp_boards`
und `Recording.frames` benutzt und die Kandidaten-Maschinerie auslaesst.

**Die Achse, auf die es ankommt.** Ueber alle 24 Aufnahmen mit `corners` liegt die Verkuerzung der
hinteren Brettkante zwischen 0,955 und 1,025 (1,0 = senkrecht von oben), Median 0,986 — der Korpus
hat **eine Kamerapose und eine Hoehe**. Die gemessene Fehlermechanik (Springer liest sich als Turm,
68 % der Restfehler aus 12 von 280 Verweil-Episoden, `docs/plan-98/00-plan.md`) ist
deshalb die **Eigendrehung der Figur**, nicht der Kamerawinkel. Ertrag in dieser Reihenfolge:
**Ausrichtung, Hoehe, Licht, Stellung**.

Dass Rotation traegt, ist gemessen: **+0,0245 gepaart ueber sieben Seeds, 7/7, p = 0,0078**
(`docs/plan-98/00-plan.md`, „Ergebnis der Abnahme"). **Nicht verwechseln** mit
`docs/model-improvement-2026-08-26.md` (Ergebnisteil) (`rot90 −0,046`): das war 80 px, ohne Flip, ohne
Brettkopf, anderer Datensatz.

## Phasen

| # | Datei | Konzern | Abhaengig von |
|---|---|---|---|
| 00 | `00-planer-api.md` | Planer, Schema, zwei Routen | — (**landet ALLEIN**) |
| 01 | `01-import.md` | `chesslab capture import`, Buendel zu Brettern | — (**landet ALLEIN**) |
| 02 | `02-erfassungs-modus.md` | Bildschirme in `:app`, Video, `capture.json` | 00 |
| 03 | `03-messachsen.md` | Hoehe, Ausrichtung und Pose messbar | 00 |

00 und 01 teilen keine Datei und koennen parallel laufen. 02 braucht 00 (Plan-Schema) und liefert
`capture.json`, worauf 01 und 03 lesen — beide testen gegen eine von Hand geschriebene Datei und
brauchen 02 nicht fertig.

**Vorbedingung fuer alles:** `uv run python scripts/backfill_brightness.py`, danach
`scripts/coverage_gaps.py` neu. Sonst rechnet die Luecken-Karte auf 62 % des Korpus.

## Was NICHT gebaut wird

Kein neues Gradle-Modul, kein zweites APK, keine zweite Kamerabindung, kein eigener
Session-Schreiber, kein eigener Upload, kein eigener FEN-Bauer, keine eigene Warp- oder
Mesh-Logik, keine Aenderung an `:tracker-runtime` und keine an `export-session`. Findet eine Phase, dass etwas
davon noetig waere: **anhalten** und in `STATUS.md` schreiben.

## Protokoll

- Ein Branch fuer den Pack, nie `main`. Atomare Conventional Commits wie die Steps sie benennen;
  explizit stagen, nie `git add -A` ueber Bereiche.
- **Dem Code glauben, nicht der Spezifikation.** Abweichung → `STATUS.md`, nicht stillschweigend
  die Spezifikation aendern.
- Blockiert? **Anhalten** und den Blocker schreiben. Nicht raten.
- Tests **einmal**, gezielt aufs eigene Modul. Kein `build`, kein voller Lauf, kein e2e.

## Repo-Regeln

`AGENTS.md` gilt woertlich; dieser Pack sticht, wo sie sich widersprechen. Dazu:

- **Kommentare** hart 5 Zeilen, Docstrings zaehlen mit — `tests/test_comment_budget.py:10` scannt
  nur `src/chesslab`; fuer `scripts/` gilt die Regel trotzdem. Der Kotlin-Ratchet
  (`CommentBudgetTest`, `ROOT = File("..")`) laeuft ueber den ganzen `android/`-Baum.
- **Gradle** meldet „up-to-date" auch bei Fehlern → immer `--rerun-tasks`.
- **detekt** `LongParameterList` Schwelle **8** (`android/config/detekt/detekt.yml:51`);
  Baseline-Pfad `android/build.gradle.kts:28`, eine fehlende Baseline ist zulaessig.
- **Compose** wie der Rest von `:app`: Abstaende auf 12dp-Tokens, jedes Bedienelement mit
  `contentDescription`.
- **Greps in Abnahmekriterien** immer auf `android/*/src/` einschraenken — `android/` allein
  zaehlt `app/build/` und die veralteten `bin/`-Quellkopien mit.

## Eigentuemer-Register

**Diese Tabelle sticht jede Phasendatei, die ihr widerspricht.**

| Datei | erstellt von | erweiterbar durch | Notiz |
|---|---|---|---|
| `docs/capture-plan.schema.json` | 00 | — | **einzige Autoritaet** der Auftragsform |
| `src/chesslab/capture_plan.py` | 00 | 02 | Planer und Posenrechnung |
| `tests/test_capture_plan.py` | 00 | 02 | |
| `src/chesslab/cli.py` | 00 | — | neue Sub-App `capture` |
| `platform/app/app/api/capture/{plan,coverage}/route.ts` | 00 | — | duenn; Logik in `lib` |
| `platform/app/lib/capture-plan.ts` (+ `.test.ts`) | 00 | — | Typen und Routenlogik |
| `docs/capture-axes.md` | 00 | 02 | dauerhafte Fakten |
| `android/core-engine/.../board/ReadingFen.kt` | — (existiert) | **01** | `fenOf(Map)` oeffnen |
| `src/chesslab/capture_import.py` (+ Test) | 01 | — | Buendel zu Brettern |
| `android/core-engine/.../board/ReadingFen.kt` (+ Test) | — (existiert) | **02** | `fenOf(Map)` oeffnen |
| `android/app/src/main/kotlin/.../capture/**` | 02 | — | die neuen Bildschirme |
| `android/app/.../ui/ChesslabNavHost.kt` | — (existiert) | **02** | drei Ziele registrieren |
| `docs/capture-session.schema.json` | **02** | 01 und 03 lesen | Form von `capture.json` |
| `android/config/comment-budget.txt` | 02 | — | nur falls der Ratchet es verlangt |
| `scripts/coverage_gaps.py` | — (existiert) | 03 | neue Achsen |

## Artefakt-Hoheit

`data/reports/coverage-gaps.json` gehoert `scripts/coverage_gaps.py`; `generated_at` der
Coverage-Route kommt aus der **mtime** und ist damit gemessen, kein erfundenes Feld.
`data/reports/capture-plan.json` gehoert 00. Die Auftragsform steht in
`docs/capture-plan.schema.json`, die Form von `capture.json` in `docs/capture-session.schema.json`
— Python, TypeScript und Kotlin schreiben ab, keine Sprache ist Vorbild der anderen.

## Fertig heisst

| Phase | fertig, wenn |
|---|---|
| 00 | Planer erzeugt Auftraege mit eindeutiger `id` und entschiedenem Feld, Schema liegt, beide Routen antworten (401 ohne Kopplung), Tests gruen |
| 01 | `chesslab capture import` macht aus einem Buendel mit `capture.json` Bretter, ohne Kandidat und ohne eigene Warp-Logik |
| 02 | `:app` nimmt einen Auftrag mit Video auf, schreibt `capture.json` und je Ply einen gueltigen FEN; `:app` bleibt vollstaendig gruen und `:tracker-runtime` unberuehrt |
| 03 | Eine Session traegt Hoehe, Ausrichtung und Pose; `coverage_gaps.py` wertet sie als Achsen aus |

Den vollen Gate-Lauf macht der Orchestrator.
