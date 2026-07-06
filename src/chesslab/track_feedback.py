"""Turn move-tracker UNDO=bad feedback into labeled hard-negative training crops.

Every move the user undoes is logged (frame + signals) to ``data/tracker_feedback/``. This module
slices each undone move's warped board into 64 square crops and labels them from ``fen_before``
— the position the board is in AFTER the undo, i.e. the TRUE state IF the committed move was a
ghost (drift/light/hand — no piece actually moved). Those are exactly the squares the recognizer
got wrong, so they are high-value hard negatives.

IMPORTANT (label integrity): ``fen_before`` is the true board only for GHOST commits. If a move was
undone because it was MIS-identified (a real move happened but was named wrong), ``fen_before`` is
NOT the physical board and the labels would be wrong. There is no reliable automatic way to tell
the two apart from the record, so this is gated behind ``assume_ghost`` (default on) and you should
sanity-check with ``visualize=True`` before training on the result. Crops are written under their
own session id so they never leak into val/test unless you build the dataset to include them.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import chess
import cv2

from . import config
from .calibration import crop_border_px, load_profile
from .labeling import _replace_session_in_manifest, all_squares, crop_square, square_color

_SESSION_ID = "track-feedback"       # single synthetic session holding all hard negatives


def _bad_records() -> list[dict]:
    jsonl = config.DATA.tracker_feedback / "feedback.jsonl"
    if not jsonl.exists():
        return []
    out = []
    for line in jsonl.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if r.get("feedback") == "bad" and r.get("fen_before") and r.get("images", {}).get("cur_bgr"):
            out.append(r)
    return out


def ingest_feedback(*, assume_ghost: bool = True, visualize: bool = False,
                    default_profile: str = "phone") -> dict:
    """Slice all undone (bad) moves into labeled crops appended to the squares manifest.

    Returns a summary dict. `visualize` also writes a per-record montage (warped board + the
    fen_before label on each square) under data/tracker_feedback/review/ for eyeballing."""
    if not assume_ghost:
        return {"ok": False, "error": "assume_ghost is required to auto-label (fen_before = truth "
                "only for ghost commits); run with visualize to inspect first"}
    fb_dir = config.DATA.tracker_feedback
    records = _bad_records()
    if not records:
        return {"ok": True, "records": 0, "crops": 0, "note": "no bad feedback to ingest"}

    squares_root = config.DATA.squares
    review_dir = fb_dir / "review"
    manifest_path = config.DATA.manifests / "squares.jsonl"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    prof_cache: dict[str, object] = {}
    new_lines: list[str] = []
    n_crops = 0
    per_class: dict[str, int] = {}
    ts_now = datetime.now(UTC).isoformat()

    for r in records:
        pname = r.get("profile") or default_profile
        prof = prof_cache.get(pname)
        if prof is None:
            prof = load_profile(pname)
            prof_cache[pname] = prof
        img_path = fb_dir / r["images"]["cur_bgr"]
        warped = cv2.imread(str(img_path))
        if warped is None:
            continue
        bs = prof.board_size
        if warped.shape[0] != bs or warped.shape[1] != bs:
            warped = cv2.resize(warped, (bs, bs))
        b = crop_border_px(prof)
        bordered = cv2.copyMakeBorder(warped, b, b, b, b, cv2.BORDER_CONSTANT, value=(0, 0, 0))
        board = chess.Board(r["fen_before"])
        out_size = tuple(prof.crop.out_size)
        stamp = f"{int(r['ts'] * 1000)}_{r.get('ply', 0):03d}"

        montage = warped.copy() if visualize else None
        for square in all_squares():
            piece = board.piece_at(chess.parse_square(square))
            label = config.label_from_piece(piece.symbol() if piece else None)
            crop = crop_square(bordered, square, prof, out_size)
            out_dir = squares_root / label
            out_dir.mkdir(parents=True, exist_ok=True)
            fname = f"{_SESSION_ID}_{stamp}_{square}.png"
            cv2.imwrite(str(out_dir / fname), crop)
            new_lines.append(json.dumps({
                "path": str((out_dir / fname).as_posix()),
                "label": label,
                "session_id": _SESSION_ID,
                "frame": stamp,
                "ply": r.get("ply"),
                "square": square,
                "square_color": square_color(square),
                "fen": r["fen_before"],
                "out_size": [out_size[0], out_size[1]],
                "geometry": "warp",
                "photometry": "none",
                "source": "track-feedback",     # provenance: undo=bad hard negative
                "undone_move": r.get("move"),
                "ts": ts_now,
            }, ensure_ascii=False))
            n_crops += 1
            per_class[label] = per_class.get(label, 0) + 1
            if montage is not None and label != "empty":
                from .calibration import square_to_crop_box
                x0, y0, x1, y1 = square_to_crop_box(square, prof, clamp=True)
                cv2.putText(montage, label, (int(x0) + 2, int((y0 + y1) / 2)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)
        if montage is not None:
            review_dir.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(review_dir / f"{stamp}_{r.get('move', 'x')}.jpg"), montage)

    _replace_session_in_manifest(manifest_path, _SESSION_ID, new_lines)
    return {"ok": True, "records": len(records), "crops": n_crops, "classes": per_class,
            "session_id": _SESSION_ID,
            "review_dir": str(review_dir) if visualize else None}
