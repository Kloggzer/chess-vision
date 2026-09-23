"""Session-Verwaltung (archive/restore/delete) — headless mit temporären Pfaden."""

import json
from pathlib import Path

import pytest
import yaml

from chesslab import config, session_lifecycle
from chesslab.session_store import paths as store_paths


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


def _manifest(paths, tag="default"):
    """A pool carries its own manifest now: `crops/<tag>/manifest.jsonl`."""
    return paths.crops / tag / "manifest.jsonl"


def _mk_manifest(paths, session_ids):
    mp = _manifest(paths)
    mp.parent.mkdir(parents=True, exist_ok=True)
    mp.write_text("\n".join(json.dumps({"session_id": s}) for s in session_ids) + "\n", encoding="utf-8")


def _mk_crop(paths, sid, frame="0000", square="e1", label="wK"):
    d = paths.crop_pool / label
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{sid}_{frame}_{square}.png"
    p.write_bytes(b"x")
    return p


def test_list_sessions_reports_frames_and_crops(tmp_path):
    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1", frames=3)
    _mk_session(paths, "s0", frames=1, archived=True)
    _mk_manifest(paths, ["s1", "s1"])
    lst = {m["session_id"]: m for m in session_lifecycle.list_sessions(paths)}
    assert lst["s1"]["n_frames"] == 3 and lst["s1"]["n_crops"] == 2 and lst["s1"]["archived"] is False
    assert lst["s0"]["archived"] is True and lst["s0"]["n_crops"] == 0


def test_archive_prunes_an_ingested_session_from_its_variant_pool(tmp_path):
    """An ingested session is sliced into `crops/<tag>` — archiving must reach that too.

    `list_sessions` reads its crop count from that pool's own manifest, but archiving purged
    only the default pool and filtered only its manifest. The directory moved, the crops
    and the rows stayed, and the session kept contributing to every dataset built afterwards —
    while the archive index recorded `removed_crops: 0` as if there had been nothing to remove.
    """
    paths = config.Paths(root=tmp_path)
    d = _mk_session(paths, "chesscog__s1")
    (d / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "chesscog__s1", "mode": "ingested", "profile": "chesscog"}),
        encoding="utf-8")

    pool = paths.crops / "chesscog" / "wK"
    pool.mkdir(parents=True)
    (pool / "chesscog__s1_0000_e1.png").write_bytes(b"x")
    variant = _manifest(paths, "chesscog")
    variant.parent.mkdir(parents=True, exist_ok=True)
    variant.write_text(json.dumps({"session_id": "chesscog__s1"}) + "\n"
                       + json.dumps({"session_id": "chesscog__s2"}) + "\n", encoding="utf-8")

    res = session_lifecycle.archive_session("chesscog__s1", "duplicate of the rig corpus", paths)

    assert res["removed_crops"] == 1, "the variant pool was not purged"
    assert not (pool / "chesscog__s1_0000_e1.png").exists()
    kept = [json.loads(x)["session_id"] for x in variant.read_text(encoding="utf-8").splitlines() if x.strip()]
    assert kept == ["chesscog__s2"], f"variant manifest still holds the archived session: {kept}"


def test_archive_removes_crops_and_manifest_then_restore(tmp_path):
    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1")
    _mk_session(paths, "s2")
    _mk_manifest(paths, ["s1", "s2"])
    _mk_crop(paths, "s1")
    _mk_crop(paths, "s2")

    r = session_lifecycle.archive_session("s1", "test", paths)
    assert r["removed_crops"] == 1
    assert not (paths.sessions / "s1").exists() and (paths.sessions_archive / "s1").exists()
    kept = [json.loads(line)["session_id"] for line in _manifest(paths)
            .read_text(encoding="utf-8").splitlines() if line.strip()]
    assert kept == ["s2"]                                  # only s2 stays in the manifest
    assert not (paths.crop_pool / "wK" / "s1_0000_e1.png").exists()
    assert (paths.crop_pool / "wK" / "s2_0000_e1.png").exists()  # other session untouched

    session_lifecycle.restore_session("s1", paths)
    assert (paths.sessions / "s1").exists() and not (paths.sessions_archive / "s1").exists()


