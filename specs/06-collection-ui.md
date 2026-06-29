# Stufe 6 — Collection-UI: Trainingsdaten-Assistent (`collect_ui.py`)

## Zweck

Beim Aufnehmen von Trainingsdaten fehlt dem Nutzer der Überblick: Welche Klassen sind
bereits gut abgedeckt? Welche Figurentypen fehlen fast völlig? Auf welchen Feldfarben
wurde eine Figur noch nie gesehen? Diese Stufe ergänzt den `collect`-Loop (Stufe 3)
um ein **zweites OpenCV-Fenster** — ein Live-Dashboard, das diese Fragen kontinuierlich
beantwortet und gezielt nächste Stellungen vorschlägt.

Kein neuer Pflicht-Dependency. Kein separater Prozess. Das Fenster öffnet sich neben dem
bestehenden Kamerafenster, sobald `--ui` übergeben wird.

## Abhängigkeiten zu anderen Stufen (wichtig)

- **Stufe 2 (`state.py`):** Die Abdeckung wird aus FEN abgeleitet — über dieselbe
  Label-Logik (`label_for` / das zentrale Mapping). Stufe 6 erfindet **kein** eigenes
  Label-Mapping.
- **Stufe 3 (`collect.py`):** liefert die Datenquelle (Session-Logs, s. u.) und den
  Loop, in den das Dashboard eingehängt wird.
- **Stufe 4 (`split.json`):** optional, nur für die Standalone-Ansicht.
- **Unabhängig von Stufe 5.** Stufe 6 kann direkt nach Stufe 4 gebaut werden; sie wird
  beim *Sammeln* genutzt, lange bevor trainiert wird.

## Datenquelle — Session-Logs, NICHT das Manifest (kritisch)

`collect` schreibt pro bestätigter Stellung **nur** Rohframe + FEN in `log.jsonl`
(Stufe 3, Teil 1). Das gelabelte Manifest `squares.jsonl` entsteht **erst später** durch
`slice` (Stufe 3, Teil 2). Während einer laufenden `collect`-Session existieren die
gerade aufgenommenen Stellungen also **noch nicht** im Manifest.

Deshalb berechnet das Dashboard die Abdeckung **direkt aus den Session-Logs**:

- Für jede Zeile in jeder `data/sessions/<id>/log.jsonl`: FEN nehmen, daraus die 64
  Feld-Labels via zentralem Mapping (Stufe 2) ableiten, `square_color` je Feld
  deterministisch berechnen (`(file_idx + rank_idx) % 2`).
- Über alle Sessions aggregieren → Zählung pro Klasse und pro (Klasse × Feldfarbe).

Das ergibt **exakt** dieselben Zahlen, die ein späteres `slice` produzieren würde (jede
geloggte Stellung = 64 Crops), ist aber **sofort beim Aufnehmen** verfügbar. So
aktualisiert sich die Abdeckung unmittelbar nach jeder Aufnahme.

> Das Manifest (`squares.jsonl`) wird **optional** als Zweitquelle gelesen, wenn es
> existiert — nur im Standalone-Modus (`chesslab ui`) nach einem `slice`, um bereits
> geslicte Crops auf Plausibilität gegen die Log-Ableitung zu prüfen. Für die Live-Sicht
> sind die Session-Logs maßgeblich.

## CLI

```
chesslab collect pgn  ... [--ui] [--target 200]
chesslab collect live ... [--ui] [--target 200]
```

`--ui` aktiviert das Dashboard-Fenster. `--target N` setzt die Zielzahl Samples pro
Nicht-`empty`-Klasse (Default aus `config.py`, s. u.). Ohne `--ui` ist das Verhalten
**bitidentisch** zu Stufe 3 — keine Verhaltensänderung an der Aufnahme-Logik.

Zusätzlich steht das Dashboard standalone zur Verfügung, um den aktuellen Stand
**ohne** laufende Aufnahme einzusehen:

```
chesslab ui [--sessions data/sessions] [--manifest data/manifests/squares.jsonl]
```

Standalone aggregiert es über **alle** Session-Logs (gleiche Ableitung wie oben).
`--manifest` ist optional und nur informativ.

## Konfiguration (config before code)

Alle Schwellwerte leben in `config.py` (bzw. YAML), nicht im Rendering-Code hartkodiert:

```python
ui_target_per_class: int = 200     # Zielzahl je Nicht-empty-Klasse (= stats-Schwelle Stufe 4)
ui_empty_target_ratio: float = 1.5 # empty-Ziel = ratio * größte Figurenklasse (vgl. max-empty-ratio)
ui_warn_frac: float = 0.5          # < 50 % Ziel -> rot, 50-99 % -> gelb, >= 100 % -> grün
ui_total_target: int = 5000        # Gesamt-Crop-Ziel für den Fortschrittsbalken (Bereich A)
```

