# Referenzstand des Regressionssatzes — 2026-09-14

Die Zahlen, gegen die ein neuer Lauf sich rechtfertigt. Wer sie ersetzt, schreibt Datum, Commit und
Bedingungen dazu — ein Referenzstand ohne die ist keiner.

## Wie er entstanden ist

    .\scripts\replay-regression.ps1 -Tag alarm-base

Gemessen am 2026-09-14, 08:13–08:24 (683 s, 2 JVMs parallel, warmer `tmp/obs-cache`). Baum auf
`f7e2cf1a`, aber `Alarm.kt` auf `d8453566` zurueckgesetzt — verhaltensgleich mit `d8453566`, weil
das der einzige Engine-Eingriff des Commits ist. Modell und `candidate.json` wie im Skript
vorgegeben. Logs: `tmp/batch/alarm-base/`.

## Der Stand

| Aufnahme | gefunden | verfehlt | erfunden | jenseits | Alarme | s |
|---|---|---|---|---|---|---|
| 2026-08-07-13-52-38 | 25 | 0 | 0 | 0 | 1 | 108 |
| 2026-08-08-00-39-57 | 67 | 0 | 0 | 0 | 1 | 118 |
| 2026-08-08-11-55-19 | 15 | 0 | 0 | 3 | 1 | 27 |
| 2026-08-08-11-59-12 | 73 | 0 | 0 | 164 | 0 | 233 |
| VID_20260726_233432 | 21 | 0 | 0 | 0 | 0 | 34 |
| VID_20260727_233929 | 7 | 3 | 0 | 0 | 1 | 26 |
| VID_20260802_222203 | 3 | 0 | 0 | 0 | 1 | 95 |
| VID_20260802_222741 | 22 | 11 | 1 | 0 | 1 | 122 |
| VID_20260824_153751 | 35 | 0 | 0 | 0 | 0 | 89 |
| VID_20260824_154327 | 117 | 0 | 0 | 0 | 0 | 269 |
| **Summe** | **385** | **14** | **1** | **167** | **6** | **683** |

## Erster A/B dagegen: der Alarm-Kern-Fix (`f7e2cf1a`), 2026-09-14

Punktgleich, Zeile fuer Zeile: 385 / 14 / 1 / 167 und 6 Alarme in beiden Armen, 689 s statt 683.
Logs: `tmp/batch/alarm-after/`.

Verhaltensrelevant unterscheiden sich die Logs an **genau einer** Stelle im ganzen Satz —
`2026-08-07-13-52-38`, Ply 25:

    base:  REJECT e1c1 by=rejected why=ALARM latched on a1,c1,e1
    after: REJECT e1c1 by=rejected why=ALARM latched on c1,e1

Der transiente Extrafeld faellt weg, das Urteil bleibt. Alles Uebrige sind Zeitmessungen und
`obs-cache`-Treffer (der zweite Arm laeuft auf dem warmen Cache des ersten).

**Was das heisst und was nicht:** kein Phantom dazu, keins verloren — der Fix ist auf diesem Satz
punktneutral. Er ist damit NICHT als Verbesserung belegt, sondern als unschaedlich. Der Satz
enthaelt nur diesen einen Fall, in dem Kern und letzte Beobachtung auseinandergehen; wer die
Wirkung messen will, braucht Material mit rotierenden Konflikten.

## Zweiter A/B: der kubische Crop-Warp (`a99ff156`), 2026-09-14

Punktgleich mit dem Referenzstand: 385 / 14 / 1 / 167 und 6 Alarme, Zeile fuer Zeile identisch.
Logs: `tmp/batch/warp-cubic/`.

**Und der Cache beweist, dass wirklich jeder Crop anders ist:** der Referenzlauf hatte 4 418
Treffer bei 3 Fehlschlaegen, dieser **0 Treffer bei 4 421** — `tmp/obs-cache` ist nach Crop-Bytes
gekeyt. Die 1 171 s statt 683 s sind dieser kalte Cache, keine langsamere Engine.

**Was das heisst:** kein Crop ist mehr derselbe, und das Modell faellt trotzdem dieselben Urteile.
Die Umstellung ist auf diesem Satz unschaedlich — und das Modell ist robuster gegen die
Schaerfe-Domaene, als die Laplace-Zahl vermuten liesse. Es ist KEIN Beleg fuer einen Gewinn; der
zeigt sich erst, wenn ein Modell auf kubisch geschnittenen Crops TRAINIERT wird
(`docs/warp-resampling.md`).

## Wie die Spalten zu lesen sind

- **erfunden ist das Veto.** Ein Phantom disqualifiziert einen Kandidaten, verfehlte Zuege sind
  verrechenbar. Der Referenzstand traegt genau eines, in `VID_20260802_222741`.
- **jenseits ist kein Fehler.** Das ist, was das Video nach dem Ende des Labels noch gespielt hat;
  `11-59-12` traegt damit konstruktionsbedingt 164 und `11-55-19` drei. Nur Phantome INNERHALB der
  Referenz zaehlen gegen einen Lauf.
- **Die beiden Aufnahmen mit Verlusten sind bekannt.** `VID_20260727_233929` verliert seine letzten
  Plies, weil die Kamera zu frueh stoppt (`docs/recordings.md`), und `VID_20260802_222203` traegt
  nur drei Referenz-Plies und misst deshalb fast nichts.
- **Alarme sind eine Beobachtung, kein Urteil.** Der Alarm sperrt Erholung und Resync; wer an ihm
  dreht, verschiebt beide. Sie stehen hier, damit eine Verschiebung auffaellt.

## Zeiten sind nur bei ruhigem Rechner vergleichbar

683 s gelten fuer zwei parallele JVMs auf einem sonst unbelasteten Rechner mit warmem Cache. Kalt
dauert es deutlich laenger. Die Sekunden gehoeren zur Nachvollziehbarkeit, nicht zur Bewertung.
