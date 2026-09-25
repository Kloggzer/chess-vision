"""SAM 3 cuts the hand out — `alpha_sam3` is the matte the labels come from."""

from __future__ import annotations

import gc
import json
import os
import sys
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from threading import Thread
from time import perf_counter, sleep

import cv2
import numpy as np

from . import provenance
from .cell_rule import PIECE_VISIBLE_MAX
from .ioutil import append_rows, read_jsonl, stamp_of, write_rows_guarded
from .labeling import all_squares, crops_for_frame, usable_board
from .session_store.log import read_log_rows
from .session_store.matte import effective_rows, measured_coverage, read_matte
from .session_store.names import log_path, matte_path, mattes_dir
from .session_store.paths import read_session_meta

SAM3_REPO = "facebook/sam3"

# One pass per concept, unioned; all reuse the same vision embedding.
CONCEPTS = (
    "person",
    "hand",
    "arm",
    "sleeve",
    "wristwatch",
)

# `zone` ist keine Grenze mehr: `MAX_ZONE_FRAC` trennte nach FLAECHE, nicht nach Irrtum, und feuerte
# im Korpus nie.




_SAM3: tuple = ()


def _timestamp() -> str:
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")


def _rate(frames: int, started: float) -> tuple[float, float]:
    if frames <= 0:
        return 0.0, 0.0

    elapsed = perf_counter() - started

    if elapsed <= 0:
        return 0.0, 0.0

    return frames / elapsed, elapsed / frames


def _sam3():
    """SAM 3, loaded lazily and separately from the cheap frame scanner."""
    global _SAM3

    if not _SAM3:
        import torch
        from transformers import Sam3Model, Sam3Processor

        device = "cuda" if torch.cuda.is_available() else "cpu"

        processor = Sam3Processor.from_pretrained(SAM3_REPO)
        model = Sam3Model.from_pretrained(SAM3_REPO).to(device).eval()

        _SAM3 = (
            processor,
            model,
            device,
        )

    return _SAM3




def unload_models() -> None:
    """Release cached Torch models before interpreter shutdown, instead of leaving GBs of
    CUDA-backed objects for it to dismantle.
    """
    global _SAM3

    _SAM3 = ()

    gc.collect()

    try:
        import torch
    except ImportError:
        return

    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _win_ancestors(pid: int) -> list[tuple[int, str]]:
    """(pid, image) up the tree, via Toolhelp — no third-party dependency for one lookup."""
    import ctypes
    from ctypes import wintypes

    class Entry(ctypes.Structure):
        _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
                    ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.c_void_p),
                    ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
                    ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", ctypes.c_long),
                    ("dwFlags", wintypes.DWORD), ("szExeFile", ctypes.c_char * 260)]

    k = ctypes.windll.kernel32
    k.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    snap = k.CreateToolhelp32Snapshot(0x00000002, 0)
    tree: dict[int, tuple[int, str]] = {}
    entry = Entry()
    entry.dwSize = ctypes.sizeof(Entry)
    ok = k.Process32First(snap, ctypes.byref(entry))
    while ok:
        tree[entry.th32ProcessID] = (entry.th32ParentProcessID,
                                     entry.szExeFile.decode("latin-1"))
        ok = k.Process32Next(snap, ctypes.byref(entry))
    k.CloseHandle(snap)

    chain, seen = [], set()
    while pid in tree and pid not in seen:
        seen.add(pid)
        pid, image = tree[pid]
        chain.append((pid, image))
    return chain


def _owner_pid() -> int:
    """The shell that launched us, not the venv shim: `.venv/Scripts/python.exe` re-executes the
    real interpreter and WAITS on it, so watching `getppid()` never fires.
    """
    if sys.platform != "win32":
        return os.getppid()

    for pid, image in _win_ancestors(os.getpid()):
        if image.lower() != "python.exe":
            return pid
    return os.getppid()


