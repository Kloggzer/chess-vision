"""Bug-Jagd 2026-09-16 (e): ingest, occluded_model, meshprep."""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab import config, ingest, occluded_model
from chesslab.calibration import crop_border_px

# --- 1. occluded_model.frame_cells: das gespeicherte Brett ohne Massstabspruefung ----------


def _profile(board_size: int):
    return ingest.ingestion_profile("bughunt-e", board_size)


def _session_with_board(tmp_path, board_size: int, row_board_size: int):
    """Eine Aufnahme, deren Brett mit `row_board_size` geschrieben wurde. Brett blau, Frame rot."""
    sdir = tmp_path / "s"
    (sdir / "boards").mkdir(parents=True)
    (sdir / "frames").mkdir(parents=True)
    prof = _profile(board_size)
    border = crop_border_px(prof)
    row_border = int(round(border * row_board_size / board_size))
    canvas = row_board_size + 2 * row_border
    cv2.imwrite(str(sdir / "boards" / "000001.webp"),
                np.full((canvas, canvas, 3), (255, 0, 0), np.uint8))
    cv2.imwrite(str(sdir / "frames" / "000001.png"),
                np.full((board_size, board_size, 3), (0, 0, 255), np.uint8))
    row = {"frame": "frames/000001.png", "board": "boards/000001.webp",
           "board_size": row_board_size, "board_border": row_border,
           "board_straightened": True, "fen": "8/8/8/8/8/8/8/8 w - - 0 1",
           "corners": [[0.0, 0.0], [float(board_size), 0.0],
                       [float(board_size), float(board_size)], [0.0, float(board_size)]]}
    return sdir, prof, row


def test_a_board_written_at_another_scale_is_not_cut_with_the_profile(tmp_path):
    """`labeling.usable_board` ist die Wache jedes anderen Brettlesers — hier fehlt sie.

    Das Brett traegt seine eigenen `board_size`/`board_border`; wer mit dem Profil schneidet,
    das gerade zufaellig geladen ist, holt bis zu 59 px daneben (CLAUDE.md, Board store).
    """
    sdir, prof, row = _session_with_board(tmp_path, 128, 256)
    cells = occluded_model.frame_cells(sdir, row, prof)
    means = np.stack([c.reshape(-1, 3).mean(axis=0) for c in cells]).mean(axis=0)
    assert means[2] > means[0], (
        "frame_cells hat das fremd skalierte Brett (blau) geschnitten statt auf den Frame (rot) "
        "zurueckzufallen — derselbe stille Halbzellen-Versatz, gegen den `usable_board` existiert."
    )


def test_a_matching_board_is_still_read_from_the_board(tmp_path):
    """Gegenprobe: passt der Massstab, bleibt das Brett die Quelle."""
    sdir, prof, row = _session_with_board(tmp_path, 128, 128)
    cells = occluded_model.frame_cells(sdir, row, prof)
    means = np.stack([c.reshape(-1, 3).mean(axis=0) for c in cells]).mean(axis=0)
    assert means[0] > means[2]


# --- 2. occluded_model.read_session: Zeile nur mit `board` ---------------------------------

def test_a_row_with_only_a_board_does_not_crash_the_read(tmp_path, monkeypatch):
    """Der Filter laesst Zeilen OHNE `frame` durch, zwei Zeilen spaeter steht `row["frame"]`."""
    sdir = tmp_path / "s"
    sdir.mkdir()
    (sdir / "log.jsonl").write_text("{}\n", encoding="utf-8")
    monkeypatch.setattr("chesslab.session_store.recording.game_dir", lambda name: sdir)
    monkeypatch.setattr(occluded_model, "read_session_meta",
                        lambda d: {"session_id": "rg-s", "profile": "p"})
    monkeypatch.setattr(occluded_model, "check_not_circular", lambda run, sid: None)
    monkeypatch.setattr(occluded_model, "load_profile", lambda name: object())
    monkeypatch.setattr(occluded_model, "model_classes", lambda run: ["empty", "wP"])
    monkeypatch.setattr(occluded_model, "read_log",
                        lambda d: [{"board": "boards/000001.webp",
                                    "fen": "8/8/8/8/8/8/8/8 w - - 0 1"}])
    monkeypatch.setattr(occluded_model, "frame_cells",
                        lambda d, row, prof: [np.zeros((4, 4, 3), np.uint8)] * 64)
    monkeypatch.setattr(occluded_model, "all_reads",
                        lambda run, cells, dev, w: [{"probs": [1.0, 0.0]}] * 64)

    res = occluded_model.read_session("s", tmp_path / "run", progress=False)

    assert res["cells"] == 64
    rows = [json.loads(ln) for ln in
            (sdir / occluded_model.READS_FILE).read_text(encoding="utf-8").splitlines()[1:]]
    assert {r["frame"] for r in rows} == {"000001"}


