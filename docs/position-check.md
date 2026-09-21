# Stellungs-Prüfung — die Zelle entscheidet, nicht das Frame

Warum die Matte-Review nur noch eine Frage stellt, und wie die andere gemessen wird. Code:
`realgames.settle_for_ply` (Messung), `labeling.slice_session` (Tor), `position_flags.py` (Vorlage).
Welche Frames überhaupt eine Matte bekommen: `docs/frame-scan.md`.

## Der Ausgangspunkt (2026-08-22)

SAM 3s Alphas sind in der Review bestätigt; sie werden nicht mehr abgefragt. Übrig bleibt die
zweite Frage — zeigt das Brett noch die Stellung, für die sein Intervall bürgt. Zwei Messungen
haben den Entwurf entschieden:

- **Jedes Frame hat ein Alpha.** Über alle 20 Sessions trägt `matte.jsonl` genau so viele
  distinkte Frames wie `log.jsonl`, 0 `skipped`. Die Maske ist damit ein Sichtbarkeitsfilter für
  jedes Frame und nicht nur ein Occlusion-Label.
- **`settle_dev` stand auf keiner Session.** `session settle-scan` war auf diesem Korpus nie
  gelaufen; das Zell-Tor in `slice_session` hat nie gefeuert.

## Die vier Urteile

Pro Zelle, gegen die gesetzte Stellung des eigenen Ply-Intervalls:

| Coverage | Abweichung | Urteil | Was passiert |
|---|---|---|---|
| > `MATTE_DIRTY` (0,15) | egal | verdeckt | FEN-Label bleibt, `coverage` nimmt die Zelle aus dem Klassifikations-Loss — das IST das Occlusion-Target |
| ≤ 0,15, `settle_seen` ≥ 0,5 | < `SETTLE_LIMIT` (45, seit 2026-09-09) | unverändert | FEN-Label gilt, Zelle geht in den Pool |
| ≤ 0,15, `settle_seen` ≥ 0,5 | ≥ 45 | strittig | Karte auf der `Strittig`-Lane |
| ≤ 0,15, `settle_seen` < 0,5 | nicht messbar | strittig | dito — weder vergleichbar noch vom Loss ausgenommen |

Damit hört die FRAME-Klasse auf zu entscheiden: `clean`, `occluded`, `stale` und `changed` steuern
nur noch, was SAM zuerst mattet. Der sichtbar ziehende Bauer — a2 leer, a3 besetzt, während die
FEN noch a2 sagt — ist zwei Karten und kein verworfenes Frame.

## Was gemessen wird

**Die Referenz ist alpha-gefiltert.** Der pixelweise Median läuft nur über die Boards des
Intervalls, deren Alpha nirgends mehr als `SETTLE_CLEAR_MAX` (0,02) behauptet. Eine Hand im
Median wäre die Stellung.

**Die Abweichung läuft nur auf sichtbaren Pixeln, und beide Seiten werden vorher genivelliert:**
`mean|(Zelle − ⌀Zelle) − (Referenz − ⌀Referenz)|` über `alpha < 128`. Ein Schatten verschiebt die
Helligkeit einer Zelle, eine Figur ihre Struktur. Roh flaggte der Schatten des vorgebeugten
Spielers auf ply 7 von 20-41-33 die Felder a2, b3 und b5 auf einem Brett, das niemand angefasst
hatte; genivelliert nichts davon.

`settle_seen` steht neben `settle_dev` in der Log-Zeile: der sichtbare Anteil je Zelle. Eine Zelle,
die auf einem Fünftel ihrer Pixel gemessen wurde, ist nicht „unverändert", sondern ungesehen.

## Der Preis in Karten

`2026-08-16-20-41-33`, 1.048 Frames, 1.032 davon gemessen:

| `dirty_reason` | Frames | ohne eine Karte | mit Karten |
|---|---|---|---|
| clean | 510 | 485 (95 %) | 25 |
| occluded | 487 | 349 (72 %) | 138 |
| stale | 26 | 20 | 6 |
| changed | 8 | 8 | 0 |

276 Karten auf 169 Frames, davon 98 Frames mit genau einer. Für den Pool heißt das auf dieser
Session **+1.939 Zellen**: `stale` bringt +1.635 und `changed` +508 ein, weil beide jetzt
zellweise gerettet werden, und `occluded`/`clean` geben 268 strittige Zellen ab, die über die Lane
zurückkommen.

## Die Prüfung des Commit-Fensters

Der Zug, der ein Intervall eröffnet, MUSS zwischen der Referenz des Vorgängers und der eigenen
sichtbar sein — auf genau den Feldern aus `changed_squares`. Sonst hängt der FEN an Pixeln, die
ihn nie gezeigt haben, und danach stimmt jedes Frame des Intervalls mit einer Referenz überein,
die schon falsch ist. Das ist der einzige Test, der über eine Intervallgrenze hinaussieht;
`realgames.interval_moves` schreibt ihn nach `interval-check.jsonl`.

Über 177 Nachbar-Paare aus drei Sessions ist der Zug in 161 sichtbar (Median 33–49 gegen die
Schwelle 15), 16 bleiben darunter.

| Session | Paare | sichtbar | unsichtbar | p10 | Median |
|---|---|---|---|---|---|
| 2026-08-16-20-41-33 | 65 | 56 | 9 | 12,8 | 33,0 |
| 2026-08-08-00-39-57 | 64 | 62 | 2 | 29,2 | 48,6 |
| 2026-08-15-23-01-43 | 48 | 43 | 5 | 16,9 | 41,4 |

**Die 16 sind nicht automatisch falsche Commits.** Nachgesehen auf ply 32 von 20-41-33 (a7–a5,
`dev` 1,54): das Brett hat einen Helligkeitsverlauf von h nach a — h3 liegt bei 156, a7 bei 20.
Ein schwarzer Bauer auf einem fast schwarzen Feld ist dort schlicht nicht zu sehen. Deshalb
verwirft nichts automatisch; die Zeile sagt `seen: false` und der Mensch entscheidet.

## Die bekannte Blindstelle

Dieselbe Rechnung gilt für die Zell-Messung: in der dunklen Ecke des Bretts bleibt eine Figur, die
kommt oder geht, unter `SETTLE_LIMIT`, und die Zelle geht mit ihrem alten Label durch. Das ist
keine neue Schwäche — `SETTLE_LIMIT` und `framescan.CHANGE_THR` haben sie beide — aber
`interval-check.jsonl` misst sie jetzt pro Ply, statt sie zu verschweigen. Wer sie schließen will,
muss die Abweichung am Eigenkontrast der Zelle normieren, nicht die Schwelle senken.