def _wait_for_exit(pid: int) -> None:
    """Block until `pid` is gone — Windows waits on a handle, POSIX watches for reparenting."""
    if sys.platform == "win32":
        import ctypes
        from ctypes import wintypes

        k = ctypes.windll.kernel32
        k.OpenProcess.restype = wintypes.HANDLE
        handle = k.OpenProcess(0x00100000, False, pid)          # SYNCHRONIZE
        if handle:
            k.WaitForSingleObject(handle, 0xFFFFFFFF)
            k.CloseHandle(handle)
            return

    while os.getppid() == pid:
        sleep(5.0)


def exit_with_parent() -> None:
    """Drop the weights and go when the launching shell dies — killing the shell does not kill the
    worker, which keeps its VRAM. CHESSLAB_NO_PARENT_WATCH=1 detaches.
    """
    if os.environ.get("CHESSLAB_NO_PARENT_WATCH"):
        return

    owner = _owner_pid()

    def watch() -> None:
        _wait_for_exit(owner)
        unload_models()
        os._exit(1)

    Thread(target=watch, daemon=True).start()




#: Bridges the seam between two concept masks. Small on purpose — a real gap between two fingers
#: is far wider and has to survive.
UNION_CLOSE_PX = 9
#: A hole over this share of the mask is not an artefact: backdrop through a curled hand is 0.77 %.
MAX_HOLE_FRAC = 0.002


def solid(alpha: np.ndarray, close_px: int = UNION_CLOSE_PX,
          max_hole_frac: float = MAX_HOLE_FRAC) -> np.ndarray:
    """Close the seams the UNION leaves, then fill the SMALL things it encloses (uint8 in and out);
    a curled hand encloses backdrop, so size decides.
    """
    m = (alpha > 127).astype(np.uint8)
    if close_px > 1:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_px, close_px))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)
    # 4-connected BACKGROUND against the 8-connected foreground: equal connectivity lets a pocket
    # leak out along a diagonal the mask counts as sealed.
    n, lab, stats, _c = cv2.connectedComponentsWithStats(
        (1 - m).astype(np.uint8), connectivity=4)
    outside = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    cap = max(1.0, m.sum() * max_hole_frac)
    small = [i for i in range(1, n) if i not in outside and stats[i, cv2.CC_STAT_AREA] <= cap]
    if small:
        m[np.isin(lab, small)] = 1
    return np.maximum(alpha, m * 255)


def alpha_sam3(
    board: np.ndarray,
    *,
    fill: bool = True,
) -> tuple[np.ndarray, dict[str, float]]:
    """The union of SAM 3's concept masks, made solid by `solid`; one image encoding for all
    concepts. `fill=False` returns the bare union.
    """
    import torch

    processor, model, device = _sam3()

    rgb = cv2.cvtColor(
        board,
        cv2.COLOR_BGR2RGB,
    )

    alpha = np.zeros(
        board.shape[:2],
        dtype=np.float32,
    )

    hits: dict[str, float] = {}

    image_inputs = processor(
        images=rgb,
        return_tensors="pt",
    ).to(device)

    # The encoder is 77 % of the frame, and under fp16 no coverage cell crosses PIECE_VISIBLE_MAX.
    autocast = torch.autocast("cuda", dtype=torch.float16, enabled=device != "cpu")

    # MATH statt der schnellen SDPA-Kerne: auf torch 2.13.0+rocm10.0.0 vergiftet die Aufmerksamkeit
    # den HIP-Kontext, und der naechste Kernelstart stirbt mit `hipErrorInvalidValue`.
    from torch.nn.attention import SDPBackend, sdpa_kernel

    with torch.inference_mode(), autocast, sdpa_kernel([SDPBackend.MATH]):
        vision_embeds = model.get_vision_features(
            pixel_values=image_inputs["pixel_values"],
        )

        for concept in CONCEPTS:
            text_inputs = processor(
                text=concept,
                return_tensors="pt",
            ).to(device)

            outputs = model(
                vision_embeds=vision_embeds,
                **text_inputs,
            )

            found = processor.post_process_instance_segmentation(
                outputs,
                threshold=0.5,
                mask_threshold=0.5,
                target_sizes=image_inputs["original_sizes"].tolist(),
            )[0]

            if not len(found["masks"]):
                continue

            mask = (
                found["masks"]
                .float()
                .amax(dim=0)
                .cpu()
                .numpy()
                .astype(np.float32, copy=False)
            )

            # Usually already original size (target_sizes); fallback for other Transformers
            # versions.
            if mask.shape != alpha.shape:
                mask = cv2.resize(
                    mask,
                    (board.shape[1], board.shape[0]),
                    interpolation=cv2.INTER_NEAREST,
                )

            np.maximum(
                alpha,
                mask,
                out=alpha,
            )

            hits[concept] = round(
                float(found["scores"].max()),
                3,
            )

    if not fill:
        return alpha, hits

    filled = solid(
        (np.clip(alpha, 0.0, 1.0) * 255.0).astype(np.uint8),
    )

    return filled.astype(np.float32) / 255.0, hits


