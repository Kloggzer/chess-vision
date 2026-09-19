# Schlagzug auf besetztes Feld: 19,7 s statt 3 s

Nutzer, 2026-09-19: "hinten raus dauert das erstaunlich lange fuer die erkennung". Gemessen an
der Partie, die er danach spielte (59 Plies, Matt mit `Rxe8#`), aus `adb logcat`.

## Die Messung

Wartezeit zwischen zwei Commits, aus den Logcat-Zeitstempeln:

| Ply | Zug | Wartezeit |
|---|---|---|
| 48-52 | Nf6, Rdc2, Rac8, d5, cxd5 | 2,1-3,1 s |
| 53 | Qxc8 | 4,2 s |
| 54 | Rxc8 | 3,5 s |
| **55** | **Rxc8+** | **19,7 s** |
| 56 | Qxc8 | **0,0 s** |
| **57** | **Rxc8+** | **15,5 s** |
| 58 | Ne8 | 6,6 s |

Der Rest der Partie lag bei 2-7 s. Die Ablehnungsquote steigt im letzten Zehnerfenster auf 58 %
(gegen 23 % in der Mitte), haeufigster Grund `STUCK no_legal_move` (14x).

## Der Mechanismus

**Fuenf Schlagzuege hintereinander auf c8** — Qxc8, Rxc8, Rxc8+, Qxc8, Rxc8+. Bei Ply 54 sah der
Erkenner:

    ply=54 COMMIT e8c8  changed=[e8=33.9 a8=2.7 a3=1.5]           cnnAgree=1.000
    ply=54 REJECT c2c7  changed=[c2=19.0 c7=2.8 d8=1.9]           cnnAgree=0.500   (8x)

**`c8` steht auf keiner der Listen.** Dort stand ein schwarzer Turm, danach ein weisser — gleiche
Silhouette, nur andere Farbe, und der Frame-Diff misst die Aenderung der Pixel. Der echte Zug war
`Rc2xc8`.

`Scoring.loglikScores` bewertet ALLE legalen Zuege nach der Summe der Logits ihrer beruehrten
Felder. `Rc2xc8` bekommt c2 = 19,0 und c8 ~ 0; `Rc2c7` bekommt c2 = 19,0 und c7 = 2,8. Der falsche
Zug gewinnt auf 2,8 Punkten Rauschen, und die Engine wiederholt ihn achtmal, waehrend das CNN mit
`cnnAgree=0.500` halb widerspricht.

Aufgeloest wurde es erst, als ein ZWEITER Zug das Brett genug veraenderte: Ply 55 und 56
committeten zusammen als `cnn_pair` auf `changed=[e6=31.9 c8=22.7 c2=18.6 ...]`. Deshalb brauchte
Ply 56 exakt 0,0 s — er kam mit 55 gratis.

## Was daran NICHT der Engpass war

- **Die Bildrate nicht.** Dieselbe Partie lief mit den gemessenen 15 fps (`sensor gap 66,7 ms`).
- **Das CNN nicht.** 12-28 ms je 64 Crops, keine Drift.
- **Die Zugzahl nicht.** Im Regressionssatz ueber zehn Aufnahmen faellt die Ablehnungsquote mit
  steigendem Ply (65-74 % frueh, 23-53 % spaet). "Hinten raus" ist hier der Abtausch, nicht das
  Alter der Partie.
- **Kein ALARM.** Null in der ganzen Partie.

## Die offene Frage

Der Frame-Diff ist auf einem Schlagzug blind, wenn geschlagene und schlagende Figur dieselbe
Silhouette haben — Turm schlaegt Turm ist der haerteste Fall, Dame schlaegt Turm der naechste.
Das CNN sieht den Unterschied (Klasse UND Farbe), aber die Rangfolge der Kandidaten kommt aus dem
Frame-Diff-z, nicht aus der CNN-Klasse; das CNN darf nur noch zustimmen oder nicht.

**Nicht gemessen:** ob eine Kandidatenbewertung, die bei besetztem Zielfeld die CNN-Klasse statt
der Pixelaenderung heranzieht, den Fall loest, ohne anderswo Phantome zu erzeugen. Das waere eine
Engine-Aenderung und braucht `scripts/replay-regression.ps1` gegen 396/3/0/171 bei 5 Alarmen — und
der Regressionssatz enthaelt genau diesen Fall vermutlich zu selten, um ihn zu bewerten.

## Der Clip

`data/testclips-real/real-c8-exchange.mp4` — 48,2 s, 2560x1440, 15 fps, aus der Partie selbst
geschnitten (Session `20260919-162622`, Videozeit 205,0-253,2 s; Segment 003 ab 25 s plus
Segment 004 bis 13 s, ohne Neukodierung). Daneben `real-c8-exchange.labels.json`:

