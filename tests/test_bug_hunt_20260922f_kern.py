"""Mutationsprobe ueber `src/chesslab/*.py`: ein Test je ungedeckter Wache."""
from __future__ import annotations

import json
import os
from collections import Counter

import numpy as np
import pytest

from chesslab import ingest, locks, occluded_model, sensor_audit
from chesslab.calibration import crop_border_px
from chesslab.labeling import MATTE_DIRTY, all_squares
from chesslab.position_flags import frame_flags

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


# --- 1. occluded_model.frame_cells: ein unlesbares Brett -----------------------------------

def _board_session(tmp_path, *, content: bytes | None):
    """Eine Aufnahme, deren Brettdatei `content` traegt — `None` heisst: gar keine Datei."""
    sdir = tmp_path / "s"
    (sdir / "boards").mkdir(parents=True)
    prof = ingest.ingestion_profile("mutprobe", 128)
    border = crop_border_px(prof)
    if content is not None:
        (sdir / "boards" / "000001.webp").write_bytes(content)
    row = {"frame": "frames/000001.png", "board": "boards/000001.webp",
           "board_size": 128, "board_border": border, "board_straightened": True,
           "fen": "8/8/8/8/8/8/8/8 w - - 0 1",
           "corners": [[0.0, 0.0], [128.0, 0.0], [128.0, 128.0], [0.0, 128.0]]}
    return sdir, prof, row


@pytest.mark.parametrize("content", [None, b"not an image at all"])
def test_an_unreadable_board_is_a_refusal_not_sixty_four_blank_crops(tmp_path, content):
    """`cv2.imread` gibt `None` zurueck, es wirft nicht — eine halb gelesene Aufnahme darf nicht
    als Messung durchgehen: `read_session` schriebe sonst 64 erfundene Lesarten je Frame in
    `model-reads.jsonl`, und die Labeling-Lane liest die Datei als Wahrheit.
    """
    sdir, prof, row = _board_session(tmp_path, content=content)
    with pytest.raises(FileNotFoundError):
        occluded_model.frame_cells(sdir, row, prof)


def test_a_readable_board_still_yields_its_crops(tmp_path):
    """Gegenprobe zur Wache: ein lesbares Brett kommt als 64 Crops zurueck."""
    import cv2

    sdir, prof, row = _board_session(tmp_path, content=None)
    canvas = 128 + 2 * crop_border_px(prof)
    cv2.imwrite(str(sdir / "boards" / "000001.webp"),
                np.full((canvas, canvas, 3), (255, 0, 0), np.uint8))
    assert len(occluded_model.frame_cells(sdir, row, prof)) == 64


# --- 2. position_flags.frame_flags: `dev` ohne Messung -------------------------------------

def test_a_card_without_a_settle_measurement_says_dash_not_zero():
    """Eine Karte traegt `dev: None`, wenn `settle_dev` diese Zelle nicht nennt.

    0,0 heisst in der Lane "gemessen, Bild passt zur Stellung" — auf einer Karte, die genau das
    Gegenteil behauptet. Ohne Messung ist die Zelle nicht unstrittig, sondern ungemessen.
    """
    entry = {"frame": "frames/000007.png", "fen": START, "ply": 3,
             "settle_dev": [], "settle_seen": [1.0] * 64, "settle_left": ["a2"]}
    flags = frame_flags(entry, {"a2": 0.0}, "rg-x")

    assert [f["square"] for f in flags] == ["a2"]
    assert flags[0]["dev"] is None


def test_a_card_with_a_measurement_still_carries_the_number():
    """Gegenprobe: liegt die Messung vor, steht sie auch auf der Karte."""
    dev = [0.0] * 64
    dev[all_squares().index("a2")] = 42.5
    entry = {"frame": "frames/000007.png", "fen": START, "ply": 3,
             "settle_dev": dev, "settle_seen": [1.0] * 64, "settle_left": ["a2"]}

    assert frame_flags(entry, {"a2": 0.0}, "rg-x")[0]["dev"] == 42.5


# --- 3. sensor_audit: leere Gruppe, ungemessene Matte, fremder Massstab --------------------

def test_an_empty_group_reports_no_median_at_all():
    """`summary([])` meldet `None`, nicht 0,0 — sonst liest sich eine Gruppe ohne eine einzige
    gueltige Messung im Bericht wie "Abweichung null gemessen"."""
    assert sensor_audit.summary([]) == {"n": 0, "median": None, "p90": None}
    assert sensor_audit.summary([2.0, 4.0])["median"] == 3.0


def _audited_session(monkeypatch, tmp_path, row_overrides=None, matte=None):
    """`sensor_audit.audit` ueber EINE Zeile, ohne Platte: die Nachbarn sind gestellt."""
    prof = ingest.ingestion_profile("mutprobe", 128)
    row = {"frame": "frames/000001.png", "board": "boards/000001.webp", "ply": 1, "fen": START,
           "board_size": 928, "board_border": 58, "board_straightened": True,
           "settle_dev": [1.0] * 64, "settle_seen": [1.0] * 64}
    row.update(row_overrides or {})
    seen_args: dict = {}

    def fake_missing_edges(gray, board_size, pad, *, white_pov=True):
        seen_args.update(board_size=board_size, pad=pad)
        return {}

    monkeypatch.setattr(sensor_audit, "_profile_for_session", lambda meta, _x: prof)
    monkeypatch.setattr(sensor_audit, "read_session_meta", lambda rec: {"profile": "mutprobe"})
    monkeypatch.setattr(sensor_audit, "read_matte", lambda rec: matte or {})
    monkeypatch.setattr(sensor_audit, "read_log", lambda rec: [row])
    monkeypatch.setattr(sensor_audit, "usable_board", lambda r, p: True)
    monkeypatch.setattr(sensor_audit, "missing_edges", fake_missing_edges)
    monkeypatch.setattr(sensor_audit, "hand_squares", lambda edges: set())
    monkeypatch.setattr(sensor_audit.cv2, "imread",
                        lambda path: np.zeros((1044, 1044, 3), np.uint8))
    skipped: Counter = Counter()
    cells = list(sensor_audit.audit(tmp_path, skipped=skipped))
    return cells, skipped, seen_args