def alpha_for(session_dir: Path, row: dict) -> Path:
    """Das Alpha, das ZU DIESER ZEILE gehoert: nach einem Upsert liegt SAMs unter `.sam.webp`,
    `<stem>.webp` ist das des Sensors.
    """
    mattes = mattes_dir(session_dir)
    if (row.get("source") or "sam") == "sam":
        own = mattes / f"{row['frame']}.sam.webp"
        if own.is_file():
            return own
    return mattes / f"{row['frame']}.webp"


def coverage_of(
    alpha: np.ndarray,
    entry: dict,
    profile,
) -> dict[str, float]:
    """Per square, cut by the SAME `crops_for_frame` call the image goes through: label region =
    crop region.
    """
    grey = (
        np.clip(alpha, 0.0, 1.0)
        * 255.0
    ).astype(np.uint8)

    board = cv2.cvtColor(
        grey,
        cv2.COLOR_GRAY2BGR,
    )

    masks = crops_for_frame(
        None,
        entry["corners"],
        profile,
        board=board,
        out_size=tuple(profile.crop.out_size),
    )

    return {
        square: round(
            float(mask.mean()) / 255.0,
            4,
        )
        for square, mask in zip(
            all_squares(),
            masks,
            strict=True,
        )
    }


# Eine REIHENFOLGE, keine Behauptung: der Bericht meldet den ganzen dirty-Stapel, dieser Lauf
# arbeitet `occluded` zuerst ab.
ALPHA_REASON = "occluded"


def dirty_pile(rows: list[dict], reason: str = "all") -> set[str]:
    """Die Stems, die eine Matte brauchen; `reason` engt auf EIN `dirty_reason` ein. `matte_status`
    und `alpha_worker` muessen denselben Stapel meinen.
    """
    return {Path(r["board"]).stem for r in rows
            if r.get("board") and r.get("dirty") and not r.get("unusable")
            and (reason == "all" or r.get("dirty_reason") == reason)}


# A hand-corrected alpha lands beside SAM's, never on top: which one a row used is written down.
FIXED_SUFFIX = ".fixed.webp"


