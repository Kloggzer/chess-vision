"""Measure first, pick after: what a frame is worth, and which eight of them the position keeps."""

import pytest

from chesslab import framescan as fs

SEG = {"start": 0, "end": 120, "ply": 3}


def _scan(hands=(), skin=(), cells=None, stride=3, end=120):
    """One scan row per stride, clean unless an index falls into `hands` (person) or `skin`."""
    rows = [{"idx": idx, "person": 0.9 if idx in hands else 0.11,
             "skin": idx in skin, "grid": [],
             "cells": list(cells(idx)) if cells else [10.0] * 64}
            for idx in range(0, end, stride)]
    return rows


def test_a_hand_over_an_unchanged_board_keeps_its_fen():
    """The withdrawal after a commit: a real hand over a KNOWN position, the material we want."""
    scan = _scan(hands=range(0, 30))
    out = fs.classify(SEG, scan)
    assert out[0] == "occluded" and out[27] == "occluded"
    assert out[60] == "clean", "the hand leaving changes nothing about the labels"


def test_the_next_move_appearing_early_makes_the_rest_stale():
    """The image leads the commit by up to 4.6 s — the board says so before any commit does."""
    seg = dict(SEG, next_touches=["a8", "b8"])
    scan = _scan(hands=range(75, 90),
                 cells=lambda idx: [10.0] * 64 if idx < 90 else [90.0] + [10.0] * 63)
    out = fs.classify(seg, scan)
    assert out[87] == "occluded", "still the committed position, just covered"
    assert out[90] == "stale" and out[117] == "stale"


def test_a_handshake_in_the_middle_stays_occluded():
    """No commit follows it and the board does not move, so the position still holds."""
    scan = _scan(hands=range(30, 48))
    out = fs.classify(SEG, scan)
    assert out[33] == "occluded", "a hand that leaves again does not invalidate the FEN"
    assert out[60] == "clean" and out[117] == "clean"


