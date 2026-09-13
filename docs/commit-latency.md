# Commit-Latenz — wo die halbe Sekunde sitzt und was sie kostet (2026-09-07)

Gefragt: *„kannst du das noch beschleunigen ohne Qualität zu verlieren?"* Gemessen an den
Handy-Aufnahmen vom 2026-09-06 (15 fps) und dem Regressionssatz (30 fps), Phantome als Veto.

## 1. Das Budget je Ply am PC

`scripts/commit_budget.py` zerlegt jeden retimeten Ply (`docs/retime.md`) in drei Stücke, aus dem
Replay-Log und dem `<motiondump>.status.csv`:

| Stück | 20-27-33, Median | was es ist |
|---|---|---|
| Stellung → ruhig | 0,2–0,4 s | der Nachlauf der Hand über dem Brett, nachdem die Figur steht |
| ruhig → Kandidat | 0,2 s | `motionHoldS` 0,2 s nach dem letzten Bewegungs-Frame, dazu 3 stabile Frames |
| Kandidat → Commit | ~0 s | die CNN-Bestätigung — am PC synchron mit Cache |

Der Hold und die Settle-Frames decken sich: bei 15 fps sind 3 Frames 0,2 s, bei 30 fps 0,1 s
unter dem Hold. Deshalb bewegt `settleFramesOverride=2` **nichts** (identische Zahlen), und
`motionHoldS=0,1` ist der einzige Hebel — er kostet auf dem 30-fps-Satz ein Phantom (222741:
33/0/0 → 22/11/1) und 11 verlorene Züge auf 233432 (21/0/0 → 10/11/0), während die 15-fps-Videos
sauber blieben (`tmp/batch/lat-hold01-20260907`). **0,2 s Hold bleiben**; der Rest der halben
Sekunde ist die Hand.

## 2. Das Handy war nie 2–3× langsamer

`phone_vs_pc.py` las bis zum 2026-09-07 die Handy-Commits aus `frame_phone`, und die lagen über
die Partie um bis zu 19 Frames zu spät: `ConcatFrameSource` addierte an jeder 60-s-Segmentnaht
nur die letzte PTS und verlor damit ein Frame-Intervall je Segment (30 Segmente = 2,1 s). Auf der
eigenen Uhr des Videos (Sync-Basis der Timeline auf die PTS-Tabelle):

| Aufnahme | PC Stellung → Commit | Handy | Differenz |
|---|---|---|---|
| 2026-09-06-21-29-35 | 0,67 s | 0,73 s | +0,06 s |
| 2026-09-06-20-27-33 | 0,51 s | 0,80 s | +0,29 s |
| 2026-08-30-16-20-19 | 1,13 s | 1,13 s | 0 |

22-43-46 (25,7 fps, altes Timeline-Format) lässt sich so nicht abbilden. Die Differenz ist die
Rundreise des Observers: der erste Blick auf einen Kandidaten ist strukturell unbrauchbar
(`VerifySingle`: `snap.seq < pend.seq`), am Handy kostet die nächste Beobachtung 1–2 Frames plus
Inferenz. Seit 2026-09-07 trägt jede Timeline-Zeile den Motion-Score (`TrackerStatus.motion`),
damit `settle_compare.py` an der nächsten Partie den Settle-Anteil des Handys direkt liest.

## 3. Was bleibt

- Der Observer könnte eine Beobachtung aus der Ruhephase VOR dem Kandidaten annehmen, statt
  eine nach `pend.seq` zu verlangen — spart am Handy 0,1–0,2 s je Zug, ändert am PC nichts und
  ist nur am Gerät messbar. Nicht gebaut: das Veto-Risiko wäre eine Hand, die unter der
  Bewegungsschwelle noch über den Feldern liegt.
- Die Ausreißer von 12–18 s sitzen bei Handy UND PC im Warten auf Ruhe (Hand über dem Brett),
  nicht in der Verifikation (`docs/verifier-stall.md` §4).

