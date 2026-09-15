"""2.5D compositing: occluder plates over a recorded board, with exact per-cell coverage.

Why the occluder goes onto the SOURCE frame, why size is not randomised, and why coverage is cut
by `crops_for_frame`: `docs/occluder-plates.md`.
"""
from __future__ import annotations

from collections import deque
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from queue import Full, Queue
from threading import Event, Thread

import cv2
import numpy as np

from .calibration import CalibrationProfile, GridMesh, mesh_from_lines
from .labeling import _replace_session_in_manifest, all_squares, crops_for_frame
from .occluders import WORK_SIZE
from .realgames import measured_board_size

#: The occluder clips were shot on the SAME rig as the board, only with the camera moved closer —
#: so the plate already carries the right size and only needs that one distance correction, not a
#: free scale. Set by eye against the board footage; the jitter covers the rest.
RIG_SCALE = 0.60
SCALE_JITTER = (0.85, 1.15)
#: Frames between two boards. The turntable turns 0.43 deg/frame, so this is ~3.4 deg —
#: the historical ingest step, and below it consecutive crops shift by under a pixel.
#: Grad je Frame auf dem Drehteller — steht so in der CLI-Hilfe von `occluders composite`.
DEG_PER_FRAME = 0.43
STRIDE = 8


@dataclass(frozen=True)
class Placement:
    """Where one tile landed, kept so a composite can be reproduced from its manifest row."""

    tile: str
    centre: tuple[int, int]
    scale: float
    angle: float
    flipped: bool


#: Threads fuer Encode und Platte. Acht ist gemessen: 4 -> 52 ms, 8 -> 33, 16 -> 36 je 64 Crops.
WRITE_THREADS = 8
#: Vorlauf und Lader fuer die Kacheln. Gemessen auf 4K: 1 Lader 130 ms je Brett, 4 -> 120, 8 -> 117;
#: 12 Bretter Vorlauf brachten nichts mehr und kosteten auf 1080p 20 % (`docs/ingest-speed.md`).
TILE_LOOKAHEAD = 6
TILE_WORKERS = 8
#: Dateinamen, die den Clip NICHT benennen — dann steht die Kennung im Ordner darueber.
GENERIC_STEMS = frozenset({"video", "clip", "input", "out"})


def clip_id(video: Path) -> str:
    """Woran ein Clip im geteilten Pool erkennbar ist — Dateiname, sonst der Ordner darueber.

    Vier Quellen heissen `video.mp4`: ueber den Stem benannt wurden sie alle zu `comp-video`, und
    die Crops ueberschrieben sich auf der Platte, weil auch der Dateiname daraus kommt.
    """
    return video.parent.name if video.stem in GENERIC_STEMS else video.stem


def plate_long_side(plate_dir: Path, fallback: int = max(WORK_SIZE)) -> int:
    """Die längste Kante der Aufnahme, aus der die Kacheln geschnitten wurden — aus dem Index.

    Deklariert, nicht geraten: bis 2026-08-23 lagen Kacheln auf `WORK_SIZE`, danach in
    Quellauflösung. Wer das verwechselt, setzt jede Hand um den Faktor zwei falsch ins Bild.
    """
    import json

    for name in ("occluders.json", "plates.json"):
        path = plate_dir / name
        if not path.is_file():
            continue
        sizes = [max(e["source"]) for e in json.loads(path.read_text(encoding="utf-8"))
                 if isinstance(e, dict) and e.get("source")]
        if sizes:
            return max(sizes)
    return fallback


def load_tiles(plate_dir: Path) -> list[Path]:
    return sorted(plate_dir.glob("*.webp"))