`--target` überschreibt `ui_target_per_class` zur Laufzeit.

## Fensterlayout

Festes OpenCV-Bild (z. B. 900×700 px), das nach jeder aufgenommenen Stellung neu
gerendert wird. Vier Bereiche:

```
┌─────────────────────────────────────────────────────┐
│  SESSION-FORTSCHRITT                        [Bereich A] │
│  Sessions: 3 | Frames: 47 | abgeleitete Crops: 3 008 │
├───────────────────────┬─────────────────────────────┤
│  KLASSENABDECKUNG     │  HELL/DUNKEL-MATRIX [Bereich C] │
│  [Bereich B]          │                              │
├───────────────────────┴─────────────────────────────┤
│  NÄCHSTE EMPFOHLENE STELLUNG              [Bereich D] │
│  FEN: … | Begründung: bQ fehlt auf hellen Feldern    │
└─────────────────────────────────────────────────────┘
```

### Bereich A — Session-Fortschritt

- Anzahl Sessions, geloggte Frames, daraus abgeleitete Crops gesamt (Frames × 64).
- Aktueller Modus (PGN / Live) und Session-ID (im Live-Betrieb).
- Fortschrittsbalken Richtung `ui_total_target`.

### Bereich B — Klassenabdeckung (Balkendiagramm)

13 horizontale Balken in der kanonischen Reihenfolge aus `config.py`:

```
empty  ████████████████████ 1840
wP     ████████             320
wN     ██                    80  ← WARN
…
```

- Balkenbreite relativ zu `ui_target_per_class`.
- Farbe: **grün** ≥ 100 %, **gelb** `ui_warn_frac`–99 %, **rot** < `ui_warn_frac`.
- `empty` separat mit eigenem Ziel (`ui_empty_target_ratio` × größte Figurenklasse) und
  hellblauer Farbe — optisch abgesetzt, weil `empty` die Statistik dominiert.

### Bereich C — Hell/Dunkel-Matrix

Kompakte 13×2-Tabelle: jede Klasse × {hell, dunkel}. Die Spalten entsprechen den
Manifest-Werten **`light`** (hell) und **`dark`** (dunkel) aus Stufe 3.

```
       hell   dunkel
empty   ✓      ✓
wN      ✓      ✗  ← fehlt (light=ok, dark=0)
wB      ✗      ✓  ← fehlt
…
```

- ✓ (grün) wenn ≥ 1 Sample dieser (Klasse × Feldfarbe).
- ✗ (rot) wenn keine Samples. Stärkeres Signal als die reine Zahl: eine nur auf einer
  Feldfarbe gelernte Figur wird die andere im Echtbetrieb systematisch falsch erkennen.

### Bereich D — Empfohlene nächste Stellung

Einzeilige Empfehlung plus eine FEN für `collect live --start-fen`:

```
Empfehlung: wN auf dunklem Feld fehlt, bQ < 50 %
FEN: r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 6
[Taste g: FEN in Zwischenablage kopieren]
```

**Empfehlungslogik (deterministisch, priorisiert — kein Zufall, kein Seed nötig):**
1. (Klasse × Feldfarbe) mit ✗ (fehlende Feldfarben-Abdeckung) → höchste Priorität.
2. Klasse unter `ui_warn_frac` der Zielzahl.
3. Klasse unter 100 % der Zielzahl.

**FEN-Generierung (Anforderungen):**
- Die FEN muss die gesuchte Figur auf einem Feld der **konkret fehlenden Feldfarbe**
  platzieren (bei Priorität 1). Eine Figur auf dem falschen Feldfarbton schließt die
  Lücke nicht.
- Die FEN muss **strukturell gültig** sein (genau ein König je Farbe, keine Bauern auf
  Reihe 1/8, plausible Figurenzahlen) — sonst lehnt `chess.Board`/`--start-fen` sie ab.
- Empfohlene Umsetzung: kleine **statische Bibliothek** geprüfter Muster-FEN je
  (Klasse × Feldfarbe) in `collect_ui.py`. Keine Laufzeit-Suchlogik, dadurch
  deterministisch und testbar. Alternativ programmatisch via `chess.Board.set_piece_at`
  auf einem definierten Grundgerüst, anschließend `is_valid()`-Prüfung.

> Die FEN ist ein Vorschlag, kein Befehl. Der Nutzer baut die Stellung physisch auf und
> löst die Aufnahme wie gewohnt aus.