def test_a_cell_the_matte_never_measured_is_unknown_not_free(monkeypatch, tmp_path):
    """Ohne Matte-Eintrag ist die Zelle UNGEMESSEN (`matte_unknown`), nicht "Matte sagt frei".

    Dieselbe Falle wie bei SAMs Absage (CLAUDE.md): `coverage or 0.0` machte aus "nicht
    nachgesehen" ein sauberes Brett und verschob die Zelle in eine Zustimmungsgruppe.
    """
    matte = {"000001": {"a1": MATTE_DIRTY + 0.5}}
    cells, _skipped, _args = _audited_session(monkeypatch, tmp_path, matte=matte)
    by_square = {c["square"]: c for c in cells}

    assert by_square["a1"]["group"] == "matte_only"
    assert by_square["h8"]["group"] == "matte_unknown"
    assert by_square["h8"]["coverage"] is None


def test_the_grooves_are_read_at_the_scale_the_row_declares(monkeypatch, tmp_path):
    """Das Brett traegt seine eigenen `board_size`/`board_border`; wer die Bildgroesse nimmt,
    sucht die Rillen bis zu 59 px daneben (CLAUDE.md, Board store)."""
    _cells, _skipped, args = _audited_session(monkeypatch, tmp_path)

    assert args == {"board_size": 928, "pad": 58}


def test_an_unstraightened_board_is_skipped_instead_of_scored(monkeypatch, tmp_path):
    """Ohne `board_straightened` ist jede Rillen- und Settle-Zahl auf einem gebogenen Brett
    gemessen — der Audit zaehlt die Zeile als uebersprungen, statt sie mitzubewerten."""
    cells, skipped, _args = _audited_session(
        monkeypatch, tmp_path, row_overrides={"board_straightened": False})

    assert cells == []
    assert skipped["unsupported_geometry"] == 1


# --- 4. locks: ein toter Prozess und ein fremder Anspruch ----------------------------------

def test_a_process_that_exited_is_not_alive_while_its_handle_is_still_open():
    """Windows haelt das Prozess-OBJEKT am Leben, solange jemand ein Handle haelt — `Popen` tut
    genau das. Wer nur `OpenProcess` fragt, sieht einen seit Minuten toten Auftrag als Halter und
    sperrt jeden weiteren Lauf aus; die Antwort steht im EXIT-CODE.
    """
    import subprocess
    import sys

    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()

    assert locks.pid_alive(proc.pid) is False
    assert locks.pid_alive(os.getpid()) is True


def test_a_reclaimer_leaves_a_lock_a_competitor_wrote_in_between(tmp_path):
    """`_break_stale` raeumt NUR das Lock weg, das der Aufrufer selbst als tot gelesen hat.

    Sonst nimmt der zweite Reclaimer dem ersten seinen FRISCHEN Anspruch wieder weg und beide
    halten sich fuer den Halter — der Pool haette wieder zwei Schreiber.
    """
    lock = tmp_path / "heavy.lock"
    lock.write_bytes(b'{"pid": 2}')

    locks._break_stale(lock, b'{"pid": 1}')

    assert lock.read_bytes() == b'{"pid": 2}'
    assert not list(tmp_path.glob("*.stale-*"))


def test_a_reclaimer_does_remove_the_dead_lock_it_read(tmp_path):
    """Gegenprobe: was unveraendert dalag, ist tot und darf weg."""
    lock = tmp_path / "heavy.lock"
    lock.write_bytes(b'{"pid": 1}')

    locks._break_stale(lock, b'{"pid": 1}')

    assert not lock.exists()


def test_release_leaves_a_lock_that_belongs_to_someone_else(tmp_path):
    """`release` loescht nur den EIGENEN Anspruch: nach einer Uebernahme gehoert die Datei
    einem anderen Lauf, und ein blindes `unlink` gaebe den Pool fuer einen zweiten Schreiber frei.
    """
    lock = tmp_path / "heavy.lock"
    lock.write_text(json.dumps({"pid": os.getpid() + 1, "job": "slice"}), encoding="utf-8")

    locks.release(lock)

    assert lock.exists()


def test_release_removes_our_own_lock(tmp_path):
    """Gegenprobe: der eigene Anspruch wird abgeraeumt."""
    lock = tmp_path / "heavy.lock"
    lock.write_text(json.dumps({"pid": os.getpid(), "job": "slice"}), encoding="utf-8")

    locks.release(lock)

    assert not lock.exists()


# --- 5. label_audit: der Korrektur-Audit prueft PAARE --------------------------------------

