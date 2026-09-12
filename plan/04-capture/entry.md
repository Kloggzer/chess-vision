# 04 — Gezielte Erfassung: eigenes APK plus Planer

Material fuer die gemessenen Korpusluecken aufnehmen. `data/reports/coverage-gaps.json`
(`scripts/coverage_gaps.py`) nennt **58 von 120 Zellen** (Figur x Feldfarbe x Helligkeitsband)
mit unter 200 sichtbaren Belegen, **27 davon null**: 34 ueber eine Stellung erreichbar, 24 nur
ueber anderes Licht.

**Der Befund, der den Auftrag formt.** Ueber alle 24 Aufnahmen liegt die Verkuerzung der hinteren
Brettkante zwischen 0,955 und 1,025 (1,0 = senkrecht von oben), Median 0,986 — der Korpus hat
**eine Kamerapose und eine Hoehe**. Die gemessene Fehlermechanik (Springer liest sich als Turm,
68 % der Restfehler aus 12 von 280 Verweil-Episoden, `docs/plan-98/02-fehleranalyse.md:11`) ist
deshalb die **Eigendrehung der Figur**, nicht der Kamerawinkel. Achsen mit Ertrag, in dieser
Reihenfolge: **Ausrichtung, Hoehe, Licht, Stellung**.

