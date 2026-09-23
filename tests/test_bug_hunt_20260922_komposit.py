"""Was der Komposit-Pfad misst: `composite_frame`s `coverage` auf echtem Brett plus Profil."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from chesslab import composite
from chesslab.ingest import ingestion_profile
from chesslab.labeling import all_squares, crops_for_frame

BOARD = 256
OUT = (16, 16)


def _board():
    """Ein echtes Brett plus Profil: Rauschbild, Ecken am Bildrand, Crops ueber `crops_for_frame`."""
    prof = ingestion_profile("bug-hunt", BOARD, OUT)
    frame = np.random.default_rng(7).integers(30, 220, (BOARD, BOARD, 3), dtype=np.uint8)
    corners = [[0, 0], [BOARD - 1, 0], [BOARD - 1, BOARD - 1], [0, BOARD - 1]]
    return prof, frame, corners


def _plate(side: int = 96):
    return ("hand.webp", np.full((side, side, 3), 255, np.uint8),
            np.full((side, side), 255, np.uint8))


def _composite(seed: int = 3, side: int = 96):
    prof, frame, corners = _board()
    crops, cov, used = composite.composite_frame(
        frame, corners, prof, [_plate(side)], np.random.default_rng(seed),
        rig=1.0, plate_long=BOARD)
    clean = crops_for_frame(frame, corners, prof, out_size=OUT)
    changed = {sq: float(np.abs(a.astype(int) - b.astype(int)).mean())
               for sq, a, b in zip(all_squares(), crops, clean, strict=True)}
    return cov, changed, used


def test_coverage_names_the_squares_the_plate_actually_changed():
    cov, changed, _used = _composite()
    covered = {sq for sq, v in cov.items() if v > 0.2}
    repainted = {sq for sq, v in changed.items() if v > 10.0}

    assert covered == repainted, (
        f"coverage and image disagree: coverage claims {sorted(covered)} are occluded, "
        f"but the plate repainted {sorted(repainted)} — a cell called 0.0 here enters "
        f"training as a clearly visible square (CLAUDE.md, 'Coverage Matte Trap')"
    )
    assert covered, "the fixture placed no plate on the board — the guard would pass vacuously"


def test_untouched_squares_carry_an_exact_zero_and_covered_ones_do_not():
    cov, changed, _used = _composite()
    for sq, v in cov.items():
        if changed[sq] == 0.0:
            assert cov[sq] == 0.0, f"{sq} is pixel-identical to the clean cut but reports {v}"
    assert max(cov.values()) > 0.9, (
        f"a fully opaque plate over the board peaks at coverage {max(cov.values()):.3f} — "
        f"nothing above PIECE_VISIBLE_MAX would ever be masked out of the loss"
    )


def test_coverage_follows_the_plate_and_is_not_a_constant():
    small, _c1, _u1 = _composite(side=48)
    big, _c2, _u2 = _composite(side=144)
    assert sum(big.values()) > sum(small.values()) * 1.5, (
        f"a 3x larger plate covers {sum(big.values()):.2f} squares against "
        f"{sum(small.values()):.2f} — coverage does not scale with the occluder"
    )


def test_plate_long_side_measures_the_tile_when_the_index_cannot_say(tmp_path):
    """Der Rueckfall riet `WORK_SIZE`; ein 4K-Pool ohne `source` landete auf halber Groesse."""
    import cv2

    pool = tmp_path / "plates"
    pool.mkdir()
    rgba = np.zeros((300, 500, 4), np.uint8)
    rgba[100:200, 200:300, 3] = 255
    cv2.imwrite(str(pool / "a.webp"), rgba)

    assert composite.plate_long_side(pool) == 500, (
        "without an index the fallback guesses WORK_SIZE, so every hand from a pool that "
        "declares no `source` is composited at the wrong scale"
    )


def test_plate_long_side_still_believes_a_declared_index(tmp_path):
    pool = tmp_path / "plates"
    pool.mkdir()
    (pool / "occluders.json").write_text('[{"source": [2400, 2012]}]', encoding="utf-8")
    assert composite.plate_long_side(pool) == 2400


@pytest.mark.parametrize("name", ["occluders.json", "plates.json"])
def test_plate_long_side_falls_back_when_the_index_has_no_source(tmp_path, name):
    import cv2

    pool = tmp_path / "plates"
    pool.mkdir()
    (pool / name).write_text('[{"tile": [1200, 1006]}]', encoding="utf-8")
    cv2.imwrite(str(pool / "a.webp"), np.zeros((640, 800, 4), np.uint8))
    assert composite.plate_long_side(pool) == 800, (
        "data/occluders/occluders.json declares tile [1200, 1006] for 2400x2012 files — "
        "an index without `source` must be measured, not believed"
    )


def _session_pack(root, name: str, rows: list[dict], crops):
    """Ein Session-Pack auf der Platte: `packed_images.u8` plus Meta, wie `pack_session` ihn legt."""
    from chesslab.training.packs import write_meta

    d = root / "packs" / name
    d.mkdir(parents=True)
    arr = np.stack(crops).astype(np.uint8)
    arr.tofile(d / "packed_images.u8")
    write_meta(d, rows, arr.shape[1], arr.shape[2])
    return d


def test_measure_noise_reads_a_session_pack_dataset(tmp_path, monkeypatch):
    """Die v6-Saetze zitieren ihre Packs; ohne eigenes Memmap las das Rauschmass 0 Crops."""
    import sys

    from chesslab import config
    from chesslab.ioutil import write_rows

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "synth"))
    import measure_noise as mn

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    rng = np.random.default_rng(11)
    crops = [rng.integers(0, 255, (16, 16, 3), dtype=np.uint8) for _ in range(6)]
    rows = [{"path": f"mm://s1-16/{i:06d}/a1", "label": "empty", "session_id": "s1"}
            for i in range(6)]
    _session_pack(config.DATA.root, "s1-16", rows, crops)
    ds = config.DATA.root / "datasets" / "v6-like"
    ds.mkdir(parents=True)
    write_rows(ds / "manifest.jsonl", rows)

    out = mn.measure(ds, label="empty", n=4)
    assert out["n"] == 4, (
        f"the dataset cites a session pack and measure_noise read {out['n']} of 4 crops — "
        f"every sibling consumer (evaluate, gradcam, quantize) names this case instead"
    )
    assert out["p50"] > 0.0


def test_measure_noise_refuses_a_sample_it_could_not_read(tmp_path, monkeypatch):
    """Halb gelesen ist kein Messwert: fehlende Crop-Dateien duerfen nicht still schrumpfen."""
    import sys

    import cv2

    from chesslab import config
    from chesslab.ioutil import write_rows

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "synth"))
    import measure_noise as mn

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    ds = config.DATA.root / "datasets" / "files"
    (ds / "crops").mkdir(parents=True)
    rows = []
    for i in range(4):
        p = ds / "crops" / f"{i}.png"
        if i < 2:
            cv2.imwrite(str(p), np.full((16, 16, 3), 40 + i, np.uint8))
        rows.append({"path": p.as_posix(), "label": "empty", "session_id": "s1"})
    write_rows(ds / "manifest.jsonl", rows)

    with pytest.raises(ValueError, match="could not be read"):
        mn.measure(ds, label="empty", n=0)


def _capture():
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "synth"))
    import capture_turntable as ct

    return ct


def test_a_second_turntable_run_does_not_overwrite_the_scan(tmp_path):
    """`scans/` sind Ground-Truth ohne Backup — 307 Fotos liegen dort als `000.jpg` aufwaerts."""
    ct = _capture()
    for i in (0, 1, 2):
        (tmp_path / f"{i:03d}.jpg").write_bytes(b"x")

    assert ct.next_index(tmp_path, None) == 3, (
        "a run without --start begins at 000 again and overwrites the photos already in the "
        "folder — scan originals have no backup"
    )


def test_an_explicit_start_that_would_overwrite_is_refused(tmp_path):
    ct = _capture()
    (tmp_path / "000.jpg").write_bytes(b"x")
    with pytest.raises(SystemExit, match="000.jpg"):
        ct.next_index(tmp_path, 0)


def test_an_empty_folder_still_starts_at_zero(tmp_path):
    ct = _capture()
    assert ct.next_index(tmp_path, None) == 0
    assert ct.next_index(tmp_path, 7) == 7


def _noisy_texture(path, seed: int = 5):
    import cv2

    rng = np.random.default_rng(seed)
    img = rng.integers(20, 90, (64, 64, 3), dtype=np.uint8)
    img[20:30, 20:40] = 250                      # eingebranntes Glanzlicht
    cv2.imwrite(str(path), img)
    return img


def test_cleaning_a_texture_twice_does_not_compound(tmp_path):
    """Gemessen auf `synth_pieces/bN/v2.png`: ein zweiter Lauf zieht 1,5 % der Pixel bis 9 Stufen."""
    import sys

    import cv2

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "synth"))
    import clean_piece_textures as cpt

    tex = tmp_path / "v1.png"
    original = _noisy_texture(tex)
    cpt.process(str(tex), preview=False)
    once = cv2.imread(str(tex))
    cpt.process(str(tex), preview=False)
    twice = cv2.imread(str(tex))

    assert np.array_equal(once, twice), (
        f"the second run cleans the already-cleaned file instead of the backup — "
        f"max drift {int(np.abs(once.astype(int) - twice.astype(int)).max())} grey levels"
    )
    assert np.array_equal(cv2.imread(str(tmp_path / "v1_raw.png")), original)


def test_a_preview_shows_what_an_in_place_run_would_write(tmp_path):
    import sys

    import cv2

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "synth"))
    import clean_piece_textures as cpt

    tex = tmp_path / "v1.png"
    _noisy_texture(tex)
    cpt.process(str(tex), preview=False)
    cpt.process(str(tex), preview=True)
    assert np.array_equal(cv2.imread(str(tex)), cv2.imread(str(tmp_path / "v1_clean.png"))), (
        "after an in-place run the preview cleans the cleaned file, so it shows a double "
        "clean rather than the candidate it exists to judge"
    )