def recut_coverage(
    name: str,
    *,
    progress: bool = True,
) -> dict:
    """Die `coverage` aus dem Alpha NEU schneiden, mit der heutigen Geometrie: ein Re-Export
    verschiebt die Ecken und laesst die Zahl stehen. Reine Arithmetik, kein SAM.
    """
    from .calibration import load_profile
    from .session_store.recording import game_dir

    session_dir = game_dir(name)
    path = matte_path(session_dir)
    if not path.exists():
        raise FileNotFoundError(f"{name}: no matte.jsonl — run `occluders alpha-worker` first")
    profile = load_profile(read_session_meta(session_dir)["profile"])
    entries = {Path(e["board"]).stem: e for e in read_log_rows(session_dir) if e.get("board")}
    stamp = stamp_of(path)

    rows: list[dict] = []
    recut = crossed = restamped = 0
    source = provenance.source(session_dir)
    for row in read_jsonl(path):
        alpha_path = alpha_for(session_dir, row)
        entry = entries.get(row["frame"])
        # `alpha: fixed` gehoert dem Menschen, und eine Zeile ohne Coverage ist SAMs Absage.
        if (row.get("coverage") is None or row.get("alpha") == "fixed" or entry is None
                or not alpha_path.exists() or not usable_board(entry, profile)):
            rows.append(row)
            continue
        image = cv2.imread(str(alpha_path), cv2.IMREAD_GRAYSCALE)
        if image is None:
            rows.append(row)
            continue
        fresh = coverage_of(image.astype(np.float32) / 255.0, entry, profile)
        was = row["coverage"]
        # Auch eine unveraenderte Zahl bekommt den neuen Stempel, sonst bliebe die Matte-Sprosse
        # offen.
        current = (row | {"_source": source}) if source else row
        if all(abs(fresh.get(sq, 0.0) - v) <= 1e-4 for sq, v in was.items()):
            restamped += current != row
            rows.append(current)
            continue
        # Nur was die Schwelle UEBERQUERT, aendert ein Label — der Rest ist Nachkommastelle.
        crossed += sum((was.get(sq, 0.0) > PIECE_VISIBLE_MAX) != (v > PIECE_VISIBLE_MAX)
                       for sq, v in fresh.items())
        recut += 1
        rows.append(current | {"coverage": fresh,
                               "cells_over_half": sum(v > 0.5 for v in fresh.values())})
        if progress and recut % 50 == 0:
            print(f"[{_timestamp()}]   {recut} Zeilen neu geschnitten", flush=True)

    if recut or restamped:
        write_rows_guarded(path, rows, stamp,
                           what=f"{name}: matte.jsonl changed while recutting — the alpha worker "
                                "is writing it. Let it finish and run this again.")
    return {"name": name, "frames": len(rows), "recut": recut, "crossed": crossed}


def recut_fixed(
    name: str,
    *,
    progress: bool = True,
) -> dict:
    """Recompute coverage for every frame whose alpha a human corrected, through `coverage_of`: the
    UI hands over pixels, never a coverage number.
    """
    from .calibration import load_profile
    from .session_store.recording import game_dir

    session_dir = game_dir(name)

    path = matte_path(session_dir)

    if not path.exists():
        raise FileNotFoundError(
            f"{name}: no matte.jsonl — "
            "run `occluders alpha-worker` first"
        )

    profile = load_profile(
        read_session_meta(session_dir)["profile"],
    )

    entries = {
        Path(entry["board"]).stem: entry
        for entry in read_log_rows(session_dir)
        if entry.get("board")
    }

    # Rewritten whole while alpha_worker appends: a row added in between would otherwise die.
    stamp = stamp_of(path)

    rows: list[dict] = []
    redone = 0
    source = provenance.source(session_dir)

    for row in read_jsonl(path):
        fixed = (
            mattes_dir(session_dir)
            / f"{row['frame']}{FIXED_SUFFIX}"
        )

        entry = entries.get(
            row["frame"],
        )

        if (
            fixed.exists()
            and entry is not None
            and usable_board(entry, profile)
        ):
            fixed_image = cv2.imread(
                str(fixed),
                cv2.IMREAD_GRAYSCALE,
            )

            if fixed_image is None:
                raise ValueError(
                    f"{name}: corrected alpha is unreadable: {fixed}"
                )

            alpha = (
                fixed_image.astype(np.float32)
                / 255.0
            )

            coverage = coverage_of(
                alpha,
                entry,
                profile,
            )

            row = row | {
                "coverage": coverage,
                "alpha": "fixed",
                "cells_over_half": sum(
                    value > 0.5
                    for value in coverage.values()
                ),
                # Frisch gegen die heutige Geometrie geschnitten, also traegt die Zeile den heutigen
                # Export.
                **({"_source": source} if source else {}),
            }

            redone += 1

            if progress and redone % 10 == 0:
                print(
                    f"[{_timestamp()}] "
                    f"  {redone} corrected alphas recut",
                    flush=True,
                )

        rows.append(row)

    write_rows_guarded(
        path, rows, stamp,
        what=f"{name}: matte.jsonl changed while recutting — the alpha worker "
             "is writing it. Let it finish and run this again; nothing was written.")

    return {
        "path": path,
        "frames": len(rows),
        "recut": redone,
    }