## Tastensteuerung (ein einziger Key-Loop — wichtig)

OpenCV-HighGUI hat **eine** globale `waitKey`-Schleife; Tastendrücke lassen sich **nicht**
einem bestimmten Fenster zuordnen. Deshalb:

- Das Dashboard-Fenster ist **rein darstellend** und verarbeitet **keine** eigenen Tasten.
- Der bestehende `collect`-Key-Loop (Stufe 3) bleibt alleiniger Tasten-Owner und erhält
  **eine** zusätzliche Taste:
  - `g` = empfohlene FEN aus Bereich D in die Zwischenablage kopieren (via `pyperclip`,
    optional). Fehlt `pyperclip` → WARN beim Start, `g` ist No-Op.
- Keine `q`-Kollision: `q` behält seine Stufe-3-Bedeutung (Session beenden) und schließt
  dabei **beide** Fenster. Es gibt keine separate „Dashboard schließen"-Taste.

Im Standalone-Modus (`chesslab ui`) gibt es nur ein Fenster; dort beendet `q` die Ansicht
und `g` kopiert die FEN.

## Integration in `collect`

Das Dashboard ist ein optionales Modul — `collect.py` importiert `collect_ui.py` nur, wenn
`--ui` gesetzt ist. Minimale Schnittstelle:

```python
# collect_ui.py
class CollectDashboard:
    def __init__(self, sessions_dir: Path, target_per_class: int = 200): ...
    def update(self) -> None:
        """Session-Logs neu aggregieren und Fenster neu rendern. Aufruf nach jeder Aufnahme."""
    def recommended_fen(self) -> str | None:
        """Aktuell empfohlene FEN (für Taste g im collect-Loop)."""
    def close(self) -> None: ...
```

`collect.py` ruft `dashboard.update()` nach jedem geschriebenen Log-Eintrag (auch nach
`undo`) auf. Das Dashboard hält **keinen** In-Memory-Zustand, der mit dem Loop konsistent
gehalten werden müsste — es liest die Logs bei jedem `update()` frisch.

## Rendering-Details

Alles mit `cv2`-Primitiven (`cv2.rectangle`, `cv2.putText`, `cv2.line`). Keine externen
Plot-Bibliotheken.

- Hintergrund dunkelgrau; Schrift `cv2.FONT_HERSHEY_SIMPLEX`, Größe 0.45–0.55.
- Fensterposition neben dem Kamerafenster (`cv2.moveWindow`).
- `cv2.WINDOW_NORMAL`, feste Basis-Canvas-Größe.

## Akzeptanzkriterien (Definition of Done)

- `chesslab collect live --ui` öffnet ein zweites Fenster; **nach jeder Aufnahme** ändert
  sich die Klassenabdeckung sichtbar — und das **vor** jedem `slice`, weil die Zahlen aus
  den Session-Logs (FEN→Label) stammen, nicht aus dem Manifest.
- Balkenfarben (grün/gelb/rot) stimmen mit `ui_warn_frac` überein; Hell/Dunkel-Matrix
  zeigt ✗ korrekt für (Klasse × Feldfarbe) ohne Samples.
- Die Empfehlung (Bereich D) nennt die Klasse/Feldfarbe mit der schlechtesten Abdeckung;
  die ausgegebene FEN enthält diese Figur auf der **richtigen** Feldfarbe und ist
  `chess.Board`-gültig (Unit-Test).
- `chesslab ui` öffnet das Dashboard standalone und aggregiert über alle Session-Logs,
  auch wenn noch **kein** `slice` gelaufen ist.
- Ohne `--ui` ist `collect` bitidentisch zu Stufe 3 (Regressions-Smoke-Test).
- `pyperclip` fehlt → saubere WARN, Taste `g` ist No-Op, keine Exception.

## Fallstricke

- **Manifest ≠ Live-Stand:** Das Manifest wächst erst beim `slice`. Die Live-Abdeckung
  **muss** aus den Session-Logs kommen, sonst zeigt das Dashboard die gerade
  aufgenommenen Stellungen nicht an.
- **Noch keine Session vorhanden:** keine Logs → „0 Crops", alle Klassen rot. Korrekt und
  hilfreich, kein Fehler.
- **Ein Key-Loop:** Nicht versuchen, Tasten pro Fenster zu trennen — das Dashboard ist
  darstellend, der collect-Loop besitzt die Tastatur.
- **Feldfarbe der Empfehlung:** Eine empfohlene FEN, die die Figur auf der falschen
  Feldfarbe platziert, schließt die ✗-Lücke nicht — Priorität 1 muss die Farbe treffen.