def test_the_correction_audit_stays_silent_on_a_frame_nobody_corrected(tmp_path):
    """Das Urteil gilt dem PAAR aus `fen` und Korrektur — ohne Korrektur gibt es kein Paar.

    Eine Zeile mit leerem `corrections` behauptete, ein Mensch habe fuer dieses Bild gebuergt,
    und `frames` zaehlte Bilder mit, die nie jemand angesehen hat.
    """
    from dataclasses import replace

    from chesslab import config
    from chesslab.label_audit import audit_corrections

    broken = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNP w KQkq - 0 1"   # Bauer auf h1
    d = tmp_path / "recordings" / "2026-09-01-10-00-00"
    d.mkdir(parents=True)
    (d / "log.jsonl").write_text(
        json.dumps({"frame": "000100.png", "ply": 4, "fen": broken}) + "\n", encoding="utf-8")

    report = audit_corrections(replace(config.Paths(), root=tmp_path))

    assert report["frames"] == 0
    assert report["rows"] == []


# --- 6. capture_import: zwei Schritte auf EINEM Video-Index --------------------------------

def test_two_capture_steps_on_one_video_index_are_refused(monkeypatch, tmp_path):
    """Zwei Schritte, ein Frame: beide Zeilen benennen dieselbe Datei und tragen verschiedene
    FEN. Das Brett wird einmal geschrieben und das Log widerspricht sich ueber dasselbe Bild —
    laut abbrechen statt ein Label zu wuerfeln.
    """
    from chesslab import capture_import

    other = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    stored = [{"ply": 1, "fen": START, "corners": [], "ts": "t1"},
              {"ply": 2, "fen": other, "corners": [], "ts": "t2"}]
    monkeypatch.setattr(capture_import.store_rec, "stored_rows", lambda bundle: stored)

    with pytest.raises(ValueError, match="teilen sich einen Video-Index"):
        capture_import.capture_rows(tmp_path, {1: (0, 1), 2: (1, 2)}, [(0, 0)], 1.0)


def test_distinct_steps_keep_their_own_frames(monkeypatch, tmp_path):
    """Gegenprobe: liegen die Fenster auseinander, bekommt jeder Schritt seinen eigenen Index."""
    from chesslab import capture_import

    other = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    stored = [{"ply": 1, "fen": START, "corners": [], "ts": "t1"},
              {"ply": 2, "fen": other, "corners": [], "ts": "t2"}]
    monkeypatch.setattr(capture_import.store_rec, "stored_rows", lambda bundle: stored)

    rows = capture_import.capture_rows(
        tmp_path, {1: (0, 10**9), 2: (10**9, 2 * 10**9)}, [(0, 0)], 1.0)

    assert [r["frame"] for r in rows] == ["frames/000000.png", "frames/000001.png"]


def test_a_ply_in_no_capture_step_is_refused_not_dropped(monkeypatch, tmp_path):
    """Ein Ply, das `capture.json` nicht kennt, hat keinen Weg ins Video — still uebergangen
    verschwaende die Erfassung genau die Stellung, fuer die sie aufgenommen wurde."""
    from chesslab import capture_import

    stored = [{"ply": 1, "fen": START, "corners": [], "ts": "t1"},
              {"ply": 9, "fen": START, "corners": [], "ts": "t9"}]
    monkeypatch.setattr(capture_import.store_rec, "stored_rows", lambda bundle: stored)

    with pytest.raises(ValueError, match="in keinem Schritt"):
        capture_import.capture_rows(tmp_path, {1: (0, 10**9)}, [(0, 0)], 1.0)


def test_a_row_whose_board_was_never_written_does_not_reach_the_log(monkeypatch, tmp_path):
    """Hinter dem Ende einer abgeschnittenen Aufnahme gibt der Dekoder kein Bild mehr her.

    Die Zeile bliebe im `log.jsonl` stehen und benennt eine Datei, die es nicht gibt — jeder
    Brettleser danach (slice, matte, model-read) meldet dann eine unlesbare Aufnahme statt
    einer kuerzeren.
    """
    from chesslab import calibration, capture_import
    from chesslab.ioutil import read_jsonl

    session = tmp_path / "session"
    bundle = tmp_path / "bundle"
    session.mkdir()
    bundle.mkdir()
    rows = [{"frame": "frames/000000.png", "ply": 1, "fen": START, "board": "boards/000000.webp"},
            {"frame": "frames/000001.png", "ply": 2, "fen": START}]

    monkeypatch.setattr(capture_import.store_rec, "stored_session_dirs", lambda n: [bundle])
    monkeypatch.setattr(capture_import.store_rec, "video_path", lambda n: tmp_path / "v.mp4")
    monkeypatch.setattr(capture_import.store_rec, "game_dir", lambda n: session)
    monkeypatch.setattr(capture_import.rg_boards, "fit_rows_to_grid",
                        lambda r, p, frames=None: {"arrived": rows})
    monkeypatch.setattr(capture_import.rg_boards, "rewarp_boards",
                        lambda d, r, p, frames=None: {"boards": 1})
    monkeypatch.setattr(capture_import, "container_fps", lambda v: 1.0)
    monkeypatch.setattr(capture_import, "capture_steps", lambda b: {})
    monkeypatch.setattr(capture_import, "video_syncs", lambda b: [(0, 0)])
    monkeypatch.setattr(capture_import, "capture_rows", lambda *a: rows)
    monkeypatch.setattr(capture_import, "video_frames", lambda v, r: iter(()))
    monkeypatch.setattr(capture_import, "write_capture_meta", lambda *a: None)
    monkeypatch.setattr(calibration, "load_profile", lambda name: object())

    capture_import.import_capture("rec")

    written = read_jsonl(session / "log.jsonl")
    assert [r["frame"] for r in written] == ["frames/000000.png"]


# --- 7. composite.plate_long_side: ohne Index wird gemessen, nicht geraten -----------------

