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
python -m move_tracker.app --profile phone --source https://192.168.178.23:4444/video/m.jpeg
# dann:  http://127.0.0.1:8001
```

Im UI: **Start** (beginnt aus der Grundstellung) · **Startstellung neu** (= „ich habe gerade die
Grundstellung aufgebaut", setzt die Referenz) · **Undo**. Links Live-Kamera mit dem, was der Computer
glaubt (Figurenbuchstaben + letzter Zug gelb), rechts das rekonstruierte Brett + Zugliste + FEN.

**Bedienung:** Grundstellung aufbauen → **Start** → normal ziehen. Nach jedem Zug (Hand weg, Brett ruhig)
erscheint der Zug rechts. Verrutscht etwas / Zug nicht erkannt → **Undo** oder **Startstellung neu**.

## Parameter (alle Stellschrauben)

Die Defaults leben in **einer** Stelle: dem `MoveTracker(...)`-Konstruktor in `tracker.py`. Dort dauerhaft
ändern, oder pro Lauf per CLI-Flag (`app.py`) bzw. API-Body (`POST /api/start`) überschreiben.

| Parameter         | Default        | Wirkung                                                                 | Hochsetzen, wenn …                          | Runtersetzen, wenn …                        | Wo einstellbar |
|-------------------|----------------|-------------------------------------------------------------------------|---------------------------------------------|---------------------------------------------|----------------|
| `profile`         | `"phone"`      | chesslab-Kalibrierprofil (Geometrie/Warp). Datei `data/calibration/<name>.yaml`. | —                                           | —                                           | CLI `--profile`, API-Body |
| `source`          | `"0"`          | Kamera: `0`/`1` = lokale Webcam, URL = IP-Cam (MJPEG `…/video/m.jpeg`).  | —                                           | —                                           | CLI `--source`, API-Body |
| `motion_thr`      | `3.0`          | Bewegungs-Schwelle (mittlere Frame-zu-Frame-Differenz) für „Hand im Bild". | Erkennung bleibt fälschlich auf „moving" (Licht-/Sensorrauschen). | Züge werden erkannt, *während* die Hand noch über dem Brett ist. | `tracker.py`, API-Body |
| `change_thr`      | `16.0`         | Ab welcher Helligkeits­differenz (0–255) ein Feld als „geändert" gilt.   | Geisterzüge durch Schatten/Licht.           | Echte Züge werden übersehen (zu wenig Kontrast Figur↔Feld). | `tracker.py`, API-Body |
| `settle_frames`   | `4`            | Wie viele ruhige Frames vergehen müssen, bis überhaupt geprüft wird.     | Es wird zu früh geprüft (Brett noch nicht ganz ruhig). | Erkennung fühlt sich träge an.              | `tracker.py` |
| `confirm_frames`  | `2`            | Wie oft derselbe Zug in Folge bestätigt sein muss, bevor er committet.   | Noch Geisterzüge durch einzelne Rausch-Frames. | Erkennung soll schneller/sofort reagieren (`1`). | `tracker.py` |
| `ambiguity_margin`| `= change_thr` | Mindest-Score-Abstand zum zweitbesten Zug; sonst „mehrdeutig", kein Commit. | Zu oft „mehrdeutig" bei eindeutigen Zügen.  | Zwei ähnliche Züge werden verwechselt.      | `tracker.py` |
| `--host`/`--port` | `127.0.0.1`/`8001` | Adresse des Web-UI.                                                  | —                                           | —                                           | CLI |

**Beispiele:**

```bash
# pro Lauf via CLI (Geometriequelle):
python -m move_tracker.app --profile phone --source 1 --port 8002

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

## Grenzen (Prototyp)

- Startstellung muss bekannt sein (Grundstellung; beliebige Stellung später per CNN-Resync).
- Bei Desync (verschobene Figur, Wackler) hilft aktuell nur **Undo**/**Startstellung neu**.
- Schwellen sind heuristisch — siehe Tabelle, an Licht/Brett anpassen.

## Nächste Schritte

- **CNN-Resync** (chesslab-Modell) als Sicherheitsnetz: bei „kein legaler Zug passt" das Brett neu
  klassifizieren und den Zustand korrigieren.
- Beliebige Startstellung per CNN einlesen statt Grundstellung.
- PGN-Export / Stockfish-Analyse der laufenden Partie.
</content>
</invoke>
