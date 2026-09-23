"""Mutationsprobe 2026-09-22c: Gegenproben fuer ungedeckte Waechter auf Export- und Label-Weg."""

from __future__ import annotations

import math

import cv2
import numpy as np
import pytest

from chesslab import manifest_cache, provenance
from chesslab.ioutil import write_rows
from chesslab.labeling import _session_flat_cells
from chesslab.realgames import (
    _fit_frame_geometry,
    board_rel,
    hand_seen,
    meshes_for_boards,
    write_board,
)
from conftest import START_FEN, write_jsonl

EIGHTHS = [k / 8.0 for k in range(9)]


def _lines(tilt: float) -> dict:
    return {"x": list(EIGHTHS), "y": list(EIGHTHS), "tx": [tilt] * 9, "ty": [0.0] * 9}


def test_a_groove_named_hand_gives_no_mesh_to_the_pool() -> None:
    """`hand_seen` hat ZWEI Haelften, und nur die `dirty_reason`-Haelfte war gehalten
    (`test_bug_hunt_20260921`). Faellt `hand_squares` weg, gibt der Frame, dessen Rillen eine
    Hand benennt, sein Mesh an die Session ab — gemessen schlechter als gar keines.

    Die alte Probe war ein falscher Zeuge: ein einzelner Handframe unter vier sauberen geht im
    Median unter. Hier sind die Handframes in der UEBERZAHL.
    """
    clean = [{"frame": f"frames/{i:06d}.png", "grid_lines": _lines(0.0)} for i in (0, 3, 6)]
    hands = [{"frame": f"frames/{i:06d}.png", "grid_lines": _lines(0.9),
              "hand_squares": ["e4"]} for i in (9, 12, 15, 18)]

    assert hand_seen(hands[0]) is True
    assert meshes_for_boards(clean + hands)[0].tx == pytest.approx([0.0] * 9)


def test_a_board_that_turns_dirty_leaves_no_copy_in_the_clean_pile(tmp_path, small_profile) -> None:
    """Der ORDNER ist das Sauber/Schmutzig-Praedikat, das `temporal_matte` und `sensor_audit`
    lesen. Ohne das `unlink` in `write_board` bleibt die alte Platte liegen, und derselbe Frame
    ist danach in beiden Stapeln — als Handframe UND als Referenzplatte.
    """
    image = np.full((240, 320, 3), 128, np.uint8)
    corners = small_profile.image_corners
    write_board(tmp_path, "000001", image, corners, small_profile, dirty=False)
    assert (tmp_path / board_rel("000001")).is_file()

    write_board(tmp_path, "000001", image, corners, small_profile, dirty=True)

    assert (tmp_path / board_rel("000001", True)).is_file()
    assert not (tmp_path / board_rel("000001")).exists()


def test_a_frame_that_could_not_be_read_reports_nan_not_zero(small_profile) -> None:
    """`fit_rows_to_grid` unterscheidet `export-fit-kept` von `export-fit-failed` allein an
    `worst == worst`. Eine 0.0 statt `nan` machte aus dem nicht gelesenen Frame einen gemessenen
    mit der BESTEN Note, und `align_worst_px` 0,0 ginge als Geometrie-Urteil ins Log.
    """
    quad, before, after, mesh = _fit_frame_geometry(None, small_profile.image_corners,
                                                    small_profile)

    assert quad is None and mesh is None
    assert math.isnan(before) and math.isnan(after)


def test_the_illumination_map_ignores_a_board_at_another_scale(slice_fixture) -> None:
    """`_session_flat_cells` tastet mit `cell_illumination` unter der Skala des PROFILS ab. Ein
    Brett in einer anderen liefert eine Karte ueber ganz andere Stellen — und die wird vor dem
    Zuschnitt aus jedem Crop herausgerechnet. `usable_board` ist die Wache.
    """
    rows = [{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1}]
    sdir, prof, _root = slice_fixture(rows)
    log = [dict(r, board_size=999, board_border=0) for r in rows]

    assert _session_flat_cells(sdir, log, prof) is None


