"""Replay regression tests against local video clips (Spec 11, part 3).

Only useful locally: `uv run pytest -m clips`. Without `data/testclips/` (clips are not
committed) or without `erwartete_zugliste` in the manifest it is cleanly skipped. The clips
run without CNN (deterministic, no model dependency) and throttled without acceleration
only by the tracker loop itself.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

_ROOT = Path(__file__).resolve().parents[1]
_COMMITTED_CLIPS = _ROOT / "tests" / "data" / "testclips"
_LOCAL_CLIPS = _ROOT / "data" / "testclips"
_CLIPS = _COMMITTED_CLIPS if (_COMMITTED_CLIPS / "manifest.yaml").exists() else _LOCAL_CLIPS
_MANIFEST = _CLIPS / "manifest.yaml"

pytestmark = pytest.mark.clips


def _clip_path(entry: dict) -> Path | None:
    """The clip file, or None when this machine does not have it.

    Two directories, on purpose. The committed 640x640 Blender renders live next to the
    manifest; the real 30 fps phone recordings are tens to hundreds of megabytes and CANNOT be
    committed, so their manifest ENTRY is committed (corners, margin, ground truth, why it
    fails) while the file itself is dropped into the gitignored `data/testclips/`. An entry
    whose file is on neither path is skipped, so the suite still runs on a fresh clone.
    """
    for base in (_CLIPS, _LOCAL_CLIPS):
        path = base / entry["file"]
        if path.exists():
            return path
    return None


def _entries() -> list[dict]:
    if not _MANIFEST.exists():
        return []
    data = yaml.safe_load(_MANIFEST.read_text(encoding="utf-8")) or {}
    return [e for e in data.get("clips", []) if _clip_path(e) is not None]


def _replay_deterministic(entry: dict) -> dict:
    """Virtual-clock replay for entries that ask for it (`deterministic: true`).

    The realtime replay below drops frames according to machine load, so two runs of the same
    clip give different games. That is tolerable for a pass/fail move list on short renders and
    NOT tolerable for the real recordings, whose value is exactly the list they produce today
    (`known_committed`) — a pin has to be reproducible. This drives the same `MoveTracker`
    through the fixture emitter's `ClipDriver` with `time` replaced by a clock the driver
    advances by VIDEO time, so every frame is seen and the hold / recency / taint parameters
    behave as they do live.
    """
    sys.path.insert(0, str(_ROOT / "scripts"))
    import importlib.util  # noqa: PLC0415

    spec = importlib.util.spec_from_file_location("sweep_clip_params",
                                                  _ROOT / "scripts" / "sweep_clip_params.py")
    sweep = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sweep)
    import cv2  # noqa: PLC0415

    path = _clip_path(entry)
    fps = cv2.VideoCapture(str(path)).get(cv2.CAP_PROP_FPS) or 30.0
    promotion = next((uci[4] for uci in (entry.get("moves_uci") or []) if len(uci) == 5), "q")
    out = sweep.run(str(path), entry["corners"], board_size=entry.get("board_size") or 640,
                    fps=fps, tracker_kwargs=entry.get("tracker") or {},
                    margin=float(entry.get("margin") or 0.0),
                    start_fen=entry.get("start_fen"), promotion=promotion)
    return {"history": out["moves"], "fen": out["fen"], "note": out["note"]}


def _replay(entry: dict) -> dict:
    if entry.get("deterministic"):
        return _replay_deterministic(entry)
    sys.path.insert(0, str(_ROOT / "scripts"))
    from replay_clip import replay  # noqa: PLC0415

    # Optional per-clip threshold overrides (`tracker:` dict in the manifest): the clips
    # were shot on a different board than the live setup the defaults are tuned for.
    # realtime: hold/recency parameters are WALL-CLOCK — an unthrottled replay
    # compresses the quiet gaps and behaves nothing like the live tracker.
    # Promotion piece: without a CNN the tracker pauses on the choice; derive it from the
    # manifest's UCI moves (the promotion suffix q/r/b/n) so under-promotions replay too.
    # margin: the fraction by which the manifest's corners lie OUTSIDE the playing field. 0.0 for
    # the Blender renders (their corners ARE the field corners), the profile's value for anything
    # detected from ArUco — those markers sit in the label border, and replaying at 0.0 oversizes
    # the board enough to jam the grid-line gate (commit 721901a fixed the same defect in the
    # fixture emitter; this harness still had it).
    promotion = next((uci[4] for uci in (entry.get("moves_uci") or []) if len(uci) == 5), "q")
    return replay(str(_clip_path(entry)), cnn_run=None, realtime=True,
                  start_fen=entry.get("start_fen"),
                  tracker_kwargs=entry.get("tracker") or {},
                  corners=entry.get("corners"), frame_size=entry.get("frame_size"),
                  board_size=entry.get("board_size"), promotion=promotion,
                  margin=float(entry.get("margin") or 0.0))


@pytest.mark.parametrize("entry", _entries() or [None],
                         ids=lambda e: e["file"] if e else "no-clips")
def test_clip_erwartete_zugliste(entry):
    """Clips with `erwartete_zugliste` in the manifest must produce exactly this SAN sequence."""
    if entry is None:
        pytest.skip("data/testclips missing (clips are local, not committed)")
    # An explicit empty list is a valid target (phantom-move / hover clips: the tracker must
    # NOT fabricate a move). Only skip when the key is absent entirely.
    expected = entry.get("erwartete_zugliste")
    if expected is None:
        pytest.skip(f"{entry['file']}: no expected move list in manifest")
    if entry.get("marker") is False:
        pytest.skip(f"{entry['file']}: without ArUco markers — waiting for markerless "
                    f"board detection (specs/rework/11-markerless-board-detection.md)")
    res = _replay(entry)
    if entry.get("known_failure"):
        # Documented-failing material — the real 30 fps recordings. The clip is NOT expected to
        # reproduce `erwartete_zugliste` yet, so the list it DOES produce is pinned instead: a
        # change in tracker behaviour then shows up here instead of staying invisible. The
        # moment it matches the ground truth this fails and asks to be promoted.
        assert res["history"] == list(entry["known_committed"]), (
            f"{entry['file']}: KNOWN-FAILING clip moved. found {res['history']}, "
            f"pinned {entry['known_committed']}, ground truth {expected}\n"
            f"reason on record: {entry['known_failure']}\nlast note: {res['note']}")
        assert res["history"] != list(expected), (
            f"{entry['file']}: now reproduces the ground truth — drop `known_failure` / "
            f"`known_committed` from the manifest and let it into the gate")
        return
    assert res["history"] == list(expected), \
        f"{entry['file']}: found {res['history']}, expected {expected}\nlast note: {res['note']}"
    # The recovered end position must match the board after the COMMITTED legal moves (for
    # failure clips that is not the last rendered position — the tracker correctly withholds
    # the illegal transition). `expect_fen` carries it explicitly; older move-only clips fall
    # back to the last rendered position (identical there). Piece placement + side/castling/ep.
    positions = entry.get("positions")
    want_fen = entry.get("expect_fen") or (positions[-1] if positions else None)
    if want_fen:
        got = " ".join(res["fen"].split()[:4])
        want = " ".join(str(want_fen).split()[:4])
        assert got == want, f"{entry['file']}: end FEN {got}, expected {want}"
    _assert_behaviour(entry, res)


def _assert_behaviour(entry: dict, res: dict) -> None:
    """Optional per-clip assertions on occlusion / shadow / failure behaviour — not just the
    move list. Each `expect_*` field runs only when present in the manifest, so move-only
    clips are unaffected. The tracker exposes all of this via `status()` (aggregated by the
    replay harness into the trace fields used here)."""
    tag = entry["file"]
    for state in entry.get("expect_states") or []:
        assert state in res["states"], \
            f"{tag}: state {state!r} never reached (states seen: {res['states']})"
    if entry.get("expect_occlusion"):
        assert res["occluded_vetoed"] or "occluded" in res["states"], \
            f"{tag}: no occlusion detected (states {res['states']}, occluded_vetoed empty)"
    if entry.get("expect_shadow"):
        assert res["shadow_vetoed"], f"{tag}: no square was shadow-vetoed"
    if entry.get("expect_stuck"):
        assert any(entry["expect_stuck"] in r for r in res["stuck_reasons"]), \
            f"{tag}: stuck reason {entry['expect_stuck']!r} not seen (got {res['stuck_reasons']})"
    if entry.get("expect_note_contains"):
        assert any(entry["expect_note_contains"] in n for n in res["notes"]), \
            f"{tag}: no note contained {entry['expect_note_contains']!r}\nnotes: {res['notes']}"
    if entry.get("expect_game_over"):
        assert res["game_over"], f"{tag}: game not over (expected end of game)"
    if entry.get("expect_result") is not None:
        assert res["result"] == entry["expect_result"], \
            f"{tag}: result {res['result']!r}, expected {entry['expect_result']!r}"
