"""Ein Upsert, dessen Alpha nicht umgehaengt werden kann, nimmt seine Zeile zurueck — wie alle
anderen Matte-Schreiber auch."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, matte, temporal_matte
from chesslab.ioutil import read_jsonl
from chesslab.session_store.matte import effective_rows
from conftest import write_jsonl


def test_a_failed_upsert_rename_retracts_its_row(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    stems = ("000001", "000002")
    write_jsonl(rec / "log.jsonl", [{"frame": f"frames/{s}.png", "ply": 1, "board": f"boards/{s}.webp"}
                                    for s in stems])
    write_jsonl(rec / "matte.jsonl", [{"frame": s, "coverage": {"a1": 0.0}} for s in stems])
    for s in stems:
        cv2.imwrite(str(rec / "mattes" / f"{s}.webp"), np.full((8, 8), 10, np.uint8))
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    for s in stems:
        cv2.imwrite(str(proposals / f"{s}.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [{"frame": s, "alpha": f"{s}.alpha.png",
                                                 "fraction_above_half": 1.0} for s in stems])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})
    real_replace = Path.replace

    def refuse_first(source: Path, target: Path):
        if source.name == "000001.tmp.webp":
            raise PermissionError(13, "a web cut holds it", str(target))
        return real_replace(source, target)

    monkeypatch.setattr(Path, "replace", refuse_first)

    with pytest.raises(OSError, match="000001.*retracted"):
        temporal_matte.upsert_proposals("rg-t")
    rows = effective_rows(read_jsonl(rec / "matte.jsonl"))
    assert rows["000001"].get("source") is None, "die Upsert-Zeile ohne ihre Pixel blieb stehen"
    assert cv2.imread(str(matte.alpha_for(rec, rows["000001"])), 0).max() == 10
    assert rows["000002"]["source"] == "upsert"
    assert cv2.imread(str(matte.alpha_for(rec, rows["000002"])), 0).min() == 255
    assert not list((rec / "mattes").glob("*.tmp.webp"))
