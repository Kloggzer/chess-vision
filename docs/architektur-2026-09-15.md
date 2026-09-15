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

---

# Runde 2: die Naehte und die Testsuite (2026-09-15, nachts)

Zwei ungeprimte Agenten, bewusst anders geschnitten als Runde 1: einer auf die Grenzen zwischen
Python, Kotlin und TypeScript, einer auf Testsuite und Fehlerbehandlung als Querschnitt.
**Was daraus schon gebaut ist, steht in `f0cf2f42`** — hier steht nur, was offen bleibt.

## Das Muster, das das Projekt schon besitzt

Das Repo hat zwei sehr gute Naht-Muster und wendet beide an der falschen Stelle an:

- **Geteiltes Fixture ueber drei Sprachen.** `parity/_geometry/mesh_crop_parity.json` wird von
  keiner Seite geschrieben und von `tests/test_mesh_crop.py`, `MeshPointParityTest.kt` **und**
  `platform/app/lib/warp.test.ts` gelesen, Toleranz 1e-9. Es sichert **Rechnungen**, nie Formate.
- **Versionierte Huelle mit dokumentierter Bedeutungsaenderung.** `ConfigCodec.kt`
  (`CONFIG_SCHEMA_VERSION = 6`) erklaert jede Stufe und hat einen Test. Das beste
  Migrationsdokument im Baum — und es liegt auf dem einzigen Format, das **keine** Sprachgrenze
  kreuzt.

**19 Formate kreuzen eine Sprachgrenze. 2 haben ein Schema, beide Prosa. 0 tragen eine Version.
0 haben einen Round-Trip-Test ueber zwei Sprachen.** Die Naht, die als einzige ein Schema, einen
deklarativen Kotlin-Codec (`@SerialName`) und einen typisierten TS-Zwilling hat — `capture-plan` —
ist auch die einzige **ohne** gefundene Drift. Sie ist die Vorlage fuer die anderen neun.

## (A) Klein, getestet, verhaltensgleich — offen

| Fund | Aufwand |
|---|---|
| `clahe_golden.py` liegt in `tmp/` und ist gitignored: die Golden-Summe des CLAHE-Zwillings ist **nicht reproduzierbar**. (Ich fasse `tmp/` nicht an — bitte selbst rueberziehen oder freigeben.) | 15 min |
| `vulture`-`paths` um `scripts` erweitern — 12 061 Zeilen, heute ungeprueft | 10 min |
| Drei Kotlin-Selbsttests (`theGuardCanSee*Sources`) loeschen: sie pruefen, dass der Waechter seine eigenen Dateien findet, und sind in jedem Zustand des Produktivcodes gruen | 20 min |
| `training/clahe_gpu.py`: 133 Zeilen, **0 Aufrufer, 0 Tests**, Docstring sagt selbst "UNBENUTZT (2026-09-07)". Loeschkandidat — **nur auf Anweisung** | 5 min |
| `CommentBudgetTest.kt:79` nennt den falschen Pfad; drei Zeilen tiefer steht der richtige | 5 min |

## (A/B) Die vier `TrackerService`-Ableitungen — der beste Hebel im Bericht

`gridArm = modelSpec?.coverageOutput != true` (`TrackerService.kt:151`) schaltet den modellfreien
Hand-Sensor — den Arm hinter dem **67/67-mit-0-erfundenen**-Meilenstein. Ueber **1 656 Kotlin-Tests
reicht kein einziger ihn ab**; die zwei, die `gridArm` erwaehnen, uebergeben das Boolean literal.
**Eine Ein-Zeichen-Aenderung (`== true`) schaltet den Phantom-Veto auf jedem ausgelieferten Modell
ab, und alles bleibt gruen.** Dasselbe gilt fuer `cropClahe` (das Standardmodell ist
`p4a-80-clahe`), fuer `engineConfig` (in null Testdateien, obwohl die fps-Kopplung genau daran
haengt) und fuer `BUNDLED_MODELS` gegen `assets/cnn_model/` (heute 7:7 deckungsgleich, die
dokumentierte Falle ungeschuetzt). Vier Einzeiler, 2 h. **Naechster Schritt, wenn Zeit ist.**

