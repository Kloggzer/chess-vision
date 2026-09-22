# Die Entscheidungszeile mischt zwei Frames (2026-09-22, am Log bewiesen)

Drei Erklärungsketten für den `Rg1`-Fehlgriff auf `2026-09-19-15-50-28` sind heute gefallen. Die
vierte hält — und sie erklärt zugleich, **warum die ersten drei so plausibel aussahen**: die
Entscheidungszeile im Log setzt sich aus zwei verschiedenen Frames zusammen.

## Der Beweis, ohne einen einzigen neuen Lauf

Die Commit-Zeile bei Frame 1392 lautet:

```
changed=[g1=20.9 h1=19.4 h3=2.6 f2=1.9]   shadowVeto=e1,f1,f2,g1
```

Drei Schritte, jeder am Code belegt:

1. `Dispatch.topChangedVals` listet **jedes** Feld mit `z >= zThr * 0.5 = 1,5`, bis zu acht Stück.
   Es stehen vier da, also wurde nichts abgeschnitten — **e1, f1 und f2 haben `z < 1,5`**.
2. `Vetoes.applyVetoes` baut `shadowVetoed` **ausschließlich** aus `hot = {z >= 3,0}`.
   `shadowVetoed ⊆ hot` ist dort eine Invariante.
3. `{e1, f1, f2, g1}` ist keine Teilmenge von `{g1, h1}`. **Drei der vier Felder können aus
   `applyVetoes` nicht stammen.**

Der einzige andere Schreiber ist `FrameLoop.updateBaselineOcclusion`. Und `tryDetect` bricht bei
`pending != null` schon in `detectGuards()` ab — **vor** `computeEvidence` und `applyVetoes`. Eine
Verify-Commit-Zeile trägt deshalb:

- `changed`/`changedVals` vom **Hebungs-Frame**,
- `shadowVetoed`/`occludedVetoed` vom **Commit-Frame**, überschrieben vom Baseline-Arm.

**Damit ist erklärt, warum mein Schattenveto-A/B nichts bewegte:** das geloggte `shadowVeto` ist
nie in die Entscheidung eingegangen. Und `occlVeto=` leer beweist **nicht**, dass nichts verdeckt
war — die 100-ms-Keepalive war bei 1393 schlicht abgelaufen.

## Was wirklich passiert ist

Der Hebungs-Frame ist **1389, nicht 1392.** Das einzige stabile Fenster nach dem Zug ist
1387–1389.

Bei **seq 1388 wurde die RICHTIGE Hypothese `e1g1` erzeugt** und von `sightSettled` verworfen —
die Notiz steht im Log: *„early: e1g1 not seen settled yet (8 sights)"*. Die Hand lag auf e1/f1,
und die `moveTouchedMask` einer Rochade verlangt e1, f1, g1 **und** h1 sichtbar.

Einen Frame später, bei 1389, blieb als Evidenz nur `{g1, h1}` übrig. Und `h1g1` besteht
`sightSettled` mühelos — denn **„h1 leer, g1 besetzt" sieht genau aus wie eine fertige Rochade.**

Der Commit fiel dann bei ~92,9 s aus der Verify-Leiter über einen CNN-Schnappschuss, während die
Schleife noch `moving` war. Deshalb fehlt im Log jeder Zustandswechsel an dieser Stelle:
`onSnapshot` ruft `stateSink` nicht.

## Meine Rekonstruktion war falsch, und E2 ist es auch

