# Nachtschicht 2026-09-20/21 — was gefunden wurde

Eine Runde mit mehreren parallelen Bearbeitern auf disjunkten Bereichen plus zwei unabhängigen
Durchsichten. Ergebnis: **25 Fehler mit rotem Test**, drei davon in Sachen, die ich selbst am
selben Tag gebaut hatte.

Jeder Eintrag hier ist am Code belegt und hat einen Test, der ohne den Fix rot ist. Was nur
vermutet war, steht als solches da.

## Die Sorte, die immer wieder kam

Von den 25 fallen die meisten in **eine** Familie: eine stille Rückfallebene, die einen
**ungemessenen** Fall als gemessenen ausgibt.

| Ort | Form | Folge |
|---|---|---|
| `chain_decode.py` | `1.0 - (cov or 0.0)` | die ungemessene Zelle stimmt mit vollem Gewicht |
| `test_used.py` | `except: continue` | halbes `eval_test.json` = „nichts verbrannt", Exit 0 |
| `cross_eval.py` | `if not sp.exists(): return False` | unbekannte Herkunft gilt als saubere |
| `screen_knobs.py` | `max(value, 0)` | das `-1` für „kein Score" wird zur gemessenen 0 |
| `DecisionLog.kt` | `snap?.inferMs ?: 0.0` | „nie gemessen" wird zu 0,0 ms |
| `matte_audit.py` u. a. | Nenner = Gesamtzahl | Anteil an Ungeprüftem statt an Geprüftem |

Das ist keine Zufallsverteilung. Wer hier sucht, sollte zuerst nach `or`, `?:`, `except: pass`,
`.get(x, default)` und Sentinel-Werten an Stellen fragen, wo „nicht da" und „gemessen null"
verschiedene Dinge sind.

## Die vier schwersten Einzelfunde

**Eine erfundene Mehr-Ply-Brücke.** `discardVisualReference()` nimmt Referenz und Geometrie weg,
räumte aber die offene Recovery-Stimme nicht ab — der *weichere* Vorfall (Ecken-Sprung) tut das
längst. Stimme eins fiel damit durch die alte Rektifizierung und committete mit der ersten neuen
einen Halbzug, den niemand zweimal unter derselben Geometrie gesehen hat. Das ist die teuerste
Sache, die diese Engine falsch machen kann.

**Ein BOM sperrte jedes menschliche Urteil aus.** Python liest `.jsonl` bewusst als `utf-8-sig`;
der TS-Zwilling tat es nicht. Eine BOM-gestempelte `review-notes.jsonl` hätte jedes Urteil aller
Sitzungen unerreichbar gemacht, weil die Leser bei einer kaputten Zeile *mittendrin* die ganze
Datei wegwerfen — und Zeile 1 mit BOM sieht genau so aus.

**Ein Cache, der das Modell nicht im Kopf trug.** `sweep_prior_lambda` validierte den
Wahrscheinlichkeits-Cache über die **Zeilenzahl**. Ein zweiter Lauf meldete damit die Softmax des
ersten Modells unter dem Namen des zweiten. Exakt die Falle, die der Replay-Cache mit seinem
Schlüssel auf Graph *und* `config.json` vermeidet, und die dort schon einmal ein Temperatur-A/B
wertlos gemacht hat.

**Jede Feldfarbe umgedreht.** `plan_setups.square_color` rechnete mit dem 1-basierten Rang, `a1`
galt als hell.

## Der erste bewiesene tote Sensor

`darkLumaThr` prüft **zweimal** dieselbe Größe gegen dieselbe Schwelle:

| | Ort | Folge |
|---|---|---|
| zuerst | `FramePipeline.darkNote` | Frame verworfen, **kein `FrameInput`** |
| danach | `FrameLoop` | `Skip(SKIP_DARK)` = `gate:dark` |

Ein Frame, der die zweite Bedingung erfüllen würde, hat die erste schon getroffen. Das Tor der
Engine **kann im Produkt nicht feuern** — passend dazu zeigt der Korpus in 1 066 309 Frames
kein einziges `gate:dark`. Der Fuzzer erreicht es nur, weil er die Pipeline umgeht.

Ob die redundante Wache bleiben soll, ist eine Entscheidung und keine Messung. Sie kostet nichts
und trägt, falls die Engine je aus einer anderen Quelle gefahren wird — genau das tut der Fuzzer.

## Drei Fehler in Sachen, die am selben Tag gebaut wurden

Ohne die zwei unabhängigen Durchsichten wären alle drei durchgegangen:

1. **Ein Fix stand nur in der Commit-Nachricht.** Das Patch-Skript fand seinen Zielblock nicht
   mehr (ein Formatierer hatte ihn umgeschrieben), meldete trotzdem Erfolg, und die Behauptung
   ging ins Protokoll. Seitdem: `assert` vor jeder Ersetzung, und danach wird das **neue**
   Textstück gegreppt.
2. **Eine Vorgabe zu ändern nützt nichts, wenn der Aufrufer sie überschreibt.** `gridArm` wurde
   auf den Gerätewert gesetzt, der Sampler zog es weiter in der Hälfte der Fälle anders. Jetzt
   über `coverageModel` als echte Exklusivität modelliert.
