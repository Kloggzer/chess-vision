"""`fit-stored`: der PC fittet den Quad nach, den eine Android-"Stored"-Session geloggt hat."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import cv2

from .. import config
from ..session_store.recording import stored_rows, stored_session_dirs, write_quad_fit
from .mesh import _field_profile, field_quad, grid_line_fracs, measured_board_size

FIT_METHOD = "grid-fit over printed field edges"


def fit_stored_session(session_dir: Path, *,
                       margin: float = config.DEFAULT_MARKER_MARGIN) -> tuple[dict, list[float]]:
    """The sidecar payload, plus what the LOGGED quad measured before the fit. The log's constant
    marker outset is off by up to 14 px; it only has to reach the first search window.
    """
    from ..alignment import improve_quad

    frames, failed, before_px = {}, [], []
    for row in stored_rows(session_dir):
        stem = Path(row["frame"]).stem
        image = cv2.imread(str(session_dir / row["frame"]))
        if image is None:
            failed.append(stem)
            continue
        size = measured_board_size(row["corners"])
        start = field_quad(row["corners"], size, margin)
        quad, before, after = improve_quad(
            image, start, _field_profile(start, (image.shape[1], image.shape[0]), size))
        worst = after if quad is not None else before
        if worst != worst:  # NaN: no square measurable, nothing here is trustworthy
            failed.append(stem)
            continue
        frames[stem] = {"corners": [[round(x, 2), round(y, 2)] for x, y in (quad or start)],
                        "align_worst_px": round(float(worst), 2)}
        mesh = grid_line_fracs(image, quad or start, size)
        if mesh is not None:
            frames[stem]["grid_lines"] = mesh
        if before == before:
            before_px.append(round(float(before), 2))
    payload = {
        "margin": 0.0,
        "frames": frames,
        "failed": failed,
        "method": FIT_METHOD,
        "source_margin": float(margin),
        "written_at": datetime.now(UTC).isoformat(),
    }
    return payload, sorted(before_px)


def _median(values: list[float]) -> float | None:
    return values[len(values) // 2] if values else None


def fit_stored(name: str) -> list[dict]:
    """Write `quad-fit.json` next to every stored session of one bundle, and say what it moved."""
    sessions = stored_session_dirs(name)
    if not sessions:
        raise FileNotFoundError(f"{name}: no stored session under files/sessions/<id>/log.jsonl")
    done = []
    for session_dir in sessions:
        payload, before = fit_stored_session(session_dir)
        path = write_quad_fit(session_dir, payload)
        after = sorted(f["align_worst_px"] for f in payload["frames"].values())
        print(f"  {name}/{session_dir.name}: {len(payload['frames'])} fitted, "
              f"{len(payload['failed'])} failed — align_worst_px median {_median(before)} -> "
              f"{_median(after)}, max {before[-1] if before else None} -> {after[-1] if after else None}")
        done.append({"name": name, "session": session_dir.name, "path": path,
                     "fitted": len(payload["frames"]), "failed": payload["failed"],
                     "before": _median(before), "after": _median(after)})
    return done


def bundles_with_stored() -> list[str]:
    root = config.DATA.recordings
    return sorted(d.name for d in root.iterdir() if stored_session_dirs(d.name)) if root.is_dir() else []


def fit_stored_all() -> list[dict]:
    """Every bundle that carries a stored session, one after the other — ONE worker, no pool."""
    done = []
    for name in bundles_with_stored():
        done += fit_stored(name)
    return done