## (B) Vorschlaege — aufgeschrieben, nicht gebaut

- **`cov` heisst in zwei Geschwister-Berichten das Gegenteil.** `hand_flags.py:58` `cov` =
  **Modell**-Sigmoid, `position_flags.py:57` `cov` = **SAM**. Beide landen in `data/reports/`,
  beide liest die Strittig-Lane, und nur eine Seite hat einen Doc-Kommentar — den falschen fuer die
  Nachbardatei. `audit_flags.py:103` tauft dieselbe Zahl ein drittes Mal um. Vorschlag:
  `model_cov`/`matte_cov` ueberall, `cov` verbieten. **2 h, beruehrt Berichtsformate.**
- **`measured` bedeutet drei Dinge**, zwei davon 35 Zeilen auseinander (`session.ts:52` = traegt
  `settle_dev`, `label-stream.ts:89` = SAM-Coverage als Zahl, `frame-hands.ts:19` = ueberhaupt
  gescannt). Ausgerechnet das Wort, mit dem das Projekt "ungemessen ist nicht 0" durchsetzt.
- **`_fit_axis` gegen `AxisFit.kt` haelt nur ein Kommentar.** Beide Seiten testen gegen ihre eigene
  synthetische Wahrheit. Der Grid-Fit traegt das ganze Genauigkeitsbudget (Mesh 0,9–1,1 px gegen
  15–16 px roh). Das Werkzeug dafuer steht im Baum und laeuft in drei Sprachen — es wurde nur nie
  auf die teuerste Rechnung gerichtet. **½ Tag, der wertvollste Vorschlag der Runde.**
- **Erfundene Konstanten beim Lesen.** `session.ts:182-184`: `board_size ?? 928`,
  `pad_side ?? 0.05`, `clock.fps ?? 30` — durch genau diese Zahlen schneidet die
  Labeling-Oberflaeche jeden Crop, und der Kommentar 80 Zeilen darueber haelt fest, dass Kandidat
  und Profil sich hier schon um 8 % widersprochen haben. Python daneben: `serving.py:73`
  `cfg.get("out_size", [96, 128])`, waehrend Kotlin fuer denselben Schluessel `getValue` nutzt und
  laut wirft. **Ein Format, ein Schluessel, entgegengesetzte Politik.**
- **`session_profile` macht aus einer fehlenden Datei einen Messwert** (`sessions.py:520`): das
  Ersatzprofil ist am Rueckgabewert nicht als Ersatz erkennbar, und zwei Aufrufer reichen es in
  `worst_offset` — eine Ausrichtungsmessung in px, die als `align_worst_px` in den Log geht.
- **`respondError()` fuer die TS-Routen.** Es gibt im gesamten API **keine einzige 500**:
  `api/cell/.../route.ts:37` macht aus korrupter `log.jsonl`, ungeradem Brett, fehlender `.webp`
  oder `sharp`-Fehler ein **404** mit dem Error als Body, den niemand liest. **30 Routen.**
- **`vitest.config.mts:6` sammelt nur `lib/`.** Alles unter `app/` ist nicht kollektierbar —
  `app/strom/labeln/stream.tsx` mit 346 Statements steht auf 0,0 %. Die zwei Regex-ueber-JSX-Tests
  im Baum sind Source-Grep, **weil die Config keinen anderen Weg laesst**.
- **Kein gemeinsamer Fixture-Baukasten, dreimal.** Python hat **keine einzige `conftest.py`**
  (`CalibrationProfile(...)` 29-mal von Hand in 21 Dateien); TS kein Helfer-Modul (`mkdtemp`
  47-mal, `CHESSLAB_DATA_DIR` 43-mal gesetzt, **7** raeumen auf); Kotlin `TrackerConfig(` 121-mal
  in 55 Dateien.
