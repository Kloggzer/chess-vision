# 08 — Synth-Pipeline reproduzierbar machen

**Größe:** S · **Hängt ab von:** 00 (sinnvoll nach 03 wegen des Ecken-Tests) · **Blockiert:** —

## Ziel & Kontext

Die synthetische Datenpipeline (Turntable-Fotos → RealityScan → `isolate_piece.py` →
`fens.py` → `render_chessboard.py` in Blender → Ingest) ist der wichtigste Hebel gegen den
Trainingsdaten-Mangel — aber heute nur mit Operator-Gedächtnis bedienbar: cwd-relative
hartkodierte Pfade (`data/synth_raw`, `synth_assets/Chess Scene.blend`, `synth_pieces/`),
hartkodierte Auflösung (1024 px), keine Orchestrierung, kein README. Fehlbedienung erzeugt
stumm falsche Daten. Diese Phase macht Pfade/Parameter explizit und dokumentiert die Kette.

## Änderungen

### 1. `synth/render_chessboard.py` — explizite Flags (≈ Z.294–316)

Die Argument-Verarbeitung nach dem `--`-Separator (Blender-Konvention) auf benannte Flags
umstellen; Parsing als **pure Funktion** kapseln (bpy-frei testbar):

```python
def parse_render_args(argv: list[str]) -> RenderArgs
    # --out PFAD (PFLICHT, wird absolut aufgelöst)  --n INT (Default 200)
    # --seed INT (Default 42)  --fens PFAD (optional)  --pieces PFAD (Default: neben --blend)
    # --res INT (Default 1024, ersetzt die hartkodierte Auflösung ≈ Z.315)
```

Keine cwd-relativen Defaults für Ausgaben mehr; beim Start alle aufgelösten absoluten Pfade
per print ausgeben. Ausgabeformat (PNG + JSON mit `fen` + `corners [a8,h8,h1,a1]`) bleibt
**unverändert** — der Test aus Spec 03 ist der Wächter.

### 2. `config.py` — `SynthDefaults`

```python
@dataclass(frozen=True)
class SynthDefaults:
    blend: Path      # Default: REPO_ROOT / "synth_assets/Chess Scene.blend"
    pieces_dir: Path # Default: REPO_ROOT / "synth_pieces"
    out_dir: Path    # Default: paths.data / "synth_raw"
    res: int = 1024
    blender_exe: str = "blender"   # überschreibbar via Env CHESSLAB_BLENDER
```

### 3. Neuer CLI-Befehl `chesslab synth render`

In `cli.py` (lazy imports, Muster bestehender Befehle). Trennung für Testbarkeit:

```python
def build_blender_cmd(blender, blend, script, out, n, seed, fens, pieces, res) -> list[str]
    # ["blender", "--background", str(blend), "--python", str(script), "--",
    #  "--out", str(out), "--n", ..., "--res", ...]
```

Der Befehl druckt die exakte Kommandozeile vor dem `subprocess.run` (`[OK]/[FAIL]`-Glyphen wie
im Bestand). Optionen: `--blend`, `--pieces-dir`, `--out`, `--n`, `--seed`, `--fens`, `--res`,
`--blender` (Defaults aus `SynthDefaults`). Optional, wenn trivial: `chesslab synth fens`
als Wrapper um `synth/fens.py`.

### 4. `synth/README.md` — die vollständige Kette

Abschnitte mit exakten Befehlen:
1. Turntable-Aufnahme (`synth/capture_turntable.py`, Anti-Flicker-Hinweis),
2. RealityScan (Cloud) → Mesh+Textur herunterladen,
3. `synth/isolate_piece.py` in Blender (Figur aufrecht, Basis z=0, Ausgabe `synth_pieces/<X>.obj+png`),
4. `synth/fens.py` (FEN-Liste),
5. `chesslab synth render …` (bzw. rohe Blender-Zeile als Alternative),
6. `chesslab ingest synthetic <out> --tag synth …` + visuelle Kontrolle,
7. Training mit dem Variant-Manifest.

Prominent dokumentieren: **Ecken-Reihenfolge `[a8, h8, h1, a1]`** ist der Contract; Wächter ist
`tests/test_ingest_synthetic.py`. Asset-Erwartungen (blend-Szene, pieces-Namensschema) auflisten.

### 5. Kleinkram

`cli.py`-Hilfetext des `ingest`-Befehls: Adapter-Liste um `synthetic` ergänzen (nennt aktuell
nur `chesscog | chessred`).

## Tests — neu `tests/test_synth_cli.py`

1. `parse_render_args`: Pflicht-`--out` fehlt → Fehler; alle Flags geparst; Pfade absolut.
   (Import so gestalten, dass kein `bpy` nötig ist — Parser in einen bpy-freien Abschnitt des
   Skripts legen oder als Mini-Modul `synth/render_args.py`.)
2. `build_blender_cmd`: erzeugte argv entspricht exakt dem dokumentierten Format inkl. `--`.
3. `SynthDefaults`: Defaults lösen auf absolute Pfade auf; `CHESSLAB_BLENDER` überschreibt exe.

Kein Test startet Blender.

## Definition of Done

- [ ] render_chessboard.py mit Flags, `--out` Pflicht, `--res` parametrisiert, Ausgabeformat unverändert
- [ ] `chesslab synth render` + SynthDefaults + build_blender_cmd
- [ ] synth/README.md mit vollständiger Befehlskette + Ecken-Contract
- [ ] ingest-Hilfetext ergänzt; Tests grün; Gesamtsuite grün; Commit `rework 08: …`

## Guardrails

- Ausgabe-JSON-Format nicht anfassen (Spec-03-Test + Adapter hängen daran).
- bpy darf in keinem Test importiert werden.
- Bestehende Render-Aufrufe im REPORT/README (rohe Blender-Zeile) als Alternative
  dokumentieren, nicht löschen — Nutzer-Gewohnheit.
