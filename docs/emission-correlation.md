# Wie unabhängig sind die Emissionen? (2026-08-24)

Ein HMM summiert Log-Likelihoods über Frames, als wäre jeder Read eine neue Ziehung. Diese Seite
misst, ob das stimmt. Es stimmt nicht, und die Abweichung ist groß genug, dass sie Entscheidungen
umdreht.

Datenbasis: `model-reads.jsonl` aus 20 Recordings, 479 Stellungsintervalle, ~1,2 M Feld-Reads,
Modell `comp13-occ-bn-lr1e2-bs512`. Verdeckte Zellen (`cov > 0.15`) sind ausgenommen — dort ist
das FEN-Label nicht, wonach das Modell gefragt wird.

## Die Fehler wiederholen sich, statt zu streuen

Basisrate 15,6 % falsche Argmax-Reads. Die Bedingung darauf:

| | P(Fehler \| Vorframe Fehler) | P(Fehler \| Vorframe ok) | ρ | effektive Stichprobe |
|---|---|---|---|---|
| innerhalb einer Stellung | 0,918 | 0,018 | 0,901 | 0,052 n — **19 Reads = 1** |
| über den Zug hinweg | 0,773 | 0,016 | 0,757 | 0,138 n — **7 Stellungen = 1** |

Die erste Zeile ist erwartbar: dieselbe Kamera auf derselben Stellung liefert fast dasselbe Bild,
also dieselbe Antwort. Die zweite ist die eigentliche Nachricht — der Fehler überlebt den Zug. Er
ist keine Frame-Flackerei, sondern eine Eigenschaft des Feldes.

Damit ist auch benannt, was `--floor` in `scripts/chain_decode.py` tatsächlich tut. Der empirisch
gefundene Wert 0,08 deckelt, wieviel ein einzelnes Feld bezeugen darf; das ist eine
Korrelationskorrektur ohne diesen Namen.

## Warten kauft keine Unabhängigkeit

Wenn ein Verfahren zwei Stimmen im Abstand von 0,7 s einholt, unterstellt es, dass der Fehler in
dieser Zeit vergisst. Er tut es nicht. Fehlerkorrelation nach zeitlichem Abstand, innerhalb
derselben Stellung:

| Abstand | Paare | P(Fehler \| Fehler) | ρ |
|---|---|---|---|
| 0,10 s | 149 877 | 0,945 | **0,935** |
| 0,40 s | 137 793 | 0,914 | 0,897 |
| 1,00 s | 96 968 | 0,900 | 0,872 |
| 1,50 s | 81 677 | 0,907 | **0,874** |

Sechs Punkte über den Faktor 15 im Abstand, danach flach. Drei Beobachtungen im Sekundentakt
tragen also so viel wie drei direkt hintereinander — kosten aber zwei Sekunden mehr.

Das entwertet Cooldowns als Mittel zur Unabhängigkeit. `cnnCooldownS` bleibt trotzdem sinnvoll,
aber aus einem anderen Grund: als Kostenbremse gegen Reads, die nach derselben Messung ohnehin
nichts beitragen. Was er NICHT leistet, ist die Stimmen unabhängiger zu machen — wer damit
argumentiert, argumentiert gegen diese Tabelle.

Gemessen mit `scripts/emission_lag.py` über dieselben 20 Recordings.

## Beobachtungen wegwerfen macht die Kette besser

`--every N` nimmt nur jeden N-ten Read. Wenn Reads Evidenz wären, müsste mehr davon helfen.

| Reads | 16-20-41-33 | 15-23-01-43 |
|---|---|---|
| jeder | 57 / 9 / 19 | 43 / 8 / 16 |
| jeder 3. | — | 49 / 2 / 4 |
| **jeder 5.** | **64 / 2 / 4** | **51 / 0 / 0** |
| jeder 8. | — | 51 / 0 / 0 |
| jeder 10. | 58 / 8 / 6 | — |
| jeder 20. | 30 / 36 / 21 | — |

(gefunden / verpasst / erfunden, `--temp 5`)

