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