def test_a_rewrite_of_the_same_millisecond_is_a_different_log() -> None:
    """`provenance.same_log` prueft ZWEI Dinge: die Millisekunde auf 1 genau (Python rundet sie
    ueber float-Sekunden), die Groesse exakt. Ohne die Groesse gilt ein Lauf von vor dem
    Re-Export als aktuell, sobald die Uhr zufaellig passt — und die Kette macht ihre Sprosse
    nicht wieder auf.
    """
    assert provenance.same_log("1000:500", "1001:500") is True
    assert provenance.same_log("1000:500", "1000:501") is False
    assert provenance.same_log("1000:500", None) is False


def test_a_changed_manifest_is_scanned_again(tmp_path) -> None:
    """Der Cache-Schluessel ist `(mtime_ns, size)`. Faellt er weg, antwortet der Cache fuer die
    Datei von vorhin — `list_sessions` zeigt dann Crop-Zahlen eines Manifests, das es so nicht
    mehr gibt. Die eine bestehende Probe (`test_manifest_stats_hands_out_a_copy`) prueft die
    Kopie, nicht die Frische.
    """
    path = tmp_path / "manifest.jsonl"
    write_rows(path, [{"session_id": "a"}])
    assert manifest_cache.session_crop_count(path, "a") == 1

    write_rows(path, [{"session_id": "a"}, {"session_id": "a"}])

    assert manifest_cache.session_crop_count(path, "a") == 2


def test_a_row_whose_board_is_gone_keeps_its_frame(tmp_path, monkeypatch) -> None:
    """`park_frames_session` gibt einen Frame nur auf, wenn das Brett WIRKLICH daliegt. Eine
    Zeile, die ein `board` nennt, dessen Datei fehlt, haelt sonst die letzte Kopie ihres Bildes
    nicht mehr — und `data/` ist gitignored.
    """
    from chesslab import config
    from chesslab.sessions import park_frames_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.sessions / "s1"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir()
    picture = np.full((40, 40, 3), 128, np.uint8)
    rows = []
    for i, has_file in enumerate((True, False)):
        stem = f"{i:06d}"
        cv2.imwrite(str(sdir / "frames" / f"{stem}.png"), picture)
        if has_file:
            cv2.imwrite(str(sdir / "boards" / f"{stem}.webp"), picture)
        rows.append({"frame": f"frames/{stem}.png", "board": f"boards/{stem}.webp"})
    write_jsonl(sdir / "log.jsonl", rows)
    (sdir / "session.yaml").write_text("session_id: s1\n", encoding="utf-8")

    assert park_frames_session("s1")["moved"] == 1
    assert not (sdir / "frames" / "000000.png").exists()
    assert (sdir / "frames" / "000001.png").is_file()


def test_a_chunked_rewarp_uses_the_recordings_one_mesh(tmp_path, monkeypatch) -> None:
    """`rewarp_parallel` poolt das Mesh im ELTERNTEIL und reicht es hinunter. Poolte jeder
    Abschnitt sein eigenes, begradigte er seine Bretter gegen eine andere Messung als sein
    Nachbar — und die Naht mitten in der Aufnahme sieht niemand.
    """
    from chesslab import realgames as rg

    rows = [{"frame": f"frames/{i:06d}.png", "grid_lines": _lines(0.0 if i < 60 else 0.5)}
            for i in range(120)]
    seen: list[dict] = []

    def spy(chunk, progress, **kw):
        seen.append(kw["meshes"])
        return {"rewarped": 0, "no_mesh": 0, "no_frame": 0}, chunk

    monkeypatch.setattr(rg, "_warp_chunk", spy)
    # Die Abschnitte laufen hier IN diesem Prozess: der Pool koennte die Sonde nicht pickeln.
    monkeypatch.setattr(rg, "run_chunked",
                        lambda fn, chunks, total, label, **kw: [fn(c, None) for c in chunks])

    rg.rewarp_parallel(tmp_path, rows, "p", video=tmp_path / "v.mp4", rotate=None,
                       lens=None, workers=2)

    assert len(seen) == 2, "zwei Abschnitte, oder diese Probe zeigt nichts"
    assert seen[0] is not None and seen[0] == seen[1], "beide bekommen DASSELBE Mesh"
