# Architektur-Review 2026-09-22 — vier Hypothesen an `android/core-engine/`

Herkunft: externes Review (Codex, "Astra"). Hier geprueft wird am Code, nicht an der Prosa; drei
weitere Befunde derselben Liste sind schon erledigt (`89248cac`, `90803db4`, Verify-Leiter).
Belegt heisst: Datei und Symbol genannt, und wo ein echter Fehler behauptet wird, liegt ein roter
Test dabei. Kein Produktionscode geaendert.

**Die vier neuen roten Tests** (nicht gefahren — auf dem Rechner lief ein Replay):

| Test | Modul | Befund |
|---|---|---|
| `ClearRefProvisionalBugTest` | `:core-engine` | H1 — `clearRef` laesst `refProvisionalUntil` stehen |
| `RecoveryBufferClearBugTest` | `:core-engine` | H2 — ankerlose Recovery leert nur `grayBuf` |
| `OverhangCensusCacheBugTest` | `:core-engine` | H3 — `updateConfig(overhang)` laesst die Census-Codes stehen |
| `CoverageGateColumnParityTest` | `:desktop` | H4 — die zwei `withCoverageGateOf` sind auseinandergelaufen |

    ./gradlew.bat :core-engine:test :desktop:test --rerun-tasks

---

## H1 — die Referenz-Epoche: **BELEGT**, mit einem echten Fehler darin

### Gesehen

Fuenf Stellen loeschen die Epoche, und sie loeschen fuenf verschiedene Mengen. Keine ist Obermenge
einer anderen:

| Feld | `Guards.clearRef` | `clearReferenceState` | `discardVisualReference` | `Commit.finishCommit` | `CnnTick.commitRecovery` (ohne Anker) |
|---|---|---|---|---|---|
| `refGray` / `refBgr` / `refFen` | x | x | x | neu gesetzt | x (von Hand) |
| `refCorners` | – | – | x | neu gesetzt | – |
| `refGamut` | – | – | x | bleibt (`fromCommit`) | – |
| `refCensus` / `refCensusFor` | – | – | x | – (Identitaet) | – |
| `refProvisionalUntil` | **–** | x | x | neu gesetzt | **–** |
| `grayBuf` / `bgrBuf` | – | x | x | – | **nur `grayBuf`** |
| `pending` / `verifyState` | – | x | x | `pending` | – |
| `tainted`, Vetos, Fristen | – | x | **–** | – | – |
| `stuckReason` / `refusedStreak` | – | x | **–** | x | x |

Es sind also nicht "verschieden grosse Teilmengen", sondern **zwei orthogonale Familien**:
`clearReferenceState` raeumt die Vetos und den Stuck-Zustand, ruehrt aber Ecken, Gamut und Census
nicht an; `discardVisualReference` genau umgekehrt. `clearReferenceState` nennt sich im KDoc selbst
"die INTERSECTION der drei Aufrufer" — das gilt innerhalb seiner Familie und sagt ueber die andere
nichts.

Welche Ueberlebenden sind harmlos, und warum:

- `refCorners` ueberlebt `clearRef`/`clearReferenceState`, wird aber nur in `cornersJumped`
  gelesen, und `detectGuards` erreicht diesen Zweig erst hinter `refGray != null`. Bis dahin hat
  `setRef` die Ecken neu gesetzt.
- `refCensus`/`curCensus` haengen an einem **Identitaets**-Schluessel (`refCensusFor === ref`), nicht
  an Gleichheit. Ein neues Referenzbild ist ein neues Objekt, also rechnet `refCensusCodes` neu.
  Das traegt — bis jemand die BOXEN unter dem gleichen Bild wechselt, siehe H3.
- `refGamut` ueberlebt beide Loeschungen, wird aber in `FrameLoop.updateBaselineOcclusion` nur
  hinter `ref != null` gelesen, und der naechste stille Anker (`setRef`, `fromCommit = false`)
  ruft `markGamutStale`. Fenster ohne Neuberechnung: keines.

### Geschlossen

Ein Feld beschreibt nach der Loeschung wirklich die alte Epoche und wird danach gelesen:
**`refProvisionalUntil` ueberlebt `Guards.clearRef`.**

