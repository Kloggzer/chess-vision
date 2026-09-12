"""Three-frame masks must suppress endpoint moves and preserve transient evidence."""

import json

import numpy as np
import pytest

from chesslab.temporal_matte import alpha_proposal, bracketing


def background():
    y, x = np.indices((160, 160))
    return np.repeat((40 + 160 * ((x // 16 + y // 16) % 2))[..., None], 3, axis=2).astype(np.uint8)


@pytest.mark.parametrize("method", ["difference", "local"])
def test_either_endpoint_of_a_move_is_not_a_hand(method):
    before = background()
    after = before.copy()
    after[50:90, 60:100] = 130
    assert alpha_proposal(before, before, after, method=method).max() == 0
    assert alpha_proposal(before, after, after, method=method).max() == 0


def test_local_fit_recovers_translucency_on_a_textured_known_background():
    bg = background()
    current = bg.copy()
    current[30:130, 30:130] = (.3 * bg[30:130, 30:130] + .7 * 140).astype(np.uint8)
    alpha = alpha_proposal(bg, current, bg)
    assert np.median(alpha[65:95, 65:95]) == pytest.approx(.7, abs=.05)
    assert alpha[0, 0] == 0


def test_a_faint_blur_below_half_alpha_is_deliberately_not_a_hand():
    bg = background()
    current = bg.copy()
    current[30:130, 30:130] = (.6 * bg[30:130, 30:130] + .4 * 140).astype(np.uint8)
    assert alpha_proposal(bg, current, bg).max() == 0


def test_uniform_exposure_shift_does_not_make_a_full_board_mask():
    bg = background()
    assert alpha_proposal(bg, bg + 15, bg).max() == 0


def row(frame, seconds, ply=1):
    return {"frame": frame, "board": f"boards/{frame}.webp", "ply": ply, "fen": f"fen{ply}",
            "ts": f"2026-09-11T12:00:{seconds:02d}+00:00"}


def test_reference_selection_requires_both_sides_and_a_short_single_move_window():
    before, current, after = row("000001", 1), row("000002", 2), row("000003", 3, 2)
    assert bracketing([before, current, after], current) == ([before], [after])
    assert bracketing([before, current], current) is None
    assert bracketing([before, current, row("000003", 10)], current) is None
    assert bracketing([before, current, row("000003", 3, 4)], current) is None


def test_plate_takes_the_nearest_peers_of_the_neighbours_interval_only():
    older = [row("000010", 0), row("000020", 0, 0), row("000030", 0), row("000040", 1)]
    current, after = row("000042", 2), row("000045", 3, 2)
    left, right = bracketing([*older, current, after], current, peers=2)
    assert [r["frame"] for r in left] == ["000040", "000030"]
    assert right == [after]


def test_plate_median_removes_a_single_blurred_view(tmp_path):
    import cv2

    from chesslab.temporal_matte import plate

    bg = background()
    rows = []
    for i, image in enumerate((bg, bg, cv2.GaussianBlur(bg, (0, 0), 6.))):
        cv2.imwrite(str(tmp_path / f"{i}.png"), image)
        rows.append({"board": f"{i}.png"})
    assert np.array_equal(plate(tmp_path, rows), bg)


def test_holes_inside_a_hand_are_filled_and_speckle_is_dropped():
    from chesslab.temporal_matte import solid_blobs

    alpha = np.zeros((160, 160), np.float32)
    alpha[20:120, 40:100] = 1.
    alpha[60:70, 60:70] = 0.
    alpha[140:143, 140:143] = 1.
    out = solid_blobs(alpha, min_area=.003)
    assert out[65, 65] > .9
    assert out[141, 141] < .01
    assert out[5, 5] < .01


def test_the_core_of_an_opaque_blob_is_flat_and_a_translucent_one_keeps_its_level():
    from chesslab.temporal_matte import solid_blobs

    alpha = np.zeros((200, 200), np.float32)
    alpha[20:180, 40:160] = 1.
    alpha[80:100, 80:100] = .6
    assert solid_blobs(alpha, min_area=.003)[90, 90] > .97
    faint = np.where(alpha > 0, .7, 0.).astype(np.float32)
    assert solid_blobs(faint, min_area=.003)[90, 90] == pytest.approx(.7, abs=.02)


def test_the_mask_grows_outward_by_the_margin_but_not_further():
    from chesslab.temporal_matte import solid_blobs

    alpha = np.zeros((200, 200), np.float32)
    alpha[50:150, 50:150] = 1.
    out = solid_blobs(alpha, min_area=.003, grow=20)
    assert out[100, 35] > .9
    assert out[100, 20] < .1


def test_the_outline_is_smoothed_without_moving_it_on_average():
    from chesslab.temporal_matte import solid_blobs

    alpha = np.zeros((200, 200), np.float32)
    alpha[50:150, 50:150] = 1.
    alpha[50:150:4, 40:50] = 1.
    out = solid_blobs(alpha, min_area=.003, grow=0)
    column = out[60:140, 45]
    assert column.std() < .1


def test_a_wide_gap_across_an_opaque_blob_takes_the_blob_level():
    from chesslab.temporal_matte import solid_blobs

    alpha = np.zeros((300, 300), np.float32)
    alpha[20:280, 100:200] = 1.
    alpha[120:200, 104:196] = 0.
    assert solid_blobs(alpha, min_area=.003, grow=0)[160, 150] > .9


def test_closed_form_refinement_moves_the_rim_onto_the_image_edge():
    from chesslab.temporal_matte import refine_edges

    image = np.full((200, 200, 3), 60, np.uint8)
    image[40:160, 40:150] = (200, 180, 170)
    alpha = np.zeros((200, 200), np.float32)
    alpha[40:160, 40:140] = 1.
    out = refine_edges(image, alpha, inner=10, outer=20)
    assert out[100, 145] > .9
    assert out[100, 155] < .1
    assert np.array_equal(refine_edges(image, np.zeros_like(alpha)), np.zeros_like(alpha))


def test_plates_are_computed_once_per_neighbour_set(tmp_path):
    import cv2

    from chesslab.temporal_matte import plate

    cv2.imwrite(str(tmp_path / "a.png"), background())
    cache = {}
    first = plate(tmp_path, [{"board": "a.png"}], cache)
    (tmp_path / "a.png").unlink()
    assert plate(tmp_path, [{"board": "a.png"}], cache) is first


def test_gpu_fit_agrees_with_the_cpu_fit():
    torch = pytest.importorskip("torch")
    if not torch.cuda.is_available():
        pytest.skip("no GPU")
    from chesslab.temporal_matte_gpu import propose_alpha

    bg = background()
    current = bg.copy()
    current[30:130, 30:130] = (.3 * bg[30:130, 30:130] + .7 * 140).astype(np.uint8)
    cpu = alpha_proposal(bg, current, bg)
    gpu = propose_alpha(bg, current, bg, refine=False)
    assert np.abs(cpu - gpu).mean() < .02
    assert propose_alpha(bg, bg, bg).max() == 0


def test_adopt_writes_matte_rows_only_for_frames_sam_never_cut(tmp_path, monkeypatch):
    import cv2

    from chesslab import calibration, config, matte, temporal_matte

    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    rows = [{"frame": f"frames/{s}.png", "ply": 1, "board": f"boards/{s}.webp"}
            for s in ("000001", "000002", "000003", "000004")]
    (rec / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (rec / "matte.jsonl").write_text(json.dumps({"frame": "000001", "coverage": {"a1": .9}}) + "\n", encoding="utf-8")
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(rec / "mattes" / "000004.webp"), np.zeros((8, 8), np.uint8))
    for stem, value in (("000001", 255), ("000002", 255), ("000003", 0), ("000004", 255)):
        cv2.imwrite(str(proposals / f"{stem}.alpha.png"), np.full((8, 8), value, np.uint8))
    (proposals / "proposals.jsonl").write_text("".join(json.dumps(
        {"frame": s, "alpha": f"{s}.alpha.png", "fraction_above_half": .3}) + "\n"
        for s in ("000001", "000002", "000003", "000004")), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, entry, profile: {"a1": float(alpha.mean())})
    result = temporal_matte.adopt_proposals("rg-t")
    # 000004 has a file but no row: an orphan of ours, replaced.
    assert (result["adopted"], result["empty"], result["kept_sam"]) == (2, 1, 1)
    assert cv2.imread(str(rec / "mattes" / "000004.webp"), 0).max() == 255
    lines = [json.loads(s) for s in (rec / "matte.jsonl").read_text().splitlines()]
    assert [r["frame"] for r in lines] == ["000001", "000002", "000004"]
    assert lines[1]["source"] == "temporal" and (rec / "mattes" / "000002.webp").is_file()
    # A rerun replaces our own rows and files, and leaves SAM's alone.
    again = temporal_matte.adopt_proposals("rg-t")
    assert (again["adopted"], again["replaced"]) == (2, 2)
    assert [r["frame"] for r in (json.loads(s) for s in (rec / "matte.jsonl").read_text().splitlines())] == ["000001", "000002", "000004"]
    assert temporal_matte.sam_matte(rec) == {"000001": {"a1": .9}}


def test_upsert_replaces_only_frames_where_sam_found_nothing(tmp_path, monkeypatch):
    import cv2

    from chesslab import calibration, config, matte, temporal_matte

    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    rows = [{"frame": f"frames/{s}.png", "ply": 1, "board": f"boards/{s}.webp"}
            for s in ("000001", "000002", "000003")]
    (rec / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    # SAM found nothing on 000001, a hand on 000002; 000003 is the pen's.
    for stem in ("000001", "000002"):
        cv2.imwrite(str(rec / "mattes" / f"{stem}.webp"), np.zeros((8, 8), np.uint8))
    cv2.imwrite(str(rec / "mattes" / "000003.fixed.webp"), np.zeros((8, 8), np.uint8))
    (rec / "matte.jsonl").write_text("".join(json.dumps(
        {"frame": s, "concepts": {}, "coverage": c}) + "\n" for s, c in (
        ("000001", {"a": 0.}), ("000002", {"a": .9}), ("000003", {"a": 0.}))), encoding="utf-8")
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    for stem in ("000001", "000002", "000003"):
        cv2.imwrite(str(proposals / f"{stem}.alpha.png"), np.full((8, 8), 255, np.uint8))
    (proposals / "proposals.jsonl").write_text("".join(json.dumps(
        {"frame": s, "alpha": f"{s}.alpha.png", "fraction_above_half": 1.}) + "\n"
        for s in ("000001", "000002", "000003")), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, entry, profile: {"a": float(alpha.mean())})
    result = temporal_matte.upsert_proposals("rg-t")
    assert (result["upserted"], result["sam_found"], result["fixed"]) == (1, 1, 1)
    lines = [json.loads(s) for s in (rec / "matte.jsonl").read_text().splitlines()]
    assert [r["frame"] for r in lines] == ["000001", "000002", "000003", "000001"]
    assert lines[-1]["source"] == "upsert" and lines[-1]["coverage"] == {"a": 1.}
    assert cv2.imread(str(rec / "mattes" / "000001.sam.webp"), 0).max() == 0
    assert cv2.imread(str(rec / "mattes" / "000001.webp"), 0).min() == 255
    assert cv2.imread(str(rec / "mattes" / "000002.webp"), 0).max() == 0
    again = temporal_matte.upsert_proposals("rg-t")
    assert (again["upserted"], again["replaced"]) == (1, 1)
    assert len((rec / "matte.jsonl").read_text().splitlines()) == 4
    assert temporal_matte.sam_matte(rec) == {"000001": {"a": 0.}, "000002": {"a": .9}, "000003": {"a": 0.}}


def test_prune_drops_only_temporal_rows_sam_has_since_re_cut(tmp_path, monkeypatch):
    from chesslab import config, temporal_matte

    rec = tmp_path / "recordings" / "t"
    rec.mkdir(parents=True)
    rows = [{"frame": "000001", "source": "temporal", "coverage": {"a": 1.}},
            {"frame": "000002", "source": "temporal", "coverage": {"a": 1.}},
            {"frame": "000001", "concepts": {"hand": .9}, "coverage": {"a": .8}},
            {"frame": "000003", "concepts": {}, "coverage": {"a": 0.}},
            {"frame": "000003", "source": "upsert", "coverage": {"a": 1.}}]
    (rec / "matte.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    result = temporal_matte.prune_dead_rows("rg-t")
    left = [json.loads(s) for s in (rec / "matte.jsonl").read_text().splitlines()]
    assert (result["dropped"], result["kept"]) == (1, 4)
    # 000002 has no SAM row yet, 000003 is an upsert on top of SAM's empty row: both stay.
    assert [(r["frame"], r.get("source")) for r in left] == [
        ("000002", "temporal"), ("000001", None), ("000003", None), ("000003", "upsert")]