def matte_status(name: str) -> dict:
    """Welche dirty-Frames eine Matte haben, und welche Matten keinen Frame mehr. Eine LUECKE ist
    teuer: ohne Matte gilt Coverage 0 — ein freies Feld.
    """
    from .session_store.recording import game_dir

    session_dir = game_dir(name)
    rows = read_log_rows(session_dir)
    want = dirty_pile(rows)
    # Getrennt: `changed` und `stale` holt nur `--reason all`, als EINE Zahl meldete das ewig eine
    # Luecke.
    standard = dirty_pile(rows, ALPHA_REASON)
    known = {Path(r[k]).stem for r in rows for k in ("board", "frame") if r.get(k)}
    # Ein gemessen-dann-abgesagtes Frame ist keine Matte.
    have = set(read_matte(session_dir))
    return {"session": name, "dirty": len(want), "matted": len(want & have),
            "missing": sorted(standard - have),
            "missing_other": sorted((want - standard) - have),
            "orphans": sorted(have - known)}


def _drop(staged: list[tuple[Path, Path]]) -> None:
    """Die gestapelten Pixel wegwerfen — ein abgebrochener Lauf hinterlaesst nichts."""
    for tmp, _ in staged:
        tmp.unlink(missing_ok=True)


def close_seams(name: str, *, dry_run: bool = False, progress: bool = True) -> dict:
    """Run `solid` over the alphas on disk and recut the coverage it moves; re-running SAM would
    cost hours for the same pixels. `alpha: fixed` rows are the person's and skipped whole.
    """
    from .calibration import load_profile
    from .session_store.recording import game_dir

    session_dir = game_dir(name)
    path = matte_path(session_dir)
    if not path.exists():
        raise FileNotFoundError(f"{name}: no matte.jsonl — run `occluders alpha-worker` first")
    profile = load_profile(read_session_meta(session_dir)["profile"])
    entries = {Path(e["board"]).stem: e for e in read_log_rows(session_dir) if e.get("board")}
    stamp = stamp_of(path)

    raw = read_jsonl(path)
    # Je Frame nur die WIRKSAME Zeile: sonst stapelten zwei Zeilen desselben Frames ZWEIMAL dieselbe
    # `*.tmp.webp`, und das zweite `replace()` starb.
    live_row = effective_rows(raw)

    rows: list[dict] = []
    # Die Pixel gehen in Nachbardateien und werden ZULETZT mit dem Ledger umgehaengt: sonst trugen
    # Alphas neue Pixel und `matte.jsonl` alte `coverage`, und ein zweiter Lauf fand nichts zu tun.
    staged: list[tuple[Path, Path]] = []
    closed = crossed = added = 0
    # Jeder Abbruch raeumt die gestapelten `*.tmp.webp`, sonst zog `straighten_boards` sie gerade.
    try:
        for row in raw:
            if live_row.get(row.get("frame")) is not row:
                rows.append(row)
                continue
            alpha_path = alpha_for(session_dir, row)
            entry = entries.get(row["frame"])
            image = cv2.imread(str(alpha_path), cv2.IMREAD_GRAYSCALE) if alpha_path.exists() else None
            # `alpha: fixed` coverage was cut from the person's `.fixed.webp`. Eine Zeile OHNE
            # `coverage` ist SAMs Absage, keine Messung.
            if (image is None or entry is None or row.get("alpha") == "fixed"
                    or row.get("coverage") is None or not usable_board(entry, profile)):
                rows.append(row)
                continue
            filled = solid(image)
            gained = int((filled > 127).sum() - (image > 127).sum())
            if gained == 0:
                rows.append(row)
                continue
            coverage = coverage_of(filled.astype(np.float32) / 255.0, entry, profile)
            was = row.get("coverage") or {}
            # Only a cell stepping over the loss's threshold moves a LABEL; counted, because
            # coverage is training input.
            crossed += sum((was.get(sq, 0.0) > PIECE_VISIBLE_MAX) != (v > PIECE_VISIBLE_MAX)
                           for sq, v in coverage.items())
            closed += 1
            added += gained
            if not dry_run:
                # `.tmp.webp`, nicht `.webp.tmp`: `imwrite` waehlt den Codec ueber die ENDUNG.
                alpha_tmp = alpha_path.with_name(f"{alpha_path.stem}.tmp{alpha_path.suffix}")
                if not cv2.imwrite(str(alpha_tmp), filled):
                        raise OSError(f"{name}: could not write {alpha_tmp}")
                staged.append((alpha_tmp, alpha_path))
                row = row | {"coverage": coverage,
                             "cells_over_half": sum(v > 0.5 for v in coverage.values())}
            rows.append(row)
            if progress and closed % 25 == 0:
                print(f"[{_timestamp()}]   {closed} alphas closed", flush=True)

        if not dry_run and closed:
            write_rows_guarded(
                path, rows, stamp,
                what=f"{name}: matte.jsonl changed while closing seams — the alpha worker "
                     "is writing it. Let it finish and run this again.")
            # Nur noch Umbenennungen, Millisekunden. Atomar ueber N+1 Dateien ist es nicht (dafuer
            # braeuchte es ein Journal).
            for tmp, final in staged:
                tmp.replace(final)
    except BaseException:
        _drop(staged)
        raise
    return {"name": name, "frames": len(rows), "closed": closed, "px": added,
            "crossed": crossed, "dry_run": dry_run}