Dass Rotation traegt, ist am 2026-09-12 gemessen: **+0,0245 gepaart ueber sieben Seeds,
Vorzeichentest 7/7, p = 0,0078** (`docs/plan-98/00-plan.md`, Abschnitt „Ergebnis der Abnahme").
**Nicht verwechseln** mit `docs/model-improvement-results-2026-08-27.md:66`, wo `rot90` mit
−0,046 steht: das war 80 px, ohne Flip, ohne Brettkopf, auf einem anderen Datensatz.

## Vier Entscheidungen, die zwei Pruefungen erzwungen haben

1. **Ein Aufbau ist ein FEN, keine Partie.** `SessionRecorder.capture` verlangt
   `(ply, fen, moveSan, corners)`. Ein FEN beschreibt ein BRETT: `8/8/8/8/8/7Q/8/8 w - - 0 1` ist
   gueltig, und `GameState(...).label_for("h3")` gibt `wQ` (nachgemessen). Also braucht es keinen
   neuen Artefakttyp — `ply` zaehlt die Drehschritte, `moveSan` bleibt `null`, und der bestehende
   Slice-Pfad labelt die Aufnahme wie jede andere.
2. **Ein Auftrag verspricht kein Helligkeitsband.** Kein Feld hat „sehr hell" als haeufigstes
   Band; der Planer nennt ein FELD (das hellste bzw. dunkelste seiner Farbe), und was erreicht
   wurde, misst Phase 02 hinterher.
3. **Geteilt statt dupliziert.** Alle neun CameraX-Dateien liegen in `:app`, das kein Modul
   einbinden kann — also wandern die 139 Zeilen Kalibrierung und rund 80 Zeilen Bindung in ein
   neues `:board-setup`, aus dem BEIDE Apps ziehen (Phase 01). „Ein Kamera-Besitzer" gilt je
   Prozess, ein zweites APK darf binden; eine zweite Implementierung braucht es dafuer nicht.
4. **Abdeckung ist NICHT in Echtzeit.** `coverage-gaps.json` entsteht aus einem GEBAUTEN Datensatz.
   Die App zeigt Fortschritt gegen den PLAN und die Abdeckung mit ihrem Erzeugungszeitpunkt. Ein
   Balken, der sich nach dem Upload nicht bewegt, waere eine Luege.

**Namensgebung:** das Wort `turntable` ist im Repo vergeben (motorisierter Drehteller,
`docs/turntable-ingest.md`, `composite.py:29` „0.43 deg/frame"). Alles Neue heisst **`capture`**.

## Phasen

| # | Datei | Konzern | Abhaengig von |
|---|---|---|---|
| 00 | `00-planer-api.md` | Planer, Schema, zwei Routen | — (**landet ALLEIN**) |
| 01 | `01-extraktion.md` | `fenOf` oeffnen, `:board-setup` aus `:app` | — (**landet ALLEIN**) |
| 02 | `02-capture-app.md` | Android-Modul `:capture` | **00 und 01** |
| 03 | `03-messachsen.md` | Hoehe und Ausrichtung messbar | 00 |

00 und 01 sind beide Vertragslieferanten und koennen **parallel** laufen — sie teilen keine Datei.
02 braucht beide fertig. 03 haengt nur an 00.

**01 ist die einzige Phase, die `:app` anfassen darf**, und sie aendert kein Verhalten. Ohne sie
schriebe 02 drei zweite Implementierungen: Kamerabindung, Kalibrier-Ablauf und ein `fenOf`, das
`core-engine/board/ReadingFen.kt` bereits rechnet.

## Protokoll

- Ein Branch fuer den Pack, nie `main`. Atomare Conventional Commits wie die Steps sie benennen;
  explizit stagen, nie `git add -A` ueber Bereiche.
- **Dem Code glauben, nicht der Spezifikation.** Abweichung → `STATUS.md` unter „Notes /
  discrepancies", nicht stillschweigend die Spezifikation aendern.
- Blockiert? **Anhalten** und den Blocker schreiben. Nicht raten.
- Der gemeinsame Baum kompiliert womoeglich nicht: in einer eigenen Kopie pruefen
  (`git worktree` auf HEAD plus eigene Dateien) und das im Bericht sagen. **Nie** die Datei einer
  anderen Phase anfassen, um gruen zu werden.

## Gedaechtnis-Vertrag

Tests **einmal**, gezielt aufs eigene Modul. Kein `build`, kein voller Lauf, kein e2e. Typpruefung
nur im eigenen Bereich.

## Repo-Regeln

`AGENTS.md` gilt woertlich; dieser Pack sticht, wo sie sich widersprechen. Dazu:

- **Kommentare:** hart 5 Zeilen, Docstrings zaehlen mit — aber `tests/test_comment_budget.py:10`
  scannt **nur `src/chesslab`**, nicht `scripts/`. Fuer `scripts/` gilt die Regel trotzdem.
- **Kotlin-Ratchet:** `CommentBudgetTest` laeuft mit `ROOT = File("..")` ueber den **ganzen**
  `android/`-Baum, also auch ueber neues `:capture` — er faellt aber erst bei `:app:test` auf.
  Phase 01 fuehrt ihn deshalb einmal selbst aus.
- **Gradle** meldet „up-to-date" auch bei Fehlern → immer `--rerun-tasks`.
- **detekt** `LongParameterList` Schwelle **8** (`android/config/detekt/detekt.yml:51`).
- **OpenCV:** `:core-geometry` kompiliert `compileOnly` gegen `org.bytedeco:opencv`
  (`build.gradle.kts:32`, Begruendung im Kommentar `:8-21`); **jedes Runtime liefert genau eine
  Implementierung plus Natives** — `:app` das `org.opencv`-AAR. `:capture` muss dasselbe tun.
- **Abhaengigkeiten** nur ueber Versionskatalog und Lockfiles.

## Statische Analyse

`gradlew.bat :<modul>:ktlintCheck :<modul>:detekt --rerun-tasks` bzw. `uv run ruff check <dateien>`
und `uv run vulture --min-confidence 80`. Einmal, null NEUE Befunde, keine `@Suppress`- oder
Baseline-Eintraege. `ktlintFormat` benutzen, nicht nachahmen.

## Eigentuemer-Register

**Diese Tabelle sticht jede Phasendatei, die ihr widerspricht.**

| Datei | erstellt von | erweiterbar durch | Notiz |
|---|---|---|---|
| `docs/capture-plan.schema.json` | 00 | — | **einzige Autoritaet** der Auftragsform |
| `src/chesslab/capture_plan.py` | 00 | 02 | Planer und Posenrechnung |
| `tests/test_capture_plan.py` | 00 | 02 | |
| `src/chesslab/cli.py` | 00 | — | neue Sub-App `capture` |
| `platform/app/app/api/capture/{plan,coverage}/route.ts` | 00 | — | |
| `platform/app/lib/capture-plan.ts` | 00 | — | TS-Typen, aus dem Schema abgeschrieben |
| `platform/app/lib/capture-plan.test.ts` | 00 | — | |
| `docs/capture-axes.md` | 00 | 01, 02 | dauerhafte Fakten |
| `android/core-engine/.../ReadingFen.kt` | — (existiert) | **01** | `fenOf(Map)` aufspalten |
| `android/board-setup/**` | 01 | — | neues Android-Library-Modul |
| `android/app/.../geometry/ArucoCalibrator.kt` | — (existiert) | **01** | wird verschoben |
| `android/app/.../camera/TrackerCamera.kt` | — (existiert) | **01** | Bindung wandert |
| `android/capture/**` | 02 | — | neues Modul, eigener `applicationId` |
| `android/settings.gradle.kts` | 01 und 02 | — | je eine `include`-Zeile |
| `android/config/comment-budget.txt` | 01, 02 | — | nur falls der Ratchet es verlangt |
| `docs/capture-session.schema.json` | 02 | — | Form von `capture.json` |
| `capture.json` (Inhalt) | **02** | 03 liest | Schreiber ist 02, Leser 03 |
| `scripts/coverage_gaps.py` | — (existiert) | 03 | neue Achsen |

## Artefakt-Hoheit

`data/reports/coverage-gaps.json` gehoert `scripts/coverage_gaps.py`; 00 liest es und erfindet
keine Felder — `generated_at` der Coverage-Route kommt aus der **mtime der Datei**, ist also
gemessen und kein erfundenes Feld. `data/reports/capture-plan.json` gehoert 00. **Die
Auftragsform steht in `docs/capture-plan.schema.json` und nirgends sonst**; Python, TypeScript und
Kotlin schreiben sie ab, keine Sprache ist Vorbild der anderen.

## Fertig heisst

| Phase | fertig, wenn |
|---|---|
| 00 | Planer erzeugt Auftraege mit eindeutiger `id`, Schema liegt, beide Routen antworten (401 ohne Kopplung), `docs/capture-axes.md` steht, Tests gruen |
| 01 | `fenOf(Map)` existiert einmal, `:board-setup` traegt Kalibrierer und Bindung, **`:app` unveraendert im Verhalten und vollstaendig gruen** |
| 02 | APK baut, nimmt auf, schreibt `capture.json` und einen gueltigen FEN je Schritt, laedt ueber den BESTEHENDEN Ingest hoch |
| 03 | Eine Session traegt Hoehe und Ausrichtung, `coverage_gaps.py` wertet beide als Achsen aus |

Den vollen Gate-Lauf macht der Orchestrator.
