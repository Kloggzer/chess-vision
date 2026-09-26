"""Ein Trainingslauf auf der Platte: der EINE Leser seiner `config.json`, ohne torch."""

from __future__ import annotations

import json
from pathlib import Path

CONFIG_FILE = "config.json"


def read_run_config(run_dir: Path | str) -> dict:
    path = Path(run_dir) / CONFIG_FILE
    if not path.is_file():
        raise FileNotFoundError(f"no {CONFIG_FILE} in {run_dir}")
    return json.loads(path.read_text(encoding="utf-8"))


def lacks_run_config(run_dir: Path | str) -> bool:
    """True, with the refusal printed, when `run_dir` is no finished run."""
    if (Path(run_dir) / CONFIG_FILE).is_file():
        return False
    print(f"[FAIL] no {CONFIG_FILE} in {run_dir} — first run `chesslab train`.")
    return True