| Feld | Wert |
|---|---|
| `start_fen` | `2r1r1k1/5ppp/2p1qnb1/1p1P4/pB2P3/2Q2P2/P1R1B1PP/2R3K1 b - - 0 26` |
| `san` | cxd5, **Qxc8, Rxc8, Rxc8+, Qxc8, Rxc8+** |
| `corners` | Median-Quad ueber die 725 Frames des Fensters |
| `margin` | 0,045 — ArUco-Ecken sitzen im Label-Rand, ohne den Wert ueberdehnt der Warp um 6-8 % |
| `board_size` | 896 (aus der `settings.json` der Sitzung) |

**Fuenf der sechs Halbzuege schlagen auf c8.** Die Zugfolge ist nicht abgetippt, sondern aus den
sechs verschiedenen FENs der `timeline.jsonl` mit `python-chess` hergeleitet — inklusive der
Stelle, an der ZWEI Halbzuege in einer einzigen Stellungsaenderung stecken, weil die Engine
dazwischen 19,7 s hing.

### Warum er NICHT in `tests/data/testclips/` liegt

Zwei Gruende, beide hart:

1. **Groesse.** 53 MB gegen 11 MB fuer die gesamte bestehende Suite. Die Blender-Clips sind
   640x640 und board-only; herunterzuskalieren wuerde ausgerechnet das Signal zerstoeren, um das
   es geht — bei 1280x720 faellt ein Feld von ~116 auf ~58 px, unter die 80 px des Modells.
2. **Der Katalog haengt an `parity/index.json`.** `SimClips` liest die Clip-NAMEN und je Clip
   eine `parity/<name>/meta.json` mit der `effectiveConfig`, die der PYTHON-Tracker wirklich fuhr
   — Kotlins eigene Vorgaben weichen davon ab (`occlusionColorThr` 3,0 gegen 1,5), Vorgaben zu
   nehmen wuerde einen Portierungsfehler vortaeuschen. Diese Fixtures erzeugt
   `scripts/emit_parity_fixtures.py`; ohne sie einen Namen in den Index zu schreiben, faehrt
   `ClipReplayParityTest` gegen nicht vorhandene Daten.