## 4. Nachtrag 2026-09-12: der Latch, die getrennte Referenz, die Sofort-Beobachtung

Werkzeug: `replay … trace=<file>` schreibt den Engine-Zustand nach JEDEM Frame (Gate,
Settle-Zaehler, Hold, CNN-Alter, Deckung), `scripts/commit_latency_ab.py <base> <cand>` paart die
Commits zweier Batches je Ply und stellt found/missed/invented daneben. Alle Laeufe ueber den
Zehner-Satz, ein JVM nach dem anderen; 15 fps mit `set:motionThr=0.5`, wie
`TrackerService.engineConfig()` es am Geraet tut. Rohdaten `tmp/latency/<arm>/`.

**Wie oft, nicht nur wie lang (30 fps, Basis, 378 Commits):** Detect-Gate 40x je Commit,
CNN-Inferenz 15/s durchgehend (69 je Commit), 0,91 explizite Verifikationen je Commit, ein
Zyklus von ein bis zwei Frames. 479 Rejects, davon 202 `no_legal_move`, 131 `ambiguous`, 44
`too_many_changed`; 147 von 375 Commits kamen per CNN-Recovery statt Frame-Diff.

**Der Latch (9e8bec26).** `updateBaselineOcclusion` lief in jedem Zustand ausser `waiting`/`move`,
also auch im kern-verdeckten `occluded`. Feuert `ready` innerhalb des 0,1-s-Keep-alive der
Kern-Stempel — nur bei Holds unter 0,1 s moeglich — wird die ruhige Stellung jeden Frame gegen die
ALTE Referenz gemessen; ein gespielter Zug traegt drei und mehr Kern-Felder, `> 2` haelt den
Zustand, ohne Bewegung kein Ausgang. 13-52-38 verlor so 8 von 25 Plies, 00-39-57 52 von 67. Jetzt
laeuft die Baseline nur bei Bewegung oder verdecktem Gitter; bei 200 ms Hold ist der Pfad
unerreichbar, die Entscheidungslogs alter und neuer Basis sind bytegleich.

**50 ms Hold bleibt verboten, auch mit Fix**: 11-59-12 committet Ply 59 richtig (`e3d4`, Evidenz
14,3/9,4 statt 31,5/29,4), aber das Mittel von 5742/5744 wird Referenz und die Felder unter dem
zurueckgehenden Arm melden 8 267 Frames lang „ILLEGAL MOVE? g1,b2,h2,a4"; 222741 traegt ein Phantom.
0,20 s ist die Zeit des Arms, nicht die der Engine.

