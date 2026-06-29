"""Session-Verwaltung (archive/restore/delete) — headless mit temporären Pfaden."""

import json

import pytest
import yaml

from chesslab import config
from chesslab import sessions as S


def _mk_session(paths, sid, frames=2, archived=False):
    root = paths.sessions_archive if archived else paths.sessions
    d = root / sid
    (d / "frames").mkdir(parents=True)
    (d / "session.yaml").write_text(
        yaml.safe_dump({"session_id": sid, "mode": "live", "profile": "default"}), encoding="utf-8")
    lines = "\n".join(json.dumps({"frame": f"frames/{i:04d}.png", "ply": i, "fen": "f"})
                      for i in range(frames))
    (d / "log.jsonl").write_text(lines + "\n", encoding="utf-8")
    return d


def _mk_manifest(paths, session_ids):
    mp = paths.manifests / "squares.jsonl"
    mp.parent.mkdir(parents=True, exist_ok=True)
    mp.write_text("\n".join(json.dumps({"session_id": s}) for s in session_ids) + "\n", encoding="utf-8")


def _mk_crop(paths, sid, frame="0000", square="e1", label="wK"):
    d = paths.squares / label
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{sid}_{frame}_{square}.png"
    p.write_bytes(b"x")
    return p


def test_list_sessions_reports_frames_and_crops(tmp_path):
    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1", frames=3)
    _mk_session(paths, "s0", frames=1, archived=True)
    _mk_manifest(paths, ["s1", "s1"])
    lst = {m["session_id"]: m for m in S.list_sessions(paths)}
    assert lst["s1"]["n_frames"] == 3 and lst["s1"]["n_crops"] == 2 and lst["s1"]["archived"] is False
    assert lst["s0"]["archived"] is True and lst["s0"]["n_crops"] == 0


def test_archive_removes_crops_and_manifest_then_restore(tmp_path):
    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1")
    _mk_session(paths, "s2")
    _mk_manifest(paths, ["s1", "s2"])
    _mk_crop(paths, "s1")
    _mk_crop(paths, "s2")

    r = S.archive_session("s1", paths)
    assert r["removed_crops"] == 1
    assert not (paths.sessions / "s1").exists() and (paths.sessions_archive / "s1").exists()
    kept = [json.loads(l)["session_id"] for l in (paths.manifests / "squares.jsonl")
            .read_text(encoding="utf-8").splitlines() if l.strip()]
    assert kept == ["s2"]                                  # nur s2 bleibt im Manifest
    assert not (paths.squares / "wK" / "s1_0000_e1.png").exists()
    assert (paths.squares / "wK" / "s2_0000_e1.png").exists()  # andere Session unberührt

    S.restore_session("s1", paths)
    assert (paths.sessions / "s1").exists() and not (paths.sessions_archive / "s1").exists()


def test_delete_removes_dir_crops_manifest_and_corrections(tmp_path):
    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1")
    _mk_manifest(paths, ["s1", "s2"])
    _mk_crop(paths, "s1")
    cp = paths.corrections
    cp.parent.mkdir(parents=True, exist_ok=True)
    cp.write_text("\n".join(json.dumps({"session_id": s, "frame": "0000", "square": "e1", "label": "wK"})
                            for s in ("s1", "s2")) + "\n", encoding="utf-8")

    r = S.delete_session("s1", paths)
    assert r["deleted"] and r["removed_crops"] == 1
    assert not (paths.sessions / "s1").exists()
    assert [json.loads(l)["session_id"] for l in (paths.manifests / "squares.jsonl")
            .read_text(encoding="utf-8").splitlines() if l.strip()] == ["s2"]
    assert [json.loads(l)["session_id"] for l in cp.read_text(encoding="utf-8").splitlines()
            if l.strip()] == ["s2"]


def test_invalid_id_and_missing(tmp_path):
    paths = config.Paths(root=tmp_path)
    with pytest.raises(ValueError):
        S.delete_session("../etc", paths)
    with pytest.raises(FileNotFoundError):
        S.archive_session("nope", paths)
    with pytest.raises(FileNotFoundError):
        S.restore_session("nope", paths)