`SimClips` ist auf echte Clips vorbereitet — `simClipDir` liest `-Pchesslab.sim.clips`, und der
`margin`-Schluessel existiert ausdruecklich fuer sie ("a real clip's entry carries the profile's
value, which is what makes its warp right"). **Was fehlt, ist der Paritaets-Eintrag.**

## KORREKTUR und Replay-Befunde (2026-09-19, spaeter)

### Meine Erklaerung war zur Haelfte falsch

Ich hatte geschrieben, `c8` sei unsichtbar, weil Turm und Turm dieselbe Silhouette haben. Die
Engine misst auf c8 aber sehr wohl: **13,4** bei Ply 2 (Qxc8), **23,3** bei Ply 4, **18,8** bei
Ply 6. Nur waehrend des Stillstands zeigt c8 GAR NICHTS, waehrend c2 auf 29,1 bis 18,6 steht —
und vetoiert war c8 bei den acht Wiederholungen nicht (nachgezaehlt: 12 Entscheidungen auf Ply 3,
c8 im `occlVeto` nur bei dreien, keine davon eine der acht).

Der Mechanismus steht in `Evidence.kt`: `z = max(zGray, censusZWeight * zCensus)`.

- `zGray` ist der Absdiff gegen die Referenz, **medianormiert** ("so a global exposure jump dies").
- `zCensus` ist Struktur und **ausdruecklich beleuchtungsinvariant** ("which is why it sees the
  dark-on-dark moves the gray mean dilutes away").

Turm gegen Turm trifft beide an ihrer schwachen Stelle: die Helligkeitsaenderung wird ueber die
64 Felder weggemittelt, und der Kanal, der sonst einspringt, ist per Bauart farbenblind. Dass die
Silhouette gleich ist, ist also der Grund fuer das Versagen des ZWEITEN Kanals — nicht fuer das
Fehlen des Signals ueberhaupt. **Warum c8 im Stillstand auf ~0 faellt und bei Ply 4 auf 23,3
springt, ist damit noch nicht erklaert.**

### Der Clip laeuft im Replay — und findet alles

`data/recordings/rxr-c8-20260919/` (Video + `candidate.json` + auf das Fenster zugeschnittene
`timeline.jsonl`, aus der der Replay die Startstellung liest). Ergebnis: **6 gefunden, 0 verpasst,
0 erfunden.** Die Korrektheit stimmt; der Fehler steckt in den FRAME-Nummern, und der Replay
reproduziert ihn: Ply 3 bei Frame 139, Ply 4 erst bei 431 — 292 Frames = **19,5 s**, praktisch die
19,7 s vom Geraet.

### Kein gebundeltes Modell loest es

Sechs Modelle ueber den Clip, Wartezeit je Zug in Sekunden:

| Modell | cxd5 | Qxc8 | Rxc8 | **Rxc8+** | Qxc8 | Rxc8+ | Summe |
|---|---|---|---|---|---|---|---|
| p4a-128 / p4-128 / p4afull-128 / p4full-128 | 1,8 | 3,9 | 3,5 | **4,2** | 15,3 | 15,4 | **44,1** |
| p4a-80 | 7,1 | 0,0 | 2,1 | **4,3** | 15,2 | 15,4 | **44,1** |
| p4a-80-clahe (Champ) | 5,9 | 0,0 | 3,3 | **19,5** | 0,0 | 15,4 | **44,1** |

**Die Summe ist bei allen sechs identisch.** Der Champ buendelt die Wartezeit auf einen Zug und
bekommt den naechsten gratis; die anderen verteilen sie. Gefuehlt ist das ein grosser Unterschied,
gemessen ist es dieselbe Zeit — ein Modellwechsel waere hier Kosmetik.

**Die Konstante, die bleibt:** die letzten zwei Zuege kosten in JEDEM Modell ~15 s. Ob das die
Engine ist oder die Hand ueber dem Brett, trennen diese Daten nicht — die Referenzzeiten stammen
aus der Erkennung selbst. Das braucht eine von Hand gesetzte Wahrheit, wann der Zug wirklich fiel.

## Die Ursache: das Rauschmodell lernt die Aenderung weg (2026-09-19)

`probe=<feld>` schreibt die drei Beweiskanaele EINES Feldes je Frame in die Replay-Trace
(`ReplayOptions.probeSquare`, `ReplayTrace`). Fuer c8 ueber den Stillstand:

| Frame | `diff` (grau, roh) | `census` (roh) | **`z` (fusioniert)** | changed | Veto |
|---|---|---|---|---|---|
| 204 | 76,91 | 97,61 | **0,00** | nein | nein |
| 264 | 76,80 | 97,91 | **0,00** | nein | nein |
| 360 | 76,96 | 99,96 | **0,00** | nein | ja |
| 432 | 70,08 | 91,30 | **23,30** | **ja** | nein |

**Beide Kanaele sehen die Aenderung die ganze Zeit — 77 und 99 — und das fusionierte `z` ist
null.** Der Nutzer hatte also recht: die Helligkeit aendert sich enorm. Sie kommt nur nicht an.
Und die Verdeckung ist es nicht: bei Frame 204-264 steht kein Veto und `z` trotzdem auf 0,00.

### Die Rueckkopplung

`SquareNoise` fuehrt je Feld einen EMA und misst daran:

    mean[i] = (1-a) * mean[i] + a * diff          // a = 0,05, JEDEN Frame
    std[i]  = max(3,0, (1-a) * std[i] + a * |d-m|)
    z[i]    = (diff - mean[i]) / std[i]

Eine Figur, die auf einem Feld STEHEN BLEIBT, liefert denselben `diff` Frame fuer Frame — der EMA
holt ihn ein. Nachgerechnet fuer einen Sprung auf 77 bei den ausgelieferten Vorgaben:

| Frame | 0 | 3 | **5** | 15 | 30 |
|---|---|---|---|---|---|
| `z` | **12,83** | 4,24 | **2,93** | 1,15 | 0,60 |

**Nach fuenf Frames liegt `z` unter `zThr = 3,0` — bei 15 fps ein Drittel einer Sekunde.** So
lange hat die Engine Zeit, eine bleibende Aenderung zu bemerken, bevor ihr eigenes Rauschmodell
sie unter die Schwelle gelernt hat.

Der Schutz dagegen EXISTIERT: `update(exclude = …)` faehrt fuer den Grau-Kanal Alpha 0, "Gray
exclusions learn nothing". Er greift nur fuer Felder, die bereits als geaendert gelten — und das
wurde c8 nie, weil sein `z` schon unter der Schwelle lag. **Der Kreis ist der Defekt**, nicht das
Lernen selbst.

`PersistentChangeLearnedAwayTest` haelt beides fest: den Verfall unter `zThr` in fuenf Frames und
den Gegenbeweis, dass ein ausgeschlossenes Feld sichtbar bleibt.

### Was das ueber die Modelle sagt

Kein gebundeltes Modell aendert daran etwas — sie sitzen hinter dieser Stufe. Dass die 128er den
Zug bei Frame 203 statt 431 committen, verschiebt nur, WELCHE der beiden Halbzuege wartet; die
Gesamtzeit bleibt 44,1 s. **Das hier ist die Stelle, an der ein Fix ansetzen muesste**, nicht am
Klassifikator.

## Der Fix: die Verdeckungsfrage darf nicht nur die BELEGUNG kennen (2026-09-19)

`Taint.cnnOcclusionFilter` entschied bisher allein ueber die Belegung:

    if (!obs.confident(name, thr) || occupancyAgreesWithBoard(i, obs)) taint = taint.with(i)

und `occupancyAgreesWithBoard` traegt den Kommentar "Occupancy only, never identity: a knight read
as a pawn still agrees here, **deliberately**". Ein Schlagzug auf ein besetztes Feld aendert die
Belegung nie — er galt damit als VERDECKER, und `applyTaints` nullt dessen `z`. Daher die exakten
0,00 ueber 217 Frames, obwohl beide Rohkanaele 77 und 99 zeigten.

`identityDisagrees` stellt die zweite Frage: liest das Modell dort SICHER eine andere Figur als das
Brett fuehrt, ist es der Zug und kein Verdecker. Schwelle `taintIdentityThr`.

| `taintIdentityThr` | `Rxc8+` committet bei | vetoierte Felder im Clip |
|---|---|---|
| 0 (Engine-Vorgabe) | Frame 431 | 22 |
| **0,5** | **Frame 202** | **12** |
| 0,7 | Frame 431 | — |

**15,3 Sekunden frueher, und die Haelfte der Blendungen faellt weg** — der zweite Gewinn trifft
genau den Fall "Hand liegt auf dem Zielfeld", denn fuer diesen Filter sind eine Hand und ein
Schlagzug auf besetztes Feld ununterscheidbar gewesen.

### Regressionssatz: keine einzige Abweichung

    Referenz              396/3/0/171 bei 5 Alarmen (10 Aufnahmen)
    taintIdentityThr=0.5  396/3/0/171 bei 5 Alarmen (10 Aufnahmen)

Je Aufnahme verglichen: identisch. `invented` bleibt 0 — die Achse, vor der der Kommentar warnt.

### Wo der Wert steht, und warum nicht in der Engine

`TrackerConfig.taintIdentityThr` bleibt bei **0**. Die Vorgabe dort zu aendern riss alle sieben
Python-Paritaetstests (`ClipReplayParityTest`, `EvidenceTest`, `NoiseLearningTest`, …) — die Engine
ist an Pythons aufgezeichnetes Verhalten gepinnt. Gesetzt wird der Wert deshalb von der APP, in
`TrackerService.engineConfig` neben den drei Korrekturen, die dort schon sassen
(`TAINT_IDENTITY_THR = 0.5`). Der Knopf steht in `NOT_A_SETTING`: kein Regler im Spiel
(Nutzer, 2026-09-19).

### Zwei verworfene Spuren, damit sie niemand nochmal geht

- **Die Silhouette.** "Turm sieht aus wie Turm" erklaert das Versagen des Census-Kanals, aber nicht
  das fehlende Signal: `diff` stand die ganze Zeit auf 77.
- **Das Rauschmodell.** `SquareNoise` lernt eine stehende Aenderung tatsaechlich in fuenf Frames
  unter `zThr` — nachgerechnet und als `PersistentChangeLearnedAwayTest` festgehalten. Es ist aber
  NICHT die Ursache hier: ein EMA liefert nie exakt 0,00, `applyTaints` schon.

---

## KORREKTUR (2026-09-19, spaeter Abend): der Fix verglich zwei verschiedene Formen

Der oben beschriebene Fix war falsch implementiert, und alle Zahlen dieses Dokuments wurden mit
der falschen Fassung gemessen. Gefunden beim Versuch, den Fix nachtraeglich zu testen — es gab
keinen.

**Der Fehler.** `identityDisagrees` verglich

```kotlin
val seen = obs.label(name)          // "bB" — Klassenform, w/b plus Grossbuchstabe
val held = board.pieceCharAt(name)  // 'b'  — ein FEN-Zeichen
return obs.labelConfident(name, thr) && seen != held.toString()
```

`"bB" != "b"` ist IMMER wahr. Die Funktion meldete also fuer jedes sicher gelesene besetzte Feld
"Identitaet weicht ab", nicht nur dort, wo das Modell wirklich eine andere Figur liest. In
`cnnOcclusionFilter` wird daraus `agrees == false` fuer jedes solche Feld — ein sicher gelesenes
besetztes Feld konnte damit gar nicht mehr als Verdecker gelten. Statt "ein Schlagzug auf ein
besetztes Feld ist kein Verdecker" stand dort faktisch "**kein** sicher gelesenes besetztes Feld
ist ein Verdecker".

**Behoben** durch den Vergleich in derselben Form (`board.labelAt(name)`, also ebenfalls `"bB"`).

**Der Test, den es nie gab.** `TaintIdentityTest` haelt jetzt BEIDE Richtungen:

| Fall | `thr = 0` | `thr = 0,5` |
|---|---|---|
| Modell liest eine ANDERE Figur als das Brett fuehrt | Verdecker | kein Verdecker (der Zug) |
| Modell liest DIESELBE Figur (Hand darueber) | Verdecker | **weiter Verdecker** |

Die zweite Zeile war rot und ist der eigentliche Fund; die erste war schon vorher gruen und hat
den Fehler deshalb verdeckt. Ohne die Gegenprobe haette ein Test den Bug bestaetigt statt ihn zu
zeigen.

### Was jetzt ungeklaert ist

- **Die 15,3 s bei c8** (Frame 431 -> 202) sind mit abgeschaltetem Verdeckungsschutz gemessen.
  Ob der Gewinn den korrigierten Vergleich ueberlebt, ist offen.
- **`396/3/0/171` bei 5 Alarmen, Ziffer fuer Ziffer wie die Referenz** — gemessen mit derselben
  kaputten Fassung. Das ist die unangenehmere Zahl: der Regressionssatz hat nicht bemerkt, dass
  der Verdeckungsschutz fuer sicher gelesene besetzte Felder ausgeschaltet war. Entweder tritt
  dieser Fall dort kaum auf, oder der Satz misst die Achse nicht. **Das ist zu klaeren, bevor der
  Satz wieder als Freigabe fuer eine Engine-Aenderung gilt.**
- Beide Messungen sind zu wiederholen. Sie brauchen einen neuen `:desktop:installDist`, der nicht
  laufen darf, waehrend ein Batch dieselbe Binary benutzt.

**Nicht betroffen:** die Analyse der Doppelcommits (`docs/doppelcommits-2026-09-19.md`) ruht auf
den Logs des REFERENZlaufs mit `taintIdentityThr = 0`; dort springt die Funktion in der ersten
Zeile heraus. Der Vergleich ref-gegen-fix darin trug allerdings dieselbe kaputte Fassung — der
dort gemeldete zweite Fund (`Raxd4`+`Rb1+`, 4,4 s frueher) steht unter demselben Vorbehalt.

### Nachgemessen mit dem korrigierten Vergleich (2026-09-20)

Beide Messungen wiederholt, auf einem frischen `:desktop:installDist` mit `board.labelAt`:

| | thr = 0 | thr = 0,5 |
|---|---|---|
| `Rxc8+` (ply 4) | Frame 432 | **202** |
| `Qxc8` (ply 5) | Frame 432 | 432 |
| Entscheider | `cnn_pair` | `cnn_occupancy` (beide) |

Der Clip laeuft mit **14,94 fps**, die 230 Frames sind also **15,4 s**. Alle uebrigen Plies
committen frameidentisch. Das Doppelcommit ist aufgeloest: aus einem `cnn_pair` auf Frame 432
werden zwei einzelne Entscheidungen.

**Der Gewinn kam also vom beabsichtigten Mechanismus, nicht vom Bug.** Die kaputte Fassung hat
dasselbe Ergebnis geliefert und zusaetzlich den Verdeckungsschutz abgeraeumt — sie war schlechter,
ohne besser auszusehen.

Regressionssatz auf demselben Build: **396/3/0/171 bei 5 Alarmen**, Ziffer fuer Ziffer die
Referenz. Die drei `missed` liegen wie immer alle in `VID_20260727_233929`.

**Der Vorbehalt von gestern bleibt bestehen und ist jetzt zweifach belegt:** derselbe Satz liefert
`396/3/0/171` mit intaktem UND mit abgeschaltetem Verdeckungsschutz. Er misst diese Achse nicht.
Wer eine Engine-Aenderung mit "Regressionssatz unveraendert" freigibt, sagt damit weniger, als es
klingt. Ein Satz, der diese Achse trifft, waere eine eigene Aufgabe — der Screening-Lauf
(`scripts/screen_knobs.py`) zeigt dasselbe von der anderen Seite: `taintIdentityThr` bewegt auf
vier Aufnahmen an beiden Raendern keine einzige Zahl.