def test_plates_without_an_index_are_measured_not_assumed(tmp_path):
    """Ohne brauchbaren Index sagt die KACHEL, in welcher Aufloesung sie geschnitten wurde.

    Die Rueckfallkonstante ist die alte Arbeitsgroesse; wer sie fuer eine Kachel in
    Quellaufloesung nimmt, komponiert jede Hand um den Faktor zwei falsch
    (`docs/occluder-plates.md`).
    """
    import cv2

    from chesslab.composite import plate_long_side

    plates = tmp_path / "plates"
    plates.mkdir()
    cv2.imwrite(str(plates / "a.webp"), np.zeros((300, 700, 4), np.uint8))

    assert plate_long_side(plates, fallback=128) == 700


def test_a_declared_source_size_is_taken_from_the_index(tmp_path):
    """Gegenprobe: steht die Quellgroesse im Index, wird nicht gemessen."""
    from chesslab.composite import plate_long_side

    plates = tmp_path / "plates"
    plates.mkdir()
    (plates / "occluders.json").write_text(
        json.dumps([{"source": [1900, 2400]}]), encoding="utf-8")

    assert plate_long_side(plates, fallback=128) == 2400


def test_a_plate_without_an_alpha_channel_is_refused(tmp_path):
    """Ohne Alpha gibt es keine Verdeckung zu messen: `t[:, :, 3]` waere ein Farbkanal, und
    die Coverage des Komposits waere aus dem Blauanteil der Kachel gerechnet."""
    import cv2

    from chesslab.composite import read_tile

    path = tmp_path / "rgb.webp"
    cv2.imwrite(str(path), np.full((20, 20, 3), 128, np.uint8))

    with pytest.raises(ValueError, match="not an RGBA plate"):
        read_tile(path)


def test_a_composite_warps_at_the_size_its_source_gives(monkeypatch, tmp_path):
    """Die QUELLE setzt die Brettgroesse, nicht eine Konstante.

    Fest 1280 warf einen 1080p-Clip um 1,93x hoch; die erfundenen Pixel warf der 80er Schnitt
    sofort wieder weg — das waren 62 % des Pretrains (CLAUDE.md, Crop sizes).
    """
    from chesslab import calibration, composite
    from chesslab.realgames.mesh import measured_board_size

    frame = np.full((720, 1280, 3), 90, np.uint8)
    corners = [[100.0, 100.0], [740.0, 100.0], [740.0, 640.0], [100.0, 640.0]]
    monkeypatch.setattr(composite, "read_forward", lambda video, stride: iter([(0, frame)]))
    monkeypatch.setattr(composite, "median_mesh", lambda cap, prof, samples=40: None)
    monkeypatch.setattr(composite, "mesh_for", lambda f, c, p: None)
    monkeypatch.setattr(calibration, "detect_board_corners_aruco", lambda f: corners)
    monkeypatch.setattr(calibration, "load_profile",
                        lambda name: ingest.ingestion_profile("mutprobe", 128))

    boards = list(composite.composed_boards(tmp_path / "v.mp4"))

    assert measured_board_size(corners) != 1280, "Die Probe braucht eine Quelle unter 1280."
    assert boards[0][3].board_size == measured_board_size(corners)


def test_a_failed_provenance_write_keeps_the_pool_readable(monkeypatch, tmp_path):
    """Lesen-aendern-schreiben auf EINE Datei: mehrere Clips teilen sich `composite.json`.

    Ein Abbruch mitten im Schreiben nahm sonst die Herkunft jedes frueheren Clips mit, und
    `read_provenance` wirft danach — der Pixel-Pass koennte keinen davon mehr neu schneiden.
    """
    from chesslab import composite

    (tmp_path / "composite.json").write_text(json.dumps({"alt": {"seed": 1}}), encoding="utf-8")

    def boom(path, data, **kw):
        path.write_text("{halb", encoding="utf-8")
        raise OSError("Platte voll")

    monkeypatch.setattr(composite, "write_json", boom)
    with pytest.raises(OSError, match="Platte voll"):
        composite._write_provenance(tmp_path, "neu", {"seed": 2})

    assert composite.read_provenance(tmp_path) == {"alt": {"seed": 1}}
    assert not list(tmp_path.glob("*.tmp"))


def test_a_second_clip_into_one_pool_keeps_the_first_clips_rows(monkeypatch, tmp_path):
    """Der Upsert laeuft ueber `split_group`, nicht ueber `session_id`.

    Die Zeilen eines Komposits tragen je Block eine eigene `session_id`; nur die Gruppe benennt
    den ganzen Clip. Ueber die falsche Spalte ersetzt, blieb der erste Clip mit seinen Crops auf
    der Platte und ohne Manifestzeilen zurueck — und ein zweiter Lauf desselben Clips verdoppelte.
    """
    from chesslab import composite
    from chesslab.ioutil import read_jsonl

    prof = ingest.ingestion_profile("mutprobe", 128)
    crops = [np.zeros((8, 8, 3), np.uint8)] * 64

    def two_boards(video, plate_dir, **kw):
        for idx in (0, 8):
            yield idx, crops, dict.fromkeys(all_squares(), 0.0), prof

    monkeypatch.setattr(composite, "composed_boards", two_boards)
    manifest = tmp_path / "manifest.jsonl"
    pool = tmp_path / "pool"
    for clip in ("a", "b"):
        (tmp_path / clip).mkdir()
        composite.build_from_video(tmp_path / clip / "video.mp4", tmp_path, pool, manifest,
                                   START, clean=True, blocks=2)

    groups = {r["split_group"] for r in read_jsonl(manifest)}
    assert groups == {"comp-a", "comp-b"}

    composite.build_from_video(tmp_path / "a" / "video.mp4", tmp_path, pool, manifest,
                               START, clean=True, blocks=2)
    rows = read_jsonl(manifest)
    assert len([r for r in rows if r["split_group"] == "comp-a"]) == 128


