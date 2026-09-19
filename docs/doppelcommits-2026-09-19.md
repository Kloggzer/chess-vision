# Doppelcommits im ganzen Korpus (2026-09-19)

Nach dem c8-Fix (`taintIdentityThr`, Commit `5297bad1`) die Frage: wo committen sonst noch zwei
Zuege auf einem Frame? Gesucht in zwei unabhaengigen Quellen, nichts neu gerechnet ausser zwei
`probe=`-Laeufen.

## Quellen und Zahlen

| Quelle | Cluster | Anmerkung |
|---|---|---|
| `data/recordings/*/candidate.json` (Zeitleisten, ganzer Korpus) | 24 | 3 mit Rueckschlag auf dasselbe Feld |
| `tmp/batch/confthr-ref/*.log` (Replay, Regressionssatz) | 14 | der belastbare Zeuge, weil beide Laeufe vorliegen |

## Drei verschiedene Wurzeln, nicht eine

**1. Geschwaerzte Evidenz (die c8-Wurzel).** `applyTaints` setzt z auf exakt 0,00, obwohl der
`diff` gross ist. Im Regressionssatz genau ein weiterer Fall: `2026-08-08-11-59-12` ply 61/62,
`Raxd4`+`Rb1+`, beide auf seq 6095 als `cnn_pair`. Mit `taintIdentityThr=0.5` getrennt auf 5963
und 6059 — **4,4 s frueher**. In der Gesamtzaehlung 396/3/0/171 unsichtbar, weil sich nur Frames
verschieben. Insgesamt bewegt der Fix 7 Zuege, 5 davon deutlich nach vorn, 2 um ±1–2 Frames.

**2. Echtes Schnellspiel (`cnn_pair`, kein Defekt).** `VID_20260726_233432` ply 20/21
`Qxg4`+`Nxg4` sieht wie c8 aus — ist es nicht: `changed=[g5=22.0 g4=21.3 e5=19.6]`, der Diff sah
alle drei Endpunkte. Zwei Zuege zwischen zwei Ruhepunkten, korrekt als Paar aufgeloest. Ebenso die
Eroeffnungs-Cluster (`e4+e5` auf Frame 84/87): da setzt sich das Brett, es ging kein Zug verloren.

**3. Stellungsverlust (`cnn_recovery`) — die eigentliche Qualitaetsfrage.** Nicht „zwei Zuege
gleichzeitig", sondern „die Stellung war WEG und das CNN hat sie neu gebaut". Ueber die zehn
Aufnahmen **6 Ereignisse, 16 nachgebaute Zuege**:

| Aufnahme | Ereignisse | Zuege | Groessen |
|---|---|---|---|
| `2026-08-08-11-55-19` | 1 | 3 | 3 |
| `2026-08-08-11-59-12` | 3 | 9 | 2, 3, 4 |
| `VID_20260727_233929` | 1 | 2 | 2 |
| `VID_20260802_222741` | 1 | 2 | 2 |

Der `taintIdentityThr`-Fix aendert daran **nichts** (identische Zahlen), er senkt nur die
Steckenbleiber leicht: `no_legal_move` 2 539 -> 2 524, `too_many_changed` 119 -> 116,
`occluded` 61 -> 51.

## Was die Messung NICHT hergibt

- **`changed=[…]` im Log ist auf acht Felder gedeckelt** (822 von 1 445 Zeilen haben exakt 8,
  kleinster gelisteter z-Wert 1,50). Ein fehlendes Feld heisst „unter Rang 8", nicht „null".
  Zum Vorsortieren brauchbar, als Urteil nicht — dafuer braucht es `probe=<feld>`.
- **`cnn_recovery` committet mehrere Plies per Konstruktion gleichzeitig.** Wer Commits ueber die
  letzte gesehene `seq=`-Zeile gruppiert, zaehlt das als Doppelcommit. Es IST eines, aber die
  Ursache liegt im Verlust davor, nicht im Commit.

## Zurueckgezogen

Zwei Hypothesen auf dem Weg, beide gemessen widerlegt:

- **„Die Dunkel-Ecke"** fuer `Qd7` auf `2026-08-08-11-55-19`. d7 misst auf dem gerichteten Brett
  **213,2** und ist eines der hellsten Felder des Bretts (dunkelste: a7=42, b8=46, b6=55).
- **„Der Zug ist unsichtbar"** ebenda. Die Probe zeigt auf d7 genau EIN Ereignis im ganzen Lauf:
  Index 793, `diff=73.08 z=27.30 census=68.46 changed=true`, nach zwei Frames nicht mehr vetoed.
  Das ist der Bauer, der d7 bei `d6` verlaesst, committet auf seq 794 — eine Frame spaeter, also
  punktgenau. Die kleinen Werte davor und danach sind ein stehender Referenzwert, keine Messung.

## Offen

- `2026-08-30-16-20-19` (`Nxe5+Nxe5+dxe5`) liegt NICHT im Regressionssatz. Ob der Fix dort greift,
  ist ungemessen.
- `VID_20260802_222741` bleibt 1 319 Frames in `no_legal_move` stecken — mit Abstand der groesste
  Wert im Satz (naechster: 212). Ungeklaert.
- Warum die Stellung in den 6 Faellen ueberhaupt verloren geht, ist nicht gemessen. Das waere je
  Fall ein `probe=`-Lauf auf die Felder der nachgebauten Zuege.