def flagged_frames(name: str, *, reported: bool = False, wanted: bool = False,
                   temporal: bool = False) -> set[str] | None:
    """Die Frames, die eine Fahne fuer DIESE Aufnahme meint; `None` heisst: der ganze Stapel. Die
    erste gesetzte Fahne gewinnt.
    """
    from .session_store.recording import game_dir, reported_dirty

    if reported:
        return {f"{index:06d}" for index in reported_dirty(f"rg-{name}")}
    if wanted:
        return {f"{index:06d}" for index in reported_dirty(f"rg-{name}", verdict="matte-wanted")}
    if temporal:
        path = matte_path(game_dir(name))
        return {r["frame"] for r in read_jsonl(path) if r.get("source") == "temporal"}
    return None


def alpha_worker_all(
    names: list[str],
    *,
    limit: int | None = None,
    reason: str = ALPHA_REASON,
    frames_for: Callable[[str], set[str] | None] | None = None,
    progress: bool = True,
) -> dict:
    """Every session in one process, so SAM 3's weights load once; released after the last
    session.
    """
    runs: list[dict] = []
    #: Ohne diese Liste war ein Stapel mit 20 Ausfaellen von einem sauberen Lauf nicht zu
    #: unterscheiden.
    failed: list[dict] = []

    started_all = perf_counter()

    try:
        for index, name in enumerate(
            names,
            1,
        ):
            if progress:
                print(
                    f"[{_timestamp()}] "
                    f"=== {name} ({index}/{len(names)})",
                    flush=True,
                )

            frames = None if frames_for is None else frames_for(name)
            # Ohne Treffer UEBERSPRINGEN: sonst mattet `--reported` alles, wo ein Mensch nichts
            # gemeldet hat.
            if frames_for is not None and not frames:
                continue

            try:
                result = alpha_worker(
                    name,
                    limit=limit,
                    reason=reason,
                    frames=frames,
                    progress=progress,
                )

                runs.append(
                    result
                    | {
                        "session": name,
                    }
                )

            except (
                FileNotFoundError,
                ValueError,
                KeyError,
                OSError,
            ) as exc:
                failed.append({"session": name, "error": f"{type(exc).__name__}: {exc}"})
                print(
                    f"[{_timestamp()}] "
                    f"[ERR] {name}: {exc}",
                    flush=True,
                )

        result = {
            "sessions": len(runs),
            "alphas": sum(
                run["alphas"]
                for run in runs
            ),
            "already": sum(
                run["already"]
                for run in runs
            ),
            "runs": runs,
            "failed": failed,
        }

        if progress:
            total_frames = sum(
                run["frames"]
                for run in runs
            )

            fps, seconds_per_frame = _rate(
                total_frames,
                started_all,
            )

            elapsed = (
                perf_counter()
                - started_all
            )

            print(
                f"[{_timestamp()}] "
                f"=== alpha-worker finished: "
                f"{result['sessions']} sessions, "
                f"{result['alphas']} new alphas, "
                f"{result['already']} already present, "
                f"{total_frames} frames in {elapsed:.1f}s "
                f"({fps:.3f} frames/s, "
                f"{seconds_per_frame:.2f} s/frame)",
                flush=True,
            )

        return result

    finally:
        unload_models()

        if progress:
            print(
                f"[{_timestamp()}] "
                "=== models released",
                flush=True,
            )