Sein eigenes KDoc in `EngineState` behauptet das Gegenteil — "Cleared with the reference itself —
it outlived every path that drops `refGray`/`refFen`" — und `RefProvisionalResetTest` prueft genau
diese Invariante fuer `clearReferenceState`, `discardVisualReference` und `adoptPosition`.
`clearRef` ist die vierte Tuer und fehlt in beidem. Der Weg dahin: ein frueher Commit
(`finishCommit` setzt den Merker), dann ein Eckensprung — `detectGuards` ruft `clearRef`. Danach
faengt `FrameLoop.stableMeans` die Referenz frisch (Zweig `refGray == null`, sauber, mit
`markGamutStale`), und der NAECHSTE ruhige Frame findet `refProvisionalUntil > 0.0` und
`!motionSinceRef` vor und ueberschreibt sie ueber `setRef(fromCommit = true)` — ohne
`markGamutStale`. Das ist wortwoertlich der Defekt, fuer den `RefProvisionalResetTest` angelegt
wurde, auf dem vierten Pfad.

Nebenbefund am selben Feld: es wird **nirgends gegen `nowS` geprueft**, nur auf `> 0.0`. Name und
KDoc ("is re-captured at this time") lesen sich wie eine Frist, der Code ist ein Flag. Ein Leck
laeuft deshalb nicht von selbst ab. Auch `commitRecovery` setzt es nicht (`finishCommit` weist es
auf jedem Commit-Weg zu) — dort blockiert nur `motionSinceRef = true` den Zweig voruebergehend.

Roter Test: `ClearRefProvisionalBugTest`. Der Fix waere eine Zeile in `clearRef`; ob er den
Regressionssatz bewegt, ist ungemessen (er verschiebt, welcher Frame Referenz wird), deshalb
**nicht angefasst**.

### Wie man mich widerlegen koennte

Zeigen, dass `detectGuards` den `cornersJumped`-Zweig nie mit `refProvisionalUntil > 0.0` erreicht
— etwa weil jeder fruehe Commit vor dem naechsten Eckensprung ueber `stableMeans` aufgeloest wird.
Dann bliebe der Befund eine Invarianzluecke ohne Pfad.

---

## H2 — "Zug anwenden" mehrfach implementiert: **BELEGT**, ein echter Fehler

### Gesehen

Feld fuer Feld, `Commit.commitMove` / `Commit.commitSequence` (beide via `finishCommit`) gegen
`CnnTick.pushRecovery`+`commitRecovery`:

| Nachbedingung | `commitMove` | `commitSequence` | `commitRecovery` |
|---|---|---|---|
| `board`, `history`, Decision-Zeile je Zug | gleich | gleich | gleich (`pushRecovery`) |
| `lastMove`, `lastCommitSize` | 1 | `moves.size` | `moves.size` |
| `queueSessionCapture` | x | x | x |
| Referenz | `setRef(fromCommit = true)` | dito | `setRefComposite(..., fromCommit = true)` oder von Hand genullt |
| `refProvisionalUntil` | zugewiesen | zugewiesen | **nicht beruehrt** |
| `state` | `MOVE` | `MOVE` | `WAITING` (kommentiert) |
| `motionSinceRef` | `false` (via `setRef`) | `false` | **`true`** (kommentiert) |
| `verifyState` | `confirmed` | `confirmed` | **nicht gesetzt** |
| `confirmer`, `clearStuck`, `anomalySince`, `clearDesyncStreak` | x | x | x |
| `pending` | `null` | `null` | **nicht gesetzt** (per Konstruktion null) |
| `cnnStatus` / `cnnConflicts` | bleiben | bleiben | auf `ok` / leer |
| `takenBack` | bleibt (kommentiert) | bleibt | bleibt (kommentiert) |
| Alarm | bleibt | bleibt | `clearAlarm(null)` |

Die drei grossen Abweichungen (`state`, `motionSinceRef`, Alarm) tragen je einen Kommentar, der
sie begruendet — das ist in Ordnung. Ohne Erklaerung sind:

1. **`commitRecovery` leert bei fehlendem Anker `grayBuf`, aber nicht `bgrBuf`.** Der Zweig
   `anchor == null` schreibt `refGray = null; refBgr = null; refFen = null; grayBuf.clear()` — eine
   fuenfte Schreibweise derselben Loeschung, und eine, die nur die halbe Mittelung wegwirft. Danach
   mittelt `RunningMeanBgr` weiter ueber Frames aus der Stellung VOR der Bruecke, waehrend das Grau
   frisch zaehlt. `FrameLoop.stableMeans` uebergibt dieses ungleiche Paar an `setRef`, also wird
   `refBgr` — und ueber `markGamutStale` der Gamut des Schattenvetos — aus alten Pixeln gebaut.
   Roter Test: `RecoveryBufferClearBugTest`. Fix waere `bgrBuf.clear()`; ob das den
   Regressionssatz bewegt, ist ungemessen, deshalb nicht angefasst.
