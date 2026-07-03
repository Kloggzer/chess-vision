"""Tests für synth/render_args.py, build_blender_cmd, SynthDefaults — headless, kein bpy."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# render_args ist im synth/-Ordner außerhalb des Pakets → Pfad temporär ergänzen
_SYNTH_DIR = Path(__file__).resolve().parents[1] / "synth"
sys.path.insert(0, str(_SYNTH_DIR))
from render_args import RenderArgs, parse_render_args  # noqa: E402

sys.path.pop(0)


# --- parse_render_args ------------------------------------------------------------------


def test_parse_render_args_missing_out_errors():
    with pytest.raises(SystemExit, match="--out ist Pflicht"):
        parse_render_args(["--n", "10"])


def test_parse_render_args_all_flags_parsed(tmp_path):
    out = tmp_path / "render_out"
    fens = tmp_path / "fens.txt"
    pieces = tmp_path / "pieces"
    argv = [
        "--out", str(out),
        "--n", "10",
        "--seed", "123",
        "--fens", str(fens),
        "--pieces", str(pieces),
        "--res", "512",
    ]
    ra = parse_render_args(argv)
    assert ra.out == out.resolve()
    assert ra.n == 10
    assert ra.seed == 123
    assert ra.fens == fens.resolve()
    assert ra.pieces == pieces.resolve()
    assert ra.res == 512


def test_parse_render_args_paths_absolute(tmp_path):
    out = tmp_path / "sub" / "out"
    argv = ["--out", str(out)]
    ra = parse_render_args(argv)
    assert ra.out.is_absolute()


def test_parse_render_args_defaults():
    out = Path("test_out")
    ra = parse_render_args(["--out", str(out)])
    assert ra.n == 200
    assert ra.seed == 42
    assert ra.fens is None
    assert ra.pieces is None
    assert ra.res == 1024


# --- build_blender_cmd -------------------------------------------------------------------


def test_build_blender_cmd_minimal():
    from chesslab.config import build_blender_cmd

    cmd = build_blender_cmd("blender", Path("/tmp/b.blend"), Path("/tmp/s.py"), Path("/tmp/out"))
    assert cmd == [
        "blender", "--background", str(Path("/tmp/b.blend")),
        "--python", str(Path("/tmp/s.py")),
        "--",
        "--out", str(Path("/tmp/out")),
        "--n", "200",
        "--seed", "42",
        "--res", "1024",
    ]


def test_build_blender_cmd_all_flags():
    from chesslab.config import build_blender_cmd

    cmd = build_blender_cmd(
        "blender", Path("b.blend"), Path("s.py"), Path("out"),
        n=10, seed=99, fens=Path("fens.txt"), pieces=Path("pieces"), res=512,
    )
    assert "--" in cmd
    sep = cmd.index("--")
    body = cmd[sep + 1:]
    assert body == [
        "--out", str(Path("out")),
        "--n", "10",
        "--seed", "99",
        "--res", "512",
        "--fens", str(Path("fens.txt")),
        "--pieces", str(Path("pieces")),
    ]


def test_build_blender_cmd_no_optional():
    from chesslab.config import build_blender_cmd

    cmd = build_blender_cmd("blender", Path("b.blend"), Path("s.py"), Path("out"))
    sep = cmd.index("--")
    body = cmd[sep + 1:]
    # keine --fens/--pieces
    assert "--fens" not in body
    assert "--pieces" not in body


# --- SynthDefaults -----------------------------------------------------------------------


def test_synth_defaults_absolute_paths():
    from chesslab.config import SYNTH

    assert SYNTH.blend.is_absolute()
    assert SYNTH.pieces_dir.is_absolute()
    assert SYNTH.blender_exe == "blender"


def test_synth_defaults_blender_env_override(monkeypatch):
    monkeypatch.setenv("CHESSLAB_BLENDER", "/custom/blender")
    from chesslab.config import SYNTH

    assert SYNTH.blender_cmd() == "/custom/blender"

    monkeypatch.delenv("CHESSLAB_BLENDER", raising=False)
    # Ohne Env-Var: PATH-Lookup oder Auto-Detektion üblicher Installationsorte —
    # das Ergebnis muss ein aufrufbarer Name ODER ein existierendes blender.exe sein.
    from pathlib import Path
    resolved = SYNTH.blender_cmd()
    assert resolved == "blender" or Path(resolved).exists()


# --- RenderArgs dataclass ----------------------------------------------------------------


def test_render_args_dataclass_fields():
    ra = RenderArgs(out=Path("/out"))
    assert ra.out == Path("/out")
    assert ra.n == 200
    assert ra.seed == 42
    assert ra.fens is None
    assert ra.pieces is None
    assert ra.res == 1024
