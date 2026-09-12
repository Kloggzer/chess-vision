# 04 — Gezielte Erfassung: eigenes APK plus Planer

Material fuer die gemessenen Korpusluecken aufnehmen. `data/reports/coverage-gaps.json`
(`scripts/coverage_gaps.py`) nennt **58 von 120 Zellen** (Figur x Feldfarbe x Helligkeitsband)
mit unter 200 sichtbaren Belegen, **20 davon null**: 34 ueber eine Stellung erreichbar, 24 nur
ueber anderes Licht.

**Der Befund, der den Auftrag formt.** Ueber alle 24 Aufnahmen liegt die Verkuerzung der hinteren
Brettkante zwischen 0,954 und 1,025 (1,0 = senkrecht von oben), Median 0,986 — der Korpus hat
**eine Kamerapose und eine Hoehe**. Die gemessene Fehlermechanik (Springer liest sich als Turm,
68 % der Restfehler aus 12 von 280 Verweil-Episoden) ist deshalb die **Eigendrehung der Figur**,
nicht der Kamerawinkel; `--rot90` hat genau das nachgeahmt und brachte +0,0245 ueber 7 Seeds.
Achsen mit Ertrag, in dieser Reihenfolge: **Ausrichtung, Hoehe, Licht, Stellung**.

## Drei Entwurfsentscheidungen, die eine Pruefung des Vorgaengers erzwungen hat

1. **Ein Auftrag verspricht kein Helligkeitsband.** Kein einziges der 64 Felder hat „sehr hell"
   als haeufigstes Band; ein Auftrag „Dame auf ein Feld im Band X" waere fuer 25 der 34
   Stellungs-Luecken unerfuellbar. Der Planer nennt deshalb ein FELD (das hellste bzw. dunkelste
   seiner Farbe) und das erreichte Band wird **hinterher gemessen**, nie zugesagt.
2. **`:capture` baut seine eigene CameraX-Bindung.** `:tracker-runtime` ist `java-library` und
   traegt **null** CameraX-Dateien; alle neun liegen in `:app`, das kein Modul als Abhaengigkeit
   nutzen kann. „Ein Kamera-Besitzer" gilt je Prozess — ein eigenes APK darf binden. Wiederverwendet
   werden die reinen JVM-Teile: `SessionRecorder`, `HttpIngestClient`, `:core-geometry`.
3. **Abdeckung ist NICHT in Echtzeit.** `coverage-gaps.json` entsteht aus einem GEBAUTEN Datensatz;
   eine frisch hochgeladene Session erscheint dort erst nach Slice, Export und Dataset-Bau. Die App
   zeigt deshalb den Fortschritt gegen den PLAN (deterministisch) und daneben die Abdeckung mit
   ihrem Erzeugungszeitpunkt. Ein Balken, der sich nach dem Upload nicht bewegt, waere eine Luege.

## Phasen

| # | Datei | Konzern | Abhaengig von |
|---|---|---|---|
| 00 | `00-planer-api.md` | Planer, JSON-Schema, zwei Routen | — (**landet ALLEIN, zuerst**) |
| 01 | `01-capture-app.md` | Android-Modul `:capture` | 00 |
| 02 | `02-messachsen.md` | Hoehe und Ausrichtung messbar | 00 |

01 und 02 laufen nach 00 parallel und teilen keine Datei.

## Protokoll

- Ein Branch fuer den Pack, nie `main`. Atomare Conventional Commits wie die Steps sie benennen;
  explizit stagen, nie `git add -A` ueber Bereiche.
- **Dem Code glauben, nicht der Spezifikation.** Abweichung → `STATUS.md` unter „Notes /
  discrepancies", nicht stillschweigend die Spezifikation aendern.
- Blockiert? **Anhalten** und den Blocker schreiben. Nicht raten.
- Der gemeinsame Baum kompiliert waehrend einer Phase womoeglich nicht: in einer eigenen Kopie
  pruefen (`git worktree` auf HEAD plus eigene Dateien) und das im Bericht sagen. **Nie** die
  Datei einer anderen Phase anfassen, um gruen zu werden.