def test_a_fidgeting_hand_does_not_cost_the_whole_position():
    """Measured on ply 49 of 00-39-57: a hand in 35 of 50 frames used to blank all 50."""
    scan = _scan(hands=[i for i in range(0, 120, 3) if (i // 3) % 3])
    out = fs.classify(SEG, scan)
    assert sum(v == "clean" for v in out.values()) == 14, "every gap between reaches still counts"


def test_a_piece_that_falls_over_taints_the_rest_of_the_interval():
    """No hand touches it, and no sensor that looks for one can see it. The commit's board can."""
    scan = _scan(cells=lambda idx: [10.0] * 64 if idx < 60 else [90.0] + [10.0] * 63)
    out = fs.classify(SEG, scan)
    assert out[57] == "clean"
    assert out[60] == "changed" and out[117] == "changed"


def test_a_lamp_dimming_over_the_interval_is_not_a_moved_piece():
    """Lighting drift once flagged 877 k of 906 k pixels — the global shift comes off first."""
    scan = _scan(cells=lambda idx: [10.0 + idx // 3] * 64)
    assert set(fs.classify(SEG, scan).values()) == {"clean"}


def test_something_crossing_the_board_is_not_a_fallen_piece():
    """A deviation that comes back is a shadow or a sleeve; only a lasting one is a moved piece."""
    scan = _scan(cells=lambda idx: [90.0] + [10.0] * 63 if 30 <= idx < 45 else [10.0] * 64)
    assert "changed" not in fs.classify(SEG, scan).values()


def test_the_skin_read_alone_takes_a_frame_out():
    """58 frames in this corpus carry fingertips at the border that stay under the model's 0.20."""
    scan = _scan(skin={60})
    assert fs.classify(SEG, scan)[60] == "occluded"


def test_eight_clean_frames_come_out_spread_over_the_position():
    scan = _scan(hands=range(90, 120))
    clean, _ = fs.select(fs.classify(SEG, scan))
    assert len(clean) == 8
    assert clean == sorted(clean) and len(set(clean)) == 8
    assert max(clean) < 90, "nothing from the reach"


def test_a_position_without_eight_clean_frames_gives_what_it_has():
    """Fewer is fine (User, 2026-08-18) — inventing one would mean a hand in the clean pool."""
    scan = _scan(hands=range(12, 120))
    clean, _ = fs.select(fs.classify(SEG, scan))
    assert clean == [0, 3, 6, 9]


def test_the_dirty_pile_takes_the_withdrawal_before_the_stale_tail():
    """A hand over a KNOWN position is labelable; a board that has already moved on is not."""
    scan = _scan(hands=range(0, 30),
                 cells=lambda idx: [10.0] * 64 if idx < 90 else [90.0] + [10.0] * 63)
    reasons = fs.classify(SEG, scan)
    _, dirty = fs.select(reasons, dirty_per_position=4)
    assert all(reasons[i] == "occluded" for i in dirty), "the stale tail only fills what is left"
    assert max(dirty) < 90


def test_the_dirty_pile_falls_back_to_the_stale_tail_when_it_must():
    scan = _scan(cells=lambda idx: [10.0] * 64 if idx < 30 else [90.0] + [10.0] * 63)
    reasons = fs.classify(SEG, scan)
    _, dirty = fs.select(reasons, dirty_per_position=4)
    assert len(dirty) == 4
    assert all(reasons[i] == "changed" for i in dirty), "nothing explains it, so it is not stale"


def test_a_corrected_frame_wins_its_slot_while_it_stays_near():
    """The 8 725 identity corrections are keyed by frame index — picking that index keeps them."""
    from chesslab.realgames.timeline import pick_spread

    items = list(range(20))
    assert pick_spread(items, lambda i: True, 4, prefer={5}, tol=0) == [0, 6, 13, 19]
    assert pick_spread(items, lambda i: True, 4, prefer={5}, tol=2) == [0, 5, 13, 19]
    assert pick_spread(items, lambda i: True, 4, prefer={11}, tol=2) == [0, 6, 11, 19]


def test_a_matted_occluded_frame_reaches_the_trainer_with_its_coverage(slice_fixture, tmp_path):
    """The occlusion target needs positives: without this the manifest holds only coverage 0.0."""
    import json

    from chesslab.labeling import slice_session
    from conftest import START_FEN

    rows = [{"frame": f"frames/{stem}.png", "fen": START_FEN, "ply": 1,
             "dirty": True, "dirty_reason": reason}
            for stem, reason in (("000001", "occluded"), ("000002", "stale"))]
    sdir, prof, _ = slice_fixture(rows)
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.9, "e2": 0.02}}) + "\n"
        + json.dumps({"frame": "000002", "coverage": {"a8": 0.9}}) + "\n", encoding="utf-8")

    res = slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                        squares_root=tmp_path / "squares", out_size=(32, 32))

    rows = {r["square"]: r for r in
            (json.loads(x) for x in (tmp_path / "m.jsonl").read_text(encoding="utf-8").splitlines())}
    assert res["crops"] == 64, "the occluded frame contributes all 64, the stale one none"
    assert rows["a8"]["coverage"] == 0.9, "the hidden square keeps its FEN label AND its coverage"
    assert rows["a8"]["label"] == "bR"
    assert rows["e2"]["coverage"] == 0.02
    assert all(r["frame"] == "000001" for r in rows.values()), "stale stays out, its FEN is void"


def test_an_occluded_frame_without_a_matte_stays_out(slice_fixture, tmp_path):
    """Coverage 0.0 under a hand would be a lie, so an unmatted frame is dropped as before."""
    from chesslab.labeling import slice_session
    from conftest import START_FEN

    sdir, prof, _ = slice_fixture(
        [{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1,
          "dirty": True, "dirty_reason": "occluded"}], session_id="s2")
    res = slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                        squares_root=tmp_path / "squares", out_size=(32, 32))

    assert res["crops"] == 0 and res["dirty_dropped"] == 64, "no measurement, no contribution"


def test_an_occlusion_run_can_be_loaded_back(tmp_path):
    """`--head occlusion` is the default now, and a run nobody can reload has no eval and no export."""
    import json

    torch = pytest.importorskip("torch")

    from chesslab.training.evaluate import load_run
    from chesslab.training.model import build_model

    classes = ["empty", "wP", "bP"]
    run = tmp_path / "r"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": classes, "head": "occlusion", "norm": "batchnorm",
        "out_size": [32, 32]}), encoding="utf-8")
    trained = build_model("smallcnn", len(classes) + 1, head="combined")
    torch.save(trained.state_dict(), run / "best.pt")

    model, cfg = load_run(run)

    out = model(torch.zeros(1, 3, 32, 32))
    assert out.shape[-1] == len(classes) + 1, "the coverage unit rides beside the classes"
    assert cfg["classes"] == classes


