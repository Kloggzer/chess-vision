"""Retime a candidate by the board itself: which frames show which position.
The record's ORDER of positions is confirmed; WHEN each stood on the board is read off the video
with the CNN and a monotone Viterbi over the position chain (`docs/retime.md`). A position no
frame ever showed keeps zero frames and collapses into the next, like a multi-commit."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from .training.occlusion import PIECE_VISIBLE_MAX

STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

#: Every stride-th frame is read — a hand needs a second, the camera gives 15-30 frames of it.
STRIDE = 3
#: How far BEFORE the phone's commit a position may start (the phone lags, reality is earlier).
BACK_S = 12.0
#: How far AFTER the next commit a position may still stand (the phone rarely runs ahead).
FWD_S = 4.0
#: The log-probability a wrong cell costs at most; below this the CNN is only noisy, not wrong.
LOG_FLOOR = -4.0
#: Advancing the chain by one position costs this much agreement — one frame's worth, so a single
#: misread frame cannot open a position, three agreeing ones can.
ADVANCE_COST = 6.0
#: A frame whose reads back no position at all (a hand over the board) says nothing about either.
COVERED_MAX = 12
#: How many cells MORE than the hold's cleanest frame make a frame a different board. Measured on
#: 21-12-56 ply 49: every frame of that hold misreads h2, the retracted ones add e5, e6 and h6.
DISPUTED_CELLS = 2
#: The probability a read needs before it may contradict a position. 0.85 (the engine's
#: `cnnConfThr`) let the retraction through — a black rook where a white one belongs reads 0.56.
PICTURE_CONF = 0.5
#: A ply whose entry frame prefers its position by less than this share of ADVANCE_COST is weak;
#: when more than WEAK_SHARE of the plies are weak the reads do not match the record and nothing
#: is written (21-29-35: 3 of 99 weak, median 0.77 — a median gate at 0.85 refused a good game).
WEAK_MARGIN = 0.5
WEAK_SHARE = 0.2
#: Review boards around a ply's frame, `AnnotatedFrames.REVIEW_CONTEXT`.
REVIEW_CONTEXT = 2


@dataclass
class Retimed:
    ply: int
    frame_phone: int
    frame: int
    held: int
    margin: float | None = None
    #: The cleanest frame the position was held on — the review picture, never the label frame.
    frame_review: int | None = None
    #: Cells still covered on that picture; over 0 there was no hand-free frame in the whole hold.
    review_covered: int | None = None
    #: Frames of the hold that show a DIFFERENT board — a take-back, or a label window gone bad.
    disputed: int | None = None


def viterbi(emissions: np.ndarray, allowed: np.ndarray, advance_cost: float = ADVANCE_COST) -> np.ndarray:
    """The monotone path of positions through the frames — `emissions[t, k]` is how much frame t
    agrees with position k, `allowed[t, k]` where the phone's own commits let k stand at all."""
    T, K = emissions.shape
    score = np.full((T, K), -np.inf)
    back = np.zeros((T, K), dtype=np.int32)
    score[0] = np.where(allowed[0], emissions[0], -np.inf)
    if not np.isfinite(score[0]).any():
        score[0, 0] = emissions[0, 0]
    for t in range(1, T):
        # Best predecessor j <= k, paying advance_cost per position skipped: a running maximum
        # over j of score[t-1, j] + j * cost, then minus k * cost.
        prev = score[t - 1] + np.arange(K) * advance_cost
        best = np.maximum.accumulate(prev)
        arg = np.zeros(K, dtype=np.int32)
        # Strictly greater: on a tie the EARLIER predecessor wins, so a position opens at the first
        # frame that shows it, not at the first covered frame where nothing spoke against it.
        run, top = 0, -np.inf
        for k in range(K):
            if prev[k] > top:
                run, top = k, prev[k]
            arg[k] = run
        score[t] = np.where(allowed[t], best - np.arange(K) * advance_cost + emissions[t], -np.inf)
        back[t] = arg
        if not np.isfinite(score[t]).any():
            # Nothing allowed here (a gap between windows): carry the path instead of losing it.
            score[t] = score[t - 1]
            back[t] = np.arange(K)
    path = np.zeros(T, dtype=np.int32)
    path[-1] = int(np.argmax(score[-1]))
    for t in range(T - 1, 0, -1):
        path[t - 1] = back[t, path[t]]
    return path