Ich hatte geschlossen, die Referenz sei aus der Hand heraus verankert (Frames 1365–1377). Dagegen
spricht: **im Fenster 1353–1392 hat kein einziger Referenz-Setzer gefeuert.** Der Zustand ist
1355–1386 durchgehend `moving`, und dort läuft weder `stableMeans` noch `tryDetect`. Die
CNN-Wege tragen Pflicht-Notizen (*„reference pulled forward"*), die im ganzen Log fehlen.

Gegen jedes saubere Vor-Rochade-Brett misst sich am rohen Grauwert `f1=120, g1=73, e1=65, h1=58` —
eine sauber nachgemessene Referenz kann e1/f1 also gar nicht stumm machen.

**Und es ist nicht E2.** Der Bug-Audit-Eintrag verlangt, dass der Gegner *innerhalb* des Holds
antwortet, damit `motionSinceRef` die Heilung blockiert. Hier lag nach dem b6-Commit bis 1355
**null Bewegung** — die Heilung hatte ihr sauberes Fenster. Der `refProvisional=true` in der Zeile
ist ein **anderes Feld**: `DecisionLog` schreibt dort `nowS < refHoldUntil`, also „innerhalb des
Halts", und das steht in *jeder* Zeile dieser Aufnahme.

## Zwei Riegel, und der zweite ist der dringendere

**1. Mehrdeutigkeit auf der FELD-Achse.** Ein Kandidat wird verworfen, wenn ein anderer legaler Zug
sich von ihm **nur auf getainteten oder gelatchten Feldern** unterscheidet. Für 1389: `h1g1`
berührt `{h1, g1}`, `e1g1` berührt `{e1, f1, g1, h1}`, die Differenz `{e1, f1}` liegt vollständig
in `tainted` → mehrdeutig → nicht dispatchen, Hold auslaufen lassen.

Das ist derselbe Gedanke wie `resolveAmbiguity`, nur auf der Feld- statt der LL-Achse.
`resolveAmbiguity` greift hier nicht, weil `e1g1`s Score echt eingebrochen ist (zwei seiner vier
Felder stehen auf 0) und nicht knapp daneben liegt.

**2. Die Entscheidungszeile muss aufhören zu lügen.** `shadowVetoed` und `occludedVetoed` gehören
beim **Heben** des Kandidaten in den `DecisionRecord` eingefroren, statt vom Baseline-Arm
überschrieben zu werden.

Dieser zweite ist der dringendere, auch wenn er kein einziges Ply verändert: **er hat heute drei
Ketten gekippt.** Eine Diagnosezeile, die zwei Frames mischt, kostet mehr Zeit als der Fehler, den
sie beschreiben soll.

## Die Restunsicherheit, ehrlich benannt

Meine Rekonstruktion bleibt als *zweite* Erklärung möglich — sie würde e1/f1 klein statt genullt
machen. Sie verlangt aber einen Referenz-Setzer im `moving`-Fenster, und einen solchen gibt es im
Code nicht. Ein `probe=e1`-Lauf mit `trace=` trennt beides in einem Durchgang:

- `probeDiff` groß, `probeZ = 0,00`, `probeOcclVetoed = true` → Verdeckungs-Taint. Erwartet.
- `probeDiff` groß, `probeZ = 0,00`, kein Veto → das `SquareNoise`-EMA frisst die Änderung.
- `probeDiff` **klein** → die Referenz trägt doch Hand-Inhalt, und die Suche geht zurück.

## Nachtrag: Riegel 1 ist ueberfluessig, am Log belegt (2026-09-22)

Der vorgeschlagene Mehrdeutigkeits-Riegel auf der FELD-Achse braucht nicht gebaut zu werden.
`cleanCommitsOnly` faengt denselben Frame schon, und zwar an genau denselben zwei Feldern.
Aus `tmp/batch/v2-cleanonly/2026-09-19-15-50-28.log`, ohne einen neuen Lauf:

```
seq=1388 note: early: e1g1 not seen settled yet (8 sights)
ply=12 REJECT h1g1  why=Rg1? hand in frame - clean commits only   occlVeto=e1,f1
ply=13 COMMIT e1g1 (O-O) by=cnn_occupancy  changed=[f1=25.0 h1=19.3 e1=19.1 g1=18.9 ...]
```

`occlVeto=e1,f1` ist exakt die Differenzmenge, die der Riegel gebraucht haette (`h1g1` beruehrt
`{h1,g1}`, `e1g1` beruehrt `{e1,f1,g1,h1}`). Einen Frame spaeter traegt die Evidenz alle vier
Felder und die Rochade committet richtig.

**Damit haette der Riegel keinen Zeugen.** Genau diese Sorte Wache ist in
`docs/wachen-ablation-2026-09-21.md` das Problem: drei Hand-Wachen liessen sich abschalten, ohne
dass sich eine Ziffer bewegt. Der Riegel wird nicht gebaut; wenn ein Fall auftaucht, den
`cleanCommitsOnly` durchlaesst und er faengt, ist er wieder ein Kandidat.

Riegel 2 (die Vetos beim Heben einfrieren) ist gebaut — er aendert kein Ply, raeumt aber die
Diagnosezeile auf, die heute drei Ketten gekippt hat.
