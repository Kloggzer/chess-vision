# Stufe 2 — Spielzustand (`state.py`)

## Zweck

Den exakten Brettzustand (FEN) zu jedem Aufnahmezeitpunkt kennen — das ist die Quelle der
Labels. Zwei Betriebsmodi, die dieselbe Zustands-Engine nutzen.

## Abhängigkeit

`python-chess`. `chess.Board` hält die Stellung; `board.fen()` liefert die FEN;
`board.piece_at(square)` liefert die Figur eines Feldes (Basis fürs Auto-Labeling in
Stufe 3).

## Öffentliche API (von Stufe 3 konsumiert)

```python
class GameState:
    board: chess.Board

    def fen(self) -> str: ...
    def piece_map(self) -> dict[str, str]:
        """{'e1': 'K', 'e8': 'k', 'a2': 'P', ...} – nur besetzte Felder, FEN-Buchstaben."""
    def label_for(self, square: str) -> str:
        """Label-Klasse für ein Feld: 'empty' oder z.B. 'wK','bP' (Mapping s.u.)."""
    def push_san(self, san: str) -> None: ...    # wirft bei illegalem Zug
    def push_uci(self, uci: str) -> None: ...
    def legal_moves_san(self) -> list[str]: ...
    def is_game_over(self) -> bool: ...
    def ply(self) -> int: ...                    # Halbzug-Index ab 0
```

### Label-Mapping (zentral, exakt diese Form)
- `piece_at` liefert FEN-Buchstaben: Weiß `PNBRQK`, Schwarz `pnbrqk`.
- Klassen-Label: Großbuchstabe -> Präfix `w`, Kleinbuchstabe -> Präfix `b`, dann
  Großbuchstabe des Typs. Beispiele: `P -> wP`, `n -> bN`. Leeres Feld -> `empty`.
- Dieses Mapping muss exakt der kanonischen Klassenliste aus `config.py` entsprechen.

## Modus A — PGN-Replay (`collect pgn`, primärer Datensammelmodus)

Ziel: eine echte Partie aus einer PGN physisch nachstellen; nach jedem Halbzug ein Foto.
Da die Zugfolge bekannt ist, ist **jede** Stellung sofort vollständig gelabelt.

Ablauf (Steuerung in Stufe 3, Zustand hier):
1. PGN laden (`chess.pgn.read_game`), Hauptvariante als Zugliste extrahieren.
2. Mit Startstellung beginnen. Pro Schritt:
   - aktuelle Ziel-FEN + nächsten erwarteten Zug (SAN) anzeigen,
   - Nutzer macht den Zug physisch und löst Aufnahme aus,
   - `push`(nächster Zug) -> neue FEN.
3. Optional Zwischenstellungen überspringen (`--every N` Halbzüge), falls man nicht jeden
   Halbzug fotografieren will.

## Modus B — Freies Spiel mit Zugeingabe (`collect live`)

Ziel: frei spielen und die Zustands-Engine manuell mitführen. **Eine Aktion pro Zug**
(Zug eintippen) statt 64 Klicks.
1. Start aus Startstellung **oder** aus einer vorgegebenen FEN (`--start-fen`), um gezielt
   seltene/figurenreiche Stellungen aufzunehmen.
2. Pro Zug: Nutzer tippt SAN oder UCI; Engine validiert (illegale Eingabe -> Hinweis,
   Wiederholung). Danach Aufnahme.
3. Befehle: `undo` (letzten Halbzug zurücknehmen), `fen <FEN>` (Stellung setzen), `done`.

> Tipp für die Datenqualität (in der CLI-Hilfe erwähnen): gezielt Stellungen mit vielen
> verschiedenen Figurentypen und Unterverwandlungen (mehrere Damen) aufbauen, nicht nur
> Eröffnungen — sonst sind seltene Klassen unterrepräsentiert (vgl. Stufe 4).

## Orientierung

Welche Bildecke welchem Feld entspricht, steht **im Kalibrierungsprofil** (`white_pov`),
nicht hier. `GameState` ist rein logisch und kennt keine Kamera. Stufe 3 verbindet beides.

## Akzeptanzkriterien (Definition of Done)

- `GameState` lässt sich headless (ohne Kamera) instanziieren und durch eine PGN steuern;
  `label_for` liefert für die Startstellung die korrekten 32 Figuren + 32 `empty`.
- `push_san`/`push_uci` werfen bei illegalen Zügen eine klare Exception.
- Eine bekannte Test-PGN durchgespielt ergibt am Ende die erwartete End-FEN (Unit-Test).
- `piece_map()` und `label_for()` sind über alle 64 Felder konsistent (Test: Vereinigung
  aus besetzten Feldern + `empty`-Feldern = 64).