def review_frames(frames: list[int], path: np.ndarray, covered: list[int],
                  disputes: np.ndarray) -> dict[int, tuple[int, int, int]]:
    """Choose the middle frame among the least covered, then least contradicting frames.
    Equal coverage makes contradictions comparable; the middle avoids hands at either edge.
    A hold may include a retracted position (21-12-56), so coverage alone is insufficient.
    `disputed` counts frames with DISPUTED_CELLS/64 more contradictions than the chosen picture.
    """
    runs: dict[int, list[tuple[int, int, float]]] = {}
    for i, (t, k, c) in enumerate(zip(frames, path, covered, strict=True)):
        runs.setdefault(int(k), []).append((c, t, int(disputes[i, int(k)]) / max(1, 64 - c)))
    out = {}
    for k, seen in runs.items():
        openest = min(c for c, _, _ in seen)
        floor = min(w for c, _, w in seen if c == openest)
        pool = [t for c, t, w in seen if c == openest and w <= floor]
        out[k] = (pool[len(pool) // 2], openest, sum(1 for _, _, w in seen if w >= floor + DISPUTED_CELLS / 64))
    return out


def retime_plies(frames: list[int], path: np.ndarray, phone: list[int], stride: int = STRIDE,
                 review: dict[int, tuple[int, int, int]] | None = None) -> list[Retimed]:
    """Entry frame and hold per ply from the path; a ply never entered collapses into the next held one."""
    out = []
    entries: dict[int, int] = {}
    held: dict[int, int] = {}
    for t, k in zip(frames, path, strict=True):
        entries.setdefault(int(k), t)
        held[int(k)] = held.get(int(k), 0) + stride
    for k in range(1, len(phone) + 1):
        entered = next((j for j in range(k, len(phone) + 1) if j in entries), None)
        frame = entries[entered] if entered is not None else phone[k - 1]
        picture = (review or {}).get(entered) if entered is not None else None
        out.append(Retimed(ply=k, frame_phone=phone[k - 1], frame=frame, held=held.get(k, 0),
                           frame_review=picture[0] if picture else frame,
                           review_covered=picture[1] if picture else None,
                           disputed=picture[2] if picture else None))
    return out


def windows(phone: list[int], fps: float, back_s: float = BACK_S, fwd_s: float = FWD_S) -> list[tuple[int, int]]:
    """`[lo, hi]` frame window per position 0..n: position k may stand from `back` before its own
    commit until `fwd` after the next one; position 0 from the start, position n to the end."""
    back, fwd = int(back_s * fps), int(fwd_s * fps)
    out = [(-1, phone[0] + fwd if phone else 10**9)]
    for k, frame in enumerate(phone):
        nxt = phone[k + 1] + fwd if k + 1 < len(phone) else 10**9
        out.append((frame - back, nxt))
    return out


def _labels(fen: str, squares: list[str]) -> list[str]:
    from .label_audit import fen_labels

    lab = fen_labels(fen)
    return [lab[s] for s in squares]


def _emission(reads: list[dict], targets: list[list[int]], covered_max: int) -> tuple[np.ndarray, np.ndarray]:
    """Agreement of one frame's 64 reads with every position, twice over: the summed floored
    log-probability of each position's label (what the path is found with) and the number of cells
    that CONTRADICT it confidently (what a picture is chosen with). Visible cells only; a frame
    mostly under a hand says nothing and contradicts nothing."""
    probs = np.array([r["probs"] for r in reads], dtype=np.float64)
    logs = np.maximum(np.log(np.clip(probs, 1e-9, 1.0)), LOG_FLOOR)
    visible = np.array([r.get("coverage", 0.0) <= PIECE_VISIBLE_MAX for r in reads])
    if visible.sum() < 64 - covered_max:
        return np.zeros(len(targets)), np.zeros(len(targets), dtype=np.int32)
    idx = np.arange(64)
    read = visible & (probs.max(axis=1) >= PICTURE_CONF)
    pred = probs.argmax(axis=1)
    return (np.array([float(logs[idx, np.array(t)][visible].sum()) for t in targets]),
            np.array([int((read & (pred != np.array(t))).sum()) for t in targets], dtype=np.int32))


def retime(name: str, model_dir: Path, *, device: str = "cpu", stride: int = STRIDE,
           write: bool = True, progress: bool = True) -> dict:
    """Read the recording, move every ply to the frame its position first stood on, write the
    candidate and the review boards. Refuses (no write) when the reads do not match the record."""
    from .calibration import crop_border_px, load_profile
    from .labeling import all_squares, crops_for_frame, effective_profile
    from .occluded_model import all_reads, model_classes
    from .realgames import (
        BOARD_ENCODE,
        EXPORT_PROFILE,
        detect_rotation,
        game_dir,
        load_candidate,
        video_fps,
        video_path,
    )
    from .recording import Recording
    from .training.torch_data import infer_size_of

    candidate = load_candidate(name)
    moves = candidate["moves"]
    if not moves:
        raise ValueError("candidate has no moves")
    fps = video_fps(candidate)
    phone = [int(m["frame"]) for m in moves]
    profile = load_profile(EXPORT_PROFILE)
    cfg = json.loads((model_dir / "config.json").read_text(encoding="utf-8"))
    prof = effective_profile(profile, cfg.get("pad_side"))
    # Einmal auf die Groesse schneiden, die das Netz frisst: `serving` haette den Zuschnitt an
    # `out_size` sonst ein zweites Mal skaliert (specs/22).
    out_size = infer_size_of(cfg)
    classes = model_classes(model_dir)
    squares = all_squares()
    fens = [candidate.get("start_fen") or STARTPOS] + [m["fen_after"] for m in moves]
    targets = [[classes.index(lab) for lab in _labels(fen, squares)] for fen in fens]
    corners_of = [[[float(x), float(y)] for x, y in (m.get("corners") or candidate["geometry"]["corners"])]
                  for m in moves]
    video = video_path(name)
    rotate = detect_rotation(video, candidate, set(phone))
    win = windows(phone, fps)
    lo, hi = max(0, win[1][0]), win[-1][0] + int(FWD_S * fps) + int(BACK_S * fps)
    hi = max(hi, phone[-1] + int(FWD_S * fps))
    sampled: list[int] = []
    rows: list[np.ndarray] = []
    covered: list[int] = []
    disputed: list[np.ndarray] = []
    pending: list[tuple[int, list[np.ndarray]]] = []
    told = 0

    def flush() -> None:
        # One frame per call: the exported graph takes a batch of exactly 64 (`model.onnx`).
        for idx, cells in pending:
            sampled.append(idx)
            reads = all_reads(model_dir, cells, device=device)
            row, dispute = _emission(reads, targets, COVERED_MAX)
            rows.append(row)
            disputed.append(dispute)
            covered.append(sum(r.get("coverage", 0.0) > PIECE_VISIBLE_MAX for r in reads))
        pending.clear()

    # Nur die Vielfachen von `stride` in [lo, hi]: der Decoder baut die uebrigen gar nicht erst
    # und faltet die Drehung mit der aus den Metadaten zusammen.
    read = range(-(-lo // stride) * stride, hi + 1, stride)
    for idx, frame in Recording(video).take(read, rotate):
        # The quad of the ply the phone stood on around here — the board may have moved since.
        ply_at = max(0, int(np.searchsorted(np.array(phone), idx, side="right")) - 1)
        pending.append((idx, crops_for_frame(frame, corners_of[ply_at], prof, out_size=out_size)))
        if len(pending) >= 8:
            flush()
        if progress and len(sampled) >= told + 300:
            told = len(sampled)
            print(f"  retime {idx}/{hi} frames read", flush=True)
    flush()
    if not sampled:
        raise ValueError("no frame inside the plies' windows could be read")
    emissions = np.stack(rows)
    allowed = np.array([[w[0] <= t <= w[1] for w in win] for t in sampled])
    path = viterbi(emissions, allowed)
    plies = retime_plies(sampled, path, phone, stride,
                         review_frames(sampled, path, covered, np.stack(disputed)))
    agreement = _agreement(emissions, sampled, plies)
    result = {
        "name": name,
        "model": str(model_dir),
        "stride": stride,
        "frames_read": len(sampled),
        "agreement": agreement,
        "moved": sum(p.frame != p.frame_phone for p in plies),
        "collapsed": [p.ply for p in plies if p.held == 0],
        "covered_pictures": [p.ply for p in plies if (p.review_covered or 0) > 0],
        "disputed": [p.ply for p in plies if (p.disputed or 0) > 0],
        "plies": [p.__dict__ for p in plies],
        "written": False,
    }
    weak = [p.ply for p in plies if p.held > 0 and (p.margin or 0.0) < WEAK_MARGIN]
    entered = sum(1 for p in plies if p.held > 0)
    result["weak"] = weak
    if refused(weak, entered):
        result["refused"] = (f"{len(weak)} of {entered} plies read weakly (< {WEAK_MARGIN}): the reads do not match "
                             f"the record — candidate left as the phone timed it")
        return result
    if write:
        _write_candidate(name, candidate, plies, result, fps)
        result["boards"] = _write_boards(game_dir(name) / "frames", video, rotate, plies, corners_of,
                                         profile, crop_border_px(profile), BOARD_ENCODE)
        result["written"] = True
    return result


def refused(weak: list[int], entered: int) -> bool:
    """More than WEAK_SHARE weak plies, or nothing entered at all — the record and the board disagree."""
    return entered == 0 or len(weak) > WEAK_SHARE * entered


def _agreement(emissions: np.ndarray, sampled: list[int], plies: list[Retimed]) -> float:
    """How clearly the entry frames prefer their position over the one before — the refusal gate.
    Each entered ply keeps its own margin (`Retimed.margin`), so a refusal names the plies that failed."""
    margins = []
    for p in plies:
        if p.held == 0:
            continue
        t = sampled.index(p.frame)
        p.margin = round(float(np.clip((emissions[t, p.ply] - emissions[t, p.ply - 1]) / ADVANCE_COST, 0.0, 1.0)), 3)
        margins.append(p.margin)
    return float(np.median(margins)) if margins else 0.0


def _write_candidate(name: str, candidate: dict, plies: list[Retimed], result: dict, fps: float) -> None:
    from .realgames import game_dir

    for move, p in zip(candidate["moves"], plies, strict=True):
        move["frame_phone"] = p.frame_phone
        move["frame"] = p.frame
        move["t"] = round(p.frame / fps, 3)
        move["held"] = p.held
        move["frame_review"] = p.frame_review
        move["review_covered"] = p.review_covered
        move["disputed"] = p.disputed
        if p.margin is not None:
            move["margin"] = p.margin
    candidate.setdefault("source", {})["retime"] = {
        "model": Path(result["model"]).name, "stride": result["stride"], "frames_read": result["frames_read"],
        "agreement": round(result["agreement"], 3), "moved": result["moved"], "collapsed": result["collapsed"],
        "weak": result["weak"],
    }
    path = game_dir(name) / "candidate.json"
    tmp = path.with_suffix(".json.tmp")
    try:
        tmp.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def staged_name(out: Path, idx: int) -> Path:
    """Der Zwischenname beim Umhaengen. Die Endung bleibt `.webp`, weil `cv2.imwrite` den Codec
    daran waehlt und `<stem>.webp.tmp` mit "could not find a writer" abbricht."""
    return out / f"{idx:06d}.tmp.webp"


def stage_board(out: Path, idx: int, image, encode: list) -> tuple[Path, Path]:
    # TODO: das False von `imwrite` fiel stumm aus `staged` — und die Aufraeumschleife loeschte
    # dem Frame gleich darauf sein ALTES Bild. Die Confirm-Ansicht meldete dann "kein Bild",
    # ohne dass irgendwo ein Fehler stand.
    tmp = staged_name(out, idx)
    if not cv2.imwrite(str(tmp), image, encode):
        raise OSError(f"could not write review board: {tmp}")
    return tmp, out / f"{idx:06d}.webp"


def stale_boards(out: Path):
    """Die alten Bilder — ohne die gerade gestagten: `*.webp` trifft `<stem>.tmp.webp` mit."""
    return (p for p in out.glob("*.webp") if p.suffixes[-2:] != [".tmp", ".webp"])


def _write_boards(out: Path, video: Path, rotate, plies: list[Retimed], corners_of: list, profile,
                  pad: int, encode: list) -> int:
    """The rectified board at every ply's review frame ±REVIEW_CONTEXT, replacing the phone-timed set."""
    from .calibration import warp_padded
    from .recording import Recording

    out.mkdir(parents=True, exist_ok=True)
    # `staged_name`, nicht `<stem>.webp.tmp`: cv2 waehlt den Codec an der ENDUNG und lehnt `.tmp`
    # ab — der Schreiber starb dann bei der ersten Datei (gefunden 2026-09-15).
    wanted: dict[int, int] = {}
    for i, p in enumerate(plies):
        for k in range(-REVIEW_CONTEXT, REVIEW_CONTEXT + 1):
            wanted.setdefault((p.frame_review if p.frame_review is not None else p.frame) + k, i)
    size = profile.board_size
    last = max(wanted)
    # Neben die alten, umgehaengt wird ZULETZT (wie `_write_candidate`): erst alles zu loeschen und
    # dann neu zu dekodieren liess einen Dekoder-Abbruch ohne jeden Review-Satz zurueck.
    staged: list[tuple[Path, Path]] = []
    try:
        for idx, frame in Recording(video).take(wanted, rotate):
            if idx > last:
                break
            padded = warp_padded(frame, profile, corners_of[wanted[idx]], pad)
            staged.append(stage_board(out, idx, padded[pad:pad + size, pad:pad + size], encode))
        for old in stale_boards(out):
            old.unlink()
        for tmp, dst in staged:
            os.replace(tmp, dst)
    finally:
        for tmp, _dst in staged:
            tmp.unlink(missing_ok=True)
    return len(staged)
