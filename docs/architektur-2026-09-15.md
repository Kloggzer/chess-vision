# Architektur-Durchsicht, 2026-09-15 — Kotlin und TypeScript

Eine Durchsicht, keine Bugjagd. Ziel des Nutzers: **Lesbarkeit und Wartbarkeit, lean aber
funktionierend.** Nichts hiervon ist gebaut — die Liste ist ein Vorschlag, und die Kiste sagt,
was sie kostet.

**Kisten:** (A) klein und verhaltensgleich · (B) mittel, braucht neue Tests · (C) gross, aendert
Verhalten oder Schnittstellen — **kommt nicht ohne Absprache und ohne A/B am Regressionssatz.**

Groessen: Kotlin 48 777 Zeilen ueber 7 Module, TypeScript 18 261 plus 6 947 Testzeilen.

## Das Gesamtbild

Das Repo ist nicht verwahrlost. Die Engine ist in kleine Dateien zerlegt, jede gemessene Zahl
traegt ihren Beleg im Kommentar, und die zwei Grenzen, die wirklich gefaehrlich waeren
(Client/Server in TS, Kamera-Eigentum in Android), sind durch Tests gesichert.

Was weh tut, ist fast ueberall **dieselbe Entscheidung, an drei bis zwoelf Stellen noch einmal
getroffen** — nicht verworrenes Wiring.

## Nach Aufwand mal Nutzen

| # | Fund | Kiste | Aufwand | Wirkung |
|---|---|---|---|---|
| 1 | 29 API-Routen ohne gemeinsamen Helfer | B | ½ Tag | 36 % von 539 Zeilen; `checkName` greift erstmals bewusst |
| 2 | Der gecachte JSONL-Leser, ~20× von Hand | B | ½ Tag | ~200 → ~70 Zeilen |
| 3 | 13 globale `Host`-Singletons, 93 Zugriffe | A/B | ½ Tag | prozessweiter Zustand wird sichtbar |
| 4 | Kettenschritt: drei Typen, zwei Namenstabellen | B | 2 h | die UI sagt zweimal dasselbe Wort |
| 5 | **Der (A)-Block** (siehe unten) | A | ½ Tag | neun Driftquellen zu |
| 6 | `Chrome.kt` ist drei Dinge (632 Zeilen) | A | 1 h | mechanischer Schnitt |
| 7 | Config-Funktionen aus `TrackerService` | A | 1 h | 70 Zeilen werden testbar |
| 8 | `lib/jobs.ts` ist neun Dinge (1 042 Zeilen) | B | ½ Tag | Pack-Verify und Spawn raus |
| 9 | `GameReviewScreen.kt` teilen (1 361 Zeilen) | B | 1 Tag | groesste Datei des Baums |
| 10 | Alarm: Typ → Text → Typ in einer Datei | B | 2 h | ein Weg weniger |
| 11 | Namensdrift ueber die Schichten | B/C | laufend | teuerste Lesehuerde, loest sich langsam |
| 12 | Paket-Umbenennung `:tracker-runtime` | C | 1–2 Tage | gibt `internal` zurueck |
| 13 | Engine-Mehrfachschreiber, `TrackerSeed` 22 Parameter | C | — | **nicht ohne Regressionssatz** |

## Die drei Favoriten des Agenten

**1. Der Route-Wrapper.** 29 Dateien, 36 % Boilerplate, und ein Sicherheitsdetail nebenbei:
`checkName` wird von **keiner einzigen Route** gerufen — der Traversal-Schutz greift nur, weil die
lib-Funktionen ihn intern rufen, und erscheint dann als generischer 400.

**2. Der gecachte JSONL-Leser.** Fuenf Report-Module, die man nur mit `diff` auseinanderhaelt
(`hand-flags` 73 Zeilen gegen `position-flags` 80: identisch bis auf Typname, Dateiname und
Sortierfeld). Die Cache-Schluesselzeile steht wortgleich in zwoelf Dateien.

**3. Die 13 `Host`-Singletons.** Der einzige Kotlin-Fund, der wirklich Wiring ist: 93 Zugriffe auf
globalen veraenderlichen Zustand ueber acht Pakete — unter einem Suffix, der **fuenf verschiedene
Dinge** bedeutet (Prozess-Singleton, Datenbuendel, Laufzustand, Thread-Waechter,
Compose-Navigation).

## Der (A)-Block — verhaltensgleich, zusammen ein halber Tag

Das sind die Stellen, an denen eine **dokumentierte Messung heute zweimal im Baum steht**:

- **`withMotionThrFor` existiert zweimal**, je mit eigener Referenzkonstante: `TrackerService.kt:787`
  (`REFERENCE_RATE = FPS30`) und `ReplayOptions.kt:292` (`REFERENCE_FPS = 30.0`). CLAUDE.md fuehrt
  genau diese Kopplung als gemessen. Driftet eine, misst der Desktop-Replay einen Tracker, den das
  Handy nicht faehrt.
