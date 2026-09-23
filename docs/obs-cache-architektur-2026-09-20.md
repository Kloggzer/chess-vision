# Der Beobachtungs-Cache ist dateiweise abgelegt — und das kostet bis zu 70 % eines Laufs

Gemessen 2026-09-20, waehrend drei Replays parallel liefen (also unter genau der Last, unter der
ein Optimierer arbeitet).

## Die Messung

`tmp/obs-cache/` traegt **655 588 Dateien zu im Schnitt 3,5 KB**, zusammen 2 245 MB. Das aktive
Verzeichnis eines Modells (`p4a-80-clahe-6a756fae1853`) sind davon 61 891 Dateien, 212 MB.

| Zugriff | je Datei | 1 260 Lesevorgaenge (eine Aufnahme) |
|---|---|---|
| zufaellig, Platte kalt | **10,5 – 13,5 ms** | **13 – 17 s** |
| sequenziell, Platte kalt | 3,8 – 6,2 ms | 5 – 8 s |
| warm (Seiten-Cache des OS) | **0,22 ms** | 0,27 s |

Ein Replay von 1 944 Frames dauert insgesamt ~23 s. **Bis zu 70 % davon sind Warten auf die
Platte**, nicht Rechnen. In keiner `chesslabPerf`-Zeile ist das sichtbar: der Observer-Poke liegt
in `POST`, und `POST` wird hoechstens einmal pro Sekunde protokolliert, also bevorzugt auf
beschaeftigten Frames — der Median taeuscht in beide Richtungen.

## Warum der Entwurf das erzwingt

Der Schluessel ist der **Crop-INHALT** (`CachingClassifier.keyOf`), abgelegt als eine Datei je
Eintrag. Daraus folgen drei Dinge:

1. **Keine Lokalitaet.** Die Eintraege einer Aufnahme liegen ueber das ganze Verzeichnis verstreut.
2. **Keine Arbeitsmenge.** Man kann nicht vorab wissen, welche Eintraege zur naechsten Aufnahme
   gehoeren — der Schluessel entsteht erst, wenn der Crop geschnitten ist.
3. **Vorladen hilft nicht grundsaetzlich**, es verschiebt die zufaelligen Zugriffe nur nach vorn.

Dazu kommt, dass `writeProbs` in einen FESTEN `<schluessel>.bin.tmp` schreibt. Bei parallelen
Prozessen schreiben zwei in dieselbe Datei; folgenlos ist das nur, weil der Wert eine reine
Funktion des Schluessels ist — gleiche Crops, gleiche Bytes. Das ist Glueck, nicht Entwurf.

## Dieselbe Lektion steht schon in CLAUDE.md

> „Ohne Memmap kein Training (2026-08-24): ein veralteter Pack fiel still auf den Datei-Loader
> zurueck — die Folds und die SWA-Laeufe liefen dreifach langsam an ihm vorbei, ohne dass es
> jemand sah."

Deshalb gibt es `_require_pack`. Es ist derselbe Fehler an einer anderen Stelle, und hier hat ihn
nichts bemerkt, weil den Beobachtungs-Cache niemand misst.

## Was stattdessen

| Entwurf | Schluessel | Lokalitaet | Dedup ueber Aufnahmen |
|---|---|---|---|
| heute | Crop-Inhalt, Datei je Eintrag | keine | ja |
| **Memmap je (Modell-Stempel, Aufnahme)** | Frame-Index | **sequenziell** | nein |
| Packfile mit Hash-Index | Crop-Inhalt | sequenziell | ja |

Die mittlere Variante passt zum Projekt: eine Datei je Aufnahme, ueber den Frame indiziert,
memory-mapped gelesen. „Das aktuelle Video vorladen" ist dann ein `mmap` statt 1 260 zufaelliger
Zugriffe. Der GEOMETRIE-Stempel muss dabei in den Dateinamen — sonst liest ein `alignScale`-Lauf
die Antworten eines anderen Zuschnitts. `obsCacheDir` trifft diese Vorsicht heute schon fuer
Gewichte und `config.json`; sie waere nur zu erweitern.

## Was heute stattdessen getan wurde

Ein einmaliger sequenzieller Durchlauf durch das aktive Verzeichnis (~4 min) legt die 212 MB in
den Seiten-Cache des Betriebssystems; danach kosten Lesevorgaenge 0,22 ms statt 13. Bei 16 GB
freiem RAM bleibt das stehen. **Das ist ein Pflaster** — es braucht keinen Code, hilft sofort und
aendert nichts am Entwurf.