Vier Fünftel der Beobachtungen wegzuwerfen hebt `gefunden` **und** senkt `erfunden`, auf einem
Recording bis auf 51/0/0. Jenseits von ~10 bricht es ein: die Information sättigt bei ~19 Reads,
die zeitliche Auflösung zum Platzieren eines Zuges braucht aber mehr.

Das erklärt eine Messung, die vorher unerklärt war: häufiger lesen hat dem Live-Tracker geschadet
(`rate3-desync9` 48 gegen `desync9` 51). Die zusätzlichen Reads sind keine Evidenz, sondern
Wiederholungen desselben Fehlers, und die Summe überstimmt irgendwann den Übergangs-Prior.

## Belegung setzt zurück, Figur-Identität nie

Persistenz nach wahrer Klasse, gleiche Datenbasis:

| Klasse | Reads | Fehler | P(Fehler \| Vorstellung Fehler) | häufigste Verwechslung |
|---|---|---|---|---|
| `bB` | 12 377 | 82,2 % | 0,947 | `bP` 52 %, `bR` 23 % |
| `wN` | 10 895 | 79,1 % | 0,936 | `wB` 55 %, `wP` 32 % |
| `bN` | 10 588 | 78,8 % | 0,938 | `bP` 70 %, `bB` 13 % |
| `wR` | 12 536 | 63,8 % | 0,963 | `wP` 39 %, `wB` 34 % |
| `wB` | 10 289 | 57,7 % | 0,877 | `wN` 40 %, `wP` 36 % |
| `wK` | 6 325 | 45,7 % | 0,900 | `wP` 57 %, `wB` 12 % |
| `bK` | 7 036 | 36,9 % | 0,937 | `bB` 40 %, `bP` 22 % |
| `bR` | 14 159 | 33,6 % | 0,975 | `bP` 66 %, `bK` 15 % |
| `wQ` | 5 717 | 25,2 % | 0,767 | `bQ` 24 %, `wP` 20 % |
| `wP` | 46 570 | 16,4 % | 0,702 | `wB` 65 %, `wR` 20 % |
| `bQ` | 6 355 | 11,2 % | 0,688 | `bK` 48 %, `wQ` 35 % |
| `bP` | 49 045 | 7,2 % | 0,502 | `bN` 39 %, `bR` 25 % |
| `empty` | 236 456 | **1,2 %** | **0,077** | `bP` 37 %, `bR` 16 % |

Ein scharfer Bruch: `empty` irrt selten und setzt zurück (ρ = 0,08), jede Figur irrt oft und setzt
nie zurück (ρ = 0,88–0,97). Fast jede Verwechslung kollabiert zum Bauern — die hohe Figur von oben,
plus der Klassen-Prior eines Datensatzes voller Bauern. Die WIP-Modelle
`real13-ms-s2-bn80-bs256-v2` und `-swa1e4` tragen dieselbe Signatur (`bB` → `bP`, 914 von 1727;
`wK`-Recall 0,15–0,20 bei `color_err` 0,002–0,007 — ein Typ-Problem, kein Farbproblem).

**Was das für zeitliche Verfahren heißt.** Median, Mittel, HMM, Beam, Fixed-Lag-Smoothing: alle
gewinnen aus Wiederholung. Bei ρ = 0,94 gibt es nichts zu gewinnen. Aggregation kann nur `empty`
verbessern, und `empty` liegt bei 1,2 %. Deshalb trägt der Tracker auf Belegung — welche Felder
sich geändert haben — und nicht auf Identität; das ist keine Notlösung, sondern die einzige
Größe mit brauchbarer Statistik. Figur-Identität zu heben ist Daten- und Modellarbeit.

## Reproduktion

    uv run python scripts/emission_persistence.py <sessions...>   # Persistenz innerhalb/ueber den Zug
    uv run python scripts/persist_by_class.py <sessions...>       # Aufschluesselung nach Klasse
    uv run python scripts/chain_decode.py <session> --every N --temp 5