3. **Eine Nebenbedingung, die den Amtsinhaber ablehnt.** Die neue Alarm-Regel hätte den am selben
   Tag promoteten Champion verworfen: er holt sich eine Episode in einer Aufnahme und spart acht
   in einer anderen. Treffer sind je Aufnahme unverhandelbar, Alarme sind ein **Budget über den
   Satz**.

## Was der Optimierer sagt

Unter vier harten Nebenbedingungen (Treffer, Phantome, scharfe Vetos, Alarm-Budget) findet die
Suche **nichts Besseres** als den aktuellen Stand. Die Ablehnungsquote der Alarm-Achse liegt bei
rund der Hälfte, und das Budget auf dem Suchsatz ist **2 Episoden** — der Amtsinhaber ist bereits
so ruhig, dass kaum Spielraum bleibt.

Der wahrscheinlichste Schluss: der Champion liegt nahe an einem Optimum **unter dem vollständigen
Ziel**. Die früheren, größeren Latenzgewinne waren zum Teil mit Alarmen bezahlt, die niemand
gezählt hat.

---

# Fortsetzung 2026-09-21, Tag — die Wächter selbst geprüft

Die Frage war: gibt es mehr Fälle der Familie oben? Ja. Sie liegen auf vier Ebenen, und die
Methode war jedes Mal dieselbe: **nicht die Prosa lesen, sondern den Erkenner einen
eingepflanzten Verstoß vorlegen** — oder die Sperre neutralisieren und sehen, ob jemand schreit.

## 1. Die Ratschen: derselbe Fehler in drei Sprachen

Der Kommentarzähler prüft `startsWith` auf der getrimmten Zeile und hält damit eine Zeile
INNERHALB eines String-Literals für einen Kommentar — TS an `/*`, Python an `#`, Kotlin an `//`
im rohen String. Der TS-Zwilling stand deswegen auf 5 von 5, eine Codezeile von einem grundlosen
roten Build. Gefunden nur, weil zu jeder Ratsche eine Gegenprobe geschrieben wurde; vorher hatte
genau **eine** Ratsche im Projekt eine.

Dazu in den Web-Ratschen fünf weitere Fehltreffer. Der schwerste: die Routen-Ratsche zählte
**`describe.skip` als „getestet"** — also genau die Zusage, die CLAUDE.md mit „0 von 29 ohne
Test" zitiert. Heute ist kein Routen-Test übersprungen, der Fund ist also latent; gedeckt war
die Zusage trotzdem nicht.

Jeder Fix ist verhaltensgleich belegt, indem alt gegen neu über den ganzen Baum gezählt wurde:
Kotlin 724 Quellen, **null bewegte Zahlen**.

## 2. Die Sperren im Code: Mutationsprobe

| Bereich | Sperren | ungedeckt |
|---|---:|---:|
| `platform/app` | 31 | 6 |
| `android/core-engine` | 26 | 3 |
| `android/tracker-runtime` | 20 | 3 |
| `src/chesslab` | 12 | 4 |

Der teuerste Einzelfund: `pack._rewritten_since_pack` vergleicht `(mtime, size)`, aber alle fünf
bestehenden Staleness-Tests ändern BEIDE Hälften. Ersetzt man die Bedingung durch reinen
Größenvergleich, bleibt die Suite grün — und genau der in CLAUDE.md beschriebene Fall fällt weg.

## 3. Die Dokumente, aus denen entschieden wird

- Bug-Audit: **drei von acht „offenen" Befunden waren gebaut** (C2, C4, C7). C2 trug den Satz
  „Kein roter Test: er braucht den Rücksignal-Pfad, den es nicht gibt" — den Pfad gibt es seit
  `b7a9287d`, samt Test.
- Entscheidungsvorlage: elf Einträge falsch, darunter ein **doppelt vergebener Punkt 30**, dessen
  ältere Fassung von der neueren selbst widerrufen wird.
- CLAUDE.md: drei Ratschen-Stände falsch; eine der Zahlen nannte ihre Basis nicht (Stellen oder
  Dateien?), was den Fehler vermutlich erzeugt hat.

## 4. Die Sonden, die das messen sollten, hatten den Fehler auch

`scripts/guard_ablation.py` meldete „gedeckt", wenn sich EINE Desync-Episode bewegte und keine
einzige Entscheidung. `fuzz ablate` fällte sein Urteil ohne jede Gegenprobe. Beides behoben.

## Negatives Ergebnis, auch ein Ergebnis

Die 15 `skip` und 11 `xfail` in Python sind sauber — jeder nennt seinen Grund, und bei allen elf
`xfail` lautet er „Entscheidung des Nutzers, darum nur benannt". `vulture` findet nichts, auch
nicht in `scripts/`, das bis heute gar nicht durchsucht wurde. Diese Achsen tragen keinen stillen
Rückfall.

## Und die Ausgangsfrage

Alle zehn booleschen Wachen der Engine einzeln abgeschaltet: **`docs/wachen-ablation-2026-09-21.md`**.
