"""Bug-Jagd 2026-09-16 (d): halb geschriebene Dateien und Globs, die ihren eigenen Muell
einsammeln."""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_store_straightening import (  # noqa: E402
    TILT,
    _row,
    _session,
    line_spread,
)

from chesslab import matte as matte_mod  # noqa: E402
from chesslab.realgames.boards import straighten_boards  # noqa: E402
from chesslab.realgames.decode import decode_frames  # noqa: E402
from chesslab.session_store.boards import MATTE_DIR  # noqa: E402


def _frames(tmp_path):
    out = tmp_path / "frames"
    out.mkdir()
    return out


def test_a_failed_frame_write_is_not_reported_as_arrived(tmp_path, monkeypatch):
    """`decode_frames` gab den Rueckgabewert von `cv2.imwrite` nie an.

    Schlaegt der Schreibvorgang fehl, meldet der Export den Index trotzdem als angekommen, die
    Zeile bleibt im Plan und nennt ein Brett, das nie geschrieben wurde. Jeder andere Schreiber
    dieses Moduls (`write_board`, `straighten_boards`) prueft und bricht ab.
    """
    video = tmp_path / "v.avi"
    writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"MJPG"), 5, (32, 16))
    for _ in range(3):
        writer.write(np.zeros((16, 32, 3), np.uint8))
    writer.release()
    out = _frames(tmp_path)
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: False)

    with pytest.raises(OSError):
        decode_frames(video, {1}, out)

    assert not list(out.glob("*.png")), "ein gescheiterter Schreibvorgang darf nichts hinterlassen"


def test_a_killed_frame_write_leaves_no_truncated_png_at_the_final_name(tmp_path, monkeypatch):
    """`test_decode_frames_treats_an_empty_file_as_absent` deckt nur die LEERE Datei ab.

    Der Resume-Test ist `st_size > 0`, also gilt ein abgebrochener Encode mit einem halben PNG als
    fertig und wird nie wieder geschrieben — ein stiller, dauerhafter Defekt im Frame-Satz. Die
    Pixel gehoeren deshalb neben den Zielnamen und werden ZULETZT umgehaengt.
    """
    video = tmp_path / "v.avi"
    writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"MJPG"), 5, (32, 16))
    for _ in range(3):
        writer.write(np.zeros((16, 32, 3), np.uint8))
    writer.release()
    out = _frames(tmp_path)
    real = cv2.imwrite

    def half_then_die(path, image, *a, **k):
        real(path, image, *a, **k)
        with open(path, "r+b") as fh:          # noqa: PTH123 - kuerzen, nicht schreiben
            fh.truncate(64)
        raise KeyboardInterrupt

    monkeypatch.setattr(cv2, "imwrite", half_then_die)

    with pytest.raises(KeyboardInterrupt):
        decode_frames(video, {1}, out)

    survivor = out / "000001.png"
    assert not (survivor.is_file() and survivor.stat().st_size > 0), (
        "ein halbes PNG liegt unter dem Zielnamen: der naechste Lauf haelt es fuer fertig")


def test_straighten_boards_leaves_a_staged_matte_alone(tmp_path):
    """`close_seams` stapelt seine Pixel als `<stem>.tmp.webp` NEBEN der Matte.

    `straighten_boards` sammelt das Verzeichnis mit `<stem>.*` ein, zieht also auch die
    Zwischendatei gerade und zaehlt sie als Matte mit. Was `close_seams` danach umhaengt, waere
    ein zweites Mal gezogen — und "never straighten a second time" ist die harte Regel.
    """
    rows = [_row(0, TILT)]
    sdir, board = _session(tmp_path, rows, mattes=("000000",))
    staged = sdir / MATTE_DIR / "000000.tmp.webp"
    cv2.imwrite(str(staged), board)
    before = cv2.imread(str(staged))

    done = straighten_boards(sdir, rows)

    assert done["mattes"] == 1, f"gezaehlt wurden {done['mattes']} Matten, es gibt eine"
    assert np.array_equal(cv2.imread(str(staged)), before), (
        f"die gestapelte Datei wurde mitgezogen (Versatz jetzt "
        f"{line_spread(cv2.imread(str(staged))):.0f} px)")


