"""Session/Review router: /api/sessions*, /api/reslice, /api/slice"""

from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import FileResponse, Response

router = APIRouter()


def _crop_count(sid: str) -> int:
    from ... import config
    from ...manifest_cache import session_crop_count

    return session_crop_count(config.DATA.manifests / "squares.jsonl", sid)


def _review_session_dir(sid: str) -> tuple[Path, bool]:
    from ... import config
    from ... import sessions as sessions_mod

    try:
        safe_sid = sessions_mod._safe_id(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    active = config.DATA.sessions / safe_sid
    if active.exists():
        return active, False
    archived = config.DATA.sessions_archive / safe_sid
    if archived.exists():
        return archived, True
    raise HTTPException(404, f"Session '{safe_sid}' not found.")


def _review_log(sdir: Path) -> list[dict]:
    log_path = sdir / "log.jsonl"
    if not log_path.exists():
        raise HTTPException(404, f"Session '{sdir.name}' has no log.jsonl.")
    rows: list[dict] = []
    for line in log_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    if not rows:
        raise HTTPException(404, f"Session '{sdir.name}' has no captured frames.")
    return rows


def _review_entry(sid: str, idx: int) -> tuple[Path, bool, list[dict], int, dict]:
    sdir, archived = _review_session_dir(sid)
    rows = _review_log(sdir)
    clamped = max(0, min(idx, len(rows) - 1))
    return sdir, archived, rows, clamped, rows[clamped]


def _frame_path(sdir: Path, entry: dict) -> Path:
    rel = str(entry.get("frame") or "")
    if not rel:
        raise HTTPException(404, "Log entry has no frame path.")
    path = (sdir / rel).resolve()
    root = sdir.resolve()
    if root not in path.parents and path != root:
        raise HTTPException(400, "Invalid frame path in session log.")
    if not path.exists():
        raise HTTPException(404, f"Frame '{rel}' not found.")
    return path


def _review_profile(sdir: Path):
    import yaml

    from ... import calibration, config

    meta_path = sdir / "session.yaml"
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    profile_name = (meta or {}).get("profile")
    if profile_name:
        try:
            return calibration.load_profile(profile_name)
        except FileNotFoundError:
            pass
    return calibration.CalibrationProfile(
        profile=profile_name or "review",
        camera_index=-1,
        frame_size=(0, 0),
        board_size=config.DEFAULT_BOARD_SIZE,
        image_corners=[[0.0, 0.0], [float(config.DEFAULT_BOARD_SIZE), 0.0],
                       [float(config.DEFAULT_BOARD_SIZE), float(config.DEFAULT_BOARD_SIZE)],
                       [0.0, float(config.DEFAULT_BOARD_SIZE)]],
        homography=calibration.compute_homography(
            [[0.0, 0.0], [float(config.DEFAULT_BOARD_SIZE), 0.0],
             [float(config.DEFAULT_BOARD_SIZE), float(config.DEFAULT_BOARD_SIZE)],
             [0.0, float(config.DEFAULT_BOARD_SIZE)]],
            config.DEFAULT_BOARD_SIZE,
        ),
        white_pov=True,
        crop=calibration.CropParams.default(config.DEFAULT_BOARD_SIZE),
    )


def _draw_orientation_labels(img, prof) -> None:
    """Name the four corner squares, the files and the ranks ON the rectified board.

    The corner order `[a8, h8, h1, a1]` is the one thing that silently transposes every label
    in the whole project, so the image the user confirms must say which corner it thinks is
    which. Positions come from `square_center`, so they follow the profile's `white_pov`
    instead of a second, hand-written assumption about where a1 sits.
    """
    import cv2

    from ...move_tracker.tracker import square_center

    bs = prof.board_size
    for name, col in (("a8", (80, 200, 255)), ("h8", (80, 200, 255)),
                      ("h1", (80, 200, 255)), ("a1", (60, 255, 60))):
        cx, cy = square_center(name, bs, prof.white_pov)
        if name == "a1":                      # the anchor gets a dot, not just a word
            cv2.circle(img, (cx, cy), max(6, bs // 90), col, -1, cv2.LINE_AA)
        cv2.putText(img, name, (cx - 18, cy - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                    (0, 0, 0), 4, cv2.LINE_AA)
        cv2.putText(img, name, (cx - 18, cy - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                    col, 1, cv2.LINE_AA)
    for f in "abcdefgh":                      # file letters on rank 1, rank digits on file a
        cx, cy = square_center(f + "1", bs, prof.white_pov)
        cv2.putText(img, f, (cx - 5, cy + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3,
                    cv2.LINE_AA)
        cv2.putText(img, f, (cx - 5, cy + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1,
                    cv2.LINE_AA)
    for r in range(1, 9):
        cx, cy = square_center("a" + str(r), bs, prof.white_pov)
        cv2.putText(img, str(r), (cx - 28, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3,
                    cv2.LINE_AA)
        cv2.putText(img, str(r), (cx - 28, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                    (200, 200, 200), 1, cv2.LINE_AA)


def _review_overlay_jpeg(sdir: Path, entry: dict, corners=None,
                         labels: bool = False) -> bytes | None:
    """Rectified frame + grid + the logged position drawn on it.

    `corners` overrides the row's own corners — that is how the hand-set candidate quad is
    previewed before anything is written. `labels` adds the orientation legend."""
    import chess
    import cv2

    from ...calibration import warp_from_corners
    from ...move_tracker.tracker import square_center

    corners = corners if corners is not None else entry.get("corners")
    fen = entry.get("fen")
    if not corners:
        return None
    frame = cv2.imread(str(_frame_path(sdir, entry)))
    if frame is None:
        raise HTTPException(404, "Frame could not be read.")
    prof = _review_profile(sdir)
    img = warp_from_corners(frame, prof, corners)
    bs = prof.board_size
    cell = bs / 8.0
    for i in range(9):
        p = int(i * cell)
        cv2.line(img, (p, 0), (p, bs), (0, 180, 0), 1)
        cv2.line(img, (0, p), (bs, p), (0, 180, 0), 1)
    if labels:
        _draw_orientation_labels(img, prof)
    if not fen:
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 86])
        return buf.tobytes() if ok else None
    try:
        board = chess.Board(fen)
    except ValueError as e:
        raise HTTPException(400, f"Invalid FEN in session log: {e}")
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece:
            continue
        sq = chess.square_name(square)
        cx, cy = square_center(sq, bs, prof.white_pov)
        ch = piece.symbol()
        col = (245, 245, 245) if piece.color == chess.WHITE else (25, 25, 25)
        halo = (25, 25, 25) if piece.color == chess.WHITE else (235, 235, 235)
        cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, halo, 4, cv2.LINE_AA)
        cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, col, 2, cv2.LINE_AA)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 86])
    return buf.tobytes() if ok else None


# --- Hand-set board geometry (review UI) ----------------------------------------------
#
# Why this exists: a session whose ArUco markers were not all detected has rows without
# `corners` and cannot be sliced at all. Reconstructing the missing corner from the other
# three is NOT an option for recorded data — measured on this corpus, dropping one marker
# moves the resolved quad by 78 px on a ~234 px square (a third of a cell), which would
# shift every crop. `config.TRACKER.default_min_markers = 2` allows that for the LIVE
# tracker, where a wrong frame is cheap; training data must not inherit it.
#
# So the geometry comes from the session itself (`adopt`: copy a quad that WAS detected in
# another row) or from the user (`hand`: four clicks, rotated until the overlay reads right).

CORNER_NAMES = ("a8", "h8", "h1", "a1")     # project storage order — see CLAUDE.md


def _shoelace(quad) -> float:
    """Signed doubled area. In IMAGE coordinates (x right, y DOWN) a positive value means the
    vertex order runs clockwise on screen — which `[a8, h8, h1, a1]` always does for a board
    photographed from above (verified against a real detected quad: +6.6e6)."""
    return sum(quad[i][0] * quad[(i + 1) % 4][1] - quad[(i + 1) % 4][0] * quad[i][1]
               for i in range(4))


def _quad_cyclic_clockwise(points) -> list[list[float]]:
    """Four points in ANY click order -> a proper, non-self-intersecting quad in clockwise
    (image) order. Which vertex is `a8` is left open on purpose: that is one rotation step in
    the UI, decided by looking at the overlay instead of by remembering the convention.

    A mirrored click order (counter-clockwise) is fixed here rather than offered as a flip
    button — no camera above a board produces a counter-clockwise a8→h8→h1→a1, so a
    counter-clockwise quad is always just the same cycle traversed backwards.
    """
    cx = sum(p[0] for p in points) / 4.0
    cy = sum(p[1] for p in points) / 4.0
    import math
    ordered = sorted(points, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    if _shoelace(ordered) < 0:
        ordered = list(reversed(ordered))
    return [[float(p[0]), float(p[1])] for p in ordered]


def _quad_from_points(points, rotate: int = 0, normalize: bool = True) -> list[list[float]]:
    """The quad that will be STORED, from what the UI collected.

    `normalize`: click order is unknown -> cycle + winding are fixed first (blind placement).
    False keeps the given order, which is what the marker-seeded path needs: there the
    assignment is measured from the ArUco ids, not guessed.
    `rotate`: 0-3 cyclic shifts — the "Rotate 90°" button."""
    pts = []
    for p in points or []:
        try:
            pts.append([float(p[0]), float(p[1])])
        except (TypeError, ValueError, IndexError):
            raise HTTPException(400, f"Corner point {p!r} is not an [x, y] pair.")
    if len(pts) != 4:
        raise HTTPException(400, f"Need exactly 4 corner points, got {len(pts)}.")
    quad = _quad_cyclic_clockwise(pts) if normalize else pts
    r = int(rotate) % 4
    return quad[r:] + quad[:r]


def _frame_size(path: Path) -> tuple[int, int]:
    """(w, h) of a frame from the file header — no full decode of a 3072x4096 PNG."""
    from PIL import Image

    with Image.open(path) as im:
        return int(im.width), int(im.height)


def _validate_quad(quad, size: tuple[int, int], claimed_size=None) -> None:
    """Refuse geometry that cannot be a board.

    The failure mode worth engineering against is scale: the UI collects clicks on a
    scaled-down `<img>` and must convert them to frame pixels, and a 3072x4096 frame shown at
    ~700 px means a forgotten conversion is a factor of four. Two guards, one exact and one
    plausibility-based:

    * `claimed_size` — the frame size the client measured (`naturalWidth/Height`). If that
      disagrees with the real file, the client scaled against the wrong basis. Deterministic.
    * area — a board that covers less than 4% of the frame cannot carry usable crops anyway
      (4% of 3072x4096 is a ~707 px side, i.e. 88 px per square, right at what this device
      actually delivers), so anything smaller is a mistake, not a bad camera position.
    """
    w, h = size
    if claimed_size:
        try:
            cw, ch = int(claimed_size[0]), int(claimed_size[1])
        except (TypeError, ValueError, IndexError):
            raise HTTPException(400, f"frame_size must be [w, h], got {claimed_size!r}.")
        if (cw, ch) != (w, h):
            raise HTTPException(400, f"The coordinates were measured against a {cw}x{ch} image, "
                                     f"but the frame is {w}x{h} — send full-resolution frame "
                                     "pixels (scale the click by naturalWidth/clientWidth).")
    slack = 0.1 * max(w, h)          # a marker clipped at the frame edge may sit just outside
    for name, (x, y) in zip(CORNER_NAMES, quad, strict=True):
        if not (-slack <= x <= w + slack and -slack <= y <= h + slack):
            raise HTTPException(400, f"Corner {name} at ({x:.0f}, {y:.0f}) is outside the "
                                     f"{w}x{h} frame — are the coordinates full-resolution?")
    area = abs(_shoelace(quad)) / 2.0
    if area < 0.04 * w * h:
        raise HTTPException(400, f"The quad covers {100 * area / (w * h):.1f}% of the frame — "
                                 "too small to be a board that yields usable crops (needs "
                                 "> 4%). A quarter-size quad usually means display pixels "
                                 "instead of frame pixels.")
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]
        if (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < (0.02 * min(w, h)) ** 2:
            raise HTTPException(400, "Two corners are (almost) identical — place four "
                                     "separate points.")
    cross = []
    for i in range(4):
        p, q, r = quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]
        cross.append((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]))
    if not (all(c > 0 for c in cross) or all(c < 0 for c in cross)):
        raise HTTPException(400, "The four points do not form a convex quad in this order.")


def _backup_log(log_path: Path) -> str:
    """Copy `log.jsonl` aside before rewriting it. `data/` is gitignored and unrecoverable;
    the project rule is park, never delete — so a backup is never overwritten either."""
    import shutil
    from datetime import datetime

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = log_path.with_name(f"{log_path.name}.bak.{stamp}")
    n = 1
    while dest.exists():
        dest = log_path.with_name(f"{log_path.name}.bak.{stamp}-{n}")
        n += 1
    shutil.copy2(log_path, dest)
    return dest.name


def _write_corner_rows(sdir: Path, rows: list[dict], indices: list[int], quad, *,
                       source: str, from_index: int | None) -> dict:
    """Write `quad` into the given rows and record HOW it got there.

    Provenance is the point: `corners_source` says `hand` or `adopted` (absent = detected by
    the capture pipeline, which is what every existing row is), `corners_from` names the row
    the quad came from, `corners_set_at` when. Analysis later has to be able to exclude
    hand-set geometry, and this session corpus already had one unanswerable question of
    exactly this kind (which camera took it) because nobody wrote it down.
    """
    from datetime import UTC, datetime

    log_path = sdir / "log.jsonl"
    backup = _backup_log(log_path)
    stamp = datetime.now(UTC).isoformat()
    for i in indices:
        rows[i]["corners"] = [[float(x), float(y)] for x, y in quad]
        rows[i]["corners_source"] = source
        rows[i]["corners_set_at"] = stamp
        if from_index is not None:
            rows[i]["corners_from"] = int(from_index)
        else:
            rows[i].pop("corners_from", None)
    tmp = log_path.with_suffix(".jsonl.tmp")
    tmp.write_text("".join(json.dumps(r, ensure_ascii=False, default=str) + "\n" for r in rows),
                   encoding="utf-8")
    os.replace(tmp, log_path)
    return {"ok": True, "changed": len(indices), "indices": indices, "backup": backup,
            "corners_source": source, "from_index": from_index,
            "corners": [[float(x), float(y)] for x, y in quad]}


def _corner_targets(rows: list[dict], scope: str, index: int, overwrite: bool) -> list[int]:
    """Which rows a write applies to — always an explicit, countable set.

    `frame` = this row only, `missing` = every row without corners, `all` = every row. A row
    that ALREADY has detected corners is only touched with `overwrite`, because a session like
    20260730-131607 has 7 good rows and 1 bad one and the 7 must stay measured."""
    if scope == "frame":
        candidates = [index]
    elif scope == "missing":
        candidates = [i for i, r in enumerate(rows) if not r.get("corners")]
    elif scope == "all":
        candidates = list(range(len(rows)))
    else:
        raise HTTPException(400, f"Unknown scope {scope!r} (frame | missing | all).")
    if not candidates:
        raise HTTPException(409, "Every row in this session already has corners — nothing to "
                                 "repair. Use scope=all with overwrite=true to replace them.")
    targets = [i for i in candidates if overwrite or not rows[i].get("corners")]
    if not targets:
        blocked = [i for i in candidates if rows[i].get("corners")]
        raise HTTPException(409, f"Rows {blocked} already have corners — nothing to write. "
                                 "Send overwrite=true to replace measured geometry.")
    return targets


_ADOPT_TOL_PX = 2.0     # ArUco centres of a tripod-static board scatter well under a pixel


def _adopt_candidate(rows: list[dict]) -> dict | None:
    """The quad to adopt: the one the MOST other rows agree with (within `_ADOPT_TOL_PX`),
    earliest row wins a tie.

    Most-agreed rather than nearest, so a single outlier row — a board that got bumped in one
    frame — cannot become the template for a whole session. `n_same` is what the UI shows, so
    it has to mean something: exact equality would split rows that differ by 0.05 px."""
    have = [(i, r["corners"]) for i, r in enumerate(rows)
            if r.get("corners") and len(r["corners"]) == 4]
    if not have:
        return None

    def close(a, b) -> bool:
        return all(abs(float(pa[k]) - float(pb[k])) <= _ADOPT_TOL_PX
                   for pa, pb in zip(a, b, strict=True) for k in (0, 1))

    counts = [(sum(1 for _j, q in have if close(c, q)), -i, i, c) for i, c in have]
    n_same, _neg, idx, quad = max(counts)
    return {"from_index": idx, "corners": quad, "n_same": n_same,
            "source_row_source": rows[idx].get("corners_source", "detected")}


@router.get("/api/sessions/{sid}/corners")
def session_corners(sid: str):
    """Geometry state of a session: which rows have corners, where they came from, and what
    can be adopted. The review UI labels both of its actions with the counts from here."""
    sdir, archived = _review_session_dir(sid)
    rows = _review_log(sdir)
    prof = _review_profile(sdir)
    without = [i for i, r in enumerate(rows) if not r.get("corners")]
    cand = _adopt_candidate(rows)
    size = None
    try:
        size = list(_frame_size(_frame_path(sdir, rows[0])))
    except HTTPException:
        pass
    return {
        "session_id": sid,
        "archived": archived,
        "count": len(rows),
        "n_with": len(rows) - len(without),
        "n_without": len(without),
        "indices_without": without,
        "corner_names": list(CORNER_NAMES),
        "frame_size": size,
        "profile": {"name": prof.profile, "board_size": prof.board_size,
                    "margin": list(prof.margin), "marker_dict": prof.marker_dict,
                    "white_pov": bool(prof.white_pov)},
        "rows": [{"index": i, "has_corners": bool(r.get("corners")),
                  "source": r.get("corners_source", "detected") if r.get("corners") else None,
                  "from": r.get("corners_from")} for i, r in enumerate(rows)],
        "adopt": ({"available": True, "n_target": len(without), **cand}
                  if cand else {"available": False, "n_target": len(without)}),
    }


@router.get("/api/sessions/{sid}/corners/seed/{idx}")
def session_corners_seed(sid: str, idx: int, scan: bool = Query(True)):
    """Marker positions to seed the hand-set quad with — measured, not reconstructed.

    With 4 markers the live pipeline's corners ARE the marker centres (verified on a real
    row), so every marker that IS found gives one corner exactly. Only the missing ones need
    a click, which is far more accurate than clicking all four. `scan` also looks at the other
    frames of the session for markers this frame is missing (same board, same tripod — that is
    the identical argument the adopt action rests on) and says which frame each came from.
    """
    import cv2

    from ...calibration import detect_board_markers

    sdir, _archived, rows, clamped, entry = _review_entry(sid, idx)
    prof = _review_profile(sdir)
    path = _frame_path(sdir, entry)
    frame = cv2.imread(str(path))
    if frame is None:
        raise HTTPException(404, "Frame could not be read.")
    here = detect_board_markers(frame, prof.marker_dict, corner="center")
    found = {int(k): {"point": [float(v[0]), float(v[1])], "from_index": clamped} for k, v in here.items()}
    scanned = [clamped]
    if scan and len(found) < 4:
        # nearest frames first — a moved board is more likely the further away in time
        order = sorted(range(len(rows)), key=lambda i: (abs(i - clamped), i))
        for i in order:
            if i == clamped or len(found) >= 4:
                continue
            other = cv2.imread(str(_frame_path(sdir, rows[i])))
            if other is None:
                continue
            scanned.append(i)
            for k, v in detect_board_markers(other, prof.marker_dict, corner="center").items():
                if int(k) not in found:
                    found[int(k)] = {"point": [float(v[0]), float(v[1])], "from_index": i}
    slots = [{"name": name, "marker_id": mid,
              "point": found.get(mid, {}).get("point"),
              "measured": mid in found,
              "from_index": found.get(mid, {}).get("from_index"),
              "here": mid in here}
             for mid, name in enumerate(CORNER_NAMES)]
    return {"session_id": sid, "index": clamped, "frame_size": list(_frame_size(path)),
            "corner_names": list(CORNER_NAMES), "slots": slots,
            "found_here": sorted(int(k) for k in here),
            "missing": [s["marker_id"] for s in slots if not s["measured"]],
            "scanned": scanned}


@router.get("/api/sessions/{sid}/corners/preview/{idx}")
def session_corners_preview(sid: str, idx: int, pts: str = Query(...), rotate: int = Query(0),
                            normalize: bool = Query(True), fs: str = Query("")):
    """Render the candidate quad WITHOUT writing it: the confirmation step.

    `pts`: 8 comma-separated full-resolution numbers (x0,y0,…,x3,y3). `fs`: "w,h" the client
    measured the clicks against (scale guard). Same helpers as the write path, so what the user
    confirms is exactly what gets stored."""
    sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    try:
        nums = [float(v) for v in pts.split(",") if v.strip() != ""]
        claimed = [int(float(v)) for v in fs.split(",") if v.strip() != ""] or None
    except ValueError:
        raise HTTPException(400, f"pts/fs must be comma-separated numbers, got {pts!r} / {fs!r}.")
    if len(nums) != 8:
        raise HTTPException(400, f"pts needs 8 numbers (4 points), got {len(nums)}.")
    quad = _quad_from_points([nums[i:i + 2] for i in range(0, 8, 2)], rotate, normalize)
    _validate_quad(quad, _frame_size(_frame_path(sdir, entry)), claimed)
    jpg = _review_overlay_jpeg(sdir, entry, corners=quad, labels=True)
    if jpg is None:
        raise HTTPException(400, "Preview could not be rendered.")
    return Response(jpg, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


@router.post("/api/sessions/{sid}/corners")
def session_set_corners(sid: str, points: list = Body(...), index: int = Body(0),
                        rotate: int = Body(0), normalize: bool = Body(True),
                        scope: str = Body("frame"), overwrite: bool = Body(False),
                        frame_size: list | None = Body(None)):
    """Write a hand-placed quad (stored order `[a8, h8, h1, a1]`, full-resolution pixels).

    `scope`: `frame` (this row), `missing` (every row without corners — a static sweep shares
    one quad legitimately, a moved board does not, so this is a separate explicit action) or
    `all`. Rows that already have corners need `overwrite`. `frame_size` is the size the client
    measured the clicks against (scale guard). `log.jsonl` is backed up first."""
    sdir, _archived, rows, clamped, entry = _review_entry(sid, index)
    quad = _quad_from_points(points, rotate, normalize)
    _validate_quad(quad, _frame_size(_frame_path(sdir, entry)), frame_size)
    targets = _corner_targets(rows, scope, clamped, overwrite)
    res = _write_corner_rows(sdir, rows, targets, quad, source="hand", from_index=clamped)
    res.update(session_id=sid, scope=scope, placed_on=clamped, rotate=int(rotate) % 4)
    return res


@router.post("/api/sessions/{sid}/corners/adopt")
def session_adopt_corners(sid: str, from_index: int | None = Body(None),
                          scope: str = Body("missing"), overwrite: bool = Body(False)):
    """Copy a quad that WAS detected in this session into the rows that have none.

    The common repair: one frame in a static sweep lost a marker while the other seven kept
    it. No clicking, and the geometry stays measured — but the rows say `adopted`, not
    `detected`, and name the row it came from."""
    sdir, _archived = _review_session_dir(sid)
    rows = _review_log(sdir)
    if from_index is None:
        cand = _adopt_candidate(rows)
        if cand is None:
            raise HTTPException(400, "No row in this session has corners — there is nothing to "
                                     "adopt. Place the box by hand instead.")
        src_idx, quad = cand["from_index"], cand["corners"]
    else:
        src_idx = max(0, min(int(from_index), len(rows) - 1))
        quad = rows[src_idx].get("corners")
        if not quad:
            raise HTTPException(400, f"Row {src_idx} has no corners to adopt.")
    targets = _corner_targets(rows, scope, src_idx, overwrite)
    targets = [i for i in targets if i != src_idx]
    if not targets:
        raise HTTPException(409, "Only the source row itself would change — nothing to do.")
    res = _write_corner_rows(sdir, rows, targets, quad, source="adopted", from_index=src_idx)
    res.update(session_id=sid, scope=scope)
    return res


@router.get("/api/sessions")
def sessions():
    from ... import config
    from ...manifest_cache import manifest_stats

    frames_by = manifest_stats(config.DATA.manifests / "squares.jsonl")["frames_by_session"]
    return [{"session_id": sid, "frames": frames, "n_frames": len(frames)}
            for sid, frames in sorted(frames_by.items())]


@router.get("/api/sessions/manage")
def sessions_manage():
    """List all recorded sessions (active + archived) with key data for management."""
    from ... import sessions as sessions_mod

    return sessions_mod.list_sessions()


def _geometry_version(sdir: Path) -> int:
    """A token that changes whenever the session's geometry could have changed.

    The overlay is served with `Cache-Control: max-age=300` because a frame's pixels never
    change — but the overlay is a RENDER of pixels plus corners, and writing corners changes it
    while the URL stays identical. The browser then keeps showing the pre-write image: after
    "adopt to all", the row that happened to be on screen (and its preloaded neighbours) still
    looked uncorrected, which reads as "the write skipped this row". Session-level on purpose —
    every corner write rewrites `log.jsonl`, so one token invalidates exactly the rows a write
    could have touched, and leaves everything else cacheable.
    """
    try:
        return (sdir / "log.jsonl").stat().st_mtime_ns
    except OSError:
        return 0


@router.get("/api/sessions/{sid}/review")
def session_review(sid: str, idx: int = Query(0)):
    """Return one review step: real frame URL + chess.svg board URL for the logged FEN."""
    sdir, archived, rows, clamped, entry = _review_entry(sid, idx)
    safe_sid = quote(sid, safe="")
    return {
        "session_id": sid,
        "archived": archived,
        "index": clamped,
        "count": len(rows),
        "entry": {
            "frame": entry.get("frame"),
            "ply": entry.get("ply"),
            "fen": entry.get("fen"),
            "move_san": entry.get("move_san"),
            "ts": entry.get("ts"),
            "unusable": bool(entry.get("unusable")),
            # Geometry state of THIS row: without corners the row cannot be sliced at all,
            # and `corners_source` says whether they were measured or set by hand.
            "has_corners": bool(entry.get("corners")),
            "corners_source": (entry.get("corners_source", "detected")
                               if entry.get("corners") else None),
            "corners_from": entry.get("corners_from"),
        },
        "frame_url": f"/api/sessions/{safe_sid}/frame/{clamped}",
        "overlay_url": f"/api/sessions/{safe_sid}/overlay/{clamped}",
        "overlay_available": bool(entry.get("corners") and entry.get("fen")),
        "board_url": f"/api/sessions/{safe_sid}/board/{clamped}",
        # Cache buster for `overlay_url` — see `_geometry_version`. The client MUST put this in
        # the overlay request, or a corner write stays invisible for `max-age`.
        "geometry_version": _geometry_version(sdir),
    }


# Review images are cache-friendly: a frame's content never changes for a given index
# (trim only cuts the TAIL, flags don't alter pixels), and the review UI preloads the
# neighbouring indexes — without a Cache-Control the browser revalidates every step
# and the overlay (server-side render) is recomputed although nothing changed.
_REVIEW_CACHE = {"Cache-Control": "private, max-age=300"}


@router.get("/api/sessions/{sid}/frame/{idx}")
def session_frame(sid: str, idx: int):
    sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    return FileResponse(_frame_path(sdir, entry), headers=_REVIEW_CACHE)


@router.get("/api/sessions/{sid}/overlay/{idx}")
def session_overlay(sid: str, idx: int, labels: bool = Query(False)):
    """`labels`: draw the corner/file/rank legend. The review panel asks for it — judging
    "is White at the bottom" from a bare grid means guessing, and a transposed quad is the
    worst failure mode in this project."""
    sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    jpg = _review_overlay_jpeg(sdir, entry, labels=labels)
    if jpg is None:
        return FileResponse(_frame_path(sdir, entry), headers=_REVIEW_CACHE)
    return Response(jpg, media_type="image/jpeg", headers=_REVIEW_CACHE)


@router.get("/api/sessions/{sid}/board/{idx}")
def session_board(sid: str, idx: int):
    import chess
    import chess.svg

    _sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    fen = entry.get("fen")
    if not fen:
        raise HTTPException(404, "Log entry has no FEN.")
    try:
        board = chess.Board(fen)
    except ValueError as e:
        raise HTTPException(400, f"Invalid FEN in session log: {e}")
    return Response(chess.svg.board(board, size=560), media_type="image/svg+xml",
                    headers=_REVIEW_CACHE)


@router.post("/api/sessions/{sid}/archive")
def session_archive(sid: str, reason: str = "archived from the web UI"):
    """`reason` is recorded in the archive index and in the session's own `session.yaml`.

    It has a default so the existing UI button keeps working, but the default is deliberately
    uninformative: a caller that cares should say why.
    """
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.archive_session(sid, reason)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/restore")
def session_restore(sid: str):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.restore_session(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except FileExistsError as e:
        raise HTTPException(409, str(e))


@router.post("/api/sessions/{sid}/reviewed")
def session_set_reviewed(sid: str, reviewed: bool = Body(..., embed=True)):
    """Mark a session reviewed / not-reviewed so the UI can hide it from the NEW list."""
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.set_session_reviewed(sid, reviewed)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.delete("/api/sessions/{sid}")
def session_delete(sid: str):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.delete_session(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/trim")
def session_trim(sid: str, keep_frames: int = Body(..., embed=True)):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.trim_session(sid, keep_frames)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/flag/{idx}")
def session_flag_unusable(sid: str, idx: int, unusable: bool = Body(..., embed=True)):
    """Toggle the 'unusable' flag on a single frame in the session log."""
    sdir, _archived = _review_session_dir(sid)
    log_path = sdir / "log.jsonl"
    if not log_path.exists():
        raise HTTPException(404, f"Session '{sid}' has no log.jsonl.")
    lines = log_path.read_text(encoding="utf-8").splitlines()
    if idx < 0 or idx >= len(lines):
        raise HTTPException(400, f"Index {idx} out of range (0–{len(lines) - 1}).")
    entry = json.loads(lines[idx])
    entry["unusable"] = unusable
    lines[idx] = json.dumps(entry, ensure_ascii=False, default=str)
    # Atomic replace: a crash mid-write must never leave a truncated log. NOTE this is still a
    # read-modify-write — flagging is a REVIEW action; doing it while the same session is being
    # actively recorded could drop a concurrently appended line. The UI only offers review on
    # non-live sessions, so we accept that instead of introducing file locking here.
    tmp = log_path.with_suffix(".jsonl.tmp")
    tmp.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.replace(tmp, log_path)
    return {"ok": True, "session_id": sid, "index": idx, "unusable": unusable}


@router.post("/api/sessions/{sid}/slice")
def session_slice(sid: str, pad_up: float | None = Query(None), pad_side: float | None = Query(None)):
    from ... import labeling as labeling_mod
    from ... import sessions as sessions_mod

    rc = labeling_mod.run_slice(session=sid, pad_up=pad_up, pad_side=pad_side)
    crops = _crop_count(sid)
    if rc != 0:
        raise HTTPException(400, f"Slicing for '{sid}' failed.")
    # Slicing a session implies the user has accepted it → mark reviewed so it drops out of the
    # NEW list. Best-effort: a bookkeeping failure must not fail the slice itself.
    try:
        sessions_mod.set_session_reviewed(sid, True)
    except (ValueError, FileNotFoundError):
        pass
    return {"ok": True, "session": sid, "crops": crops}


@router.post("/api/reslice")
def reslice(session: str = Query(...), pad_up: float | None = Query(None),
            pad_side: float | None = Query(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(session=session, pad_up=pad_up, pad_side=pad_side)
    crops = _crop_count(session)
    return {"ok": rc == 0, "session": session, "crops": crops}


@router.post("/api/slice")
def slice_all(pad_up: float | None = Body(None), pad_side: float | None = Body(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(slice_all=True, pad_up=pad_up, pad_side=pad_side)
    return {"ok": rc == 0}