- **Zwei exportierte `fenLabels` mit verschiedener Semantik**: `lib/fen.ts:10` fuellt alle 64 Felder
  auf, `lib/pool.ts:37` gibt eine duenne Map. Der Unterschied ist tragend — `pool.ts:75` iteriert
  `Object.entries` und wuerde mit der dichten Version alle leeren Felder mitzaehlen. Eine
  Autovervollstaendigung, die den falschen Import zieht, aendert stumm ein Ergebnis.
- **Klassenlisten**: TS vier Kopien, Kotlin zwei (`:desktop` schreibt beide Listen ab, obwohl
  `core-cnn` sie sauber ableitet und `:desktop` das Paket schon importiert). `"occluded"` steht als
  nacktes Literal in sieben TS-Dateien.
- **`engineConfig(...)` viermal wortgleich**, alle vier Argumente Felder derselben Klasse.
- **Streukonstanten**: `FILES = "abcdefgh"` neunmal in Kotlin und dreimal in TS, `BYTE_MASK` neunmal,
  `BGR_CHANNELS` achtmal, Luma-Gewichte dreimal. Zwei 64-Feld-Generatoren nebeneinander benutzt.
  **`MIN_MARKERS = 2` gegen `MIN_MARKERS = 3`** bei gleichem Paket- und Konstantennamen (es sind
  drei verschiedene Fragen, aber das muss man erst herausfinden).
- **BGR→Bitmap dreimal implementiert**, einmal davon als handgeschriebene Pixelschleife.
- **Vier byte-gleiche `post<T>`** und `TOUCH` in sieben Dateien.
- **Der Pfadbau widerspricht seiner Dokumentation**: `README.md:9` sagt, `gameDir` sei die einzige
  Stelle — gemessen sind es sechs, und fuer `data/reports/` gibt es gar kein `reportsDir()`,
  obwohl acht Dateien den Join schreiben. Vier Woerter fuer dasselbe Verzeichnis.

## Widerlegt — das gehoert dazu

- **`TrackerConfig` mit 60 flachen Feldern ist kein Bag-of-Knobs.** Jedes Feld traegt seine Messung,
  und die flache Form ist, was `KNOBS`, `ConfigCodec` und die Paritaets-Fixtures brauchen.
- **`KnobCatalog.kt` ist keine zweite Tabelle** — es leitet ab, und ein Test prueft, dass die
  Partition exakt ist.
- **Die drei Lane-Dateien sind kein Copy-Paste**: paarweise 32–38 gleiche Zeilen, und das sind
  schliessende Klammern und JSX-Attribute. Drei echte Aufgaben. Der Ueberlapp sitzt bei den zwei
  `stream.tsx` (82 Zeilen).
- **Die Client/Server-Grenze in TS haelt** und ist transitiv ueber die Importkanten geprueft, mit
  Selbsttest gegen Leerlauf.

## Und eine Warnung an den naechsten Leser

**`docs/architecture-review/` ist fuer Kotlin und TS nutzlos.** Alle elf Dateien beschreiben den
Python-Baum vom Juli 2026, und ein Dutzend der genannten Module ist geloescht. Wer dort nachschlaegt,
bekommt Geschichte.

**`tmp/worktrees/` ist eine vollstaendige Repo-Kopie**, inklusive eines Moduls, das es im Hauptbaum
nicht mehr gibt. Jeder Grep, der sie mitnimmt, findet Phantom-Aufrufer — das hat am 2026-09-14
mindestens zwei falsche "tot"-Meldungen erzeugt.

---

# Architektur-Durchsicht, 2026-09-15 — Python und Skripte

Basis: 67 Module / 38 297 Zeilen `src` + `scripts`, 133 Testdateien / 18 825 Zeilen. `ruff` und
`vulture` gruen, Kommentardichte 7,5 % — **der Ballast sind nicht Kommentare und nicht Schlamperei,
sondern drei Dateien und eine fehlende Regel.**

## Nach Nutzen pro Stunde

| # | Fund | Kiste | Aufwand |
|---|---|---|---|
| 1 | `cli.py` nach Typer-Gruppen (2 677 Zeilen, 73 Kommandos) | A | 2 h |
| 2 | Import-Regel aufschreiben, 53 stdlib-Sites hochziehen | A | 2 h |
| 3 | `LogRow` als TypedDict (28 Schluessel, 17 Leser, 0 Deklarationen) | A/B | 3 h |
| 4 | Die vier echten Duplikate (A3–A6) | A | 1 h |
| 5 | Tote Doku-Zeiger | A | 1 h |
| 6 | Bulk-Schleifen in `cli.py` (5×) und `sessions.py` (3×) | A | 1 h |
| 7 | `realgames.py` aufteilen (2 178 Zeilen, fuenf Module) | B | 1 Tag |
| 9 | Pack-API und Split-Pin — **korrigiert Messungen** | B | 4 h |
| 13 | `TrainRecipe` statt 71 Parameter | C | 1 Tag |
| 14 | `sessions.py` / `build_dataset` | C | 1–2 Tage |

