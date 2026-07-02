# Move-Tracker (Prototyp) — Brett-Digitalisierung ohne CNN

Verfolgt deine Partie auf dem **fest montierten** Brett: aus der bekannten Startstellung wird jeder Zug
per **Frame-Differenz + Legalität** (python-chess) bestimmt — **kein neuronales Netz, keine Trainingsdaten**.

**Ablauf je Frame:** Warp aufs Brett (fixe Geometrie aus dem chesslab-Profil) → Motion-Gating (Hand im
Bild? → warten) → bei Ruhe Per-Feld-Differenz zum Referenzbild → unter allen **legalen** Zügen den
wählen, dessen berührte Felder die Änderung am besten erklären (Rochade/En-passant/Schlag inklusive) →
Zug anwenden, Referenz aktualisieren.

## Start

```bash
# Handy-IP-Cam (MJPEG) – oder --source 0 für lokale Kamera
chesslab track --profile phone --source https://192.168.178.23:4444/video/m.jpeg
# dann:  http://127.0.0.1:8001
```

> **Migration:** Bis Rework-Phase 06 lag der Tracker als `python -m move_tracker.app` auf Repo-Root.
> Jetzt ist er Teil des `chesslab`-Pakets: `chesslab track` (CLI) oder `python -m chesslab.move_tracker.app`
> (direkter Modul-Start).

