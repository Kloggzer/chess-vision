# Commit-Latenz — wo die Zeit sitzt und was sie kostet

Gefragt (2026-09-07): *„kannst du das noch beschleunigen ohne Qualität zu verlieren?"* Gemessen an
Handy-Aufnahmen (15 fps) und dem Regressionssatz, Phantome als Veto. **Stand der Vorgaben
(2026-09-13): Bewegungsende → Commit 133 ms (2 Frames bei 15 fps)**, vorher 333 ms — Scores auf
allen 15 Aufnahmen identisch zum Ausgang.

## 1. Das Budget je Ply am PC

`scripts/commit_budget.py` zerlegt jeden retimeten Ply (`docs/retime.md`), Mediane auf 20-27-33:

| Stück | Median | was es ist |
|---|---|---|
| Stellung → ruhig | 0,2–0,4 s | der Nachlauf der Hand über dem Brett |
| ruhig → Kandidat | 0,2 s | `motionHoldS` nach dem letzten Bewegungs-Frame, dazu die Settle-Frames |
| Kandidat → Commit | ~0 s | die CNN-Bestätigung — am PC synchron mit Cache |

**Der Referenz-Hold bleibt 0,20 s** — das ist die Zeit des Arms, nicht die der Engine. 0,1 s
kostete auf dem 30-fps-Satz ein Phantom (222741) und 11 Züge (233432); 50 ms ließen auf 11-59-12 den
zurückgehenden Arm zur Referenz werden (8 267 Frames „ILLEGAL MOVE?"). Was früher committet, ist
der getrennte Commit-Hold (§4).

## 2. Das Handy war nie 2–3× langsamer

`ConcatFrameSource` verlor an jeder 60-s-Segmentnaht ein Frame-Intervall (bis 19 Frames über eine
Partie), also lagen die Handy-Commits in `frame_phone` zu spät. Auf der eigenen Uhr des Videos
liegt das Handy 0 bis +0,29 s hinter dem PC. Die Differenz ist die Rundreise des Observers: der
erste Blick auf einen Kandidaten ist strukturell unbrauchbar (`VerifySingle`: `snap.seq <
pend.seq`). Jede Timeline-Zeile trägt seitdem den Motion-Score (`TrackerStatus.motion`) für
`settle_compare.py`.

## 3. Was offen bleibt

- Eine Beobachtung aus der Ruhephase VOR dem Kandidaten annehmen statt eine nach `pend.seq` —
  nicht gebaut, Veto-Risiko ist eine Hand unter der Bewegungsschwelle. Die Sofort-Beobachtung (§4)
  holt denselben Gewinn ohne dieses Risiko.
- Ausreißer von 12–18 s sitzen bei Handy UND PC im Warten auf Ruhe, nicht in der Verifikation
  (`docs/tracker-flow.md`, „Verifier-Stillstand" Punkt 4).

## 4. Commit unter der Hand: was die 133 ms trägt (2026-09-12/13)

Werkzeug: `replay … trace=<file>` (Engine-Zustand je Frame), `scripts/commit_latency_ab.py <base>
<cand>` (Commits zweier Batches je Ply gepaart). 15 fps mit `set:motionThr=0.5`, wie
`TrackerService.engineConfig()` es am Gerät tut.

**Ausgelieferte Vorgaben:**

- **Sofort-Beobachtung** (`verifyObserveNow`): wartet ein Kandidat (`EngineOps.verifyWaiting()`),
  warpt der Koordinator den AKTUELLEN Frame, der Beobachter nimmt ihn im selben Frame. Die normale
  Anfrage bleibt stehen, sonst kippt die Parität der Jeder-zweite-Frame-Kadenz (20-57-45 verlor
  daran 45 Plies). −67 ms, Scores identisch.
- **Same-Frame-Drain:** der Koordinator zieht die Snapshot-Queue nach dem Beobachter-Aufruf noch im
  Frame. −67 ms, jeder Commit genau einen Frame früher, kein Zug anders.
- **Getrennter Commit-Hold:** `commitHoldS` 0,067 und `SETTLE_FRAMES_CNN` 2 öffnen die Detection
  früher; die Referenz wartet auf `refHoldUntil`, den vollen Hold. Ein Commit davor setzt
  `refProvisionalUntil`, der erste ruhige Frame danach ersetzt die Referenz.

**Was den Split sicher macht** — ohne diese Regeln committete er falsch (`gxh3` statt `g3`, `Bxe4`
17 Frames zu früh):

- **Verifikations-Lücke:** `verifyMove` ist lokal auf die Kandidatenfelder. Eine sichere andere
  CNN-Ableitung blockiert jetzt den Belegungs-Commit.
- **Ankunftsregel:** das Zielfeld eines Schlagzugs ist vorher und nachher belegt; Rung 2 verlangt
  den Schläger per Identität auf dem Zielfeld — nur im Motion-Hold (`earlyCommit`), weil sie bei
  Standardwerten Schlagzüge 467 ms verzögerte.
- **Sichtbarkeits-Serie:** ein Commit im Hold braucht `earlyCommitObs` (2) Beobachtungen, in denen
  jedes Zugfeld unverdeckt war (Rillen- UND Coverage-Arm je Feld) und schon die Nach-Zug-Belegung
  zeigte. „Die Hand darf nicht im selben Crop sein wie ein Element, das committet wird" (Nutzer).
- **Dispatch-Gate, Referenz-Komposit, Paar-Rückfall:** eine Hypothese wird im Hold erst pending,
  wenn ihre Felder gesehen settled sind; ein von der Leiter verworfenes Paar wird in derselben
  Stellung nie wieder vorgeschlagen (`rejectedPair`/`rejectedPairFen`).
- **Schnellspiel-Paar:** Keepalive-Taints sind eine eigene Teilmenge (`keepaliveTainted`); nur für
  die Paar-Bewertung bekommt ein Feld, das die frische Beobachtung sicher belegt liest, seine
  Evidenz zurück (`captureTargetsRestored`).

**Der Latch-Fix:** `updateBaselineOcclusion` läuft nur bei Bewegung oder verdecktem Gitter. Vorher
lief er auch im `occluded`-Zustand und hielt ihn bei Holds unter 0,1 s ohne Ausgang.

**Verworfen, gemessen:** kein `learnNoise`, kein `censusNoise.update`, Farbwechsel als Widerspruch
im Taint-Filter, Ganzbrett-Sicht ohne Keepalive-Taints — jeder löste eine Aufnahme und riss eine
andere. Remap statt `warpPerspective` (5,2 → 5,1 ms: die Zeit ist das Einsammeln der Pixel),
LiveAlign auf der halbskalierten Kopie, Crop-Warp als Future am Frame-Kopf (mehr CPU). Parallel
bleiben Rillen-Hand, ROI-Bewegung und der Crop-Warp nach dem Tick: Wanduhr 15,1 → 10,1 ms je Frame.

**Offen (`TODO.md`):** den Nachbarring der Sicht-Serie EINZELN messen — der Coverage-Kopf liest
Zellen mit 5–15 % echter Verdeckung zu 59 % als frei, mit 15–30 % zu 24 %; und eine Messung am
Gerät. Die Unit-Tests zum Motion-Hold pinnen `commitHoldS = null`.

## 5. Die Commit-Schwelle aus einer Zielrate ableiten: geht heute nicht (2026-08-24)

Idee: statt `minAgreement`/`marginSquares`/`plyCostSquares` von Hand zu setzen, die tolerierte
Phantomrate vorgeben und die Schwelle ableiten (leave-one-recording-out, Clopper-Pearson).
`desktop replay` schreibt je Commit eine `decision-conf:`-Zeile (`scripts/commit_truth.py`,
`scripts/commit_calibrate.py`). Ergebnis: **die Merkmale trennen nicht.**

- 311 Commits, 9 erfunden: AUC `margin` 0,725, `bestScore` 0,546, `cnnAgreement` 0,492 (Zufall).
- `gridCoverage` ist bei 100 %, `cnnAgreement` bei 95 % der Commits exakt 1,0; `margin` steht bei
  47 % auf dem Sentinel `NO_SCORE` — „kein Zweitbester", also die wenigste Evidenz.
- Ziel ≤ 2 % kostet 122 von 204 richtigen Plies, um 7 von 9 Erfindungen zu töten. Die Handarbeit
  bleibt.
- Falle: mit 4 statt 9 Erfindungen hatte `bestScore` AUC 0,844. Bei einstelligen Positivzahlen ist
  jede Merkmals-Rangfolge Rauschen.

Es bräuchte einen ungesättigten Konfidenzwert, etwa die temperaturskalierte Emissions-Likelihood der
committeten Stellung gegen die zweitbeste. Alle 9 Erfindungen kamen aus `cnn_recovery`, und ein
Wert auf einem überzeugt falschen Modell erbt dessen Überzeugung (`docs/tracker-flow.md`,
„Emissionen sind korreliert").
