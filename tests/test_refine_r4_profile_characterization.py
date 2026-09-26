"""Refinement Runde 4: das Profil einer Aufnahme laden die Aufrufer auf EINEM Weg."""

from __future__ import annotations

import pytest

from chesslab import (
    calibration,
    config,
    ioutil,
    labeling,
    sensor_audit,
    session_boards,
    sessions,
    temporal_matte,
)
from chesslab.session_store.paths import session_profile
from chesslab.training import pack_session


def _recording(tmp_path, monkeypatch, meta: str | None):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    rec.mkdir(parents=True)
    if meta is not None:
        (rec / "session.yaml").write_text(meta, encoding="utf-8")
    ioutil.write_rows(rec / "log.jsonl", [
        {"frame": "frames/000001.png", "board": "boards/000001.webp", "ply": 1,
         "corners": [[0, 0], [8, 0], [8, 8], [0, 8]]}])
    (rec / "candidate.json").write_text("{}", encoding="utf-8")
    (rec / "video.mp4").write_bytes(b"")
    for name in ("p", "q"):
        session_profile(tmp_path).save(calibration.profile_path(name))
    return rec


def _rewarp(_rec, monkeypatch):
    from chesslab.realgames import decode

    monkeypatch.setattr(decode, "detect_rotation", lambda *_a: 0)
    return session_boards.rewarp_boards_session("rg-t")


CALLERS = {
    "fit_mesh": lambda rec, mp: sessions.fit_mesh_session("rg-t"),
    "mark_hands": lambda rec, mp: sessions.mark_hands_session("rg-t"),
    "settle_scan": lambda rec, mp: session_boards.settle_scan_session("rg-t"),
    "write_boards": lambda rec, mp: session_boards.write_boards_session("rg-t"),
    "rewarp": _rewarp,
    "audit": lambda rec, mp: list(sensor_audit.audit(rec)),
    "propose": lambda rec, mp: temporal_matte.propose_session("rg-t"),
    "pack": lambda rec, mp: pack_session.write_session_pack("rg-t", paths=config.DATA),
}

MISSING = {"no-yaml": None, "no-key": "session_id: rg-t\n", "empty-yaml": "",
           "no-profile-file": "session_id: rg-t\nprofile: nirgends\n"}


def _expected(caller: str, case: str) -> type[Exception]:
    """Vor Runde 4 KeyError (kein `profile`) und TypeError (leeres session.yaml).
    `source_stamp` stirbt vorher an fehlendem und leerem session.yaml.
    """
    if caller == "propose" and case == "empty-yaml":
        return AttributeError
    return FileNotFoundError


@pytest.mark.parametrize("case", sorted(MISSING))
@pytest.mark.parametrize("caller", sorted(CALLERS))
def test_a_session_without_a_usable_profile_is_refused(tmp_path, monkeypatch, caller, case):
    rec = _recording(tmp_path, monkeypatch, MISSING[case])

    with pytest.raises(_expected(caller, case)) as caught:
        CALLERS[caller](rec, monkeypatch)
    assert type(caught.value) is _expected(caller, case)
    if case in ("no-yaml", "no-key") and caller != "propose":
        assert ("fehlt" if case == "no-yaml" else "nennt kein Profil") in str(caught.value)


def _loaded(monkeypatch) -> list[str]:
    seen: list[str] = []
    real = calibration.CalibrationProfile.load.__func__

    def spy(cls, path):
        seen.append(path.stem)
        return real(cls, path)
    monkeypatch.setattr(calibration.CalibrationProfile, "load", classmethod(spy))
    return seen


@pytest.mark.parametrize("caller", sorted(CALLERS))
def test_the_profile_the_session_names_is_the_one_loaded(tmp_path, monkeypatch, caller):
    rec = _recording(tmp_path, monkeypatch, "session_id: rg-t\nprofile: p\n")
    seen = _loaded(monkeypatch)

    try:
        CALLERS[caller](rec, monkeypatch)
    except Exception:  # noqa: BLE001 - past the profile only the load counts
        pass
    assert seen[:1] == ["p"]


@pytest.mark.parametrize("meta", ["session_id: rg-t\nprofile: p\n", "", "session_id: rg-t\n"])
def test_an_override_wins_and_needs_no_profile_in_the_yaml(tmp_path, monkeypatch, meta):
    _recording(tmp_path, monkeypatch, meta)
    seen = _loaded(monkeypatch)

    try:
        pack_session.write_session_pack("rg-t", paths=config.DATA, profile="q")
    except Exception:  # noqa: BLE001 - past the profile only the load counts
        pass
    assert seen[:1] == ["q"]


def test_an_override_does_not_stand_in_for_a_missing_session_yaml(tmp_path, monkeypatch):
    _recording(tmp_path, monkeypatch, None)

    with pytest.raises(FileNotFoundError, match="fehlt"):
        pack_session.write_session_pack("rg-t", paths=config.DATA, profile="q")


@pytest.mark.parametrize(("case", "said"), [("no-yaml", "fehlt"), ("no-key", "nennt kein Profil"),
                                            ("empty-yaml", "nennt kein Profil"),
                                            ("no-profile-file", "nirgends")])
def test_slice_names_the_missing_profile(tmp_path, monkeypatch, capsys, case, said):
    _recording(tmp_path, monkeypatch, MISSING[case])

    assert labeling.run_slice(session="rg-t") == 1
    assert labeling.run_slice(preview="rg-t") == 1
    out = capsys.readouterr().out
    assert sum(said in line for line in out.splitlines()) == 2, out


def test_slice_and_preview_take_the_override(tmp_path, monkeypatch):
    _recording(tmp_path, monkeypatch, "")
    seen = _loaded(monkeypatch)

    labeling.run_slice(session="rg-t", profile="q")
    labeling.run_slice(preview="rg-t", profile="q")

    assert seen[:2] == ["q", "q"]