- **Und die Folge davon, dreimal dieselbe:** die vier Python-Labeling-Suiten schneiden aus
  `frames/` statt aus `boards/` (12 von 14 `slice_session`-Dateien nehmen den Fallback-Zweig),
  `session.test.ts` laesst die vier board-Schluessel weg (`session.ts:164` wird in seiner eigenen
  Testdatei **nie** wahr), `ModelSpecTest` baut ein Modell **ohne** `coverage_output` und ohne
  `coverage_gate` — eine Form, die das APK seit 2026-09-14 nicht mehr ausliefert, und daneben liegt
  in `CoverageGateConfigTest.kt` eine zweite, bereits divergierte Kopie desselben JSON-Bauers.
  **Ein Bauer je Sprache macht die falsche Form nicht seltener, sondern unschreibbar.**

## (C) Nicht ohne Absprache

- **Versionsfeld und Migrationsregel fuer `log.jsonl`/`candidate.json`.** Aendert, was ein drei
  Wochen alter Baum bedeutet.
- **`reason` im Job-Ledger als `{text, log, code}` statt als String.** Heute bauen drei Erzeuger
  drei Formen, ein Parser (`failure.ts:16`) zerlegt sie per Regex zurueck, und `failure.test.ts`
  **haelt den Verlust selbst fest**: die Form mit "see" ergibt `code: null`. Schlimmste Stelle:
  `app/transfers/board.tsx:184` laesst den Job-Ledger-Parser ueber einen beliebigen
  HTTP-Response-Body laufen und zeigt dem Nutzer rohes JSON.
- **`pack` ist vier Artefakte** mit je eigener `manifest.jsonl` (`training/pack.py`,
  `training/packs.py` — ein Modulname Unterschied —, `training-pack/` aus Kotlin, und der
  Crop-Pool). Namensfrage, aber eine, die jeder Neuleser einmal falsch raet.

## Widerlegt in Runde 2 — gehoert dazu

- **"Wie viele Tests pruefen nur, dass ein Symbol existiert?"** — **1,9 %** (57 von 3 063), und
  zwei Drittel davon sind bewusste Ratchets. Die Suite hat dieses Problem nicht. Verhalten:
  Python 97,9 %, TS 97,1 %, Kotlin 97,8 %.
- **Testkoerper duplizieren sich fast nicht** (Kotlin: 2 Paare ueber 0,82 Aehnlichkeit von 1 261).
  Die Doppelung sitzt auf **Datei**-Ebene.
- **"115 Kotlin-Zitate zeigen auf `entry.md`"** — nein: 114 `invariant N` sind **unqualifiziert**
  (und `docs/specs-index.md` haelt die Landkarte), genau **eine** Datei nannte den toten Pfad.
  Gefixt.
- **`ingestToken` praegt bei unlesbarer Datei keinen neuen Token** — das `wx`-Fallback liest
  zurueck und wirft. Der Test dazu steht jetzt trotzdem im Baum.
- **`withMotionThrFor` ist nicht mehr doppelt** — beide Seiten delegieren seit gestern an
  `TrackerConfig.atFrameRate`. Der Abschnitt weiter oben in diesem Dokument ist an der Stelle
  bereits veraltet.
- **`frame-flag.ts` schreibt in Pythons `log.jsonl` — und tut es richtig** (COPYFILE_EXCL,
  tmp+rename, No-Op bei gleichem Wert). Einziger Effekt: `ensure_ascii`, kosmetisch.
- **`B904` abgeschaltet verliert keine Ursachen** — nur 8 Stellen werfen ohne `from`, und Python
  verkettet ueber `__context__` ohnehin.
- **`coverage_output` fehlt, 14-Spalten-Graph als 13 gelesen: faengt der Code laut**
  (`OnnxSquareClassifier.kt:219`).
