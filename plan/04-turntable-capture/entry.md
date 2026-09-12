# 04 — Turntable-Erfassung: eigenes APK plus Plan-API

Gezielt das Material aufnehmen, das dem Korpus fehlt. Die Lücken sind gemessen, nicht vermutet:
`data/reports/coverage-gaps.json` (erzeugt von `scripts/coverage_gaps.py`) nennt **41 von 120
Zellen** (Figur × Feldfarbe × Helligkeitsband) mit unter 200 sichtbaren Belegen, 18 davon null.

**Der Befund, der den Auftrag formt.** Über alle 24 Aufnahmen liegt die Verkürzung der hinteren
Brettkante zwischen 0,954 und 1,025 (1,0 = senkrecht von oben), Median 0,986 — der Korpus hat
**eine einzige Kamerapose und eine einzige Höhe**. Die gemessene Fehlermechanik (Springer liest
sich als Turm, 68 % der Restfehler aus 12 von 280 Verweil-Episoden) ist deshalb die
**Eigendrehung der Figur**, nicht der Kamerawinkel. Eine App, die Kamerawinkel abfährt, holt
nichts. Die vier Achsen mit Ertrag, in dieser Reihenfolge: **Ausrichtung, Höhe, Licht, Stellung**.

## Phasen

| # | Datei | Konzern | Abhängig von | parallel? |
|---|---|---|---|---|
| 00 | `00-contract.md` | Planer + Platform-API + JSON-Formen | — | **landet ALLEIN, zuerst** |
| 01 | `01-capture-app.md` | Android-Modul `:capture`, eigenes APK | 00 | nach 00 |
| 02 | `02-measure-axes.md` | Aufnahme-Metadaten messbar machen | 00 | parallel zu 01 |

00 veröffentlicht die Formen, gegen die 01 und 02 programmieren, und muss vollständig sein,
bevor eine der beiden startet.

## Protokoll

- Ein Branch für den ganzen Pack, nie auf `main`. Atomare Conventional Commits genau so, wie die
  Steps sie benennen; explizit stagen, nie `git add -A` über Bereiche hinweg.
- **Dem Code glauben, nicht der Spezifikation.** Weicht die Wirklichkeit ab: in `STATUS.md`
  unter „Notes / discrepancies" festhalten, nicht stillschweigend die Spezifikation ändern.
- Blockiert? **Anhalten** und den Blocker in `STATUS.md` schreiben. Nicht raten.
- Der gemeinsame Baum kompiliert während einer Phase womöglich nicht. Prüfe in einer eigenen
  Kopie (`git worktree` auf HEAD plus deinen Dateien) und sage das im Bericht. **Nie** die Datei
  einer anderen Phase anfassen, um grün zu werden.

## Gedächtnis-Vertrag

Tests **einmal**, gezielt auf das eigene Modul. Kein `build`, kein voller Testlauf, kein e2e —
das ist Sache des Orchestrators. Typprüfung nur im eigenen Bereich.

## Repo-Regeln

`AGENTS.md` gilt wörtlich; dieser Pack sticht, wo sie sich widersprechen. Dazu aus `CLAUDE.md`:

- **Android: EIN Kamera-Besitzer.** Ein zweites CameraX-Binding hat den Feed eingefroren. Das
  eigene APK ist ein eigener Prozess und damit erlaubt — aber Kalibrierung (ArUco grob +
  Grid-Fit) und Brettgeometrie werden **aus `:core-geometry` und `:tracker-runtime` benutzt**,
  nie kopiert.
- **Kommentare:** Ziel 3 Zeilen, hart 5. Der Kotlin-Ratchet (`android/config/comment-budget.txt`)
  feuert ab 8 und darf nur schrumpfen.
- **Gradle:** Tasks melden „up-to-date" auch bei Fehlern → immer `--rerun-tasks`.
- **detekt** `LongParameterList`: Schwelle **8** für Funktionen und Konstruktoren
  (`android/config/detekt/detekt.yml:51`), `@Composable` ausgenommen. Signaturen so entwerfen,
  dass sie hineinpassen — „der Linter hat diese Form erzwungen" ist ein Geruch, kein Entwurf.
- **Abhängigkeiten** nur über den Versionskatalog und die Lockfiles. Nichts vendorn, nichts von
  Hand eintragen.

## Statische Analyse

Phasenagenten: `gradlew.bat :<modul>:ktlintCheck :<modul>:detekt --rerun-tasks`, einmal, null
NEUE Befunde, keine `@Suppress`- oder Baseline-Einträge, um grün zu werden. `ktlintFormat`
benutzen statt von Hand nachzuahmen. Python-Seite: `uv run ruff check <dateien>` und
`uv run vulture --min-confidence 80`. Repo-weite Läufe macht der Orchestrator.

## Eigentümer-Register

**Diese Tabelle sticht jede Phasendatei, die ihr widerspricht.**

| Datei | erstellt von | erweiterbar durch | Notiz |
|---|---|---|---|
| `src/chesslab/turntable.py` | 00 | 02 | Planer: Lücken → Aufnahmeaufträge |
| `platform/app/app/api/turntable/plan/route.ts` | 00 | — | |
| `platform/app/app/api/turntable/coverage/route.ts` | 00 | — | |
| `platform/app/lib/turntable.ts` | 00 | 01 liest nur | TS-Typen der Formen |
| `docs/turntable-capture.md` | 00 | 01, 02 | die dauerhaften Fakten |
| `android/capture/**` | 01 | — | neues Gradle-Modul |
| `android/settings.gradle.kts` | 01 | — | eine Zeile `include(":capture")` |
| `scripts/coverage_gaps.py` | — (existiert) | 02 | neue Achsen |

## Artefakt-Hoheit

`data/reports/coverage-gaps.json` gehört **`scripts/coverage_gaps.py`**. Phase 00 liest es und
erfindet keine Felder. `data/reports/turntable-plan.json` gehört **Phase 00**. Wer einen
Schlüssel braucht, den der Erzeuger nicht schreibt, meldet eine Lücke — er erfindet sie nicht.

## Fertig heißt

| Phase | fertig, wenn |
|---|---|
| 00 | Planer erzeugt Aufträge aus echten Lücken, beide Routen antworten, `docs/turntable-capture.md` steht, Tests grün |
| 01 | APK baut, nimmt eine Session auf, lädt sie über den BESTEHENDEN Ingest hoch, ktlint und detekt grün |
| 02 | Eine aufgenommene Session trägt Höhe und Ausrichtung, `coverage_gaps.py` wertet sie aus |

Den vollen Gate-Lauf macht der Orchestrator, nicht der Phasenagent.