def alpha_worker(
    name: str,
    *,
    limit: int | None = None,
    reason: str = ALPHA_REASON,
    frames: set[str] | None = None,
    progress: bool = True,
) -> dict:
    """SAM 3 over a session's dirty pile: one alpha per frame, coverage per square; a kill loses at
    most the current frame. `limit` counts SUCCESSFUL alphas; `frames` ignores pile and limit.
    """
    from .calibration import load_profile
    from .session_store.recording import game_dir

    session_dir = game_dir(name)

    if not log_path(session_dir).exists():
        raise FileNotFoundError(
            f"{name}: no exported session at {session_dir}"
        )

    profile = load_profile(
        read_session_meta(session_dir)["profile"],
    )

    path = matte_path(session_dir)

    rows = read_log_rows(
        session_dir,
    )

    # Der AKTUELLE Stapel, sonst verbraucht eine Matte fuer einen umgestuften Stem `--limit`-Budget.
    # `unusable` (umgefallene Figur, Katze im Bild) mattet SAM auch nicht.
    live = dirty_pile(rows, reason)

    existing_rows = (
        [
            row
            for row in read_jsonl(path)
            if row.get("frame") in live
        ]
        if path.exists()
        else []
    )

    # Every existing row counts as processed, deliberate skips included, or "zone too big" repeats
    # forever.
    done = {
        row["frame"]
        for row in existing_rows
        if row.get("frame")
    }

    # --limit counts usable alphas, per FRAME the effective row: a later refusal is no success.
    successful = {
        frame
        for frame, row in measured_coverage(existing_rows).items()
        if not row.get("skipped")
    }

    # A named frame overrides BOTH filters: a hand the scan missed sits on a `clean` row. The later
    # row wins in `read_matte`, so appending is enough.
    todo = [
        entry
        for entry in rows
        if entry.get("board")
        and Path(entry["board"]).stem in frames
    ] if frames else [
        entry
        for entry in rows
        if entry.get("dirty")
        and not entry.get("unusable")
        and (
            reason == "all"
            or entry.get("dirty_reason") == reason
        )
        and entry.get("board")
        and Path(entry["board"]).stem not in done
    ]

    if limit is not None and not frames:
        target_remaining = max(
            0,
            limit - len(successful),
        )

        todo = todo[
            :target_remaining
        ]

    out_dir = mattes_dir(session_dir)

    out_dir.mkdir(
        exist_ok=True,
    )

    written = 0
    skipped: dict[str, int] = {}
    stamp = provenance.source(session_dir)

    started = perf_counter()

    if progress and not todo:
        print(
            f"[{_timestamp()}] "
            f"  0 frames to process — "
            f"{len(successful)} successful alphas already present",
            flush=True,
        )

    # Der Prozess geht per `os._exit`, die letzte Zeile kann mitten im Puffer abbrechen; blind daran
    # angehaengt wird daraus Korruption MITTENDRIN.
    append_rows(path, [])

    staged: Path | None = None
    try:
        with path.open(
            "a",
            encoding="utf-8",
        ) as file_handle:
            for index, entry in enumerate(
                todo,
                1,
            ):
                stem = Path(
                    entry["board"],
                ).stem

                board_path = (
                    session_dir
                    / entry["board"]
                )

                # Coverage is a training target: an off-scale cut poisons the label, so the row's own
                # numbers decide.
                raster = usable_board(
                    entry,
                    profile,
                )

                board = cv2.imread(
                    str(board_path),
                    cv2.IMREAD_COLOR,
                ) if raster else None

                row = {
                    "frame": stem,
                    "ply": entry.get("ply"),
                    "dirty_reason": entry.get(
                        "dirty_reason",
                    ),
                    # Gegen WELCHEN Export dieses Alpha geschnitten wurde; `chain.ts` vergleicht den
                    # Stempel.
                    **({"_source": stamp} if stamp else {}),
                }

                if board is None:
                    row["skipped"] = (
                        "board unreadable"
                        if raster
                        else "board not the crop raster"
                    )

                else:
                    alpha, hits = alpha_sam3(
                        board,
                    )

                    # Where `alpha_for` looks for a SAM row (`.sam.webp` after an upsert); staged until
                    # the row is on disk, or a kill left new pixels under the old row.
                    matte_file = alpha_for(session_dir, {"frame": stem})
                    staged = out_dir / f"{stem}.sam.tmp.webp"

                    matte = (
                        np.clip(
                            alpha,
                            0.0,
                            1.0,
                        )
                        * 255.0
                    ).astype(
                        np.uint8,
                    )

                    if not cv2.imwrite(
                        str(staged),
                        matte,
                    ):
                        raise OSError(
                            f"{name}: failed to write matte: "
                            f"{matte_file}"
                        )

                    coverage = coverage_of(
                        alpha,
                        entry,
                        profile,
                    )

                    row |= {
                        "concepts": hits,
                        "coverage": coverage,
                        "cells_over_half": sum(
                            value > 0.5
                            for value in coverage.values()
                        ),
                        "zone": round(float((alpha > 0.5).mean()), 4),
                    }

                    written += 1

                if why := row.get("skipped"):
                    skipped[why] = (
                        skipped.get(
                            why,
                            0,
                        )
                        + 1
                    )

                file_handle.write(
                    json.dumps(row)
                    + "\n"
                )

                file_handle.flush()

                if staged is not None:
                    staged.replace(matte_file)
                    staged = None

                if progress and (
                    index % 10 == 0
                    or index == len(todo)
                ):
                    fps, seconds_per_frame = _rate(
                        index,
                        started,
                    )

                    elapsed = (
                        perf_counter()
                        - started
                    )

                    print(
                        f"[{_timestamp()}] "
                        f"  {index}/{len(todo)} frames, "
                        f"{written} alphas, "
                        f"{elapsed:.1f}s "
                        f"({fps:.3f} frames/s, "
                        f"{seconds_per_frame:.2f} s/frame)",
                        flush=True,
                    )
    except BaseException:
        if staged is not None:
            staged.unlink(missing_ok=True)
        raise

    elapsed = (
        perf_counter()
        - started
    )

    return {
        "path": path,
        "frames": len(todo),
        "alphas": written,
        "skipped": skipped,

        "already": len(successful),

        "processed": len(done),

        "seconds": round(
            elapsed,
            3,
        ),
    }