## Die drei Favoriten des Agenten

**1. `cli.py` nach Gruppen aufteilen.** Der Schnitt ist *beweisbar* mechanisch: **0 Kommandos rufen
ein anderes**, 6 Helfer (64 Zeilen), 10 saubere Gruppen. Von 2 677 Zeilen sind nur 1 361
Kommando-Rumpf, der Rest Optionen und Hilfetext.

**2. Die Import-Regel.** 543 In-Funktions-Importe, davon **drei** tragend (`ingest`,
`training.model`, `training.pack`). Dazu 53 stdlib-Sites — `cli.py` importiert `json` sechsmal neu,
obwohl es in Zeile 5 steht. Die Torch-Vermeidung funktioniert und ist berechtigt (`import
chesslab.cli` laedt torch nicht), **aber cv2 laedt sie ohnehin** — die 21 lazy `import cv2` kaufen
nichts.

**3. `LogRow` als TypedDict.** 28 Schluessel, 17 lesende Dateien, 8 schreibende, null Deklarationen.
Das ist der Grund, warum `iter_session_crops`, `sessions.py` und `realgames.py` nur mit den anderen
beiden daneben lesbar sind. Reine Annotation, kein Laufzeitverhalten — und sie macht die drei
grossen Umbauten danach erst bezahlbar.

## Was wirklich gefaehrlich ist

- **Zwei `warp_padded` mit VERTAUSCHTEN Argumenten.** `calibration.py:973` nimmt
  `(frame, profile, corners, pad)`, `grid_occlusion.py:45` nimmt `(frame, corners, profile, pad)`.
  Beide live, identische Mathematik, fuenf Aufrufer verteilt. Ein Tausch faellt erst tief in
  `compute_homography` auf. Und die Kotlin-Referenz, die der Docstring zitiert, hat die Reihenfolge
  von `calibration` — die Kopie weicht von dem ab, was sie spiegeln soll.
- **`framescan.occupied(row)` heisst das Gegenteil.** In einem Schach-Repo heisst "occupied"
  *hier steht eine Figur*; die Funktion liefert *das Hand-Gate sieht eine Hand*.
- **Acht von elf Split-Auflösungen ignorieren `split-pin.json`** — sie messen gegen genau den
  Val-Satz, den der Pin ausrangiert hat (den ohne weisse Springer), und sagen es nicht.
- **`load_packed` wirft fuer pack-gebaute Datensaetze**, und seit der Migration sind alle `v6`/`v7`
  pack-gebaut. 13 Skripte rufen nur `load_packed`; der in CLAUDE.md genannte Mining-Weg bricht auf
  `real13-mix-v7-128` ab.
- **Ein Lauf schreibt seine Augmentierungsstaerke zweimal und widerspruechlich**: `aug_erase_p: 0.25`
  und `aug.erase_p: 0.0` in derselben `config.json`, 24 Zeilen auseinander.

## Skripte

129 Stueck, **eine** Testdatei beruehrt sie — und die fand bei 5 untersuchten Skripten **5 Fehler**
(alle am 2026-09-14 gefixt). 33 haben null Referenzen, meist abgeschlossene Kampagnen; ihre Koepfe
tragen aber Messungen, die sonst nirgends stehen. **Erst ernten, dann raeumen.**

Der Vorschlag ist nicht "124 Tests schreiben", sondern die doppelten Leser nach `src/chesslab`
ziehen, wo die Suite schon hinreicht: ein gemeinsamer Replay-Log-Leser bringt sieben Skripte auf
einen Schlag unter Test.

## Widerlegt

- **Kommentar-Bloat gibt es nicht**: 7,5 % in `src/chesslab`, `cli.py` 1 %.
- **`sessions.py` und `realgames.py` duplizieren nichts** — `sessions` orchestriert, `realgames`
  besitzt die Algorithmen.
- **Crop-Geometrie existiert nicht zweimal**: `crop_square` ist der einzige Schneider.
- **128 px Pool, bikubisch gegen bilinear, `SETTLE_LIMIT` 45, λ=3** — alle gemessen und
  dokumentiert. Nichts anfassen.
- Elf kleine Module (`state`, `ioutil`, `locks`, `capture_plan`, `doctor`, …) sind **jedes genau
  eine Sache**. Nichts zu melden.