def read_tile(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """(bgr, alpha 0..255) of one RGBA plate, cropped to what the alpha actually covers.

    A plate is the whole stage, and the hand may sit in a corner of it — scaling the TILE then
    makes the occluder itself far too small, which is what the first composites showed.
    """
    t = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if t is None or t.shape[2] != 4:
        raise ValueError(f"{path} is not an RGBA plate")
    x0, y0, w, h = cv2.boundingRect((t[:, :, 3] > 8).view(np.uint8))
    if w and h:
        t = t[y0:y0 + h, x0:x0 + w]
    return np.ascontiguousarray(t[:, :, :3]), np.ascontiguousarray(t[:, :, 3])


def place(shape: tuple[int, int], tile: np.ndarray, alpha: np.ndarray, native: float,
          rng: np.random.Generator, target: tuple[int, int, int, int]
          ) -> tuple[np.ndarray, np.ndarray, tuple[int, int], Placement]:
    """Drop one tile at a random pose over `target` (x0,y0,x1,y1) -> `(rgb, alpha, (x0,y0), pose)`.

    Zurueck kommt NUR der Kasten der Kachel plus sein Versatz: ins Vollformat gewarpt kostete sie
    32 ms Warp und 308 ms Ueberblendung fuer Pixel, von denen 99 % unberuehrt bleiben (4K, 2026-08-23).
    """
    h, w = shape
    scale = native * float(rng.uniform(*SCALE_JITTER))
    angle = float(rng.uniform(0, 360))
    flip = bool(rng.integers(2))
    if flip:
        tile, alpha = tile[:, ::-1], alpha[:, ::-1]

    th, tw = tile.shape[:2]
    m = cv2.getRotationMatrix2D((tw / 2, th / 2), angle, scale)
    x0, y0, x1, y1 = target
    cx, cy = int(rng.integers(x0, max(x0 + 1, x1))), int(rng.integers(y0, max(y0 + 1, y1)))
    m[0, 2] += cx - tw / 2
    m[1, 2] += cy - th / 2

    # Die vier gedrehten Ecken sagen den Kasten exakt — ihn hinterher im Alpha zu suchen waere
    # teurer als das, was er spart.
    pts = np.array([[0, 0], [tw, 0], [tw, th], [0, th]], np.float64)
    dst = pts @ m[:, :2].T + m[:, 2]
    bx0, by0 = int(max(0, np.floor(dst[:, 0].min()))), int(max(0, np.floor(dst[:, 1].min())))
    bx1, by1 = int(min(w, np.ceil(dst[:, 0].max()))), int(min(h, np.ceil(dst[:, 1].max())))
    if bx1 <= bx0 or by1 <= by0:
        return (np.zeros((0, 0, 3), np.uint8), np.zeros((0, 0), np.uint8), (0, 0),
                Placement(tile="", centre=(cx, cy), scale=scale, angle=angle, flipped=flip))

    m[0, 2] -= bx0
    m[1, 2] -= by0
    size = (bx1 - bx0, by1 - by0)
    rgb = cv2.warpAffine(tile, m, size, flags=cv2.INTER_LINEAR)
    a = cv2.warpAffine(alpha, m, size, flags=cv2.INTER_LINEAR)
    return rgb, a, (bx0, by0), Placement(tile="", centre=(cx, cy), scale=scale, angle=angle,
                                         flipped=flip)


def over(base: np.ndarray, rgb: np.ndarray, alpha: np.ndarray, at: tuple[int, int]) -> None:
    """Blendet die Kachel AN ORT UND STELLE in `base` — nur ueber ihren eigenen Kasten.

    In uint8 durch OpenCV statt in float32 durch numpy: 16,6 ms je Kachel gegen 4,6 (gemessen
    2026-08-23). Es rundet dabei anders, verschiebt den Pixel also um bis zu einen Grauwert.
    """
    if alpha.size == 0:
        return
    x0, y0 = at
    h, w = alpha.shape
    box = base[y0:y0 + h, x0:x0 + w]
    a = cv2.cvtColor(alpha, cv2.COLOR_GRAY2BGR)
    cv2.add(cv2.multiply(box, cv2.bitwise_not(a), scale=1 / 255),
            cv2.multiply(rgb, a, scale=1 / 255), dst=box)


def mesh_for(frame: np.ndarray, corners, profile: CalibrationProfile) -> GridMesh | None:
    """The board's OWN grid lines, measured on the clean frame before anything is laid over it.

    ArUco only says where the board is; cutting at the nominal eighth bakes in the lens' barrel.
    Measured first, because an occluder covers the very lines the fit reads.
    """
    from .realgames import grid_line_fracs

    return mesh_from_lines(grid_line_fracs(frame, corners, profile.board_size, profile))


def composite_frame(frame: np.ndarray, corners, profile: CalibrationProfile,
                    plates: list[tuple[str, np.ndarray, np.ndarray]],
                    rng: np.random.Generator, rig: float = RIG_SCALE,
                    mesh: GridMesh | None = None, plate_long: int = max(WORK_SIZE)
                    ) -> tuple[list[np.ndarray], dict[str, float], list[Placement]]:
    """One board frame with occluders on it: (64 crops, coverage per square, what was placed).

    Coverage is cut by the SAME `crops_for_frame` call as the image, so the label region IS the
    crop region — mesh and pads included.
    """
    h, w = frame.shape[:2]
    # Wie groß die Kachel in DIESEM Frame sein muss: das Verhältnis der beiden Aufnahmen, dann die
    # Abstandskorrektur des Aufbaus. `plate_long` sagt, worin die Kachel geschnitten wurde — bis
    # 2026-08-23 war das immer `WORK_SIZE`, weil sie mit der Maske heruntergerechnet wurde.
    native = (max(h, w) / plate_long) * rig
    pts = np.array(corners, np.float32)
    target = (int(pts[:, 0].min()), int(pts[:, 1].min()),
              int(pts[:, 0].max()), int(pts[:, 1].max()))
    out = frame.copy()
    acc = np.zeros((h, w), np.uint8)
    used: list[Placement] = []
    for name, tile, alpha in plates:
        rgb, a, at, p = place((h, w), tile, alpha, native=native, rng=rng, target=target)
        over(out, rgb, a, at)
        if a.size:
            x0, y0 = at
            box = acc[y0:y0 + a.shape[0], x0:x0 + a.shape[1]]
            np.maximum(box, a, out=box)
        used.append(Placement(tile=name, centre=p.centre, scale=p.scale,
                              angle=p.angle, flipped=p.flipped))

    if mesh is None:
        mesh = mesh_for(frame, corners, profile)
    crops = crops_for_frame(out, corners, profile, out_size=tuple(profile.crop.out_size), mesh=mesh)
    grey = cv2.cvtColor(acc, cv2.COLOR_GRAY2BGR)
    masks = crops_for_frame(grey, corners, profile, out_size=tuple(profile.crop.out_size), mesh=mesh)
    cov = {sq: float(m.mean()) / 255.0 for sq, m in zip(all_squares(), masks, strict=True)}
    return crops, cov, used


def read_forward(video: Path, stride: int, depth: int = 3) -> Iterator[tuple[int, np.ndarray]]:
    """Jeden `stride`-ten Frame liefern — vorwaerts gelesen, in einem eigenen Thread.

    `grab` spart den uebersprungenen Frames die BGR-Umrechnung: 235 ms je genutztem Frame mit
    `cap.set`, 39 so. Auch warum die Hardware verliert, misst `docs/ingest-speed.md`.
    """
    q: Queue = Queue(maxsize=depth)
    stop = Event()

    def offer(item) -> bool:
        # Ein blockierendes `q.put` hielt den Strang fuer immer fest, wenn der Verbraucher den
        # Generator vorzeitig verliess — das `VideoCapture` kam nie zurueck. Wie in `tile_stream`.
        while not stop.is_set():
            try:
                q.put(item, timeout=0.2)
                return True
            except Full:
                continue
        return False

    def pump() -> None:
        cap = cv2.VideoCapture(str(video))
        idx = 0
        try:
            while not stop.is_set() and cap.grab():
                ok, frame = cap.retrieve() if idx % stride == 0 else (False, None)
                if ok and not offer((idx, frame)):
                    break
                idx += 1
        finally:
            cap.release()
            offer(None)

    Thread(target=pump, daemon=True).start()
    try:
        while (item := q.get()) is not None:
            yield item
    finally:
        stop.set()
        while not q.empty():
            q.get_nowait()


def tile_stream(tiles: list[Path], per_frame: tuple[int, int], seed: int, stride: int,
                depth: int = TILE_LOOKAHEAD, workers: int = TILE_WORKERS
                ) -> Iterator[tuple[int, list[tuple[str, np.ndarray, np.ndarray]]]]:
    """Die Kacheln der naechsten Bretter schon dekodiert bereithalten — endlos, eine Liste je Brett.

    Von der Platte kostet eine Kachel 89 ms, mehr als das Brett selbst; alle 1440 im Speicher
    waeren 18,7 GB. Zieht aus einem EIGENEN Strang, damit das Vorauslaufen die Posen nicht dreht.
    """
    q: Queue = Queue(maxsize=depth)
    stop = Event()

    def pump() -> None:
        names = np.array(tiles, dtype=object)
        try:
            with ThreadPoolExecutor(max_workers=workers) as pool:
                idx = 0
                while not stop.is_set():
                    # An der FRAME-ID, nicht an einer Ordnungszahl: ein uebersprungenes Brett
                    # darf die Kacheln aller folgenden nicht verschieben, und ein zweiter Lauf
                    # mit anderem `stride` trifft fuer dieselbe ID dieselbe Wahl.
                    rng = np.random.default_rng([seed, idx])
                    k = int(rng.integers(per_frame[0], per_frame[1] + 1))
                    picks = rng.choice(names, size=k, replace=False) if k else []
                    q.put((idx, [(Path(x).name, pool.submit(read_tile, Path(x))) for x in picks]))
                    idx += stride
        except BaseException as e:  # noqa: BLE001 - re-raised in the consumer, see below
            # A dead pump used to leave the consumer on `q.get()` forever: the composite build
            # hung with no message. The failure travels the queue and is raised where it is read.
            q.put(e)

    Thread(target=pump, daemon=True).start()
    try:
        while True:
            item = q.get()
            if isinstance(item, BaseException):
                raise item
            idx, jobs = item
            yield idx, [(name, *job.result()) for name, job in jobs]
    finally:
        stop.set()
        while not q.empty():
            q.get_nowait()


def median_mesh(cap, profile: CalibrationProfile, samples: int = 40) -> GridMesh | None:
    """One mesh for the whole clip: the per-line median of what the frames measure.

    A single frame's fit puts the back-rank lines where the tall pieces are (see
    `sessions._repair_mesh_outliers`), and a turntable clip has no other frame to borrow from.
    """
    from .calibration import detect_board_corners_aruco
    from .realgames import grid_line_fracs

    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fits = []
    for i in np.linspace(0, n - 1, samples).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, frame = cap.read()
        corners = detect_board_corners_aruco(frame) if ok else None
        g = grid_line_fracs(frame, corners, profile.board_size, profile) if corners else None
        if g:
            fits.append(g)
    if not fits:
        return None
    keys = set(fits[0]).intersection(*(set(f) for f in fits))
    return mesh_from_lines({k: [float(np.median([f[k][i] for f in fits])) for i in range(9)]
                            for k in keys})


def labels_of(fen: str) -> dict[str, str]:
    """`square -> class` for a static position, in `config.CLASSES` spelling."""
    import chess

    board = chess.Board(fen)
    out = {}
    for sq in all_squares():
        p = board.piece_at(chess.parse_square(sq))
        out[sq] = ("w" if p.color else "b") + p.symbol().upper() if p else "empty"
    return out


PROVENANCE_FILE = "composite.json"


def _write_provenance(out_root: Path, clip: str, entry: dict) -> None:
    """Eine Zeile je Clip im Pool — mehrere Clips teilen sich einen Pool."""
    import json

    path = out_root / PROVENANCE_FILE
    all_of = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    all_of[clip] = entry
    path.write_text(json.dumps(all_of, indent=1), encoding="utf-8")


def read_provenance(pool: Path) -> dict:
    """Was der Pixel-Pass braucht, je `split_group`."""
    import json

    path = Path(pool) / PROVENANCE_FILE
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def composed_boards(video: Path, plate_dir: Path | None = None, *, board_size: int = 0,
                    out_size: tuple[int, int] = (128, 128), stride: int = STRIDE,
                    tiles_per_frame: tuple[int, int] = (0, 2), seed: int = 42,
                    profile_name: str = "desktop", stats: dict | None = None,
                    pad_side: float | None = None
                    ) -> Iterator[tuple[int, list, dict[str, float], CalibrationProfile]]:
    """Jedes Brett des Clips, fertig komponiert: (frame_id, 64 Crops, coverage, Profil).

    DIE Schleife — wer Crops braucht, nimmt sie hier und schreibt selbst. Ohne `plate_dir`
    liegt nichts auf dem Brett: dann ist es schlicht Video -> 64 Crops.
    """
    from dataclasses import replace

    from .calibration import (
        CropParams,
        compute_homography,
        detect_board_corners_aruco,
        load_profile,
    )

    tiles = load_tiles(plate_dir) if plate_dir else []
    if plate_dir and not tiles:
        raise ValueError(f"no plates in {plate_dir}")
    plate_long = plate_long_side(plate_dir) if plate_dir else max(WORK_SIZE)
    base = load_profile(profile_name)
    cap = cv2.VideoCapture(str(video))
    prof = mesh = None
    skipped = 0
    plates = tile_stream(tiles, tiles_per_frame, seed + 1, stride) if tiles else None
    try:
        for idx, frame in read_forward(video, stride):
            corners = detect_board_corners_aruco(frame)
            if corners is None:
                skipped += 1
                continue
            if prof is None:
                # Die QUELLE setzt die Brettgroesse, nicht eine Konstante: 1280 fest bedeutete auf
                # den 1080p-Clips einen Warp um 1,93x hoch, dessen erfundene Pixel der 80er Schnitt
                # sofort wieder wegwarf (62 % des Pretrains, gemessen 2026-08-23).
                board_size = board_size or measured_board_size(corners)
                prof = replace(base, frame_size=(frame.shape[1], frame.shape[0]),
                               board_size=board_size, image_corners=corners,
                               homography=compute_homography(corners, board_size, base.margin),
                               crop=CropParams(cell=board_size / 8,
                                               pad_side=(base.crop.pad_side if pad_side is None
                                                         else pad_side), out_size=out_size))
                mesh = median_mesh(cap, prof)
            frame_mesh = mesh if mesh is not None else mesh_for(frame, corners, prof)
            # Bis zur passenden ID vorspulen — Bretter ohne Marker lassen ihre Kacheln liegen.
            batch = []
            if plates is not None:
                batch_idx, batch = next(plates)
                while batch_idx < idx:
                    batch_idx, batch = next(plates)
            if batch:
                # Die Pose haengt an der FRAME-ID, nicht an der Aufrufreihenfolge.
                crops, cov, _ = composite_frame(frame, corners, prof, batch,
                                                np.random.default_rng([seed, idx]), mesh=frame_mesh,
                                                plate_long=plate_long)
            else:
                crops = crops_for_frame(frame, corners, prof, out_size=out_size, mesh=frame_mesh)
                cov = dict.fromkeys(all_squares(), 0.0)
            yield idx, crops, cov, prof
    finally:
        cap.release()
        if plates is not None:
            plates.close()
        if stats is not None:
            stats["skipped"] = skipped


def recut_frames(prov: dict, wanted: dict[int, list[str]], out_size: tuple[int, int]
                 ) -> Iterator[tuple[int, str, np.ndarray]]:
    """Die gewuenschten Felder der gewuenschten Frames neu schneiden — aus der QUELLE.

    Der Pool traegt 128 px fuer den Menschen; das Modell bekommt seine Zielgroesse mit genau
    einem Resample statt ueber den Pool skaliert.
    """
    for idx, crops, _cov, _prof in composed_boards(
            Path(prov["video"]), None if prov.get("clean") else Path(prov["plate_dir"]),
            board_size=prov["board_size"],
            out_size=out_size, stride=prov["stride"],
            tiles_per_frame=tuple(prov["tiles_per_frame"]), seed=prov["seed"],
            profile_name=prov["profile"], pad_side=prov.get("pad_side")):
        if idx not in wanted:
            continue
        by_square = dict(zip(all_squares(), crops, strict=True))
        for sq in wanted[idx]:
            yield idx, sq, by_square[sq]


def build_from_video(video: Path, plate_dir: Path, out_root: Path, manifest: Path, fen: str,
                     board_size: int = 0, out_size: tuple[int, int] = (128, 128),
                     stride: int = STRIDE, tiles_per_frame: tuple[int, int] = (0, 2),
                     seed: int = 42, profile_name: str = "desktop",
                     blocks: int = 6, clean: bool = False,
                     angle_buckets: int = 0, deg_per_frame: float = DEG_PER_FRAME,
                     pad_side: float | None = None) -> dict:
    """A whole clip into crops with TWO targets per cell: the piece, and how much is covered.

    `blocks`, `angle_buckets`, `clean`: `docs/turntable-ingest.md`. `pad_side` uebersteuert das
    Profil und muss zum Rand der ECHTEN Crops passen — sonst zwei Rahmungen im Training.
    """
    import json

    from .labeling import CROP_ENCODE, CROP_SUFFIX, square_color

    if not clean and not load_tiles(plate_dir):
        return {"error": f"no plates in {plate_dir}"}
    probe = cv2.VideoCapture(str(video))
    n = int(probe.get(cv2.CAP_PROP_FRAME_COUNT))
    probe.release()
    labels = labels_of(fen)
    stem_sid = f"comp-{clip_id(video)}"
    rows, written = [], 0
    for label in set(labels.values()):
        (out_root / label).mkdir(parents=True, exist_ok=True)

    pending: deque = deque()
    pool = ThreadPoolExecutor(max_workers=WRITE_THREADS)
    stats: dict = {}
    prof = None
    try:
        for idx, crops, cov, prof in composed_boards(
                video, None if clean else plate_dir, board_size=board_size, out_size=out_size,
                stride=stride, pad_side=pad_side,
                tiles_per_frame=tiles_per_frame, seed=seed, profile_name=profile_name, stats=stats):
            stem = f"{idx:06d}"
            if angle_buckets:
                per_turn = 360.0 / deg_per_frame
                b = int((idx % per_turn) / (per_turn / angle_buckets)) % angle_buckets
                sid = f"{stem_sid}-a{b:02d}"
            else:
                sid = f"{stem_sid}-{min(blocks - 1, idx * blocks // max(1, n)):02d}"
            for sq, crop in zip(all_squares(), crops, strict=True):
                label = labels[sq]
                path = out_root / label / f"{sid}_{stem}_{sq}{CROP_SUFFIX}"
                pending.append(pool.submit(cv2.imwrite, str(path), crop, CROP_ENCODE))
                rows.append({"path": path.as_posix(), "label": label,
                             "coverage": round(cov[sq], 4), "session_id": sid,
                             "split_group": stem_sid, "frame": stem, "square": sq,
                             "square_color": square_color(sq), "fen": fen,
                             "out_size": list(out_size), "pad_side": prof.crop.pad_side})
                written += 1
            # Der Rueckstau ist die Bremse, nicht der Puffer: haelt man alle Crops eines Clips fuer
            # einen Lauf am Ende, liegen 60k davon im Speicher (~3 GB). Vier Bretter reichen, weil
            # Encode (33 ms je Brett auf acht Threads) unter der Rechnung (250 ms) bleibt.
            while len(pending) > 4 * 64:
                if not pending.popleft().result():
                    raise OSError("Cannot write composite crop")
        while pending:
            if not pending.popleft().result():
                raise OSError("Cannot write composite crop")
    finally:
        pool.shutdown(wait=True)
    skipped = stats.get("skipped", 0)
    board_size = prof.board_size if prof is not None else board_size
    # Upsert by clip, not overwrite: a second clip into the same pool used to discard the first
    # one's rows while its crops stayed on disk — which is why every clip got its own tag.
    _replace_session_in_manifest(manifest, stem_sid,
                                 [json.dumps(r) for r in rows], field="split_group")
    # Die Herkunft je Clip, damit ein Pixel-Pass die Komposition NEU schneiden kann statt
    # sie aus dem 128er Pool zu skalieren. Reproduzierbar, weil Kachel und Pose an der
    # Frame-ID haengen (`docs/data-pipeline.md` 3.1).
    _write_provenance(out_root, stem_sid, {
        "video": Path(video).resolve().as_posix(), "fen": fen, "seed": int(seed),
        "board_size": int(board_size), "stride": int(stride), "blocks": int(blocks),
        "angle_buckets": int(angle_buckets), "clean": bool(clean),
        "tiles_per_frame": list(tiles_per_frame), "profile": profile_name,
        "plate_dir": Path(plate_dir).resolve().as_posix(),
        "pad_side": pad_side if pad_side is not None else (prof.crop.pad_side if prof else None),
    })
    covered = sum(r["coverage"] > 0.5 for r in rows)
    return {"session_id": stem_sid, "blocks": blocks, "frames": len(rows) // 64, "crops": written, "skipped": skipped,
            "covered_over_half": covered, "share": round(covered / max(1, written), 4)}