def _seamed_session(tmp_path, monkeypatch):
    from tests.test_geometry_bug_hunt import SIDE, _profile
    from tests.test_geometry_bug_hunt import _session as _geom_session

    from chesslab.calibration import crop_border_px

    prof = _profile()
    pad = crop_border_px(prof)
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"dirty/{i:06d}.webp", "ply": i,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad} for i in (1, 2)]
    sdir = _geom_session(tmp_path, monkeypatch, rows, (SIDE + 2 * pad, SIDE + 2 * pad))
    seamed = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.uint8)
    seamed[100:140, 100:140] = 255
    seamed[100:140, 142:182] = 255
    (sdir / "mattes").mkdir()
    stems = [row["frame"][7:13] for row in rows]
    for stem in stems:
        cv2.imwrite(str(sdir / "mattes" / f"{stem}.webp"), seamed)
    (sdir / "matte.jsonl").write_text(
        "".join(json.dumps({"frame": stem, "coverage": {"a8": 0.1}}) + "\n" for stem in stems),
        encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir


def test_an_unexpected_abort_drops_the_staged_seam_pixels(tmp_path, monkeypatch):
    """`close_seams` raeumt nur an seinen ZWEI eigenen `raise` auf.

    Ein Ctrl-C oder ein Fehler mitten in der Schleife laesst die gestapelten `*.tmp.webp` liegen —
    Gigabytes, die kein Lauf je wieder anfasst, und `straighten_boards` zieht sie auch noch gerade.
    """
    pytest.importorskip("torch")
    sdir = _seamed_session(tmp_path, monkeypatch)
    real = matte_mod.coverage_of
    calls = []

    def measure_then_die(*a, **kw):
        calls.append(1)
        if len(calls) > 1:
            raise KeyboardInterrupt
        return real(*a, **kw)

    monkeypatch.setattr(matte_mod, "coverage_of", measure_then_die)

    with pytest.raises(KeyboardInterrupt):
        matte_mod.close_seams("s1", progress=False)

    assert len(calls) > 1, "der Test muss die zweite Runde wirklich erreicht haben"
    assert not list((sdir / "mattes").glob("*.tmp.webp")), (
        "die gestapelten Pixel blieben nach einem unerwarteten Abbruch liegen")


def test_an_unmeasured_dirty_frame_must_not_enter_the_settled_reference(tmp_path):
    """Ungemessen heisst ABWESEND aus der Matte, nicht `{}`.

    Seit 2026-09-16 ist eine leere Coverage "gemessen, nichts verdeckt" (Punkt 20) — der
    ungemessene Fall ist der Stem, den `read_matte` gar nicht kennt. Genau der darf nicht in den
    Median der gesetzten Stellung, wogegen `SETTLE_CLEAR_MAX` existiert.
    """
    from tests.test_settle_scan import CELL, SIDE, _profile, _write

    from chesslab.calibration import crop_border_px
    from chesslab.labeling import SETTLE_LIMIT, all_squares
    from chesslab.realgames.position import settle_for_ply

    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    (tmp_path / "boards").mkdir()
    rows = []
    #: Fuenf saubere Frames sind genau `SETTLE_MIN_FRAMES`, sechs Hand-Frames sind die MEHRHEIT
    #: der elf. Beides muss stimmen: ohne die Mehrheit bliebe der Median auch ungefiltert sauber
    #: und der Test bewiese nichts, ohne die fuenf faellt der Ply unter die Messgrenze.
    for i in range(11):
        board = np.full((side, side, 3), 90, np.uint8)
        hand = i >= 5
        if hand:
            # Halb, nicht ganz: `cell_deviations` nivelliert die Helligkeit weg, nur STRUKTUR bleibt.
            board[pad:pad + CELL, pad:pad + CELL // 2] = 200
        _write(tmp_path / "boards" / f"{i:06d}.png", board)
        rows.append({"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.png",
                     **({"dirty": True, "dirty_reason": "occluded"} if hand else {})})

    # SAM hat die Hand-Frames nie gemessen (`skipped`, oder der Lauf kam nie): sie fehlen in der
    # Matte. Die sauberen sind gemessen und frei — ein leeres Dict, kein fehlender Schluessel.
    got = settle_for_ply((tmp_path, rows, prof, {f"{i:06d}": {} for i in range(5)}))

    a8 = all_squares().index("a8")
    assert got["scores"]["000000"]["dev"][a8] < SETTLE_LIMIT, (
        "die Hand steht im Median: ein sauberer Frame weicht jetzt von der 'gesetzten' Stellung ab")
