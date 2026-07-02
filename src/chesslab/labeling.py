"""Stufe 3 (Teil 2) — Slicing & Labeling.

Reiner, wiederholbarer Schritt: liest Session-Logs, entzerrt jeden Frame, schneidet die 64
Square-Crops und labelt jeden Crop **aus der geloggten FEN** (Stufe 2). Bei geänderten
Crop-Parametern einfach neu ausführen — ohne neu aufzunehmen.

Die zentrale Geometrie (`square_to_crop_box`, `warp_board`) wird aus `calibration.py`
wiederverwendet, damit Stufe 1/3 und die spätere Inferenz-App identisch croppen.
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

from . import config, geometry3d, photometric
from .calibration import (
    CalibrationProfile,
    board_corners_for_frame,
    crop_border_px,
    load_profile,
    make_tracker,
    square_to_crop_box,
    warp_board_for_crops,
)
from .imgops import resize_keep_aspect
from .state import GameState

_FILES = "abcdefgh"


def parse_out_size(s: str) -> tuple[int, int]:
    """'96x128' -> (96, 128) = (W, H)."""
    try:
        w, h = s.lower().split("x")
        return int(w), int(h)
    except Exception as e:  # noqa: BLE001
        raise ValueError(f"ungültige out-size {s!r}, erwartet WxH (z.B. 96x128).") from e


def square_color(square: str) -> str:
    """Deterministische Feldfarbe: a1=dark. (file_idx + rank_idx) % 2."""
    sq = square.strip().lower()
    file_idx = _FILES.index(sq[0])
    rank_idx = int(sq[1]) - 1
    return "dark" if (file_idx + rank_idx) % 2 == 0 else "light"


def all_squares() -> list[str]:
    return [f"{f}{r}" for r in range(1, 9) for f in _FILES]


# Rückwärtskompatibler Alias: `resize_keep_aspect` lebt jetzt in `imgops` (löst den
# Import-Zyklus mit `geometry3d`). Wer noch `labeling._resize_keep_aspect` referenziert,
# funktioniert unverändert weiter.
_resize_keep_aspect = resize_keep_aspect


def crop_square(board_warped, square: str, profile: CalibrationProfile, out_size: tuple[int, int]):
    """Einen Square-Crop aus dem **geborderten** Brett (`warp_board_for_crops`) schneiden.

    `square_to_crop_box` liefert die Box in Spielfeld-Koordinaten [0, board_size]; da der Daten-Warp
    um `B = crop_border_px(profile)` verschoben ist, wird die Box um +B in den Canvas verschoben.
    So haben Randfelder echten Inhalt für ihre pad_side/pad_up-Erweiterung. Überstand wird schwarz
    aufgefüllt (konstante Geometrie über alle 64 Felder), dann verzerrungsfrei auf out_size skaliert.
    """
    x0, y0, x1, y1 = square_to_crop_box(square, profile, clamp=False)
    b = crop_border_px(profile)
    x0, y0, x1, y1 = x0 + b, y0 + b, x1 + b, y1 + b
    if x1 <= x0:
        x1 = x0 + 1
    if y1 <= y0:
        y1 = y0 + 1
    H, W = board_warped.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    region = board_warped[ya:yb, xa:xb]
    pad_t, pad_b, pad_l, pad_r = ya - y0, y1 - yb, xa - x0, x1 - xb
    if pad_t or pad_b or pad_l or pad_r:       # überstehende Bereiche schwarz auffüllen
        region = cv2.copyMakeBorder(region, pad_t, pad_b, pad_l, pad_r,
                                    cv2.BORDER_CONSTANT, value=(0, 0, 0))
    return resize_keep_aspect(region, out_size)


def crops_for_frame(frame, corners, profile: CalibrationProfile, *, geometry: str = "warp",
                    photometry: str = "none",
                    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
                    out_size: tuple[int, int] | None = None,
                    with_meta: bool = False):
    """64 Crops (Reihenfolge `all_squares()`) für EINEN Frame — IDENTISCH zum Trainings-Slice:
    gebordeter warp ODER box3d, dann `preprocess_crop`. Single Source für die Live-Inferenz, damit
    das Modell live exakt denselben Crop sieht wie beim Training.

    `with_meta=True`: gibt (crops, meta) zurück, wobei meta = {"used_box3d": list[bool]} je Feld
    angibt, ob der Crop über box3d (True) oder warp (False) erzeugt wurde. Wird von `slice_session`
    für die `pose_ok`-Kennzeichnung im Manifest konsumiert (De-Duplikation, Rework 01).
    """
    out = tuple(out_size) if out_size else tuple(profile.crop.out_size)
    box3d = geometry == "box3d"
    cell = profile.board_size / 8.0
    pose = None
    up = 1.0
    K = dist = None
    if box3d:
        fh, fw = frame.shape[:2]
        K, dist = geometry3d.intrinsics(profile, (fw, fh))
        pose = geometry3d.estimate_pose(corners, K, dist, profile.board_size, profile.margin)
        if pose is not None:
            up = geometry3d.up_sign(pose[0], pose[1])
    ph_units = float(piece_height_cells) * cell
    ps_units = config.EXP_BOX3D_PAD_SIDE_CELLS * cell
    warped = warp_board_for_crops(frame, profile, corners)   # warp-Crop + box3d-Fallback
    crops = []
    used_box3d = []
    for square in all_squares():
        crop = None
        is_box3d = False
        if box3d and pose is not None:
            crop = geometry3d.crop_square_3d(frame, square, K, dist, pose[0], pose[1], profile,
                                             piece_height_units=ph_units, pad_side_units=ps_units,
                                             up=up, out_size=out)
            is_box3d = crop is not None
        if crop is None:
            crop = crop_square(warped, square, profile, out)
        if photometry != "none":
            crop = photometric.preprocess_crop(crop, photometry)
        crops.append(crop)
        used_box3d.append(is_box3d)
    return (crops, {"used_box3d": used_box3d}) if with_meta else crops


def variant_of_run(run_dir: Path) -> tuple[str, str, float]:
    """(geometry, photometry, piece_height_cells) eines Modell-Runs — aus seinem Dataset-Manifest
    (die Crops tragen ihre Preprocessing-Tags). So weiß die Live-Inferenz, wie sie croppen muss.
    Default (warp, none) für ungetaggte Alt-Manifeste."""
    cfg_p = run_dir / "config.json"
    cfg = json.loads(cfg_p.read_text(encoding="utf-8")) if cfg_p.exists() else {}
    ds = cfg.get("dataset")
    if ds:
        from .dataset_build import dataset_dir
        man = dataset_dir(ds) / "manifest.jsonl"
    else:
        man = config.DATA.manifests / "squares.jsonl"
    if man.exists():
        for line in man.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                return (r.get("geometry", "warp"), r.get("photometry", "none"),
                        float(r.get("piece_height_cells", config.EXP_PIECE_HEIGHT_CELLS)))
    return ("warp", "none", config.EXP_PIECE_HEIGHT_CELLS)


def read_session_meta(session_dir: Path) -> dict:
    import yaml

    p = session_dir / "session.yaml"
    if not p.exists():
        raise FileNotFoundError(f"session.yaml fehlt in {session_dir}")
    with p.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def read_log(session_dir: Path) -> list[dict]:
    p = session_dir / "log.jsonl"
    if not p.exists():
        raise FileNotFoundError(f"log.jsonl fehlt in {session_dir}")
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.strip():
            out.append(json.loads(line))
    return out


def _effective_profile(profile: CalibrationProfile, pad_up, pad_side) -> CalibrationProfile:
    prof = copy.deepcopy(profile)
    if pad_up is not None:
        prof.crop.pad_up = float(pad_up)
    if pad_side is not None:
        prof.crop.pad_side = float(pad_side)
    return prof


def _replace_session_in_manifest(manifest_path: Path, session_id: str, new_lines: list[str]) -> None:
    """Vorherige Zeilen dieser Session entfernen, dann neue anhängen (idempotentes Re-slice)."""
    kept: list[str] = []
    if manifest_path.exists():
        for line in manifest_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            if json.loads(line).get("session_id") != session_id:
                kept.append(line)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", encoding="utf-8") as fh:
        for ln in kept + new_lines:
            fh.write(ln + "\n")


def load_corrections(path: Path) -> dict[tuple[str, str, str], str]:
    """Menschliche Label-Korrekturen laden: {(session_id, frame, square): label}. Letzte gewinnt."""
    out: dict[tuple[str, str, str], str] = {}
    p = Path(path)
    if not p.exists():
        return out
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        c = json.loads(line)
        out[(c["session_id"], str(c["frame"]), c["square"])] = c["label"]
    return out


def upsert_corrections(items: list[dict], path: Path) -> int:
    """Korrekturen (session_id, frame, square, label) mergen und neu schreiben. Gibt Gesamtzahl zurück."""
    merged = load_corrections(path)
    for it in items:
        merged[(it["session_id"], str(it["frame"]), it["square"])] = it["label"]
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for (sid, frame, square), label in merged.items():
            fh.write(json.dumps({"session_id": sid, "frame": frame, "square": square,
                                 "label": label, "ts": datetime.now(timezone.utc).isoformat()},
                                ensure_ascii=False) + "\n")
    return len(merged)


def slice_session(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    manifest_path: Path,
    squares_root: Path,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    label_overrides: dict[tuple[str, str, str], str] | None = None,
    geometry_mode: str = "warp",
    photometry: str = "none",
    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
) -> dict:
    """Eine Session slicen: 64 Crops je geloggter Stellung + Manifest-Zeilen. Pure I/O.

    `label_overrides` ersetzt das FEN-abgeleitete Label je (session, frame, square) durch
    eine menschliche Korrektur (Web-Relabel). Gibt die Anzahl angewandter Overrides zurück.

    `geometry_mode`: "warp" (Top-Down-Crop, Baseline) oder "box3d" (3D-Box aus dem Originalframe
    via Pose pro Frame). `photometry`: deterministischer Filter (none/clahe/grayworld/gamma), wird
    IN die PNGs gebacken (Train/Inference-Parität). `piece_height_cells`: Extrusionshöhe für box3d.
    """
    session_dir = Path(session_dir)
    meta = read_session_meta(session_dir)
    session_id = meta["session_id"]
    log = read_log(session_dir)

    prof = _effective_profile(profile, pad_up, pad_side)
    out = tuple(out_size) if out_size else tuple(prof.crop.out_size)
    box3d = geometry_mode == "box3d"

    new_lines: list[str] = []
    n_crops = 0
    n_overrides = 0
    n_skipped = 0
    n_fallback = 0   # box3d: Felder, die auf warp zurückfielen (Pose/Projektion fehlgeschlagen)
    tracker = make_tracker(prof)   # pro Session: aus Profil geseedet, Marker pro Frame gehalten
    for entry in log:
        frame_path = session_dir / entry["frame"]
        frame = cv2.imread(str(frame_path))
        if frame is None:
            raise FileNotFoundError(f"Frame nicht lesbar: {frame_path}")
        corners = entry.get("corners")
        if not corners:
            # Fallback (Sessions ohne gespeicherte Ecken): pro Frame aus den Markern.
            corners = board_corners_for_frame(frame, prof, tracker)
            if corners is None:
                n_skipped += 1   # keine Marker im Frame -> nicht verwertbar, überspringen
                continue

        # crops_for_frame als Single Source (Rework 01: De-Duplikation).
        crops, meta = crops_for_frame(
            frame, corners, prof, geometry=geometry_mode, photometry=photometry,
            piece_height_cells=piece_height_cells, out_size=out, with_meta=True)
        used_box3d_list = meta["used_box3d"]
        if box3d:
            n_fallback += sum(1 for v in used_box3d_list if not v)

        explicit = entry.get("labels")          # Inference/Active-Learning: explizite 64 Labels
        gs = None if explicit else GameState(entry["fen"])
        frame_stem = Path(entry["frame"]).stem  # '0007'
        squares = all_squares()
        for i, square in enumerate(squares):
            label = explicit.get(square, "empty") if explicit else gs.label_for(square)
            if label_overrides:
                corrected = label_overrides.get((session_id, frame_stem, square))
                if corrected is not None and corrected != label:
                    label = corrected
                    n_overrides += 1
            crop = crops[i]
            out_dir = squares_root / label
            out_dir.mkdir(parents=True, exist_ok=True)
            fname = f"{session_id}_{frame_stem}_{square}.png"
            cv2.imwrite(str(out_dir / fname), crop)
            row = {
                "path": str((out_dir / fname).as_posix()),
                "label": label,
                "session_id": session_id,
                "frame": frame_stem,
                "ply": entry.get("ply"),
                "square": square,
                "square_color": square_color(square),
                "fen": entry["fen"],
                "out_size": [out[0], out[1]],
                "geometry": geometry_mode,
                "photometry": photometry,
                "ts": datetime.now(timezone.utc).isoformat(),
            }
            if box3d:
                row["piece_height_cells"] = float(piece_height_cells)
                row["pose_ok"] = used_box3d_list[i]
            new_lines.append(json.dumps(row, ensure_ascii=False))
            n_crops += 1

    _replace_session_in_manifest(manifest_path, session_id, new_lines)
    return {"session_id": session_id, "frames": len(log), "crops": n_crops,
            "overrides": n_overrides, "skipped": n_skipped, "fallback": n_fallback}


# --- CLI-Ebene (löst Defaults aus config) ---------------------------------------------

def _session_ids_with_logs() -> list[str]:
    root = config.DATA.sessions
    if not root.exists():
        return []
    return sorted(p.name for p in root.iterdir() if (p / "log.jsonl").exists())


def variant_paths(variant_tag: str | None) -> tuple[Path, Path]:
    """(manifest_path, squares_root) für eine Variante. `None` = heutige Default-Pfade; sonst
    `data/manifests/squares__<tag>.jsonl` + `data/squares__<tag>/`, sodass Varianten koexistieren."""
    if not variant_tag:
        return config.DATA.manifests / "squares.jsonl", config.DATA.squares
    suffix = f"__{variant_tag}"
    return config.DATA.manifests / f"squares{suffix}.jsonl", config.DATA.root / f"squares{suffix}"


def run_slice(
    session: str | None = None,
    slice_all: bool = False,
    profile: str | None = None,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: str | None = None,
    preview: str | None = None,
    geometry_mode: str = "warp",
    photometry: str = "none",
    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
    variant_tag: str | None = None,
) -> int:
    out_size_t = parse_out_size(out_size) if out_size else None

    if preview:
        return _preview_session(preview, profile)

    if slice_all:
        sids = _session_ids_with_logs()
    elif session:
        sids = [session]
    else:
        print("[FAIL] --session <id> oder --all angeben.")
        return 1
    if not sids:
        print("Keine Sessions mit log.jsonl gefunden.")
        return 0

    manifest_path, squares_root = variant_paths(variant_tag)
    corrections = load_corrections(config.DATA.corrections)  # menschliche Relabels anwenden
    rc = 0
    for sid in sids:
        session_dir = config.DATA.sessions / sid
        try:
            meta = read_session_meta(session_dir)
            prof = load_profile(profile or meta["profile"])
            stats = slice_session(
                session_dir, profile=prof, manifest_path=manifest_path, squares_root=squares_root,
                pad_up=pad_up, pad_side=pad_side, out_size=out_size_t, label_overrides=corrections,
                geometry_mode=geometry_mode, photometry=photometry, piece_height_cells=piece_height_cells,
            )
            extra = f" ({stats['overrides']} Korrekturen)" if stats.get("overrides") else ""
            if stats.get("skipped"):
                extra += f" [{stats['skipped']} Frames ohne Marker übersprungen]"
            if stats.get("fallback"):
                extra += f" [{stats['fallback']} box3d->warp Fallbacks]"
            print(f"[OK] {sid}: {stats['frames']} Frames -> {stats['crops']} Crops{extra}.")
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {sid}: {e}")
            rc = 1
    return rc


def _preview_session(session_id: str, profile: str | None) -> int:
    """Debug: erste Stellung slicen und Label vs. sichtbaren Crop nebeneinander zeigen."""
    session_dir = config.DATA.sessions / session_id
    try:
        meta = read_session_meta(session_dir)
        prof = load_profile(profile or meta["profile"])
        log = read_log(session_dir)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] {e}")
        return 1
    if not log:
        print("[FAIL] leeres Log.")
        return 1
    frame = cv2.imread(str(session_dir / log[0]["frame"]))
    corners = log[0].get("corners") or board_corners_for_frame(frame, prof, make_tracker(prof))
    if corners is None:
        print("[FAIL] keine Marker im Frame erkannt.")
        return 1
    warped = warp_board_for_crops(frame, prof, corners)   # gleicher geborderte Crop-Pfad wie slice
    gs = GameState(log[0]["fen"])
    out = tuple(prof.crop.out_size)
    cols = []
    import numpy as np

    for square in ("a8", "e1", "d8", "h1"):
        crop = crop_square(warped, square, prof, out)
        canvas = np.zeros((out[1] + 24, out[0], 3), dtype=np.uint8)
        canvas[:out[1]] = crop
        cv2.putText(canvas, f"{square}:{gs.label_for(square)}", (2, out[1] + 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1, cv2.LINE_AA)
        cols.append(canvas)
    cv2.imshow("chesslab slice --preview (q schließt)", np.hstack(cols))
    while (cv2.waitKey(20) & 0xFF) != ord("q"):
        pass
    cv2.destroyAllWindows()
    return 0
