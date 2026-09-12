# 04 — Gezielte Erfassung: ein Modus in `:app`, kein zweites Programm

Material fuer die gemessenen Korpusluecken aufnehmen. `data/reports/coverage-gaps.json`
(`scripts/coverage_gaps.py`) nennt **58 von 120 Zellen** (Figur x Feldfarbe x Helligkeitsband) mit
unter 200 sichtbaren Belegen, **27 davon null**: 34 ueber eine Stellung erreichbar, 24 nur ueber
anderes Licht.

**Warum kein eigenes APK.** Eine Aufnahme wird erst durch `realgames.export-session` zu Brettern,
und der verlangt ein `video.mp4` (`realgames.py:254-257` wirft sonst `FileNotFoundError`). Video
heisst auf diesem Geraet den ganzen Kamera-Stack: `CameraVideo.kt` ist ein handgeschriebener
MediaCodec-Encoder (489 Zeilen, „this phone exposes no CameraX QHD Recorder profile"), dazu
`PreRollRing`, `RecordingBundleHost` und die Verdrahtung in `TrackerCamera` — zusammen 1 737 Zeilen
in `:app`. Ein zweites APK muesste das duplizieren oder aus der ausgelieferten App herausoperieren.
**Ein Modus in `:app` dupliziert nichts:** Kamera, Video, Kalibrierung, Session-Schreiber und
Upload sind dort schon, neu sind nur die Bildschirme und der Plan-Abruf.

**Die Achse, auf die es ankommt.** Ueber alle 24 Aufnahmen mit `corners` liegt die Verkuerzung der
hinteren Brettkante zwischen 0,955 und 1,025 (1,0 = senkrecht von oben), Median 0,986 — der Korpus
hat **eine Kamerapose und eine Hoehe**. Die gemessene Fehlermechanik (Springer liest sich als Turm,
68 % der Restfehler aus 12 von 280 Verweil-Episoden, `docs/plan-98/02-fehleranalyse.md:11`) ist
deshalb die **Eigendrehung der Figur**, nicht der Kamerawinkel. Ertrag in dieser Reihenfolge:
**Ausrichtung, Hoehe, Licht, Stellung**.

Dass Rotation traegt, ist gemessen: **+0,0245 gepaart ueber sieben Seeds, 7/7, p = 0,0078**
(`docs/plan-98/00-plan.md`, „Ergebnis der Abnahme"). **Nicht verwechseln** mit
`docs/model-improvement-results-2026-08-27.md:66` (`rot90 −0,046`): das war 80 px, ohne Flip, ohne
Brettkopf, anderer Datensatz.

## Phasen

| # | Datei | Konzern | Abhaengig von |
|---|---|---|---|
| 00 | `00-planer-api.md` | Planer, Schema, zwei Routen | — (**landet ALLEIN, zuerst**) |
| 01 | `01-erfassungs-modus.md` | Bildschirme in `:app`, `capture.json` | 00 |
| 02 | `02-messachsen.md` | Hoehe und Ausrichtung messbar | 00 |

01 und 02 laufen nach 00 parallel; 02 testet gegen eine von Hand geschriebene `capture.json`.

## Was NICHT gebaut wird

Kein neues Gradle-Modul, kein zweites APK, keine zweite Kamerabindung, kein eigener
Session-Schreiber, kein eigener Upload, kein eigener FEN-Bauer. Findet eine Phase, dass etwas
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
| `docs/capture-session.schema.json` | **01** | 02 liest | Form von `capture.json` |
| `src/chesslab/capture_plan.py` | 00 | 02 | Planer und Posenrechnung |
| `tests/test_capture_plan.py` | 00 | 02 | |
| `src/chesslab/cli.py` | 00 | — | neue Sub-App `capture` |
| `platform/app/app/api/capture/{plan,coverage}/route.ts` | 00 | — | duenn; Logik in `lib` |
| `platform/app/lib/capture-plan.ts` (+ `.test.ts`) | 00 | — | Typen und Routenlogik |
| `docs/capture-axes.md` | 00 | 02 | dauerhafte Fakten |
| `android/core-engine/.../board/ReadingFen.kt` | — (existiert) | **01** | `fenOf(Map)` oeffnen |
| `android/app/src/main/kotlin/.../capture/**` | 01 | — | die neuen Bildschirme |
| `android/config/comment-budget.txt` | 01 | — | nur falls der Ratchet es verlangt |
| `scripts/coverage_gaps.py` | — (existiert) | 02 | neue Achsen |

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
| 01 | `:app` nimmt einen Auftrag auf, schreibt `capture.json` und je Ply einen gueltigen FEN, das Buendel geht durch den bestehenden Upload — und `:app` bleibt vollstaendig gruen |
| 02 | Eine Session traegt Hoehe, Ausrichtung und Pose; `coverage_gaps.py` wertet sie als Achsen aus |

Den vollen Gate-Lauf macht der Orchestrator.