## Gedaechtnis-Vertrag

Tests **einmal**, gezielt aufs eigene Modul. Kein `build`, kein voller Lauf, kein e2e — das ist
Sache des Orchestrators. Typpruefung nur im eigenen Bereich.

## Repo-Regeln

`AGENTS.md` gilt woertlich; dieser Pack sticht, wo sie sich widersprechen. Dazu:

- **Kommentare:** Ziel 3 Zeilen, hart 5 — Docstrings zaehlen mit (`tests/test_comment_budget.py`,
  `LIMIT = 5`). Kotlin-Ratchet `android/config/comment-budget.txt` feuert ab 8, darf nur schrumpfen.
- **Gradle** meldet „up-to-date" auch bei Fehlern → immer `--rerun-tasks`.
- **detekt** `LongParameterList` Schwelle **8** (`android/config/detekt/detekt.yml:51`),
  `@Composable` ausgenommen.
- **OpenCV:** `:core-geometry` (`build.gradle.kts:8-20`) kompiliert `compileOnly` gegen
  `org.bytedeco:opencv`; **jedes Runtime liefert genau eine Implementierung plus Natives** —
  `:app` das `org.opencv`-AAR. `:capture` muss dasselbe tun, sonst fehlen zur Laufzeit 342 Klassen.
- **Abhaengigkeiten** nur ueber Versionskatalog und Lockfiles.

## Statische Analyse

Phasenagenten: `gradlew.bat :<modul>:ktlintCheck :<modul>:detekt --rerun-tasks` bzw.
`uv run ruff check <dateien>` und `uv run vulture --min-confidence 80`. Einmal, null NEUE Befunde,
keine `@Suppress`- oder Baseline-Eintraege. `ktlintFormat` benutzen, nicht nachahmen.

## Eigentuemer-Register

**Diese Tabelle sticht jede Phasendatei, die ihr widerspricht.**

| Datei | erstellt von | erweiterbar durch | Notiz |
|---|---|---|---|
| `src/chesslab/turntable.py` | 00 | 02 | Planer und Posenrechnung |
| `tests/test_turntable.py` | 00 | 02 | |
| `docs/turntable-plan.schema.json` | 00 | — | **einzige Autoritaet** der Auftragsform |
| `platform/app/app/api/turntable/{plan,coverage}/route.ts` | 00 | — | |
| `platform/app/lib/turntable.ts` | 00 | — | TS-Typen, aus dem Schema abgeschrieben |
| `docs/turntable-capture.md` | 00 | 01, 02 | dauerhafte Fakten |
| `android/capture/**` | 01 | — | neues Modul, eigener `applicationId` |
| `android/settings.gradle.kts` | 01 | — | eine Zeile `include(":capture")` |
| `scripts/coverage_gaps.py` | — (existiert) | 02 | neue Achsen |

## Artefakt-Hoheit

`data/reports/coverage-gaps.json` gehoert `scripts/coverage_gaps.py`; 00 liest es und erfindet
keine Felder. `data/reports/turntable-plan.json` gehoert 00. **Die Auftragsform steht in
`docs/turntable-plan.schema.json` und nirgends sonst** — Python, TypeScript und Kotlin schreiben
sie ab, keine Sprache ist Vorbild der anderen. Wer einen Schluessel braucht, den der Erzeuger
nicht schreibt, meldet eine Luecke statt ihn zu erfinden.

## Fertig heisst

| Phase | fertig, wenn |
|---|---|
| 00 | Planer erzeugt Auftraege aus echten Luecken, Schema liegt, beide Routen antworten (401 ohne Kopplung), `docs/turntable-capture.md` steht, Tests gruen |
| 01 | APK baut, nimmt auf, laedt ueber den BESTEHENDEN Ingest hoch, ktlint und detekt gruen |
| 02 | Eine Session traegt Hoehe und Ausrichtung, `coverage_gaps.py` wertet beide als Achsen aus |

Den vollen Gate-Lauf macht der Orchestrator.