2. `verifyState` bleibt nach einer Bruecke stehen, was immer die Leiter zuletzt sagte
   (`ghost`, `shadow`, `stalled`). Nur Anzeige, aber die Anzeige beschreibt dann die Epoche davor.
3. `cnnStatus` traegt entgegen seinem KDoc (`null | "ok" | "mismatch"`) auch `shadow` und `ghost`
   (`VerifyPair.acceptShadow`, `VerifyPair`-Reject). `AnomalyPatcher` fragt nur auf `mismatch`, also
   heute folgenlos — aber der Wertebereich im KDoc stimmt nicht.

Die Gegenoperationen sind sich einig genug: `TrackerEngine.undo` (kappt `lastCommitSize` auf
`history.size`, nullt `lastMove`, trimmt den Log, `clearReferenceState`), `setFen` (ueber
`adoptPosition` plus `history.clear()` und `decisionLog.clear()`) und `Resync.performResync`
(`adoptPosition`, Historie BLEIBT, eine `cnn_resync`-Zeile). `adoptPosition` ist der gemeinsame
Kern und setzt `lastCommitSize = 0`, was `undo` danach inert macht — kommentiert.

### Geschlossen

Die Nachbedingungen stimmen NICHT ueberein, aber die Abweichungen, die zaehlen, sind bis auf
Punkt 1 erklaert. Der Befund ist damit weniger "vier Implementierungen derselben Operation" als
"vier Implementierungen der REFERENZ-Nachbereitung" — und genau dort liegt der Fehler. `pushRecovery`
und `commitSequence` sind ohnehin schon Zeile fuer Zeile identisch (beide tragen denselben
Kommentar ueber `history.size` als Ply-Nummer); der Unterschied steckt allein im Schwanz.

### Wie man mich widerlegen koennte

Zeigen, dass `recoveryAnchor` nie `null` liefert — es faellt auf `lastCur` zurueck, und `lastCur`
ist nach einem stabilen Frame gesetzt. Dann waere der `bgrBuf`-Zweig toter Code. Gegenprobe:
`lastCur` wird in `stableMeans` unbedingt zugewiesen, auch `null` direkt nach einem Pufferleeren —
und genau dann ist auch `snap.gray` haeufig nicht auf `detSize`.

---

## H3 — `TrackerConfig` ohne Validierung: **TEILS BELEGT**, ein echter Fehler in `updateConfig`

### Gesehen

`TrackerConfig` ist ein `data class` ohne `init`-Block; es gibt keine einzige `require`. Die vier
genannten Kopplungen:

- **`verifyObsVotes > verifyWindow`** — seit dem Leiter-Fix **entschaerft**, nachgeprueft:
  `VerifySingle.ladder` berechnet `bound = pend.frames >= config.verifyWindow || verifyExpired(pend)`,
  und die lokale `waiting()` faellt bei `bound` auf `windowEnd` statt leer zurueckzukehren; `VerifyPair`
  spiegelt das (`atEnd()`). Eine zutreffende, aber stimmenlose Sprosse haelt den Kandidaten nicht mehr.
  Ein Restpfad bleibt: der Ausstieg `earlyCommit && !sightSettled(...)` steht VOR `bound` und gibt
  leer zurueck, zaehlt dabei aber `pend.frames` hoch. Gebunden ist er nur ueber `verifyTimeoutS`
  (`verifyExpired` misst ab `startedS`) und dadurch, dass `earlyCommit` mit `refHoldUntil` ohnehin
  in ~0,16 s verfaellt.
  **Ebenfalls entschaerft, aber anders als gedacht:** Sprosse 2 stimmt gar nicht mit
  `verifyObsVotes`, sondern mit `COMMIT_VOTES = 1`. Ein hochgedrehtes `verifyObsVotes` macht also nur
  die ABLEHNUNGEN traeger, nie die Commits — wer daran dreht, um "vorsichtiger" zu werden, erreicht
  das Gegenteil dessen, was der Name nahelegt.