# --- 8. retime: ohne Coverage-Kopf und ohne geschriebenes Brett ----------------------------

def test_retime_refuses_a_model_without_an_occlusion_head(monkeypatch, tmp_path):
    """Ohne Coverage-Kopf traegt keine Lesung ein `coverage`, jede Zelle bliebe ungemessen und
    `_emission` liefe auf lauter Nullen — eine stille Null statt einer Zeitmessung."""
    from chesslab import calibration, retime
    from chesslab.session_store import recording as store_rec

    model = tmp_path / "run"
    model.mkdir()
    (model / "config.json").write_text(json.dumps({"head": "identity"}), encoding="utf-8")
    monkeypatch.setattr(store_rec, "load_candidate",
                        lambda name: {"moves": [{"frame": 1, "fen_after": START}]})
    monkeypatch.setattr(store_rec, "video_fps", lambda cand: 30.0)
    monkeypatch.setattr(calibration, "load_profile", lambda name: object())

    with pytest.raises(ValueError, match="no occlusion head"):
        retime.retime("rec", model)


def test_a_review_board_that_was_not_written_is_an_error(monkeypatch, tmp_path):
    """`cv2.imwrite` wirft nicht, es gibt `False` zurueck. Still verschluckt loeschte die
    Aufraeumschleife dem Frame gleich darauf sein ALTES Bild, und die Confirm-Ansicht meldete
    "kein Bild", ohne dass irgendwo ein Fehler stand."""
    from chesslab import retime

    monkeypatch.setattr(retime.cv2, "imwrite", lambda *a, **k: False)

    with pytest.raises(OSError, match="could not write review board"):
        retime.stage_board(tmp_path, 7, np.zeros((4, 4, 3), np.uint8), [])


# --- 9. recording: Segmentgrenzen ---------------------------------------------------------

def test_an_unreadable_container_is_an_error_not_length_zero(tmp_path):
    """Als 0 durchgereicht verschiebt sich `base` in `_locate` nicht, und JEDER spaetere Index
    zeigt auf die falsche Log-Zeile — ein falsches FEN, kein fehlender Frame."""
    from chesslab.recording import _frame_count

    broken = tmp_path / "video-001.mp4"
    broken.write_bytes(b"not a container")

    with pytest.raises(FileNotFoundError, match="kein lesbarer Frame-Zaehler"):
        _frame_count(broken)


def test_take_starts_at_the_segment_base_not_at_the_wanted_index(monkeypatch, tmp_path):
    """Ein Seek ist auf diesem Material nicht exakt (2 von 7 Sonden lieferten andere Pixel).

    `take` faengt deshalb an der SEGMENTGRENZE an und laeuft mit `grab` vor; startet es beim
    gewuenschten Index, seekt `frames` — und ein falscher Frame ist ein falsches Label.
    """
    from chesslab.recording import Recording

    rec = Recording.__new__(Recording)
    rec.segments = [tmp_path / "video.mp4", tmp_path / "video-001.mp4"]
    rec._counts = [100]
    seen: dict = {}

    def fake_frames(self, start=0, wanted=None, rotate=None):
        seen["start"] = start
        return iter(())

    monkeypatch.setattr(Recording, "frames", fake_frames)
    list(rec.take({150}))

    assert seen["start"] == 100


# --- 10. markerless: die Ecken kommen aus ALLEN Schnittpunkten -----------------------------

def test_a_quad_needs_the_whole_grid_not_four_corners(monkeypatch):
    """Die vier aeussersten Schnittpunkte sind die am staerksten tonnenverzeichneten im Bild.

    Die Homographie ueber das ganze Gitter mittelt den Bauch; aus zu wenigen Punkten geschaetzt
    liest sie ihn an der schlechtesten Stelle ab. Zu wenig heisst: kein Quad.
    """
    from chesslab.markerless import _quad_from_grid

    horiz = [(np.array([0.0, 1.0]), float(k) * 10) for k in range(3)]
    vert = [(np.array([1.0, 0.0]), float(k) * 10) for k in range(3)]

    assert _quad_from_grid(horiz, vert) is None


def test_a_grid_line_fitted_from_one_segment_is_refused():
    """Eine Linie aus EINEM Segment hat keine Richtung, die der Fit messen koennte — die
    Kovarianz ist rangdefizit und der Eigenvektor Rauschen. Dann lieber kein Quad.
    """
    from chesslab.markerless import _fit_family

    normal, along = np.array([0.0, 1.0]), np.array([1.0, 0.0])
    segs = np.array([[0.0, 0.0, 50.0, 0.0], [60.0, 0.0, 110.0, 0.0],
                     [0.0, 30.0, 50.0, 30.0]], np.float32)

    assert _fit_family(segs, normal, [0.0], 30.0, along) is not None
    assert _fit_family(segs, normal, [0.0, 30.0], 30.0, along) is None


# --- 11. serving: welcher Checkpoint bedient wird ------------------------------------------