def test_the_coverage_unit_never_reaches_the_softmax(tmp_path, monkeypatch):
    """13 classes + coverage is 14 wide like the old 14-class model — same shape, other meaning."""
    import json

    import numpy as np
    torch = pytest.importorskip("torch")

    from chesslab import serving
    from chesslab.training.model import build_model

    classes = ["empty", "wP", "bP"]
    run = tmp_path / "r"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": classes, "head": "occlusion", "norm": "batchnorm",
        "out_size": [32, 32], "infer_size": [32, 32]}), encoding="utf-8")
    torch.save(build_model("smallcnn", len(classes) + 1, head="combined").state_dict(), run / "best.pt")

    out = serving.predict_arrays(run, [np.zeros((32, 32, 3), np.uint8)], return_probs=True)

    assert out[0]["pred_label"] in classes, "the argmax can never name the coverage unit"
    assert len(out[0]["probs"]) == len(classes), "the softmax runs over the classes only"
    assert 0.0 <= out[0]["coverage"] <= 1.0, "and the coverage comes back as its own number"


def test_an_archived_game_is_not_exported(tmp_path, monkeypatch):
    """The UI's archive flag was Python-invisible, so a re-export wrote three of them back in."""
    import json

    from chesslab import config
    from chesslab.realgames import export as rg_export
    from chesslab.session_store import recording as store_rec

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    g = store_rec.game_dir("g1")
    g.mkdir(parents=True)
    (g / "ui-meta.json").write_text(json.dumps({"archived": True}), encoding="utf-8")

    assert store_rec.is_archived("g1")
    with pytest.raises(ValueError, match="archived"):
        rg_export.export_session("g1")

    (g / "ui-meta.json").write_text(json.dumps({"title": "kept"}), encoding="utf-8")
    assert not store_rec.is_archived("g1"), "un-archiving in the UI is enough to let it back"


def test_deleting_a_session_counts_the_handwork_first(tmp_path, monkeypatch):
    """Crops come back from a re-slice, a human's verdict does not — so it is counted, not guessed."""
    import json

    from chesslab import config, session_lifecycle

    paths = config.Paths(root=tmp_path / "data")
    monkeypatch.setattr(config, "DATA", paths)
    sdir = paths.sessions / "s1"
    sdir.mkdir(parents=True)
    (sdir / "log.jsonl").write_text("".join(
        json.dumps({"frame": f"frames/00000{i}.png"}) + "\n" for i in (1, 2)), encoding="utf-8")
    paths.crop_pool.mkdir(parents=True, exist_ok=True)
    (sdir / "corrections.jsonl").write_text(
        json.dumps({"session_id": "s1", "frame": "000001", "square": "a1", "label": "wP"}) + "\n",
        encoding="utf-8")
    other = paths.sessions / "other"
    other.mkdir(parents=True)
    (other / "corrections.jsonl").write_text(
        json.dumps({"session_id": "other", "frame": "000001", "square": "a1", "label": "wP"}) + "\n",
        encoding="utf-8")

    cost = session_lifecycle.deletion_cost("s1", paths)

    assert cost == {"session_id": "s1", "frames": 2, "crops": 0, "corrections": 1}


def test_the_gate_is_the_witness_and_the_old_sensors_only_answer_for_old_scans():
    """Seit 2026-08-22 entscheidet der destillierte Kopf, ob eine Hand auf dem Brett liegt.

    Gemessen gegen SAM auf vier zurueckgehaltenen Sessions: Gate 0,9988/0,9920 gegen 0,9618/0,9509
    der drei alten Sensoren zusammen. Alte Scans tragen kein `gate` und werden weiter so gelesen,
    wie sie geschrieben wurden — sonst gaelte ein ganzer Korpus ueber Nacht als handfrei.
    """
    assert fs.occupied({"gate": fs.GATE_THR + 0.1}) is True
    assert fs.occupied({"gate": fs.GATE_THR - 0.1}) is False

    # Die Rillen stimmen NICHT mehr mit: null gerettete Frames, 36 Fehlalarme.
    assert fs.occupied({"gate": 0.0, "grid": ["e4", "e5"]}) is False

    # Ohne `gate` bleibt die alte Regel stehen.
    assert fs.occupied({"grid": ["e4"]}) is True
    assert fs.occupied({"person": 0.9}) is True
    assert fs.occupied({"person": 0.11, "skin": False, "grid": []}) is False