- **`commitHoldS < motionHoldS`** — belegt. `EngineState.earlyCommit` ist genau dieser Vergleich
  (plus `nowS < refHoldUntil`) und schaltet drei Stellen um: den Sicht-Riegel in `tryDetect`, den in
  `VerifySingle.ladder`, und `sig.commits(early = ...)`. Bei den ausgelieferten Vorgaben (0,0632
  gegen 0,1592) ist der Arm LIVE. Nicht validiert ist die andere Richtung: `commitHoldS >
  motionHoldS` ist erlaubt, schaltet `earlyCommit` aus und schiebt die Detektion hinter die
  Referenz-Freigabe — eine Kombination, die nirgends gemessen ist.
- **`earlyCommitObs = 0`** — belegt und dokumentiert: `Taint.sightSettled` gibt bei `need <= 0`
  sofort `true` zurueck, der Kommentar in `TrackerConfig` sagt "0 = the hold alone". Still ist erst
  die KOMBINATION mit dem Punkt darueber: `commitHoldS < motionHoldS` **und** `earlyCommitObs = 0`
  committet innerhalb des Bewegungs-Holds ganz ohne Evidenz — die Begruendung fuer den frueheren
  Commit (2026-09-13: "Evidenz statt physischem Hold") ist dann weggeschaltet, und kein Gate
  bemerkt es.
- **`motionPxThr` doppelt belegt** — belegt. `FrameLoop.updateMotion` gibt ihn an `motionScore`
  (Bewegungsschwelle je Pixel), `FrameLoop.updateBaselineOcclusion` reicht
  `motionPxThr * BASELINE_ABS_THR_FACTOR` (4,0) als Absdiff-Schwelle der Baseline-Verdeckung weiter.
  Eine Zahl, zwei Sensoren, ein fester Faktor dazwischen; CLAUDE.md haelt die Folge schon fest
  (26,5 % Uebereinstimmung unter dem befoerderten 34,544 gegen 73,8 % bei 20). Der Code selbst nennt
  die Kopplung an keiner der beiden Stellen.

**`updateConfig` — ja, es fehlt ein Feld.** Heute behandelt es vier Faelle: `syncAvgWindow`,
`syncConfirmWindow`, `rebuildBoxes` bei `detSize`/`overhang`, `discardVisualReference` bei
`detSize`/`diffClaheClip`. Fehlt: **nach einem `overhang`-Wechsel muessen die Census-Caches
verworfen werden.** `evidenceBoxes` wird neu gebaut, `refGray` bleibt dasselbe OBJEKT, und
`Evidence.refCensusCodes` schluesselt auf `refCensusFor === ref`. Der naechste Frame vergleicht
also Codes ueber die NEUEN Boxen gegen zwischengespeicherte Codes ueber die alten — im dazugekommenen
Streifen gegen nie beschriebene Bytes. `maybePatchAnomaly` macht an genau dieser Stelle das
Richtige (`refCensusFor = null; curCensusFor = null`), weil es `refGray` ebenfalls unter gleicher
Identitaet aendert. `overhang` steht in `LIVE_TUNABLE_KEYS`, ist also erreichbar. Das Fenster ist
kurz — der stille Neu-Anker tauscht `refGray` fast jeden ruhigen Frame —, aber genau die Frames,
in denen NICHT neu verankert wird (Kandidat offen, stuck), sind die interessanten.
Roter Test: `OverhangCensusCacheBugTest`.

### Geschlossen

Die Hypothese stimmt in der Sache, aber zwei ihrer vier Beispiele sind inzwischen falsch oder
schief: `verifyObsVotes > verifyWindow` ist gefixt, und `earlyCommitObs = 0` ist dokumentiert. Das
eigentliche Loch ist nicht die fehlende `require`-Kette, sondern dass `updateConfig` eine
**Handliste** von Feldern mit Nebenwirkung ist, die nirgends gegen die Felder von `TrackerConfig`
abgeglichen wird. Die Ratsche dafuer gibt es nicht; `UpdateConfigRebuildsBoxesTest` prueft genau
einen Fall.

### Wie man mich widerlegen koennte

Messen, dass der stille Neu-Anker in JEDEM Frame zwischen `updateConfig` und dem naechsten
`computeEvidence` greift — dann ist der Census-Cache nie der alte. Oder zeigen, dass
`censusCodesInBoxes` den Puffer vollflaechig beschreibt statt nur in den Boxen; dann waere nur der
Randstreifen betroffen, nicht "nie beschriebene Bytes".

---

## H4 — die Naht zu `core-cnn`: **TEILS BELEGT** — ein echter Fehler an den zwei
`withCoverageGateOf`; die gespaltenen Leser sind heute inert, die `>=`/`>`/`<=`-Behauptung formal

### Gesehen

