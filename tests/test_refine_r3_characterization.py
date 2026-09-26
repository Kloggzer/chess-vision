"""Refinement Runde 3: was die zusammengefuehrten Wege vorher taten, bitgleich festgehalten."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import alignment, calibration, config, ioutil, matte, temporal_matte
from chesslab.training import pack_dataset

STAMP = "2026-01-01T00:00:00+00:00"


def _recording(tmp_path: Path, monkeypatch, meta: str | None) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    if meta is not None:
        (rec / "session.yaml").write_text(meta, encoding="utf-8")
    ioutil.write_rows(rec / "log.jsonl", [
        {"frame": f"frames/{s}.png", "board": f"boards/{s}.webp", "ply": i, "dirty": True,
         "dirty_reason": "occluded"} for i, s in enumerate(("000001", "000002", "000003"), 1)])
    ioutil.write_rows(rec / "matte.jsonl", [
        {"frame": "000001", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.9}},
        {"frame": "000002", "concepts": {}, "coverage": {"a1": 0.0}},
        {"frame": "000003", "source": "temporal", "coverage": {"a1": 1.0}},
        {"frame": "000002", "source": "upsert", "merged_at": STAMP, "coverage": {"a1": 1.0}},
    ])
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    for stem, value in (("000001", 255), ("000002", 255), ("000003", 200)):
        assert cv2.imwrite(str(proposals / f"{stem}.alpha.png"), np.full((8, 8), value, np.uint8))
    ioutil.write_rows(proposals / "proposals.jsonl", [
        {"frame": s, "alpha": f"{s}.alpha.png", "fraction_above_half": f}
        for s, f in (("000001", 0.123456), ("000002", 1.0), ("000003", 0.5))])
    stamp = temporal_matte.source_stamp(rec) if meta else "vor-dem-profil"
    (proposals / "proposals.meta.json").write_text(json.dumps({"source": stamp}), encoding="utf-8")
    return rec


# --- Profil der Aufnahme: welcher Fehler, wenn es fehlt -------------------------------------

def _pack_cut(rec: Path, monkeypatch):
    from chesslab.session_store import recording as store_rec

    monkeypatch.setattr(store_rec, "game_dir", lambda _name: rec)
    return pack_dataset._cut_session(("x.u8", 1, (8, 8), "rg-t", {}))


CALLERS = {
    "recut_coverage": lambda rec, mp: matte.recut_coverage("t", progress=False),
    "recut_fixed": lambda rec, mp: matte.recut_fixed("t", progress=False),
    "close_seams": lambda rec, mp: matte.close_seams("t", progress=False),
    "alpha_worker": lambda rec, mp: matte.alpha_worker("t", progress=False),
    "adopt": lambda rec, mp: temporal_matte.adopt_proposals("rg-t"),
    "upsert": lambda rec, mp: temporal_matte.upsert_proposals("rg-t"),
    "pack": _pack_cut,
}

MISSING = {"no-yaml": None, "no-key": "session_id: rg-t\n", "empty-yaml": "",
           "no-profile-file": "session_id: rg-t\nprofile: nirgends\n"}


def _expected(caller: str, case: str) -> type[Exception]:
    """Vor Runde 3 KeyError (kein `profile`) und TypeError (leeres session.yaml); alle Aufrufer
    fangen FileNotFoundError. `require_fresh_proposals` stirbt vorher am leeren session.yaml.
    """
    if caller in ("adopt", "upsert") and case == "empty-yaml":
        return AttributeError
    return FileNotFoundError


@pytest.mark.parametrize("case", sorted(MISSING))
@pytest.mark.parametrize("caller", sorted(CALLERS))
def test_a_session_without_a_usable_profile_is_refused_the_same_way(tmp_path, monkeypatch, caller, case):
    rec = _recording(tmp_path, monkeypatch, MISSING[case])

    with pytest.raises(_expected(caller, case)) as caught:
        CALLERS[caller](rec, monkeypatch)
    assert type(caught.value) is _expected(caller, case)
    if case in ("no-yaml", "no-key") and caller not in ("adopt", "upsert"):
        assert ("fehlt" if case == "no-yaml" else "nennt kein Profil") in str(caught.value)


# --- adopt/upsert: Zeilen und Ergebnis byte-genau --------------------------------------------

def _wire_proposals(monkeypatch):
    monkeypatch.setattr(calibration, "load_profile", lambda _name: "profile")
    monkeypatch.setattr(matte, "coverage_of",
                        lambda alpha, entry, profile: {"a1": round(float(alpha.mean()), 4), "b1": 0.6})
    monkeypatch.setattr(temporal_matte.provenance, "source", lambda _rec: {"log": "stamp"})


class _Clock:
    @staticmethod
    def now(_tz):
        from datetime import datetime
        return datetime.fromisoformat(STAMP)


def test_adopt_writes_exactly_these_rows(tmp_path, monkeypatch):
    rec = _recording(tmp_path, monkeypatch, "session_id: rg-t\nprofile: p\n")
    _wire_proposals(monkeypatch)

    result = temporal_matte.adopt_proposals("rg-t")

    assert {k: v for k, v in result.items() if k != "path"} == {
        "adopted": 1, "empty": 0, "kept_sam": 2, "replaced": 1}
    assert (rec / "matte.jsonl").read_text(encoding="utf-8").splitlines()[-1] == json.dumps({
        "frame": "000003", "ply": 3, "dirty_reason": "occluded", "source": "temporal",
        "_source": {"log": "stamp"}, "concepts": {"temporal": 0.5},
        "coverage": {"a1": 0.7843, "b1": 0.6}, "cells_over_half": 2}, ensure_ascii=False)


def test_upsert_writes_exactly_these_rows(tmp_path, monkeypatch):
    rec = _recording(tmp_path, monkeypatch, "session_id: rg-t\nprofile: p\n")
    _wire_proposals(monkeypatch)
    monkeypatch.setattr(temporal_matte, "datetime", _Clock)

    result = temporal_matte.upsert_proposals("rg-t")

    assert {k: v for k, v in result.items() if k != "path"} == {
        "upserted": 1, "sam_found": 1, "fixed": 0, "replaced": 1}
    assert (rec / "matte.jsonl").read_text(encoding="utf-8").splitlines()[-1] == json.dumps({
        "frame": "000002", "ply": 2, "dirty_reason": "occluded", "source": "upsert",
        "merged_at": STAMP, "_source": {"log": "stamp"}, "concepts": {"temporal": 1.0},
        "coverage": {"a1": 1.0, "b1": 0.6}, "cells_over_half": 2}, ensure_ascii=False)


# --- alignment: die Huber-Schleife, Bit fuer Bit --------------------------------------------

def _digest(values) -> str:
    return hashlib.sha256(np.asarray(values, np.float64).tobytes()).hexdigest()[:16]


def test_the_huber_fits_are_bit_identical_to_before():
    rng = np.random.default_rng(7)
    present = [0, 1, 2, 4, 5, 7, 8]
    ks = np.repeat(np.array(present, np.float64), 6)
    lever = rng.uniform(-300, 300, ks.size)
    pos = 50 + 100 * ks + (0.002 + 0.0001 * ks) * lever + rng.normal(0, 0.3, ks.size)
    pos[::7] += rng.normal(0, 25, pos[::7].size)
    axis = alignment._fit_axis(ks, lever, pos, present, alignment.MIN_BAND_SAMPLES)
    u = rng.uniform(-0.5, 0.5, 40)
    r = 0.3 + 2.0 * u * u + rng.normal(0, 0.2, 40)
    r[::9] += 15.0
    quad = alignment._quad_coeffs(u, r)

    assert _digest([v for k in sorted(axis) for v in axis[k]]) == "670240abb6224b89"
    assert _digest(quad) == "682585675e9f52a2"
