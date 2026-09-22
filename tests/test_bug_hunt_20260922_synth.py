"""Bug hunt 2026-09-22, Bereich `synth/` + `synth_build.py`/`composite.py`/`meshprep.py`.

Gemeinsame Familie: etwas UNGEMESSENES wird als gemessener Normalwert weitergereicht — eine
Zeilennummer statt der deklarierten Pack-Ordnung, ein Prozess-Hash statt eines Seeds, ein
Debug-Muster statt der Scan-Textur.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import PIL.Image
import pytest

from chesslab.ioutil import write_json
from chesslab.training.pack import _manifest_digest

ROOT = Path(__file__).resolve().parents[1]


def _synth(name: str):
    spec = importlib.util.spec_from_file_location(f"_synth_{name}", ROOT / "synth" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# --- 1. measure_noise: die Pack-Ordnung steht in `meta["paths"]`, nicht in der Zeilennummer ----

def _tiny_dataset(tmp_path: Path, *, link_owner: str | None = None) -> Path:
    """Zwei Zeilen, deren Pack-Reihenfolge der Manifest-Reihenfolge WIDERSPRICHT."""
    ds = tmp_path / "ds"
    ds.mkdir()
    rows = [{"path": "mm://p/f_a1.png", "label": "empty", "session_id": "s"},
            {"path": "mm://p/f_b1.png", "label": "keep", "session_id": "s"}]
    (ds / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    meta = {"n": 2, "h": 4, "w": 4, "digest": _manifest_digest(rows),
            "paths": [rows[1]["path"], rows[0]["path"]]}        # gepackt: b1 zuerst
    if link_owner:
        meta["packed_from"] = link_owner
    write_json(ds / "packed_meta.json", meta, indent=None)
    img = np.zeros((2, 4, 4, 3), np.uint8)
    img[0] = 200        # b1
    img[1] = 50         # a1
    owner = tmp_path / link_owner if link_owner else ds
    owner.mkdir(exist_ok=True)
    (owner / "packed_images.u8").write_bytes(img.tobytes())
    return ds


def test_measure_noise_reads_the_pack_by_path_not_by_row_number(tmp_path):
    mn = _synth("measure_noise")
    got = mn.crops_from_dataset(_tiny_dataset(tmp_path), "empty", 0, 42)
    assert len(got) == 1
    assert int(got[0].mean()) == 50, "die Zeile a1 hat die Pixel von b1 bekommen"


def test_measure_noise_follows_a_link_to_its_owner(tmp_path):
    mn = _synth("measure_noise")
    ds = _tiny_dataset(tmp_path, link_owner="owner")
    assert int(mn.crops_from_dataset(ds, "empty", 0, 42)[0].mean()) == 50


def test_measure_noise_refuses_a_pack_that_is_not_current(tmp_path):
    mn = _synth("measure_noise")
    ds = _tiny_dataset(tmp_path)
    meta = json.loads((ds / "packed_meta.json").read_text(encoding="utf-8"))
    meta["digest"] = "stale"
    write_json(ds / "packed_meta.json", meta, indent=None)
    with pytest.raises(ValueError, match="does not match this manifest"):
        mn.crops_from_dataset(ds, "empty", 0, 42)


# --- 2. degrade: der Seed haengt am Dateinamen, nicht am Prozess ------------------------------

_SEED_PROBE = (
    "import sys; sys.path.insert(0, r'{synth}');"
    " from degrade import _seed_from_name; print(_seed_from_name('shard-0/board_a.png'))"
)


def test_degrade_seed_is_the_same_in_two_processes():
    out = [subprocess.run([sys.executable, "-c", _SEED_PROBE.format(synth=ROOT / "synth")],
                          capture_output=True, text=True, check=True,
                          env={**dict(__import__("os").environ), "PYTHONHASHSEED": s}).stdout.strip()
           for s in ("1", "2")]
    assert out[0] == out[1], f"Seed haengt am PYTHONHASHSEED: {out}"


def test_degrade_seed_still_reads_a_numeric_name_as_its_number():
    assert _synth("degrade")._seed_from_name("shard-0/000123.jpg") == 123


# --- 3. meshprep: der Debug-Filter darf abwaehlen, nie die Figur nackt lassen -----------------

def _png(path: Path, rgb: tuple[int, int, int]) -> Path:
    PIL.Image.fromarray(np.full((64, 64, 3), rgb, np.uint8)).save(path)
    return path


def test_a_sole_texture_survives_even_when_it_trips_the_debug_filter(tmp_path):
    from chesslab.meshprep import _first_real_texture, _looks_like_debug_texture

    vivid = _png(tmp_path / "wB_diffuse.png", (255, 0, 0))
    assert _looks_like_debug_texture(vivid)
    assert _first_real_texture([vivid]) == vivid


def test_a_real_texture_still_wins_over_a_debug_pattern(tmp_path):
    from chesslab.meshprep import _first_real_texture

    vivid = _png(tmp_path / "a.png", (255, 0, 0))
    wood = _png(tmp_path / "b.png", (160, 150, 150))
    assert _first_real_texture([vivid, wood]) == wood


@pytest.mark.parametrize("piece", sorted(p.name for p in (ROOT / "synth_pieces").glob("[bw][BKNPQR]")))
def test_every_shipped_scan_texture_survives_the_texture_choice(piece):
    """Die zwoelf Scans sind Ground Truth — keiner darf als UV-Debug-Muster verworfen werden."""
    from chesslab.meshprep import _first_real_texture

    d = ROOT / "synth_pieces" / piece
    tex = sorted(p for p in d.glob("v*.png") if "preview" not in p.stem and "-fixed" not in p.stem)
    assert tex, f"{piece}: keine Textur"
    assert _first_real_texture([tex[0]]) == tex[0]


def test_verbatim_obj_import_prefers_the_real_texture_over_the_debug_pattern(tmp_path):
    from chesslab.meshprep import prepare_scan
    from chesslab.scan_discover import ScanItem, _pick_texture

    scan = tmp_path / "wB"
    scan.mkdir()
    (scan / "wB.obj").write_text("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n", encoding="utf-8")
    # Das Debug-Muster ist die GROESSERE `*diffuse*`-Datei, also waehlt die Entdeckung sie.
    PIL.Image.fromarray(np.random.default_rng(0).integers(
        0, 2, (64, 64, 3), dtype=np.uint8) * 255).save(scan / "wB_diffuse.png")
    _png(scan / "wB_diffuse_2.png", (160, 150, 150))
    item = ScanItem(name="wB", obj=scan / "wB.obj", tex=_pick_texture(scan), variant="v1")
    assert item.tex.name == "wB_diffuse.png"

    rep = prepare_scan(item, tmp_path / "out", make_preview=False)

    got = np.asarray(PIL.Image.open(tmp_path / "out" / "wB" / "v1.png").convert("RGB"))
    assert tuple(got[0, 0]) == (160, 150, 150), "das UV-Debug-Muster wurde als Textur kopiert"
    assert rep["texture"] == "v1.png"


def test_a_verbatim_import_without_any_texture_says_so(tmp_path):
    """Die MTL deklariert `map_Kd <stem>.png` immer — der Report muss die Luecke nennen."""
    from chesslab.meshprep import prepare_scan
    from chesslab.scan_discover import ScanItem

    scan = tmp_path / "wP"
    scan.mkdir()
    (scan / "wP.obj").write_text("v 0 0 0\nf 1 1 1\n", encoding="utf-8")
    rep = prepare_scan(ScanItem(name="wP", obj=scan / "wP.obj", tex=None, variant="v1"),
                       tmp_path / "out", make_preview=False)
    assert rep["texture"] is None
    assert not (tmp_path / "out" / "wP" / "v1.png").exists()


# --- 4. Mutationsprobe: Sperren, die ohne Test durchgingen ------------------------------------

def test_degrade_gives_two_names_two_seeds():
    d = _synth("degrade")
    assert d._seed_from_name("a.png") != d._seed_from_name("b.png")


def test_a_generic_clip_name_is_taken_from_its_folder():
    """Vier Quellen heissen `video.mp4`; ueber den Stem benannt ueberschrieben sie sich."""
    from chesslab.composite import clip_id

    assert clip_id(Path("data/footage/turntable-03/video.mp4")) == "turntable-03"
    assert clip_id(Path("data/footage/x/VID_20260817.mp4")) == "VID_20260817"


def test_plate_scale_comes_from_the_index_not_from_the_fallback(tmp_path):
    """`source` ist die DEKLARIERTE Schnittaufloesung — sonst sitzt jede Hand um Faktor 2 falsch."""
    from chesslab.composite import plate_long_side
    from chesslab.occluders import WORK_SIZE

    write_json(tmp_path / "occluders.json", [{"source": [3840, 2160]}])
    assert plate_long_side(tmp_path) == 3840
    assert plate_long_side(tmp_path / "leer") == max(WORK_SIZE)


def test_synth_rows_drop_the_ambiguous_squares_and_keep_the_occluded_ones():
    from chesslab.calibration import CropParams
    from chesslab.synth_build import _rows_for_entry

    entry = {"frame": "shard-0/000007.jpg", "fen": "8/8/8/8/8/8/8/R7 w - - 0 1", "ply": 3,
             "occluded_squares": ["a1"], "ambiguous_squares": ["b1", "c1"]}
    rows = _rows_for_entry("ds", "ds__synth-000", entry, CropParams.default(1100))
    by_sq = {r["square"]: r["label"] for r in rows}
    assert len(rows) == 62 and "b1" not in by_sq and "c1" not in by_sq
    assert by_sq["a1"] == "occluded", "der Occluder-Footprint ueberschreibt das FEN-Label"
    assert by_sq["d1"] == "empty"


def test_a_given_pieces_path_that_does_not_exist_is_an_error(tmp_path):
    """Ein vertippter `--pieces`-Pfad rendert sonst still prozedurale Ersatzfiguren."""
    import sys as _sys
    from unittest.mock import MagicMock

    for m in ("bpy", "bpy.ops", "bpy_extras", "bpy_extras.object_utils", "mathutils", "bmesh"):
        _sys.modules.setdefault(m, MagicMock())
    _sys.path.insert(0, str(ROOT / "synth"))
    rmc = _synth("render_move_clip")
    assert rmc._given_path(None, "--pieces") is None
    assert rmc._given_path(tmp_path, "--pieces") == str(tmp_path)
    with pytest.raises(SystemExit, match="--pieces"):
        rmc._given_path(tmp_path / "tippfehler", "--pieces")
