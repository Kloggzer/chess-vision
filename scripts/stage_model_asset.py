"""Ein trainiertes Modell in die APK-Assets legen, mit dem Config-Vertrag der App: ohne
`coverage_output` wird ein 14-spaltiger Graph als 14 Klassen gesoftmaxt.

Abgelegt wird nur, was `contract_errors` durchlaesst.

    uv run python scripts/stage_model_asset.py <run-dir> --gate 0.15 [--prior-lambda 8]"""
import argparse
import json
import shutil
from pathlib import Path

from chesslab.ioutil import write_json

ASSETS = Path("android/app/src/main/assets/cnn_model")

#: `InputRepr` in `Preprocess.kt` und der `clahe_denoise`-Riegel in `ModelSpec.parse`;
#: `tests/test_bug_hunt_20260923_export.py` haelt beide gleich.
ANDROID_INPUT_REPRS = frozenset({"rgb", "gray+sobel", "rgb+sobel", "sobel"})
ANDROID_CLAHE_DENOISE = frozenset({"off"})


def contract_errors(cfg: dict) -> list[str]:
    """What stops the app from serving `cfg` as trained — empty when nothing does."""
    errs = []
    repr_ = cfg.get("input_repr", "rgb")
    if repr_ not in ANDROID_INPUT_REPRS:
        errs.append(f"input_repr={repr_!r}: die App kennt nur {sorted(ANDROID_INPUT_REPRS)}")
    denoise = cfg.get("clahe_denoise", "off")
    if denoise not in ANDROID_CLAHE_DENOISE:
        errs.append(f"clahe_denoise={denoise!r}: die App kennt nur {sorted(ANDROID_CLAHE_DENOISE)}")
    if "temperature_error" in cfg:
        errs.append(f"temperature: das Fitting scheiterte ({cfg['temperature_error']})")
    elif not _positive(cfg.get("temperature")):
        errs.append("temperature fehlt: die App nimmt dann 1,0 — `train` fittet sie auf val")
    if cfg.get("coverage_output") and not _positive(cfg.get("coverage_gate")):
        errs.append("coverage_gate fehlt: --gate, gemessen nach docs/occlusion-gate.md")
    if not _positive(cfg.get("prior_lambda")):
        errs.append("prior_lambda fehlt: --prior-lambda, gemessen mit scripts/sweep_prior_lambda.py "
                    "(docs/offene-entscheidungen.md, Prior-Kurve)")
    return errs


def _positive(v) -> bool:
    return isinstance(v, int | float) and not isinstance(v, bool) and v > 0


def stale_graph(run: Path, cfg: dict) -> str | None:
    """Why `model.onnx` is not the export of the checkpoint beside it — None when it is."""
    from chesslab.training.evaluate import EXPORT_FINGERPRINT, export_fingerprint

    stamp = cfg.get(EXPORT_FINGERPRINT)
    if not stamp:
        return "config.json traegt keinen export_fingerprint — neu exportieren"
    now = export_fingerprint(run)
    for key in ("checkpoint", "checkpoint_sha256", "onnx_sha256"):
        if stamp.get(key) != now[key]:
            return f"{key} weicht ab (Export {stamp.get(key)!r}, jetzt {now[key]!r}) — neu exportieren"
    return None


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
    ap.add_argument("--gate", type=float, default=None,
                    help="coverage_gate, gemessen mit scripts/occlusion_gate.py "
                         "(Default: der Wert der Run-Config)")
    ap.add_argument("--prior-lambda", type=float, default=None,
                    help="prior_lambda, gemessen mit scripts/sweep_prior_lambda.py "
                         "(Default: der Wert der Run-Config)")
    ap.add_argument("--name", default=None, help="Asset-Ordner (Default: Name des Run-Ordners)")
    ap.add_argument("--force", action="store_true", help="Vorhandenen Asset-Ordner ueberschreiben")
    args = ap.parse_args()

    if args.stamp:
        if args.gate is None:
            raise SystemExit("--stamp braucht --gate")
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
    if args.gate is not None:
        cfg["coverage_gate"] = args.gate
    if args.prior_lambda is not None:
        cfg["prior_lambda"] = args.prior_lambda
    errs = contract_errors(cfg)
    stale = stale_graph(run, cfg)
    if stale:
        errs.insert(0, f"model.onnx: {stale}")
    if errs:
        for e in errs:
            print(f"[FAIL] {e}")
        return 1

    out = ASSETS / (args.name or run.name)
    if out.exists() and not args.force:
        print(f"[FAIL] {out} existiert bereits; zum Ersetzen --force angeben")
        return 1
    out.mkdir(parents=True, exist_ok=True)
    write_json(out / "config.json", cfg)
    shutil.copy2(onnx, out / "model.onnx")
    print(f"[OK] {out}  classes={len(cfg['classes'])} coverage_output={cfg['coverage_output']} "
          f"coverage_gate={cfg.get('coverage_gate')} prior_lambda={cfg['prior_lambda']}  "
          f"({(out/'model.onnx').stat().st_size/1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