def test_a_named_checkpoint_is_not_served_the_runs_default_model(tmp_path, monkeypatch):
    """Ein Lauf haelt mehrere Checkpoints; der Cache-Schluessel muss den GEFRAGTEN nennen.

    Sonst bekommt der zweite Aufrufer das Modell des ersten, und ein SWA-Vergleich misst
    zweimal dasselbe Gewicht — ohne dass irgendwo etwas auffaellt.
    """
    from chesslab import serving
    from chesslab.training import evaluate

    class Fake:
        def __init__(self, name):
            self.name = name

        def eval(self):
            return self

        def to(self, _device):
            return self

    run = tmp_path / "run"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"classes": ["empty"]}), encoding="utf-8")
    monkeypatch.setattr(evaluate, "load_run", lambda d, w: (Fake(w), {"classes": ["empty"]}))

    serving.clear_cache()
    try:
        default, _ = serving.load_run(run)
        swa, _ = serving.load_run(run, weights="swa.pt")
        assert (default.name, swa.name) == (None, "swa.pt")
    finally:
        serving.clear_cache()


def test_a_gpu_request_is_not_served_silently_on_the_cpu(tmp_path, monkeypatch):
    """ONNX lohnt nur, wenn es das GEFRAGTE Geraet auch bedienen kann.

    Dieser onnxruntime-Build liefert unter Windows nur CPU-Provider; ONNX trotzdem vorzuziehen
    schob die Tracker-Inferenz still auf die CPU, waehrend torch (ROCm) einen GPU-Weg hatte.
    """
    onnxruntime = pytest.importorskip("onnxruntime")

    from chesslab import serving
    from chesslab.training import evaluate

    class Torchish:
        def eval(self):
            return self

        def to(self, _device):
            return self

    run = tmp_path / "run"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"classes": ["empty"]}), encoding="utf-8")
    (run / "model.onnx").write_bytes(b"graph")
    monkeypatch.setattr(onnxruntime, "get_available_providers", lambda: ["CPUExecutionProvider"])
    monkeypatch.setattr(serving, "_ONNXModel", lambda path, device: "onnx")
    monkeypatch.setattr(evaluate, "load_run", lambda d, w: (Torchish(), {"classes": ["empty"]}))

    serving.clear_cache()
    try:
        model, _cfg = serving.load_run(run, device="cuda")
        assert isinstance(model, Torchish)
        serving.clear_cache()
        assert serving.load_run(run, device="cpu")[0] == "onnx"
    finally:
        serving.clear_cache()


def test_the_coverage_unit_is_split_off_before_the_softmax(tmp_path, monkeypatch):
    """Der Occlusion-Kopf traegt EINE Sigmoid-Einheit neben den Klassen.

    Mit ihr zusammen softmaxed verbiegt sie jede Wahrscheinlichkeit, und `classes[argmax]`
    laeuft hinten raus, sobald das Maximum auf ihr landet.
    """
    import torch

    from chesslab import serving
    from chesslab.config import IDENTITY_CLASSES

    classes = list(IDENTITY_CLASSES)
    cfg = {"classes": classes, "out_size": [8, 8], "head": "occlusion"}

    def fake_model(batch):
        logits = torch.zeros(batch.shape[0], len(classes) + 1)
        logits[:, -1] = 9.0          # die Coverage-Einheit dominiert jede Klasse
        logits[:, 3] = 1.0
        return logits

    monkeypatch.setattr(serving, "load_run", lambda run, device, weights=None: (fake_model, cfg))
    crops = [np.zeros((8, 8, 3), np.uint8)]

    read = serving.predict_arrays(tmp_path, crops, return_probs=True)[0]

    assert read["pred_label"] == classes[3]
    assert read["coverage"] == pytest.approx(1.0, abs=1e-3)
    assert len(read["probs"]) == len(classes)


def test_without_a_position_prior_no_mass_is_called_invalid():
    """`allowed is None` heisst "kein Kontext", nicht "nichts ist erlaubt".

    Als leere Menge gelesen traegt JEDE Lesung volle Fehlmasse, und der Ausweg "keines der
    erlaubten Label passt" faellt auf jedem Feld — eine Messung, die nie stattfand.
    """
    from chesslab.serving import invalid_mass

    probs, classes = [0.7, 0.3], ["wP", "empty"]

    assert invalid_mass(probs, classes, None) == 0.0
    assert invalid_mass(probs, classes, {"empty"}) == pytest.approx(0.7)


def test_occlusion_is_never_counted_as_an_illegal_placement():
    """`occluded` ist ein Sehzustand und keine Figur auf einem Feld — als Fehlmasse gezaehlt
    wuerde eine Hand zum Beweis, dass die Stellung nicht stimmt."""
    from chesslab.serving import invalid_mass

    probs, classes = [0.2, 0.3, 0.5], ["wP", "occluded", "empty"]

    assert invalid_mass(probs, classes, {"empty"}) == pytest.approx(0.2)


def test_a_prior_that_would_zero_the_board_keeps_the_pixels():
    """Faellt die ganze Masse auf verbotene Label, bleibt die rohe Verteilung stehen.

    Ohne den Riegel teilt `apply_prior` durch die Summe der gedaempften Werte; bei numerischer
    Null kaeme `inf`/`nan` heraus, und die Engine entschiede auf einer Verteilung ohne Bedeutung.
    """
    from chesslab.serving import apply_prior

    probs, classes = [1.0, 0.0], ["wP", "empty"]

    assert apply_prior(probs, classes, {"empty"}, lam=800.0) == probs
    assert apply_prior(probs, classes, None, lam=4.0) == probs


# --- 12. dataset: der Rettungszug darf keinen Split erfinden -------------------------------