Doppelte Wahrheiten, nachgezaehlt. `TrackerConfig` fuehrt `cnnConfThr`, `cnnMinAgreement`,
`minConfidentBoard`, `minConfidentRecovery`, `cnnMarginSquares`, `cnnPlyCostSquares`,
`recoveryMaxPlies`, `cnnColorAxis`; `CnnEvaluator` fuehrt `confThr`, `minAgreement`,
`minConfidentBoard`. Wer welche liest:

| Stelle | liest |
|---|---|
| `VerifySingle.Signals`, Sprossen 1–4, `VerifyPair` | `cnn.confThr`, `cnn.minAgreement`, `cnn.minConfidentBoard` |
| `CnnTick.onMatchOk` (Blindblick-Riegel) | `cnn.confThr`, `cnn.minConfidentBoard` |
| `TrackerEngine.cnnDesync` | **`config.cnnConfThr`, `config.minConfidentBoard`** |
| `CnnTick.resolvesAlarmConflicts` | **`config.cnnConfThr`** |
| `Taint.cnnConfirmedUnchanged` | **`config.cnnConfThr`** |
| `acceptCnnPosition` / `resyncToBoard` | `cnn?.confThr ?: config.cnnConfThr` |
| `TrackerStack.submitObserved` | `seed.config.pOccludedThr`, **einmal im Konstruktor kopiert** |

Also ja: derselbe Begriff wird an einer Stelle aus dem Evaluator und an der naechsten aus der
Config gelesen. **Heute fallen die beiden trotzdem nicht auseinander, und zwar aus zwei Gruenden,
die keiner geprueft wird:** `TrackerStack.cnnConfig(seed.config)` kopiert acht Felder von Hand aus
GENAU der Config, die die Engine bekommt (`TrackerSeed` traegt das Ergebnis von `engineConfig`,
also schon durch `withCoverageGateOf` gelaufen), und keines der acht steht in
`LIVE_TUNABLE_KEYS` — ein Wechsel geht nur ueber einen Neustart, der beide Seiten neu baut.
Nachgesehen, weil es beinahe schiefgegangen waere: `RunSeed` haelt die ROHE gespeicherte Config,
nicht die gegatete, sonst wuerde `liveConfig` bei jedem Live-Knopf `calibratedConfThr` ein
weiteres Mal auf einen schon uebersetzten Wert legen.
Die Kopie ist also korrekt, aber sie ist eine Kopie: acht Zeilen, die stimmen muessen, und der
Fallback `cnn?.confThr ?: config.cnnConfThr` in `acceptCnnPosition`/`resyncToBoard` zeigt, dass die
Nahtstelle selbst nicht weiss, welche der beiden gilt. Dasselbe Muster eine Ebene tiefer:
`TrackerStack.occludedThr` friert `pOccludedThr` im Konstruktor ein — heute inert, weil auch dieser
Knopf nicht live ist.

**`pOccludedThr` mit drei Operatoren:** formal richtig, in der Sache fast folgenlos.
`OccupancyObservation.confident` vergleicht `pOccluded >= (coverageThr ?: 1.0 - thr)`,
`Taint.modelHandSquares` `> config.pOccludedThr`, `Taint.cnnConfirmedUnchanged` und
`TrackerStack` `<= ` bzw. `>`. Das `<=` ist die Verneinung des `>`, also konsistent; zwischen `>=`
und `>` liegt allein der Punkt exakter Gleichheit, und die gemessenen Gates (0,05…0,35) treffen
eine Sigmoid-Ausgabe nicht. **Aber:** `confident` gatet auf der Coverage-Achse, `modelHandSquares`
auf derselben Zahl in die andere Richtung, und beide heissen im Code nicht danach. Das ist ein
Lesbarkeits-, kein Verhaltensbefund — kein roter Test.

**Die zwei `withCoverageGateOf` sind auseinandergelaufen.** `TrackerService` (`:app`) steigt aus
mit `if (spec?.coverageOutput != true) return this` — der Fix vom 2026-09-15, mit eigenem Test
(`CoverageGateNeedsTheColumnTest`). `DesktopCnn` (`:desktop`) steigt nur bei `spec == null` aus und
zieht fuer ein Modell OHNE Coverage-Spalte trotzdem beide Achsen: `coverage_gate` auf
`pOccludedThr`, und `calibratedConfThr` auf `cnnConfThr`. Fuer die sieben ausgelieferten Modelle
ist das folgenlos (alle deklarieren `coverage_output`); fuer jedes aeltere Modell im Replay ist es
eine andere Konfiguration als auf dem Telefon — auf der Achse, auf der 2026-09-16 gemessen wurde,
dass 0,85 real 48–70 % heisst. Der Rest beider Funktionen ist Wort fuer Wort dieselbe Kopie,
inklusive Warntext.
Roter Test: `CoverageGateColumnParityTest` (`:desktop`). **Welche Richtung richtig ist, ist eine
Entscheidung, keine Messung:** die Temperatur-Uebersetzung haengt sachlich nicht an der
Coverage-Spalte, also kann ebenso gut `:app` die fehlerhafte Seite sein. Deshalb nur der Test und
diese Zeile, kein Fix.