# --- 3. ingest.debug_overlay: der Rueckgabewert von cv2.imwrite ----------------------------

def test_debug_overlay_only_reports_files_it_really_wrote(tmp_path, monkeypatch):
    """`cv2.imwrite` wirft nicht, es gibt False zurueck — die Liste log danach."""
    paths = config.Paths(root=tmp_path / "data")
    src = tmp_path / "board.png"
    cv2.imwrite(str(src), np.full((128, 128, 3), 60, np.uint8))
    sids = ingest.synthesize_sessions(
        [ingest.ImportItem(image_path=src, corners=[[0, 0], [128, 0], [128, 128], [0, 128]],
                           fen="8/8/8/8/8/8/8/8", group="g")],
        tag="ov", profile_name="ov", paths=paths)
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: False)

    with pytest.raises(RuntimeError, match="overlay"):
        ingest.debug_overlay(sids[0], 1, tmp_path / "out", profile=_profile(128), paths=paths)


# --- 4. ingest.run_ingest: das Profil landet ausserhalb von `paths` ------------------------

def test_run_ingest_keeps_its_profile_inside_the_given_paths(tmp_path, monkeypatch):
    """`paths` ist die Wurzel des Laufs — nur das Profil ging an `config.DATA` vorbei.

    In den Tests schreibt das in das ECHTE `data/calibration/` des Repos.
    """
    foreign = config.Paths(root=tmp_path / "foreign")
    monkeypatch.setattr(config, "DATA", foreign)
    paths = config.Paths(root=tmp_path / "data")
    source = tmp_path / "source"
    source.mkdir()
    cv2.imwrite(str(source / "000000.png"), np.full((128, 128, 3), 60, np.uint8))
    (source / "000000.json").write_text(json.dumps(
        {"fen": "8/8/8/8/8/8/8/8", "corners": [[0, 0], [128, 0], [128, 128], [0, 128]]}),
        encoding="utf-8")

    ingest.run_ingest("synthetic", source, tag="scoped", board_size=128, build=False, paths=paths)

    assert (paths.calibration / "scoped.yaml").exists()
    assert not (foreign.calibration / "scoped.yaml").exists(), (
        "run_ingest schrieb das Profil nach config.DATA statt nach `paths` — ein Lauf auf einer "
        "anderen Wurzel verschmutzt die echte Datenwurzel."
    )


# --- 5. meshprep: `--smooth-iters` richtet die Figur still auf ------------------------------

def test_smoothing_does_not_secretly_upright_the_mesh(tmp_path):
    """`prepare_scan` verspricht verbatim; der geglaettete Zweig dreht ueber `_load_and_extract`.

    Mit `--smooth-iters 0` bleibt dieselbe Datei liegen, wie sie ist — die Ausrichtung einer
    Figur haengt damit an einem Glaettungsschalter.
    """
    trimesh = pytest.importorskip("trimesh")
    from chesslab.meshprep import prepare_scan
    from chesslab.scan_discover import ScanItem

    scan = tmp_path / "wP"
    scan.mkdir()
    # Y ist die dominante Achse (>= 1.5x Z) — genau die Bedingung von `_ensure_z_up`.
    box = trimesh.creation.box(extents=(1.0, 4.0, 1.0))
    src = scan / "wP.obj"
    box.export(str(src))

    prepare_scan(ScanItem(name="wP", obj=src, tex=None, variant="v1"), tmp_path / "out",
                 make_preview=False, smooth_iters=1)

    written = trimesh.load(str(tmp_path / "out" / "wP" / "v1.obj"), force="mesh")
    extents = written.vertices.max(axis=0) - written.vertices.min(axis=0)
    assert extents[1] > extents[2], (
        f"der geglaettete Import hat die Figur gedreht (extents {extents}) — "
        f"`prepare_scan` nennt sich verbatim und `--smooth-iters 0` dreht nicht."
    )
