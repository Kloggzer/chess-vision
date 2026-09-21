# Das Schattenveto hing nur halb am Schalter (2026-09-21)

Der Nutzer hatte ausdrücklich nach einem Lauf **ohne Schattenveto** gefragt. Der Schalter
`baselineOcclusion=0`, gebaut am Vormittag, hat das nicht geliefert — und die Doku behauptete es.

## Der Fehler

Es gibt **zwei** Stellen, die `state.shadowVetoed` setzen:

1. `FrameLoop.updateBaselineOcclusion` aus `baselineOcclusionAndShadow` — am Schalter.
2. `Vetoes.applyVetoes`, das HSV-plus-Census-Veto auf dem `changed`-Satz — **nicht** am Schalter.

`FrameLoop` nullt `shadowVetoed`, wenn der Schalter aus ist. `applyVetoes` läuft danach in der
Erkennung (`TrackerEngine.kt`, `applyVetoes(cur, curBgr, hot)`) und setzt es wieder. Der Schalter
schaltete also genau die Hälfte ab, die in diesem Material ohnehin nichts tat.

Gemessen: im Lauf mit Schalter AUS stand **`shadowVeto=` noch sechsmal im Log**. Nach dem Fix
steht es null mal.

Beide Arme hängen jetzt am selben Schalter. `VetoesTest.theShadowVetoFollowsTheBaselineOcclusionSwitch`
hält es fest — einmal ohne den Fix gefahren und rot gesehen.

## Verhaltensgleich auf den Vorgaben, und die alte Aussage gilt weiter

Der Schalter steht per Vorgabe auf AN, die neue Bedingung ist dort also ein No-op. Nachgewiesen
statt behauptet: `replay-regression.ps1 -Satz v1` liefert **396/3/0 bei 8 Desync-Episoden**,
Ziffer für Ziffer die Referenz.

Wichtiger: die Ablationszeile „`baselineOcclusion` — der Satz merkt NICHTS" war mit dem KAPUTTEN
Schalter gemessen und belegte deshalb nur die Hälfte. Mit dem reparierten Schalter kommt dasselbe
Ergebnis heraus — **jetzt bedeutet es aber, was es sagt**: der Zehner-Satz bemerkt es nicht, wenn
man ihm *beide* engine-eigenen Verdeckungsarme und *beide* Schattenvetos nimmt.

## Was die Reparatur NICHT gelöst hat

Eine Durchsicht der sechs Phantome auf `2026-09-19-15-50-28` hatte eine saubere Kette vorgelegt:
die weiße Rochade (7. O-O, Frame 1392) wurde als `Rg1` committet, weil `e1` — das geräumte Feld —
als Schatten vetoiert und aus `changed` entfernt wurde. Übrig blieb „h1 leer, g1 besetzt", worauf
`Rh1–g1` die einzige legale Lesart ist. Das CNN hatte den richtigen Zug angesagt (`cnnMove=e1g1`)
und verlor gegen den Frame-Diff-Kandidaten. Danach steht König und Turm vertauscht auf dem
Engine-Brett, der Alarm-Latch hält `g1` dauerhaft, und ab Frame 1925 committet nichts mehr.

Die Kette ist plausibel und am Bild belegt. **Der Versuch bestätigt sie trotzdem nicht:** mit dem
reparierten Schalter und damit ohne jedes Schattenveto bleibt die Aufnahme bei **17/70/6** — Ziffer
für Ziffer. Die erste Ablehnung lautet jetzt `REJECT d2d4 … why=shadow — Shadow/no move (CNN: board
unchanged)`, also ein **dritter** Schattenbegriff: das Urteil der Verify-Leiter
(`VERIFY_STATE_SHADOW`), das aus dem CNN kommt und nicht aus `applyVetoes`.

**Damit ist offen, warum diese Aufnahme scheitert.** Ausgeschlossen sind jetzt: Live-Ausrichtung
(beide Läufe ziffergleich), der Baseline-Verdeckungsarm und das HSV-Census-Schattenveto. Der
nächste Verdächtige ist die Verify-Leiter selbst.

Die vier von sechs „Phantomen", die in Wahrheit richtige Züge in falscher Reihenfolge sind, bleiben
davon unberührt — sie sind eine Folge des Ply-Versatzes, nicht eine eigene Ursache.

## Die Lehre, die bleibt

Ein Schalter, der nur die Hälfte abschaltet, ist schlimmer als keiner: er erzeugt eine Messung, die
aussieht wie eine Antwort. Die Ablationstabelle von heute Morgen trug diese Messung eine
Tageshälfte lang, und die Zahl war zufällig richtig — das macht sie nicht belastbar.
