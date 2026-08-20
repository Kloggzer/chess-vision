# Spec-Index — der zurückgezogene Baum

47 Pakete, 382 Dateien — 254 Text mit 46 416 Zeilen, 123 PNG, 5 SVG/HTML. Letzte Änderung
2026-08-13. Sie lagen im
Arbeitsverzeichnis, obwohl sie nichts mehr trieben. Diese Seite hält die Landkarte, damit die
340 `specs/NN`-Verweise in Code und Doku weiter auf etwas zeigen; der Volltext steht in git.

```bash
git show fd9c1908:specs/53-cnn-headroom/entry.md      # ein Spec lesen
git show fd9c1908:specs/53-cnn-headroom/STATUS.md     # was davon fertig wurde
git checkout fd9c1908 -- specs/                       # alles zurueckholen
```

Was aus diesem Baum an Befunden erhalten bleibt — Wendepunkte, Sackgassen, bindende Entscheide —
steht in `docs/how-we-got-here.md`.

`Verweise` zählt, wie oft Code und Doku ausserhalb von `specs/` auf die Nummer zeigen —
eine hohe Zahl heisst, dieses Spec ist das `warum` hinter vielen Stellen.

| # | Titel | zuletzt | Dateien | Verweise |
|---|---|---|---|---|
| 08 | Android tracker (Kotlin): production port of `chesslab track` | 2026-07-10 | 11 | — |
| 09 | Illegal-move referee & shadow-destination fix (Python tracker) | 2026-07-09 | 4 | 4 |
| 10 | multi hypothesis | 2026-07-09 | 1 | — |
| 11 | Streaming CNN observer & frame-signature contract (Python tracker) | 2026-07-09 | 4 | — |
| 12 | Android parity port: 2026-07-09 Python tracker fixes → Kotlin | 2026-07-10 | 4 | 4 |
| 13 | Android visual overhaul (dark tournament) + games library & analysis | 2026-07-10 | 10 | — |
| 14 | Finlayson intrinsic-image channel (shadow-free diff input, experimental) | 2026-07-11 | 5 | 2 |
| 15 | Markerless board detection under motion + piece occlusion (Python tracker) | 2026-07-19 | 7 | — |
| 16 | Android correctness parity (port of the 2026-07-21 Python tracker fixes) | 2026-07-21 | 7 | 3 |
| 17 | Android rewrite: strict Kotlin port of the Python move tracker | 2026-07-26 | 31 | 6 |
| 18 | Occupancy model: make the CNN good at the one job it has | 2026-07-26 | 9 | 11 |
| 19 | Live hardening: what a real recorded game exposed | 2026-07-27 | 7 | 5 |
| 20 | Recovery honesty: stop inventing captures, stop fragmenting games | 2026-07-28 | 6 | — |
| 21 | Give the observation piece identity back, so the alarm can fire again | 2026-07-28 | 6 | — |
| 22 | Infer at the resolution the camera actually delivers | 2026-07-30 | 6 | 38 |
| 23 | Resolution all the way down: the warp, the crop, and the model that ships | 2026-07-30 | 5 | 18 |
| 24 | Frame the board: spend the sensor on the squares, not the table | 2026-07-30 | 7 | 2 |
| 25 | Normalization endgame: can anything but GroupNorm ship? | 2026-07-30 | 5 | 6 |
| 26 | Cheaper at the same quality | 2026-07-31 | 8 | 8 |
| 27 | Can a local verify be as safe as the whole board? | 2026-07-30 | 4 | — |
| 28 | Wider, not thinner | 2026-07-30 | 3 | 1 |
| 29 | Widen the output band | 2026-07-31 | 4 | 3 |
| 30 | specs/30 — sharper alignment | 2026-08-01 | 2 | 8 |
| 31 | specs/31 — cite what we rely on | 2026-07-31 | 2 | 3 |
| 32 | normalization on clean geometry | 2026-08-01 | 1 | 1 |
| 33 | the reply that vanishes | 2026-08-01 | 1 | — |
| 34 | Diagnostics you can read | 2026-08-02 | 4 | 7 |
| 35 | One seam per concern | 2026-08-02 | 7 | — |
| 36 | Alignment leaves the user interface | 2026-08-02 | 5 | 3 |
| 37 | A way back | 2026-08-08 | 6 | 10 |
| 38 | The rows land in Grafana | 2026-08-06 | 3 | 5 |
| 39 | What the tracker remembers | 2026-08-08 | 5 | 18 |
| 40 | Label a real game | 2026-08-06 | 5 | 2 |
| 41 | The board is its own ruler | 2026-08-03 | 5 | 17 |
| 42 | One board, two clocks | 2026-08-03 | 2 | 3 |
| 43 | The camera when you ask for it | 2026-08-03 | 6 | 6 |
| 44 | A review you can read | 2026-08-03 | 9 | 4 |
| 45 | The crop belongs to the model | 2026-08-06 | 2 | 37 |
| 46 | A position analysed once | 2026-08-06 | 2 | 1 |
| 47 | One interface | 2026-08-03 | 64 | 16 |
| 48 | Paper and ink | 2026-08-03 | 30 | 28 |
| 49 | The screen you play in front of | 2026-08-04 | 6 | 6 |
| 50 | Give the review back | 2026-08-04 | 16 | 5 |
| 51 | One door for developers | 2026-08-04 | 8 | 5 |
| 52 | The harness runs what ships | 2026-08-08 | 7 | 22 |
| 53 | The occluded class exists, and a human can afford to check it | 2026-08-10 | 8 | 20 |
| 54 | A screen anyone can read | 2026-08-13 | 14 | 2 |