### Geschlossen

Auf die woertliche Frage — kann eine Stelle heute die eine Zahl lesen, wo die andere gilt? —
lautet die Antwort **nein**, aber nur, weil kein einziges der doppelt gefuehrten Felder live
tunebar ist. Das ist keine Konstruktion, das ist ein Zufall, und nichts prueft ihn: wer morgen
`cnnConfThr` in `LIVE_TUNABLE_KEYS` aufnimmt, spaltet Verify-Leiter und Desync-Veto, ohne dass ein
Test anschlaegt.
Die Naht traegt doppelte Wahrheiten, und eine davon ist bereits einmal auseinandergelaufen, ohne
dass es jemand bemerkte — die Bedingung steht in der einen Funktion und fehlt in der anderen, und
nur eine hat einen Test. Das ist die teuerste Stelle der vier, weil hier der GEMESSENE Wert und der
GEFAHRENE auseinanderfallen koennen, und dieses Projekt hat genau daran schon dreimal verloren
(warmer Beobachtungs-Cache, `prior=0` im Regressionssatz, `coverage_gate` im Replay nicht angewandt).

### Wie man mich widerlegen koennte

Nachweisen, dass kein Replay je ein Modell ohne `coverage_output` faehrt — dann ist die Divergenz
unerreichbar. Die Liste der Modelle unter `data/models/` mit `"coverage_output": false` waere der
Beleg.

---

## Nach Hebel

Gemessen daran, wie oft dieses Projekt an der jeweiligen Stelle schon falsch lag:

1. **Die Naht `TrackerConfig` ↔ Evaluator ↔ `withCoverageGateOf` (H4).** Hier ist der Irrtum
   nicht "der Code tut das Falsche", sondern "die Messung galt einer anderen Konfiguration als der
   gefahrenen" — die teuerste Fehlerart, die dieses Projekt kennt. Umbau mit dem meisten Ertrag:
   EINE Funktion, die aus `ModelSpec` + gespeicherter Config die Lauf-Config macht, in einem Modul,
   das `:app` und `:desktop` beide sehen (`:tracker-runtime` trägt `ModelSpec` schon), plus die
   Engine-seitige Entscheidung, ob `cnn.confThr` oder `config.cnnConfThr` gilt — eine von beiden,
   nicht beide.
2. **Der Referenz-Schwanz (H1 + H2).** Fuenf Schreibweisen derselben Loeschung, und in zweien
   davon fehlt je ein Feld (`refProvisionalUntil`, `bgrBuf`). Beides sind exakt die Defekte, fuer
   die `RefProvisionalResetTest` und `EngineStateBuffersTest` schon existieren — die Klasse ist
   erkannt, die Aufzaehlung ist es nicht. Umbau: die Epoche als EIN Objekt mit einer
   `clear()`-Methode und expliziten Teil-Loeschungen, oder mindestens eine Ratsche, die jede
   Funktion, die `refGray` nullt, gegen die Feldliste haelt.
3. **`updateConfig` als Handliste (H3).** Ein Feld fehlt heute (`overhang` → Census-Cache), und
   nichts haelt die Liste gegen `TrackerConfig`. Billigster Hebel des ganzen Berichts: ein Test,
   der jeden Knopf aus `KNOBS` einmal verdreht und prueft, dass kein identitaets-gekachter
   Ableitungszustand die Aenderung ueberlebt.
4. **Die Kopplungen ohne Validierung (H3, Rest).** Real, aber die Kombinationen sind nicht
   erreichbar, ohne dass jemand bewusst dreht — und wer dreht, misst. Hier reicht, was CLAUDE.md
   schon tut: aufschreiben. Eine `require`-Kette in `TrackerConfig` wuerde vor allem Replays
   brechen, die Raender absichtlich abfahren (`FuzzSearch`).