def test_a_holdout_nobody_asked_for_stays_empty():
    """Der Rettungszug holt EINE Aufnahme aus Train zurueck, wenn ein Holdout sonst leer bliebe.

    Bei `frac = 0` ist der leere Holdout aber die Bestellung: dort greift er nicht, sonst
    verliert Train eine Aufnahme an einen Satz, den niemand auswerten wollte.
    """
    from chesslab.dataset import assign_sessions_to_splits

    sizes = {"a": 5000, "b": 4000, "c": 3000}
    splits = assign_sessions_to_splits(sizes, val_frac=0.2, test_frac=0.0, seed=1)

    assert splits["test"] == []
    assert splits["val"]
    assert sorted(splits["train"] + splits["val"]) == ["a", "b", "c"]


def test_pinning_half_a_clip_pins_the_whole_group():
    """Eine Gruppe erbt `force_train` von JEDEM Mitglied.

    Sonst bleibt die andere Haelfte desselben Clips frei und landet in Val — benachbarte Frames
    einer Aufnahme auf beiden Seiten des Splits sind genau die Leckage, die Gruppen verhindern.
    """
    from chesslab.dataset import assign_sessions_to_splits

    sizes = {"clip-0": 900, "clip-1": 900, "a": 2000, "b": 1500, "c": 1200}
    groups = {"clip-0": "clip", "clip-1": "clip", "a": "a", "b": "b", "c": "c"}
    splits = assign_sessions_to_splits(sizes, 0.3, 0.3, seed=1,
                                       force_train={"clip-0"}, groups=groups)

    assert {"clip-0", "clip-1"} <= set(splits["train"])


def test_the_same_seed_keeps_the_same_crops_whatever_the_manifest_order():
    """Gezogen wird aus einer stabil sortierten Liste, nicht aus der Einfuegereihenfolge —
    sonst haengt die Auswahl am Manifest statt am Seed und kein Lauf ist wiederholbar."""
    from chesslab.dataset import subsample_classes

    rows = [{"label": "wP" if i < 40 else "wN", "path": f"c{i:03d}.webp"} for i in range(50)]
    kept = subsample_classes(rows, max_class_ratio=2.0, seed=7)
    shuffled = subsample_classes(list(reversed(rows)), max_class_ratio=2.0, seed=7)

    assert len(kept) == 30, "die Kappe muss ueberhaupt greifen"

    assert {r["path"] for r in kept} == {r["path"] for r in shuffled}


def test_a_packed_row_is_not_reported_as_a_missing_file():
    """`mm://`-Zeilen haben keine Datei: ihre Pixel liegen im Memmap. Als Pfad geprueft meldet
    `verify` einen gebackenen Datensatz Zeile fuer Zeile als kaputt."""
    from chesslab.dataset import verify

    rows = [{"label": "empty", "path": "mm://real13-80/s1/000001_a1.png", "out_size": [80, 80]}]

    assert verify(rows, classes=["empty"]) == []


def test_stats_count_a_label_the_class_list_does_not_know():
    """Ein historischer Datensatz traegt Label, die die heutige Klassenliste nicht kennt.

    Ohne die Toleranz stirbt die Statistik dieses Satzes mit `KeyError`, waehrend derselbe
    Aufruf fuer jeden anderen laeuft — der Bericht sagt dann gar nichts statt etwas.
    """
    from chesslab.dataset import compute_stats

    rows = [{"label": "occupied", "session_id": "s1", "square_color": "light"},
            {"label": "empty", "session_id": "s1", "square_color": "dark"}]

    stats = compute_stats(rows, classes=["empty"])

    assert stats["counts"]["occupied"] == 1
    assert stats["light"]["occupied"] == 1
    assert stats["total"] == 2


# --- 13. ingest: eindeutige Sessions, lautes Scheitern -------------------------------------

def test_two_groups_that_sanitise_to_one_name_get_two_sessions(tmp_path):
    """`_safe_group` ersetzt alles Ungewohnte durch `-`; zwei Rohnamen fallen dabei zusammen.

    Ohne die Eindeutigkeit teilen sie sich EIN Verzeichnis, und das zweite `log.jsonl` kuerzt
    das erste weg — die Bilder der ersten Gruppe bleiben ungenannt auf der Platte.
    """
    from chesslab import config, ingest

    items = [ingest.ImportItem(image_path=tmp_path / f"{i}.png", corners=[[0, 0]] * 4,
                               fen=START, group=g)
             for i, g in enumerate(("game 1", "game/1"))]
    paths = config.Paths(root=tmp_path / "data")

    ids = ingest.synthesize_sessions(items, tag="t", profile_name="p", paths=paths)

    assert len(set(ids)) == 2
    assert all((paths.sessions / sid / "log.jsonl").is_file() for sid in ids)


def test_an_overlay_that_was_not_written_is_an_error(tmp_path, monkeypatch):
    """`cv2.imwrite` wirft nicht. Still verschluckt nannte die Liste Dateien, die nie entstanden,
    und der visuelle Check gegen vertauschte Labels fiel lautlos aus."""
    import cv2

    from chesslab import config, ingest

    paths = config.Paths(root=tmp_path / "data")
    prof = ingest.ingestion_profile("t", 128)
    src = tmp_path / "frame.png"
    cv2.imwrite(str(src), np.zeros((128, 128, 3), np.uint8))
    items = [ingest.ImportItem(image_path=src, corners=prof.image_corners, fen=START, group="g")]
    sid = ingest.synthesize_sessions(items, tag="t", profile_name="t", paths=paths)[0]
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: False)

    with pytest.raises(RuntimeError, match="debug overlay not written"):
        ingest.debug_overlay(sid, 1, tmp_path / "out", profile=prof, paths=paths)


