# Die Verify-Leiter wirft eine richtige CNN-Antwort weg (2026-09-21)

Auf `2026-09-19-15-50-28` erfindet der Replay sechs Züge und findet nur 17 von 87. Die Ursache ist
gefunden, an einer Stelle, deren eigener Kommentar das Prinzip nennt, das dort fehlt.

## Nur zwei der sechs „Phantome" sind welche

| Ply | erfundener Zug | decider | Was es wirklich ist |
|---|---|---|---|
| 13 | **Rg1** (`h1g1`) | `cnn_occupancy` | echte Erfindung |
| 15 | **Kf1** (`e1f1`) | `cnn_pair` | Zwangsfolger der ersten |
| 17 | b3 | `cnn_recovery` | **richtiger Zug**, einen Ply zu spät |
| 19 | Bb2 | `cnn_recovery` | **richtiger Zug**, einen Ply zu spät |
| 23 | Bf8 | `cnn_recovery` | **richtiger Zug**, einen Ply zu spät |
| 23 | a3 | `cnn_recovery` | **richtiger Zug**, einen Ply zu spät |

Die vier unteren zählen nur als erfunden, weil nach Ply 13 die Seitenparität um einen Ply
verschoben ist: die Rochade fraß zwei Plies statt einem, und seitdem schiebt `cnn_recovery` jeden
Weißzug *nach* der schwarzen Antwort nach. Der LCS nimmt die Schwarzzüge als gemeinsame Folge und
wirft jeden Weißzug doppelt heraus.

Die 70 Verfehlten sind ebenfalls eine Folge, keine eigene Ursache: ab Frame 1925 rastet der Alarm
dauerhaft auf `g1` ein — die Engine führt dort einen Turm, das CNN liest einen König, und der
Widerspruch kann sich nie auflösen, weil er echt ist.

## Die Stelle

Die weiße Rochade committet bei Frame 1392 als `Rg1`:

```
ply=13 COMMIT h1g1 (Rg1) by=cnn_occupancy  changed=[g1=20.9 h1=19.4 h3=2.6 f2=1.9]
cnnMove=e1g1  cnnAgree=1.000  verify=commit
```

**Das CNN hatte die richtige Antwort.** Sie fällt auf Sprosse 2, `VerifySingle.Signals.commits()`:

```kotlin
val fromLeftOk = fromLeftConf && (castling || (cnnUci == pendingUci && cnnAgreement >= minAgreement))
val toArrivedOk = toArrivedConf && !fromOccConf
val contradicted = cnnUci != null && cnnUci != pendingUci && cnnAgreement >= minAgreement
return arrived && (fromLeftOk || toArrivedOk || (!contradicted && occAgree >= … && occN >= …))
```

`toArrivedOk` ist **wahr**: g1 ist sicher besetzt (vom König), h1 nicht sicher besetzt.
`contradicted` ist **ebenfalls wahr** (`cnnUci = e1g1` bei Agreement 1,000). Aber `!contradicted`
schützt nur den **dritten** Zweig. `fromLeftOk` trägt seine eigene CNN-Prüfung; `toArrivedOk` trägt
gar keine.

Und `cnnAgree = 1.000` ist kein Widerspruch dazu: `verifyMove` ist **lokal** auf die Felder des
Kandidaten. Auf h1 und g1 sind `h1g1` und `e1g1` nicht unterscheidbar — h1 leer, g1 besetzt, beides
stimmt für beide Züge.

**Der Kommentar drei Zeilen darüber sagt das Prinzip selbst:** *„A confident different derivation
is not a confirmation."* Er gilt nur nicht für den Zweig, der hier committet.

Weil `COMMIT_VOTES = 1` ist, fällt der Commit beim ersten Blick, und Sprosse 4 (`overrules`, die
`e1g1` eingesetzt hätte) wird nie erreicht.

## Warum `e1` gar nicht erst in `changed` steht

Nicht das Schattenveto — das ist gemessen ausgeschlossen: `changedVals` wird in
`TrackerEngine.tryDetect` **vor** `applyVetoes` aus `lastZ` gezogen, und beide Läufe (mit und ohne
Schattenveto) tragen `changed=[g1=20.9 h1=19.4 h3=2.6 f2=1.9]` Ziffer für Ziffer gleich.

Die Evidenz-Boxen wurden nachgebaut und gegen den Log validiert (Ply 11 → `f1,g2`, Ply 12 →
`b7,b6`, exakt wie geloggt). Gegen jede **saubere** Vor-Rochade-Referenz liefert Frame 1392
`f1=122, e1=67, h1=67, g1=56` — e1 wäre also heiß. Die Signatur `{g1,h1}` allein entsteht **nur
gegen eine Referenz aus den Frames 1365–1377**, also aus der Hand heraus: dort liegt der Arm auf e1
und die Hand auf f1.

**Der Kandidat wird gegen eine Referenz gebildet, die bereits Hand-Inhalt trägt.** e1 und f1 sind
gegen diese Referenz ruhig, also bleibt `h1g1` als einzige legale Erklärung der zwei geänderten
Felder. Welcher `setRef`-Aufruf diese Referenz installiert hat, ist der eine offene Punkt.

## Ausgeschlossen, jeweils mit Messung

- **Live-Ausrichtung**: mit und ohne — 17/70/6, Ziffer für Ziffer.
- **Baseline-Verdeckungsarm und HSV-Census-Schattenveto**: mit dem reparierten Schalter (`shadowVeto=`
  steht null statt sechs Mal im Log) — unverändert 17/70/6.
- **Taint- und Occlusion-Vetos**: alle drei z-Nuller schreiben in `occludedVetoed`, und die
  Commit-Zeile trägt `occlVeto=` leer.
- **Referenz-Vorziehen** (`Reference pulled forward`): kommt im ganzen Log nicht vor.
- **Geometriewechsel**: nur bei seq 9 und 75, lange vor dem Bruch.
- **`maxChanged`**: der Replay fährt 5, das Telefon 6 — auf dieser Aufnahme kostenlos. Die einzige
  Zeile mit genau 6 steht 1 800 Frames nach dem letzten Commit, und die Sperre bei Ply 13 lautet
  `5 squares + 24 occluded` = 29, reißt also bei 5 wie bei 6. Alle sechs Entscheidungen mit
  `changed=6` haben committet. Die `maxChanged`-Kette gehört zur Schwesteraufnahme, nicht hierher.

## Was zu tun ist

Zwei Ebenen, und die obere ist die billigere:

1. **`toArrivedOk` gehört unter `!contradicted`**, wie der dritte Zweig. Das ist eine
   Verhaltensänderung auf dem Engine-Pfad und damit eine Messung gegen den Zehner-Satz: bleibt er
   bei 396/3/0 und 8 Desync-Episoden, ist es entschieden. Vorsicht: `toArrivedOk` existiert wegen
   des d4b3-Turm-Vorfalls, und der Zweig ist Rung 2 — die Referenzläufe müssen das tragen.
2. **Die Referenz darf nicht aus der Hand heraus verankert werden.** Das ist die eigentliche
   Wurzel; Punkt 1 ist das Netz darunter.