---

## KORREKTUR (2026-09-20, nach dem Umbau): die 70 % galten dem KALTEN Fall

Der Umbau ist gefahren, der Regressionssatz bestaetigt ihn (**396/3/0/171 bei 5 Alarmen**, Ziffer
fuer Ziffer). Die Beschleunigung eines normalen Laufs betraegt: **nichts.**

| | vorher | nachher |
|---|---|---|
| `2026-08-08-11-55-19`, warmer Cache | 35,0 s | **34,9 s** |

**Der Fehler in der Begruendung oben:** die 10–13 ms je Lesevorgang sind an Dateien gemessen, die
NICHT im Seiten-Cache des Betriebssystems lagen, waehrend drei Replays die Platte belasteten. Der
35-Sekunden-Lauf las dieselben Eintraege warm, also zu 0,22 ms. Eine kalte Einzelmessung wurde mit
einem warmen Lauf verrechnet; „bis zu 70 % eines Replays sind Warten auf die Platte" gilt fuer
einen KALTEN Lauf und nicht fuer den Normalfall.

**Was der Umbau trotzdem bringt:**

- Kalter Start: 981 zufaellige Zugriffe werden zu einem sequenziellen Lesevorgang.
- Plattenplatz: das aktive Verzeichnis faellt von 354 MB auf **142 MB** (kein Cluster-Verschnitt:
  eine 3,5-KB-Datei belegt auf NTFS 4 KB).
- Der ganze Cache: **2 365 MB auf 142 MB**, 84 711 Dateien geloescht. Davon 1 743 MB in sieben
  Verzeichnissen ohne Stempel, die seit Einfuehrung von `obsCacheDir` nie wieder treffbar waren.
- „Das aktuelle Video vorladen" wird ueberhaupt erst moeglich.

## Der eigentliche Engpass ist der START, nicht die Platte

Dieselbe Messung, sauber zerlegt:

```
alignment-prepass: 324 frames on 8 workers in 2,3 s
stetige Verarbeitung: 7,8 ms/Frame -> 15,1 s
FESTER Aufwand (JVM, Modell, Vorlauf): 19,8 s von 34,9 s = 57 %
```

**57 % eines Laufs haben mit dem Video nichts zu tun.** Das ist der Grund, warum ein
`multireplay` (N Konfigurationen in EINEM Durchlauf) so viel traegt: der Startaufwand faellt
einmal statt N-mal an.

> Diese Tabelle ist eine VORHERSAGE. Gemessen wurden spaeter 1,8x, und auch die sind seit
> 2026-09-23 ungueltig: ab dem zweiten Zusatzarm bekam keine Engine einen CNN-Crop
> (`docs/multireplay-2026-09-20.md`).

| N | einzeln | multireplay | Faktor |
|---|---|---|---|
| 5 | 175 s | 44 s | 4,0x |
| 10 | 350 s | 54 s | 6,5x |
| 100 | 3 496 s | 237 s | 14,7x |

Und die Engine-Arbeit ist groesstenteils ebenfalls teilbar: `perSquareCensusChange` und der
Graukanal reduzieren **861 184 Pixel auf 64 Werte**, und sie haengen NUR an (Referenz, aktuelles
Bild). Gemessen halten 95 Konfigurationen zu einem Zeitpunkt nur **fuenf verschiedene Referenzen**
(Median, max 10) — der teure Teil ist also 19-fach teilbar. Was je Konfiguration bleibt
(`normalizeDiffs`, `SquareNoise.z`, Taints, Zustandsautomat), rechnet auf 64 Zahlen.

**Nicht gemessen:** wie sich die 0,85 ms Engine-Zeit in Millisekunden auf diese Teile verteilt.
Die Aufteilung ist am Code abgelesen, nicht gestoppt. Und die fuenf Referenzen stammen aus dem
Screening, wo je EIN Knopf variiert; ein Optimierer verstellt sechs und divergiert staerker.

## Schluessel des Replay-Caches: Graph UND `config.json` (aus CLAUDE.md verschoben, 2026-09-23)

Der Cache haelt WAHRSCHEINLICHKEITEN, und die haengen an `temperature`, `normalize`, `clahe_*` und
`input_repr` aus der Config. Ein Temperatur-A/B las 2026-09-16 deshalb 41 168 Antworten des Laufs
davor und meldete "kein Unterschied"; das einzige Zeichen war die halbierte Laufzeit. Der
Engine-Knopf gehoert nicht in den Schluessel — er wirkt hinter der Softmax.