def test_an_adapter_that_found_nothing_refuses_instead_of_building(tmp_path, monkeypatch):
    """Null brauchbare Bilder heisst falscher Pfad oder kaputte Annotation — nicht "fertig".

    Ohne die Absage laeuft die Kette bis zum Datensatz durch und legt einen leeren an, der wie
    ein gebauter aussieht.
    """
    from chesslab import config, ingest

    monkeypatch.setattr(ingest, "_load_adapter", lambda name: lambda root: iter(()))

    with pytest.raises(ValueError, match="no usable images"):
        ingest.run_ingest("synthetic", tmp_path, tag="t", build=False,
                          paths=config.Paths(root=tmp_path / "data"))


def test_the_ingest_profile_lands_under_the_root_it_was_given(tmp_path, monkeypatch):
    """`profile_path(tag)` haengt an `config.DATA`: ein Lauf auf einer anderen Wurzel legte sein
    Profil trotzdem in die echte Datenwurzel, waehrend Sessions und Crops unter `paths` lagen."""
    from chesslab import config, ingest

    real = config.Paths(root=tmp_path / "real")
    monkeypatch.setattr(config, "DATA", real)
    paths = config.Paths(root=tmp_path / "other")
    item = ingest.ImportItem(image_path=tmp_path / "a.png", corners=[[0, 0]] * 4,
                             fen=START, group="g")
    monkeypatch.setattr(ingest, "_load_adapter", lambda name: lambda root: iter([item]))
    monkeypatch.setattr(ingest, "slice_imported", lambda *a, **k: {})

    ingest.run_ingest("synthetic", tmp_path, tag="mutprobe", build=False, paths=paths)

    assert (paths.calibration / "mutprobe.yaml").is_file()
    assert not (real.calibration / "mutprobe.yaml").exists()


# --- 14. doctor: ein FAIL ist ein FAIL ------------------------------------------------------

def test_a_failing_check_decides_the_exit_code_and_the_gpu_verdict(capsys, monkeypatch):
    """`validate_gpu` ist der Weg, den `train` vor dem Lauf geht: ein FAIL muss ihn anhalten,
    statt still auf die CPU zu fallen. `run` traegt dieselbe Regel in den Exit-Code."""
    from chesslab import doctor

    checks = [doctor.Check("a", doctor.PASS, ""), doctor.Check("b", doctor.WARN, ""),
              doctor.Check("c", doctor.FAIL, "")]
    monkeypatch.setattr(doctor, "gpu_checks", lambda: checks)
    monkeypatch.setattr(doctor, "base_checks", list)

    assert doctor.validate_gpu()[0] is False
    assert doctor.run(gpu=True) == 1

    monkeypatch.setattr(doctor, "gpu_checks", lambda: checks[:2])
    assert doctor.validate_gpu()[0] is True
    assert doctor.run(gpu=True) == 0
    capsys.readouterr()


# --- 15. scan_discover: das neueste Mesh, nicht das alphabetisch erste ---------------------

def test_the_newest_obj_wins_not_the_alphabetically_first(tmp_path):
    """Auf veralteten RealityScan-Ordnern steht `mesh_Model_*.obj` (grosses M) vor
    `mesh_bauer2.obj` — `sorted()[0]` nimmt dann den Ausschuss statt den frischen Scan."""
    import os

    from chesslab.scan_discover import pick_mesh

    d = tmp_path / "wP"
    d.mkdir()
    (d / "mesh_Model_alt.obj").write_text("alt", encoding="utf-8")
    fresh = d / "mesh_neu.obj"
    fresh.write_text("neu", encoding="utf-8")
    os.utime(d / "mesh_Model_alt.obj", (1, 1))

    assert pick_mesh(d) == fresh


def test_the_uv_debug_image_is_never_taken_as_a_texture(tmp_path):
    """RealityScan legt `*_unwrap.png` neben den Export. Als Textur genommen rendert die Figur
    mit dem UV-Karo statt mit ihrem Scan — und es faellt erst im Bild auf."""
    from chesslab.scan_discover import _pick_texture

    d = tmp_path / "wP"
    d.mkdir()
    (d / "model_unwrap.png").write_bytes(b"x" * 4000)
    (d / "000.jpg").write_bytes(b"x" * 10)

    assert _pick_texture(d) is None


# --- 16. temporal_flags: die Aufnahme darf sich unter dem Scan nicht bewegen ---------------

def test_a_session_that_changed_during_the_scan_publishes_nothing(monkeypatch, tmp_path):
    """Der Bericht traegt den Stempel des Zustands, gegen den gemessen wurde.

    Wandert die Aufnahme waehrenddessen (Re-Export), gehoeren die Zahlen zu Bildern, die es so
    nicht mehr gibt — und `load_flags` haelt den Bericht danach fuer aktuell.
    """
    from chesslab import temporal_flags

    stamps = iter([["vorher"], ["nachher"]])
    monkeypatch.setattr(temporal_flags, "session_dir", lambda sid: (tmp_path, None))
    monkeypatch.setattr(temporal_flags, "source_stamp", lambda rec: next(stamps))
    monkeypatch.setattr("chesslab.sensor_audit.audit",
                        lambda rec, **kw: iter(()))

    with pytest.raises(RuntimeError, match="changed during temporal scan"):
        temporal_flags.scan_session("rg-x")

    assert not (tmp_path / "reports").exists()