**Commit und Referenz getrennt (66b4574e).** `commitHoldS` (null = `motionHoldS`) oeffnet die
Detection frueher; die Referenz wartet auf `refHoldUntil`, den vollen Hold. Ein Commit davor setzt
`refProvisionalUntil`, und der erste ruhige Frame nach dem vollen Hold ersetzt die Referenz durch
das Bild, auf dem der alte Pfad committet haette. Kommt vorher neue Bewegung, bleibt die Markierung
stehen — der Labeler soll solche Commits kennen (`TODO.md`). Bei 15 fps, 2 Settle-Frames,
Commit-Hold 67 ms: 13-52-38 median 133 ms frueher (333 → 200 ms ab Bewegungsende, p90 400 → 267),
25/0/0 — aber 00-39-57 17/50/**1**: `gxh3` statt `g3`.

**Die Verifikations-Luecke dahinter (e9835263).** `verifyMove` ist lokal auf die Felder des
Kandidaten: mit Bauer auf h3 stimmt gxh3 2/2 genau wie g3, und g3 selbst schaut niemand an. Der CNN
hatte `g2g3` abgeleitet, Rung 2 committete trotzdem. Jetzt blockiert eine sichere andere Ableitung
den Belegungs-Commit; die Basis hatte den Fall nur per Zufall ueber die Recovery umschifft.

**Sofort-Beobachtung (e0c48408, `verifyObserveNow`, Vorgabe aus).** Der Beobachter fragt beim
Nehmen erst den Warp an, den der naechste Frame liefert: Anfrage und Warp wechseln sich ab, jeder
zweite Frame, `noCrops` = die Haelfte der Versuche. Ein Kandidat wartet bei 15 fps bis zu 133 ms
auf seinen pruefenden Blick. Mit dem Knob warpt der Koordinator nach dem Engine-Schritt den
AKTUELLEN Frame, sobald `EngineOps.verifyWaiting()`, und der Beobachter nimmt ihn im selben Frame.
Das ist §3, erster Punkt, ohne das Veto-Risiko einer Beobachtung von VOR dem Kandidaten.

**Gemessen, Zehner-Satz bei 15 fps, ein Binary (e9835263), Basis = gefixte Engine ohne Knobs:**

| Arm | Score gegen die Basis | Bewegungsende → Commit, Median (p90) | Verify Median (p90) |
| --- | --- | ---: | ---: |
| Basis | — | 333 ms (400) | 133 (133) |
| Verify-Guard | 10/10 identisch, Zeiten bitgleich | 333 (400) | 133 (133) |
| Sofort-Beobachtung | 10/10 identisch | **267 (333)** | **67 (67)** |
| Split 133 ms + Sofort-Beobachtung | 233929 1 Phantom (`a5`, cnn_pair), 11-59-12 52/21 | 200 (200) | 67 (67) |

Die Sofort-Beobachtung spart je Commit im Median 67 ms ohne eine einzige Score-Aenderung —
das ist der Hebel, der ausgeliefert werden kann. Der Split spart weitere 67 ms, committet aber
`Bxe4` 17 Frames vor der Label-Stellung: bei einem Schlagzug ist das Zielfeld ohnehin belegt,
`verifyMove` sieht 2/2, und die Ankunft des Schlaegers sieht niemand — der Hold hatte das
physikalisch abgedeckt. Die Ankunftsregel per Identitaet steht in `TODO.md`; erst mit ihr ist
der Split ein Kandidat. Die 15-fps-Basis selbst traegt auf 222741 ein Phantom (`Nf2`,
cnn_recovery), das 30 fps nicht hat — der skalierte Satz ist rauschiger, und der Split hat es dort
nicht (33/0/0).

### Nachmittag: Kadenz, Drain, Parallelisierung (2026-09-12, Fortsetzung)

**Die Sofort-Beobachtung darf die Kadenz nicht verschieben (5136a4f9).** Der erste Bau
beantwortete die Anfrage des Beobachters und kippte damit die Paritaet der
Jeder-zweite-Frame-Kadenz; 20-57-45 verlor 45 Plies an eine paritaetsempfindliche
Alarm-Recovery, bei GLEICHER Beobachtungszahl. Jetzt bleibt die Anfrage stehen, die Beobachtung
ist zusaetzlich. Seitdem per Vorgabe an (3256ff39).

**Same-Frame-Drain (7919df45).** Der Host leerte die Snapshot-Queue erst am Kopf des naechsten
Ticks; jetzt zieht der Koordinator sie nach dem Beobachter-Aufruf noch im Frame — derselbe
Zustand, dieselbe Uhr (`nowS` aendert erst `onFrame`), einen Frame frueher.

| 15 fps, 10 Regressions- + 5 Handy-Aufnahmen | Basis | Sofort-Beobachtung | + Drain |
| --- | ---: | ---: | ---: |
| Bewegungsende → Commit, Median (p90) | 333 (400) | 267 (333) | **200 (267)** |
| Verify Median | 133 | 67 | **0** |
| Score | — | 15/15 identisch | 15/15 identisch |

Jeder Commit exakt einen Frame frueher, kein Zug anders. Am Geraet greift der Drain, wenn die
Inferenz die Frame-Periode unterbietet; sonst laeuft es wie bisher.

**Parallel auf dem Frame-Thread (94139d76, 9e63622c, 9ca7f79f).** Rillen-Hand als Future neben
Zuschnitt und Inferenz (Release der Warps am letzten Leser); ROI-Bewegung als Future neben
Grau/Gitter; der Crop-Warp startet mit der Konvertierung (`beginCropWarp`) und wird nach dem
Engine-Tick uebergeben (`finishCropFrame`). Entscheidungslogs bytegleich (20-00-52, 13-52-38);
Wanduhr je Frame am PC 15,1 → 10,1 ms bei unveraenderter CPU-Summe (12,5 ms).

**Remap statt warpPerspective: gemessen, verworfen (bb7a87b4).** Die zwischengespeicherten
Festkomma-Tabellen waren bytegleich, aber der Warp kostet 5,2 → 5,1 ms: unimodal bei 5 ms, die
Zeit ist das Einsammeln von 350 000 Zielpixeln aus dem QHD-Quellbild, nicht die Koordinaten.
Das Ziel ist mit `forNativeCrops` schon minimal (576 px, Crops sind Submats).

**LiveAlign auf der halbskalierten Kopie: gemessen, verworfen (bc7b8ddf, zurueck mit dem
Folge-Commit).** Der Bus klont alle 200 ms QHD nur fuer LiveAlign, das bei `alignScale` 0,5
liest; die INTER_AREA-Verkleinerung an seiner Stelle war bytegleich, kostete aber 1,14 statt
1,08 ms — der Boxfilter liest dieselben 11 MB wie der Klon. Sparen liesse sich der Klon nur,
wenn weder Vorschau noch LiveAlign ihn brauchen, und LiveAlign ist per Vorgabe an.

**Crop-Warp am Frame-Kopf als Future: gemessen, verworfen (9ca7f79f, zurueck mit 5930520a).**
Der Warp ueberlappte Grau, Gitter und Tick, aber auf dem einkernig gefahrenen Desktop-OpenCV
kostete der Warp-Frame 23,8 statt 18,8 ms CPU-Summe — der Pool-Thread und der Analyzer-Thread
stehen sich in OpenCV im Weg. Er bleibt hinter dem Engine-Tick (9e63622c): der Frame
entscheidet, bevor er warpt, und niemand wartet auf niemanden.

### Nacht auf den 2026-09-13: Ankunftsregel, Sichtbarkeits-Serie, was den Split noch haelt

**Ankunftsregel fuer Schlagzuege (a365ce4d, cff28209, 7598785e).** Das Zielfeld eines Schlagzugs
ist vorher und nachher belegt, die Belegung sieht die Ankunft nicht; Rung 2 verlangt den
Schlaeger per Identitaet auf dem Zielfeld — vor JEDEM Rung-2-Pfad, weil der gehobene Schlaeger
auch FROM leert und eine Ableitung mit ihm uebereinstimmt. Bei Standardwerten gemessen: Scores
10/10 und 5/5 identisch, aber je Aufnahme ein Schlagzug 467 ms spaeter (Fensterende, 12 von 553
und 17 von 371 Commits ueber `diff_after_verify`) und 20-57-45 ein Ply weniger (54/1). Deshalb
gilt sie nur fuer Commits im Motion-Hold (`earlyCommit`), wo der Hold die Ankunft nicht mehr
physisch deckt.

**Sichtbarkeits-Serie (2d1bf7ef, 2d1bae0a, 5346ae34).** Ein Commit im Hold — nur mit
`commitHoldS` kuerzer als `motionHoldS` — braucht `earlyCommitObs` (2) aufeinanderfolgende
Beobachtungen, in denen jedes Zugfeld unverdeckt war (Rillen- UND Coverage-Arm je Feld, nicht
handfoermig) und schon die Nach-Zug-Belegung zeigte; fuer Paare ueber die Felder beider Zuege.
Das ist „die Hand darf nicht im selben Crop sein wie ein Element, das committet wird"
(Nutzer). Bei Standardwerten greift keines der Gates: `earlyCommit` verlangt den kuerzeren
Commit-Hold, sonst warteten Verifikationen waehrend eines NEUEN Holds im Sicht-Gate (zwei Plies
400–600 ms spaeter, 5346ae34).

| Split 133 ms + Ankunft + Sicht-Serie, gegen Drain | Regressionssatz 15 fps | Handy-Sessions |
| --- | --- | --- |
| Score | 8/10 identisch; 11-59-12 52/21, 154327 51/66 (Stall), 233929 +1 (Label-Ende) | **5/5 identisch** |
| Bewegungsende → Commit, Median (p90) | 133 ms (267) | 133 ms (267) |
| was die Serie loeste | 20-00-52: 30/87/3 → 117/0/0 (halbe Rochade Rc1); 00-39-57 ohne Umsortierung | — |

**Was den Split noch haelt, ist die Referenz nach dem fruehen Commit.** 11-59-12 (nach `Bxe4`,
5032) und 154327 (nach ply 53, 5602) laufen in denselben Zustand: `refProvisional` ist gesetzt,
„board unchanged" zieht die Referenz auf ein Snapshot-Bild, wenig spaeter weichen 24–26 Felder ab,
der Alarm rastet ein und nichts committet mehr. Der Commit selbst war jeweils richtig. Das ist
genau der Fall fuer den Basis-Snapshot mit Temporal-Average je Feld (Nutzer, TODO): eine
Referenz, die nur aus gesehenen Feldern besteht, kann nicht auf einem Arm-Schatten landen.
233929: `a5` bei 2396 als Paar-Commit mit 0 Hand-Feldern und mehrfach gleicher CNN-Lesung — die
Aufnahme ist dort abgeschnitten, das Label endet; eine Label-Frage, kein Engine-Fehler.

**Endstand der Vorgaben:** bytegleich zum Drain-Stand — Entscheidungslogs ohne eine einzige abweichende Zeile ueber alle zehn Regressionsaufnahmen und fuenf Handy-Sessions (`final15b`, `pfinalb`, Binary 5346ae34). Median 200 ms, p90 267 ms bei 15 fps.

### 2026-09-13, Tag: Commit unter der Hand — der Stand, der haelt, und die vier, die nicht hielten

**Was den Split jetzt traegt (Stand F):** Dispatch-Gate (`4b100131`, eine Hypothese wird im Hold erst
pending, wenn ihre Felder gesehen settled sind), Referenz-Komposit (`c70c00d8`) und der
**Rueckfall aufs Einzelzug**: ein Paar, das die Verify-Leiter verworfen hat, wird in derselben
Stellung nie wieder vorgeschlagen (`rejectedPair`/`rejectedPairFen`, `PairCandidate`). Der Fall war
zweimal derselbe: `c6g6 + a2a4` (00-39-57) und `d8f8 + g8f8` (20-27-33) — Paare mit einer
Phantom-Zweithaelfte, auf Farbe abgelehnt, jeden Frame neu vorgeschlagen, bis das Fenster den Alarm
zog; der richtige Einzelzug kam nie an die Reihe. Regel gilt auch bei Vorgaben (nicht an den
Split gebunden), deshalb sind sie neu gemessen (`final15e`, `pfinale`, s. u.).

| Stand F (Split 67 ms, 2 Ruhe-Frames, Sicht-Serie, Ankunft, Komposit, Paar-Rueckfall) | Regressionssatz 15 fps | Handy-Sessions |
| --- | --- | --- |
| Score gegen Drain | 9/10 identisch, 233929 8/2/1 (Label-Ende) | **5/5 identisch** |
| Bewegungsende → Commit | 67 ms frueher im Median (547 Plies), p90 gleich | 67 ms frueher (372 Plies) |
| Paar-Commits | 24 → 20 | 14 → 6 |
| Recovery-Commits | 76 → 49 | 48 → 28 |
| Stalls gegen Drain | keiner neu (11-59-12 ein Ply 7,5 s, wie reiner Split) | 21-29-35 ein Ply 10 s spaeter (offen, s. u.); 20-57-45 ein Alarm 26 s frueher geloest |

**Vier Eingriffe, gebaut, gemessen, verworfen.** Alle vier sassen an Rausch-Lernen oder Taints
im fruehen Detect-Frame, und jeder kippte anderswo eine Aufnahme — die beiden Rausch-EMAs
reagieren auf EINE Lernung mehr oder weniger mit einer anderen Partie:

| Eingriff (nur im Commit-Hold) | loeste | riss |
| --- | --- | --- |
| kein `learnNoise` | 20-27-33 (Rxf8+ → Phantom-Paar) | 11-59-12 60/13/1, 154327 51/66 |
| kein `censusNoise.update` | 21-29-35 mehrdeutig → Einzelzug | 00-39-57 53/14/6 |
| Farbwechsel als Widerspruch im Taint-Filter | 21-29-35 (Kxd8 + Rxd3+) | 11-59-12 60/13/1 |
| keine Keepalive-Taints, Ganzbrett-Sicht + Nachbarring | Regressionssatz 10/10 | 20-57-45 18/37, 21-29-35 Stall zurueck |

Bisect je Guard (`tmp/latency/run33`, `run35`) und die Staende B–E (`run36`–`run39`).

**Offen: das Schnellspiel-Paar unter dem Split (21-29-35, 392,0 s).** Kxd8 und Rxd3+ in einem
Handbesuch; der fruehe Detect bei 133 ms liegt noch in der 100-ms-Keepalive der
Bewegungs-Verdeckung, der Belegungs-Filter taintet die Schlagfelder d8 und d3 (belegt vor UND
nach), das Paar ist nicht mehr viabel, Kxd8 committet allein, Rxd3+ steht schon in der Referenz
und nur die CNN-Recovery findet ihn — 10 s. Jede Korrektur am Taint-Filter kostete anderswo mehr
(Tabelle). Score bleibt identisch.

**Was der Coverage-Kopf bei Fingern neben der Figur sieht (Nutzerfrage):** auf dem Holdout
20-41-33 (16 000 Zellen, SAM-Matte) liest der Kopf Zellen mit 5–15 % echter Verdeckung zu 59 % als
frei (≤ 0,05), mit 15–30 % zu 24 %, ab 30 % zu 2 %. Die Sicht-Serie haengt deshalb nicht nur am
Kopf: Rillen-Arm je Feld, zwei Beobachtungen, zwei ruhige Frames. Ueber 764 fruehe Commits auf 15
Aufnahmen kein falscher. Der Nachbarring (Zugfelder UND ihre Nachbarn handfrei) war der
Vorschlag dagegen; er ging mit Stand E unter und ist einzeln nicht gemessen.

**Endstand der Vorgaben mit dem Paar-Rueckfall (`final15e`, `pfinale`):** Scores 10/10 und 5/5
identisch zum Drain-Stand. Gegen den Vorgaben-Stand vom Morgen (`final15d`, `pfinald`) kommen am
Regressionssatz vier Plies 67–267 ms frueher und keiner spaeter; am Handy ein Ply 133 ms frueher
und einer (21-29-35) 1,27 s spaeter, Median 0.

**Nachtrag, Stand G: das Schnellspiel-Paar ist geloest.** Die Keepalive-Taints werden als eigene
Teilmenge gefuehrt (`keepaliveTainted`), und nur fuer die Paar-Bewertung bekommt ein solches Feld
wieder die Schwellen-Evidenz zurueck, wenn die frische Beobachtung es sicher belegt liest
(`captureTargetsRestored`, `PairCandidate`). Kein Modell, kein Filter, keine Lernung angefasst.
Gemessen (`splitG`, `psplitG`): **10/10 und 5/5 scoregleich**, auch 233929 jetzt identisch;
Median 67 ms frueher auf beiden Saetzen, laengste Verzoegerung gegen Drain am Handy 0,9 s statt
10 s; Paar-Commits 24 → 20 und 14 → 6, Recovery 76 → 50 und 48 → 28. Gegen Stand F bewegt sich
nur 11-59-12 (ein Ply 4,3 s frueher, eins 0,5 s spaeter) und 154327 (±67 ms).
