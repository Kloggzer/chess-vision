"""Ein trainiertes Modell in die APK-Assets legen — mit dem Config-Vertrag, den die App liest.

`chesslab export` schreibt `model_card.json`; `ModelSpec` liest daneben eine `config.json` mit
`coverage_output` und (seit 2026-08-24) `coverage_gate`. Beide fehlen dem Card, und ein 14-spaltiger
Graph ohne `coverage_output` wird als 14 Klassen gesoftmaxt — jede Wahrscheinlichkeit waere falsch.
Deshalb wandert die Run-`config.json` mit, um die zwei Schluessel ergaenzt.

    uv run python scripts/stage_model_asset.py <run-dir> --gate 0.15
"""
import argparse
import json
import shutil
from pathlib import Path

from chesslab.ioutil import write_json

ASSETS = Path("android/app/src/main/assets/cnn_model")


def stamp(asset: Path, gate: float) -> int:
    """Set `coverage_gate` on an already staged asset and touch nothing else."""
    cfg_path = asset / "config.json"
    if not cfg_path.is_file() or not (asset / "model.onnx").is_file():
        raise SystemExit(f"{asset} ist kein abgelegtes Asset (config.json + model.onnx)")
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    cfg["coverage_gate"] = gate
    write_json(cfg_path, cfg)
    print(f"[OK] {asset.name}  coverage_gate={gate}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run", nargs="?")
    ap.add_argument("--stamp", metavar="ASSET-DIR",
                    help="Nur `coverage_gate` in ein BESTEHENDES Asset schreiben. Das Gate wird "
                         "nach dem Ablegen gemessen, und zu sechs der sieben gebuendelten "
                         "Modelle gibt es keinen Lauf-Ordner mehr.")
    ap.add_argument("--gate", type=float, required=True,
                    help="coverage_gate, gemessen mit scripts/occlusion_gate.py")
    ap.add_argument("--name", default=None, help="Asset-Ordner (Default: Name des Run-Ordners)")
    ap.add_argument("--force", action="store_true", help="Vorhandenen Asset-Ordner ueberschreiben")
    args = ap.parse_args()

    if args.stamp:
        return stamp(Path(args.stamp), args.gate)
    if not args.run:
        raise SystemExit("entweder <run-dir> oder --stamp <asset-dir>")
    run = Path(args.run)
    cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
    onnx = run / "model.onnx"
    if not onnx.is_file():
        raise SystemExit(f"kein model.onnx in {run} — erst `chesslab export --format onnx`")

    # `head: occlusion` IST die Coverage-Spalte; der Export nennt sie nur nicht.
    cfg["coverage_output"] = cfg.get("head") == "occlusion"
    cfg["coverage_gate"] = args.gate

    out = ASSETS / (args.name or run.name)
    if out.exists() and not args.force:
        print(f"[FAIL] {out} existiert bereits; zum Ersetzen --force angeben")
        return 1
    out.mkdir(parents=True, exist_ok=True)
    write_json(out / "config.json", cfg)
    shutil.copy2(onnx, out / "model.onnx")
    print(f"[OK] {out}  classes={len(cfg['classes'])} coverage_output={cfg['coverage_output']} "
          f"coverage_gate={args.gate}  ({(out/'model.onnx').stat().st_size/1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
