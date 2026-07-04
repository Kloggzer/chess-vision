# Übergabe: Synthetische Renders für die Trainings-Pipeline nutzen

> Briefing für einen ausführenden Agenten (z.B. codewhale). Stand 2026-07-04,
> Commits bis `dd6f620`. Ziel: aus den fertigen Scan-Assets einen synthetischen
> Trainingsdatensatz rendern, ingestieren und ein CNN darauf (vor)trainieren.

## Ausgangslage — was FERTIG ist (nicht neu bauen!)

- **12 gescannte Figuren** liegen render-fertig in `synth_pieces/<Figur>/v1.obj`
  (+ `v1.png` Textur, `v1.mtl`, Previews). Aufrecht (Basis z=0, Z-up), ~35k Dreiecke,
  Smooth-Normalen, echte Foto-Texturen. Der Board-Renderer skaliert sie automatisch
  über reale Basis-Durchmesser (`TARGET_BASE_MM` in `synth/render_board_v2.py`).
- **Brett-Textur** aus dem echten Brettfoto: `synth_pieces/board_texture.png`
  (erzeugt via `chesslab synth board-texture --image scans/board/IMG_20260702_221301.jpg`;
  das 221409-Foto hat nur 2/4 Marker — nicht verwenden).
- **Renderer**: `chesslab synth render` (Blender/EEVEE, `synth/render_board_v2.py`).

## Render-Ausgabeformat

Pro Sample schreibt der Renderer ins `--out`-Verzeichnis:

```
000000.png            # Top-Down-Rendering (--res Pixel, Kamera leicht randomisiert)
000000.json           # {"fen": "<placement>", "corners": [[x,y]×4]}
```

`corners` sind die projizierten Brettecken **in der Reihenfolge [a8, h8, h1, a1]**
(per Konstruktion exakt — kein Ecken-Raten nötig). `fen` ist das Placement-Feld.

## Der komplette Weg zum Trainingslauf

```bash
# 1) Stellungs-Vielfalt: FEN-Liste erzeugen/beschaffen (synth/fens.py existiert dafür;
#    Alternativ: FENs aus echten Partien/PGNs sampeln). Grundstellung-only ist WERTLOS
#    für die Klassenbalance — viele verschiedene Stellungen nötig.

# 2) Rendern (Batchgröße nach Bedarf; ~Sekunden pro Bild):
uv run chesslab synth render --out data/synth_train --n 2000 --seed 42 \
    --res 1024 --fens <fen-datei>

# 3) SICHTPRÜFUNG (Pflicht, bevor irgendetwas trainiert wird):
uv run chesslab ingest synthetic data/synth_train --tag pretrain-synth \
    --limit 32 --debug-overlay 8 --no-build
#    → Overlay-PNGs ansehen: stimmen die FEN-Labels mit den gerenderten Figuren
#    überein? Falsche Ecken-Zuordnung vertauscht ALLE Labels stillschweigend.

# 4) Voll-Ingest (slict die Renders in per-Feld-Crops + baut den Datensatz):
uv run chesslab ingest synthetic data/synth_train --tag pretrain-synth

# 5) Training (Pretrain auf Synthetik, dann Finetune auf echten Sessions):
uv run chesslab train --dataset pretrain-synth --head twostage --backbone mobilenet_v3_small
uv run chesslab train --dataset <echte-sessions> --resume <pretrain-run>
```

Der `synthetic`-Ingest-Adapter (`src/chesslab/ingest_adapters/synthetic.py`) gruppiert
je 500 Samples zu Pseudo-Sessions (`synth-NNN`) — der sessionbasierte Split (Pflicht,
CLAUDE.md) funktioniert damit unverändert.

## Warum das Ganze (Kontext)

Das Live-CNN des Move-Trackers generalisiert nicht auf neues Kamera-Footage
(meldet auf der unberührten Grundstellung „Brett weicht ab" — Domain-Mismatch).
Externe Datensätze sind zu oblique für unsere Top-Down-Kamera (siehe Memory
„Transfer-learning direction"). Die synthetischen Renders schließen genau diese
Lücke: eigenes Brett, eigene Figuren, Top-Down, beliebige Stellungen, exakte Labels.
Erfolgskriterium nach dem Finetune: `uv run pytest -m clips` (Replay-Regression,
`tests/test_clips.py`) — die CNN-Recovery-Pfade des Trackers müssen auf den
Testclips wieder greifen.

## Fallstricke (alle real erlebt, nicht überspringen)

1. **Assets nicht neu generieren.** `synth_pieces/` ist fertig. Falls doch nötig
   (neuer Scan): `synth prepare --in scans` → `scripts/decimate_pieces.py` (35k ist
   das Blender-Stabilitätslimit auf dieser Maschine, 50k+ crasht nativ) → Previews
   prüfen. Scan-Originale in `scans/` NIEMALS verändern (Memory-Regel; Backup D:\scans).
2. **Kamera-Vielfalt**: `--seed` variieren bzw. mehrere Batches; der Renderer
   randomisiert Pose/Licht nur begrenzt. Die Augmentation der Trainings-Pipeline
   (config.AugmentPolicy) erledigt Helligkeit/Blur — aber KEINE Flips/90°-Rotationen
   (fixe Kamera, verboten per CLAUDE.md).
3. **Photometrie-Parität**: `--photometry` beim Ingest muss zum Finetune-Datensatz
   passen (Default `none`).
4. **`--debug-overlay` ist nicht optional.** Ein stiller Label-Flip ruiniert den
   ganzen Lauf; 5 Minuten Sichtprüfung sparen Stunden.
5. Blender-Renders laufen nur auf dieser Maschine (Blender 5.1 unter
   `C:\Program Files\Blender Foundation\Blender 5.1`, via `CHESSLAB_BLENDER`
   überschreibbar).

## Definition of Done

- [ ] ≥ 2000 Renders mit diverser FEN-Liste in `data/synth_train/` (png+json-Paare)
- [ ] Debug-Overlays gesichtet, Labels korrekt (kurz im Ergebnis dokumentieren)
- [ ] Datensatz `pretrain-synth` gebaut, Klassenverteilung geprüft (`dataset stats`)
- [ ] Pretrain-Run abgeschlossen, val_acc dokumentiert
- [ ] Finetune auf echten Sessions mit `--resume`, Vergleich gegen bisherigen Run
- [ ] `uv run pytest -m clips` vorher/nachher-Vergleich im Ergebnis
