"""Frames aus einem Turntable-VIDEO für die Photogrammetrie extrahieren.

RealityScan akzeptiert zwar Videos direkt, extrahiert dabei aber stur nach Zeitraster —
inklusive bewegungsunscharfer Frames, die die Rekonstruktion verschlechtern. Dieser Weg
ist besser: das Video in N Fenster teilen und je Fenster den SCHÄRFSTEN Frame nehmen
(Varianz des Laplacian), als `NNN.jpg` in den Scan-Ordner — danach läuft die bewährte
Foto-Pipeline (RealityScan → `synth prepare`) unverändert.
"""

from __future__ import annotations

from pathlib import Path


def sharpness(gray) -> float:
    """Schärfemaß: Varianz des Laplacian (hoch = scharf, niedrig = verwackelt/unscharf)."""
    import cv2

    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def next_index(out_dir: Path) -> int:
    """Nächste freie NNN.jpg-Nummer (hängt an bestehende Ringe an, wie der Scan-Tab)."""
    existing = [int(p.stem) for p in Path(out_dir).glob("[0-9]*.jpg") if p.stem.isdigit()]
    return (max(existing) + 1) if existing else 0


def extract_frames(video: Path, out_dir: Path, n: int = 120, quality: int = 95,
                   crop: tuple[int, int, int, int] | None = None,
                   downscale_for_score: int = 640) -> dict:
    """Die schärfsten `n` Frames gleichmäßig über das Video verteilt extrahieren.

    `crop` (x0,y0,x1,y1) schneidet den STATISCHEN Hintergrund weg — für Turntable-
    Photogrammetrie zwingend, sonst richtet RealityScan die Kameras am statischen Raum aus
    und „annulliert" die Drehung (gleiche Regel wie beim Foto-Scan-Tab).
    Rückgabe: {"written", "start_index", "total_frames", "mean_sharpness", "min_sharpness"}.
    """
    import cv2
    import numpy as np

    video = Path(video)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise ValueError(f"Video nicht lesbar: {video}")
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    if total <= 0:
        cap.release()
        raise ValueError(f"Video hat keine zählbaren Frames: {video}")
    n = max(1, min(n, total))

    # Fenstergrenzen: Frame i gehört zu Fenster floor(i * n / total).
    best: list[tuple[float, np.ndarray | None]] = [(-1.0, None)] * n
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok or frame is None:
            break
        if crop:
            x0, y0, x1, y1 = crop
            frame = frame[y0:y1, x0:x1]
            if frame.size == 0:
                cap.release()
                raise ValueError(f"Crop {crop} liegt außerhalb des Videos")
        w = min(n - 1, i * n // total)
        g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if g.shape[1] > downscale_for_score:            # Score auf verkleinertem Bild (schnell)
            s = downscale_for_score / g.shape[1]
            g = cv2.resize(g, (downscale_for_score, max(1, int(g.shape[0] * s))))
        score = sharpness(g)
        if score > best[w][0]:
            best[w] = (score, frame)
        i += 1
    cap.release()

    start = next_index(out_dir)
    written, scores = 0, []
    for score, frame in best:
        if frame is None:
            continue
        cv2.imwrite(str(out_dir / f"{start + written:03d}.jpg"), frame,
                    [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
        written += 1
        scores.append(score)
    return {"written": written, "start_index": start, "total_frames": total,
            "mean_sharpness": round(sum(scores) / len(scores), 1) if scores else 0.0,
            "min_sharpness": round(min(scores), 1) if scores else 0.0}