Im UI: **Start** (beginnt aus der Grundstellung) · **Startstellung neu** (= „ich habe gerade die
Grundstellung aufgebaut", setzt die Referenz) · **Undo**. Links Live-Kamera mit dem, was der Computer
glaubt (Figurenbuchstaben + letzter Zug gelb), rechts das rekonstruierte Brett + Zugliste + FEN.

**Bedienung:** Grundstellung aufbauen → **Start** → normal ziehen. Nach jedem Zug (Hand weg, Brett ruhig)
erscheint der Zug rechts. Verrutscht etwas / Zug nicht erkannt → **Undo** oder **Startstellung neu**.

## Parameter (alle Stellschrauben)

Die Defaults leben in **einer** Stelle: dem `MoveTracker(...)`-Konstruktor in `tracker.py`. Dort dauerhaft
ändern, oder pro Lauf per CLI-Flag (`chesslab track`) bzw. API-Body (`POST /api/start`) überschreiben.

| Parameter         | Default        | Wirkung                                                                 | Hochsetzen, wenn …                          | Runtersetzen, wenn …                        | Wo einstellbar |
|-------------------|----------------|-------------------------------------------------------------------------|---------------------------------------------|---------------------------------------------|----------------|
| `profile`         | `"phone"`      | chesslab-Kalibrierprofil (Geometrie/Warp). Datei `data/calibration/<name>.yaml`. | —                                           | —                                           | CLI `--profile`, API-Body |
| `source`          | `"0"`          | Kamera: `0`/`1` = lokale Webcam, URL = IP-Cam (MJPEG `…/video/m.jpeg`).  | —                                           | —                                           | CLI `--source`, API-Body |
| `motion_thr`      | `3.0`          | Bewegungs-Schwelle (mittlere Frame-zu-Frame-Differenz) für „Hand im Bild". | Erkennung bleibt fälschlich auf „moving" (Licht-/Sensorrauschen). | Züge werden erkannt, *während* die Hand noch über dem Brett ist. | `tracker.py`, CLI `--motion-thr`, API-Body |
| `change_thr`      | `16.0`         | Ab welcher Helligkeitsdifferenz (0–255) ein Feld als „geändert" gilt.   | Geisterzüge durch Schatten/Licht.           | Echte Züge werden übersehen (zu wenig Kontrast Figur↔Feld). | `tracker.py`, CLI `--change-thr`, API-Body |
| `settle_frames`   | `4`            | Wie viele ruhige Frames vergehen müssen, bis überhaupt geprüft wird.     | Es wird zu früh geprüft (Brett noch nicht ganz ruhig). | Erkennung fühlt sich träge an.              | `tracker.py` |
| `confirm_frames`  | `2`            | Wie oft derselbe Zug in Folge bestätigt sein muss, bevor er committet.   | Noch Geisterzüge durch einzelne Rausch-Frames. | Erkennung soll schneller/sofort reagieren (`1`). | `tracker.py`, CLI `--confirm-frames` |
| `ambiguity_margin`| `= change_thr` | Mindest-Score-Abstand zum zweitbesten Zug; sonst „mehrdeutig", kein Commit. | Zu oft „mehrdeutig" bei eindeutigen Zügen.  | Zwei ähnliche Züge werden verwechselt.      | `tracker.py` |
| `live_align`      | `True`         | Marker-Tracker live nachführen oder Kalibrier-Geometrie einfrieren.      | Kamera/Statik verschiebt sich über die Session (Marker halten dagegen). | Stativ-Kamera, fest verankert (keine Drift). | `tracker.py`, CLI `--no-live-align` |
| `avg_frames`      | `3`            | Gleitendes Mittel über N ruhige Graubilder (denoised) für die Per-Feld-Differenz. | Sensor-/Lichtrauschen hoch, plötzliche Belichtungssprünge. | Latenz soll minimal sein.                   | `tracker.py`, CLI `--avg-frames` |
| `max_changed`     | `6`            | Maximal geänderte Felder, bevor der Frame als „verdeckt/instabil" verworfen wird. | Hand löst viele Felder aus, die fälschlich als Zug erkannt werden. | Rochade (4 Felder + Schatten) wird unterdrückt. | `tracker.py`, CLI `--max-changed` |
| `cnn_run`         | `run-20260626-163320` | Modell-Run für CNN-Recovery/-Kontrolle; `''`/fehlt auf Platte = Feature aus. | —                              | —                                           | CLI `--cnn-run`, API-Body |
| `cnn_conf_thr`    | `0.85`         | Ab welcher Softmax-Konfidenz ein Feld für die Occupancy-Auswertung zählt (occluded zählt nie). | CNN „sieht" Züge, die keine sind (unsicheres Modell). | Zu wenige Felder confident → CNN sagt nie etwas. | `tracker.py` |
| `cnn_cooldown_s`  | `2.0`          | Mindestabstand zwischen Recovery-Beobachtungen (CPU ~100–300 ms je Beobachtung). | CPU-Last stört den Stream.                  | Recovery soll schneller nachsetzen.         | `tracker.py` |
| `cnn_check_interval_s` | `10.0`    | Intervall der periodischen CNN-Kontrolle bei ruhigem Brett.              | Dauerlast unerwünscht.                      | Abweichungen sollen schneller auffallen.    | `tracker.py` |
| `--host`/`--port` | `127.0.0.1`/`8001` | Adresse des Web-UI.                                                  | —                                           | —                                           | CLI |

**Beispiele:**

```bash
# pro Lauf via CLI:
chesslab track --profile phone --source 1 --port 8002

# Heuristik dauerhaft anpassen → in tracker.py, MoveTracker.__init__:
#   motion_thr=3.0  change_thr=16.0  settle_frames=4  confirm_frames=2  ambiguity_margin=None
# (ambiguity_margin=None bedeutet „= change_thr")

# live ohne Neustart via API (motion_thr/change_thr werden vom Start-Button gesendet):
curl -X POST http://127.0.0.1:8001/api/start \
  -H 'Content-Type: application/json' \
  -d '{"profile":"phone","source":"https://192.168.178.23:4444/video/m.jpeg","motion_thr":4,"change_thr":20}'
```

> Hinweis: `confirm_frames` und `ambiguity_margin` sind aktuell nur über `tracker.py` (Konstruktor-Default)
> einstellbar, nicht über CLI/API. `motion_thr`/`change_thr` gehen beides.

## CNN-Recovery & -Kontrolle (automatisch)

Mit gesetztem `cnn_run` (Default: bestes vorhandenes Modell) läuft neben der Frame-Diff-Erkennung
ein CNN-Beobachter, der **nur die Occupancy** je Feld auswertet (leer/besetzt/verdeckt — die
Figurenidentität kennt der Tracker aus der Zughistorie; verdeckte Felder zählen NIE als besetzt):

- **Automatische Recovery:** Bleibt der Diff-Pfad hängen („kein legaler Zug passt" oder
  „viel Veränderung"), beobachtet das CNN das Brett und schlägt den legalen Zug vor, dessen
  resultierende Occupancy die Beobachtung am besten erklärt (Schlag/Rochade/en passant inklusive).
  Committet wird erst nach `confirm_frames` übereinstimmenden Beobachtungen (kein Single-Shot),
  mit Note `Zug per CNN-Recovery erkannt: …`.
- **Periodische Kontrolle:** Bei ruhigem Brett prüft das CNN alle `cnn_check_interval_s`, ob
  Spielzustand und Brett noch übereinstimmen. Ein eindeutig erklärender Zug wird (per Voting)
  übernommen; sonst warnt das UI-Badge **CNN: weicht ab** mit den Konflikt-Feldern in der Note.
- **Manuell:** Button **Resync per CNN** (bzw. `POST /api/resync_cnn`) prüft sofort und wendet
  einen eindeutigen Zug direkt an; ohne eindeutigen Zug werden die Konflikt-Felder gemeldet.
- Promotion-Varianten sind auf Occupancy-Ebene identisch → bewusst keine Entscheidung
  (Nutzer-Hinweis statt Raten). Fehlt der Modell-Run auf Platte, deaktiviert sich das Feature
  still (Note beim ersten Versuch).

## Grenzen (Prototyp)

- Startstellung muss bekannt sein (Grundstellung oder FEN-Resync; das CNN liefert Occupancy,
  keine Figurenidentität — beliebige Stellungen einlesen bleibt Folgearbeit).
- Schwellen sind heuristisch — siehe Tabelle, an Licht/Brett anpassen.

## Nächste Schritte

- Beliebige Startstellung per CNN einlesen (volle Klassifikation statt nur Occupancy).
- PGN-Export / Stockfish-Analyse der laufenden Partie.
