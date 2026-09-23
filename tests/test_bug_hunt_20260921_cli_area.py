"""Fund-Belege fuer cli/labeling/dataset_build/locks."""

from __future__ import annotations

import json

import pytest

from chesslab import labeling, locks


def test_carried_frame_is_not_a_measured_zero(tmp_path):
    """Ein Frame, dessen Mesh geliehen ist (`grid_lines_source == "carried"`, zu 94,5 % eine
    Hand), traegt keine Matte-Zeile — `clean_frames` nennt ihn trotzdem gemessen sauber."""
    (tmp_path / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png", "grid_lines_source": "carried"}) + "\n"
        + json.dumps({"frame": "frames/000002.png", "dirty": True}) + "\n"
        + json.dumps({"frame": "frames/000003.png"}) + "\n",
        encoding="utf-8")
    assert labeling.clean_frames(tmp_path) == {"000003"}


def test_acquire_never_invents_a_holder(tmp_path, monkeypatch):
    """Verliert der Mitbewerber das Lock zwischen `_claim` und dem Nachlesen, meldete
    `acquire` den EIGENEN Auftrag als Halter — ein Riegel ohne Datei, wie in der Web-App."""
    lock = tmp_path / "heavy.lock"
    calls = {"n": 0}
    real = locks._claim

    def flaky(path, payload):
        calls["n"] += 1
        return False if calls["n"] == 1 else real(path, payload)

    monkeypatch.setattr(locks, "_claim", flaky)
    assert locks.acquire(lock, "slice", "mine") is None
    assert lock.is_file()


def test_occluders_status_exits_loud_on_an_unmeasurable_recording(monkeypatch, capsys):
    """Eine Aufnahme, die `matte_status` nicht lesen kann, ging mit 0 Luecken in die Summe und
    der Lauf endete auf 0 — ungemessen als gemessen sauber, wie `recut-coverage` es nicht tut."""
    import typer

    from chesslab import matte as matte_mod
    from chesslab.cli import occluders as cli

    def boom(_name):
        raise OSError("log.jsonl fehlt")

    monkeypatch.setattr(matte_mod, "matte_status", boom)
    with pytest.raises(typer.Exit) as exc:
        cli.occluders_status("kaputt")
    assert exc.value.exit_code == 1
    assert "0 von 1 Aufnahmen gemessen" in capsys.readouterr().out


def test_from_packs_refuses_a_source_manifest_instead_of_dropping_it(tmp_path):
    """`--from-packs` ueberschreibt `srcs` — ein danebengestelltes `--source-manifest` wirkte
    still nicht, und der Datensatz zitierte Pixel aus einer anderen Quelle als die Zeile sagte."""
    from chesslab import config
    from chesslab import dataset_build as db

    with pytest.raises(ValueError, match="--source-manifest"):
        db.build_dataset("x", ["s"], from_packs=True,
                         source_manifest=[tmp_path / "manifest.jsonl"],
                         paths=config.Paths(root=tmp_path))


def test_a_frame_with_a_matte_row_is_never_clean(tmp_path):
    """Die Matte-Zeile ist der zweite Riegel in `clean_frames` und war von keinem Test gehalten:
    ohne ihn faellt SAMs Absage auf einem Frame OHNE `dirty_reason` als 0,0 ins Training."""
    (tmp_path / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png"}) + "\n"
        + json.dumps({"frame": "frames/000002.png"}) + "\n", encoding="utf-8")
    (tmp_path / "matte.jsonl").write_text(
        json.dumps({"frame": "000001"}) + "\n", encoding="utf-8")
    assert labeling.clean_frames(tmp_path) == {"000002"}


def test_the_preflight_refuses_a_disk_that_cannot_hold_the_pack(monkeypatch, tmp_path):
    """Der Verweigerungs-Zweig war von keinem Test gehalten — eine Mutationsprobe schaltete ihn
    auf `if False` ab und die Zeile wanderte unbemerkt in Commit 6b431cf8."""
    import shutil

    from chesslab import config
    from chesslab import dataset_build as db

    monkeypatch.setattr(shutil, "disk_usage", lambda _p: type("U", (), {"free": 1_000})())
    with pytest.raises(ValueError, match="GB are free"):
        db._refuse_if_too_small(10_000, 50_000, config.Paths(root=tmp_path))