def test_delete_removes_dir_crops_manifest_and_corrections(tmp_path, monkeypatch):
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    sdir = _mk_session(paths, "s1")
    other = _mk_session(paths, "s2")
    _mk_manifest(paths, ["s1", "s2"])
    _mk_crop(paths, "s1")
    for sid, d in (("s1", sdir), ("s2", other)):
        (d / "corrections.jsonl").write_text(json.dumps(
            {"session_id": sid, "frame": "0000", "square": "e1", "label": "wK"}) + "\n", encoding="utf-8")

    r = session_lifecycle.delete_session("s1", paths)
    assert r["deleted"] and r["removed_crops"] == 1
    assert not (paths.sessions / "s1").exists()
    assert not (sdir / "corrections.jsonl").exists()
    assert [json.loads(line)["session_id"] for line in _manifest(paths)
            .read_text(encoding="utf-8").splitlines() if line.strip()] == ["s2"]
    assert [json.loads(line)["session_id"] for line
            in (other / "corrections.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()] == ["s2"]


def test_trim_session_removes_tail_frames_crops_manifest_and_corrections(tmp_path, monkeypatch):
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    sdir = _mk_session(paths, "s1", frames=4)
    for i in range(4):
        (sdir / "frames" / f"{i:04d}.png").write_bytes(b"x")
        _mk_crop(paths, "s1", frame=f"{i:04d}", square="e1")
    _manifest(paths).parent.mkdir(parents=True, exist_ok=True)
    _manifest(paths).write_text(
        "\n".join(json.dumps({"session_id": "s1", "frame": f"{i:04d}"}) for i in range(4)) + "\n",
        encoding="utf-8",
    )
    (sdir / "corrections.jsonl").write_text(
        "\n".join(json.dumps({"session_id": "s1", "frame": f"{i:04d}", "square": "e1", "label": "wK"})
                  for i in range(4)) + "\n",
        encoding="utf-8",
    )

    r = session_lifecycle.trim_session("s1", 2, paths)

    assert r["kept_frames"] == 2
    assert r["removed_frames"] == 2
    assert not (sdir / "frames" / "0002.png").exists()
    assert not (sdir / "frames" / "0003.png").exists()
    assert (sdir / "frames" / "0001.png").exists()
    reject_dir = Path(r["reject_dir"])
    assert (reject_dir / "frames" / "0002.png").exists()
    assert (reject_dir / "frames" / "0003.png").exists()
    reject_log = [json.loads(line) for line in (reject_dir / "log.jsonl").read_text(encoding="utf-8").splitlines()
                  if line.strip()]
    assert [Path(row["frame"]).stem for row in reject_log] == ["0002", "0003"]
    reject_meta = yaml.safe_load((reject_dir / "session.yaml").read_text(encoding="utf-8"))
    assert reject_meta["source_session_id"] == "s1"
    assert reject_meta["mode"] == "rejected-tail"
    assert not (paths.crop_pool / "wK" / "s1_0002_e1.png").exists()
    rows = [json.loads(line) for line in _manifest(paths).read_text(encoding="utf-8").splitlines()
            if line.strip()]
    assert [row["frame"] for row in rows] == ["0000", "0001"]
    corr = [json.loads(line) for line in (sdir / "corrections.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()]
    assert [row["frame"] for row in corr] == ["0000", "0001"]
    log = [json.loads(line) for line in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    assert [Path(row["frame"]).stem for row in log] == ["0000", "0001"]


def test_invalid_id_and_missing(tmp_path):
    paths = config.Paths(root=tmp_path)
    with pytest.raises(ValueError):
        session_lifecycle.delete_session("../etc", paths)
    with pytest.raises(FileNotFoundError):
        session_lifecycle.archive_session("nope", "test", paths)
    with pytest.raises(FileNotFoundError):
        session_lifecycle.restore_session("nope", paths)


def test_archiving_records_why(tmp_path):
    """A session may not leave the corpus anonymously.

    Four parked directories in three conventions, two of them with no explanation, cost a full
    day of archaeology this week. The reason is written twice on purpose: into the session's own
    `session.yaml` so it travels with the pixels, and into the archive index so the whole archive
    reads without opening every directory.
    """
    import json

    import pytest
    import yaml

    from chesslab import session_lifecycle

    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1")
    with pytest.raises(ValueError, match="reason"):
        session_lifecycle.archive_session("s1", "   ", paths)
    assert (paths.sessions / "s1").exists(), "a refused archive must not have moved anything"

    res = session_lifecycle.archive_session("s1", "blurrier than the device: 59 px/square", paths)
    assert res["reason"].startswith("blurrier")
    meta = yaml.safe_load((paths.sessions_archive / "s1" / "session.yaml").read_text(encoding="utf-8"))
    assert meta["archived_reason"].startswith("blurrier")
    assert meta["archived_at"]
    rows = [json.loads(line) for line in
            (paths.sessions_archive / "index.jsonl").read_text(encoding="utf-8").splitlines()]
    assert rows[-1]["session_id"] == "s1"
    assert rows[-1]["reason"].startswith("blurrier")


def test_archiving_never_overwrites_an_existing_archive(tmp_path):
    """`shutil.rmtree(dst)` used to run here. Archiving is the SAFE half of the API."""
    import pytest

    from chesslab import session_lifecycle

    paths = config.Paths(root=tmp_path)
    _mk_session(paths, "s1")
    session_lifecycle.archive_session("s1", "first", paths)
    _mk_session(paths, "s1")
    with pytest.raises(FileExistsError):
        session_lifecycle.archive_session("s1", "second", paths)
    assert (paths.sessions / "s1").exists(), "the live session must survive a refused archive"


def test_archived_at_in_meta_retires_a_session_that_was_never_moved(tmp_path):
    """Ein Stempel in der Meta zaehlt, nicht nur der Ordner: eine nie verschobene, archivierte
    Session riss ueber ihr totes Profil jeden `--all`-Lauf mit.
    """
    paths = config.Paths(tmp_path)
    d = _mk_session(paths, "live-one")
    stamped = _mk_session(paths, "stamped")
    meta = yaml.safe_load((stamped / "session.yaml").read_text(encoding="utf-8"))
    meta["archived_at"] = "2026-08-30T12:51:10Z"
    (stamped / "session.yaml").write_text(yaml.safe_dump(meta), encoding="utf-8")

    lst = {m["session_id"]: m for m in session_lifecycle.list_sessions(paths)}
    assert lst["stamped"]["archived"] is True
    assert lst["live-one"]["archived"] is False
    assert d.exists() and stamped.exists(), "nichts wird dabei verschoben"


def test_session_try_returns_the_error_instead_of_exiting():
    """Die `--all`-Schleifen pruefen `r["error"]` — das war toter Code, solange der Helfer ausstieg."""
    from chesslab.cli._common import _session_try

    def boom(_sid):
        raise FileNotFoundError("calibration profile 'default' not found")

    r = _session_try(boom, "rg-x")
    assert "default" in r["error"]


def test_a_stamped_session_is_not_sliced(tmp_path, monkeypatch):
    """Der Crop-Pool zaehlt Sessions ueber einen Verzeichnis-Scan, nicht ueber `list_sessions`."""
    from chesslab import labeling

    paths = config.Paths(tmp_path)
    _mk_session(paths, "live-one")
    stamped = _mk_session(paths, "stamped")
    meta = yaml.safe_load((stamped / "session.yaml").read_text(encoding="utf-8"))
    meta["archived_at"] = "2026-08-30T12:51:10Z"
    (stamped / "session.yaml").write_text(yaml.safe_dump(meta), encoding="utf-8")

    original = store_paths.all_sessions
    monkeypatch.setattr(store_paths, "all_sessions", lambda *a, **k: list(original(paths)))
    assert labeling._session_ids_with_logs() == ["live-one"]
