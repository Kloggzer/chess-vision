"""Evaluate 13-class ONNX models on confirmed, labeled real-game session frames."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab.calibration import CalibrationProfile, CropParams, compute_homography  # noqa: E402
from chesslab.labeling import all_squares, crops_for_frame  # noqa: E402
from chesslab.state import GameState  # noqa: E402


class OnnxRunner:
    def __init__(self, run: Path) -> None:
        self.run = run
        self.cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
        self.classes = list(self.cfg["classes"])
        self.class_idx = {name: i for i, name in enumerate(self.classes)}
        self.session = ort.InferenceSession(str(run / "model.onnx"), providers=["CPUExecutionProvider"])
        self.inp = self.session.get_inputs()[0]
        self.out = self.session.get_outputs()[0].name
        self.batch = int(self.inp.shape[0])
        self.height, self.width = int(self.inp.shape[2]), int(self.inp.shape[3])
        self.mean = np.asarray(self.cfg["normalize"]["mean"], np.float32)
        self.std = np.asarray(self.cfg["normalize"]["std"], np.float32)

    def predict(self, crops: list[np.ndarray]) -> np.ndarray:
        batch = np.empty((self.batch, 3, self.height, self.width), np.float32)
        for i, crop in enumerate(crops):
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
            batch[i] = ((rgb - self.mean) / self.std).transpose(2, 0, 1)
        if len(crops) < self.batch:
            batch[len(crops) :] = batch[len(crops) - 1]
        logits = self.session.run([self.out], {self.inp.name: batch})[0]
        return np.argmax(logits[: len(crops)], axis=1)


@dataclass
class Score:
    crops: int = 0
    correct: int = 0
    occupied: int = 0
    piece_correct: int = 0
    phantoms: int = 0
    misses: int = 0
    boards: int = 0
    exact_boards: int = 0
    exact_occupancy_boards: int = 0
    sessions: dict[str, Score] = field(default_factory=dict)

    def add(self, truth: np.ndarray, pred: np.ndarray) -> None:
        occupied_true = truth != 0
        occupied_pred = pred != 0
        self.crops += len(truth)
        self.correct += int(np.sum(truth == pred))
        self.occupied += int(np.sum(occupied_true))
        self.piece_correct += int(np.sum((truth == pred) & occupied_true))
        self.phantoms += int(np.sum(~occupied_true & occupied_pred))
        self.misses += int(np.sum(occupied_true & ~occupied_pred))
        self.boards += 1
        self.exact_boards += int(np.all(truth == pred))
        self.exact_occupancy_boards += int(np.all(occupied_true == occupied_pred))

    def report(self) -> dict:
        return {
            "crops": self.crops,
            "boards": self.boards,
            "crop_accuracy": self.correct / self.crops,
            "occupancy_accuracy": 1.0 - (self.phantoms + self.misses) / self.crops,
            "occupancy_board_accuracy": self.exact_occupancy_boards / self.boards,
            "occupied_piece_accuracy": self.piece_correct / self.occupied,
            "phantoms": self.phantoms,
            "misses": self.misses,
            "exact_boards": self.exact_boards,
        }


def profile_for(candidate: dict, out_size: tuple[int, int]) -> CalibrationProfile:
    geometry = candidate["geometry"]
    crop = (candidate.get("source") or {}).get("crop") or {}
    board_size = int(geometry["board_size"])
    corners = geometry["corners"]
    margin = geometry.get("margin", 0.0)
    return CalibrationProfile(
        profile="phone-eval",
        camera_index=-1,
        frame_size=tuple(int(value) for value in geometry["frame_size"]),
        board_size=board_size,
        image_corners=corners,
        homography=compute_homography(corners, board_size, margin),
        white_pov=True,
        crop=CropParams(
            cell=board_size / 8.0,
            pad_up=float(crop.get("pad_up", 0.0)),
            pad_side=float(crop.get("pad_side", 0.05)),
            out_size=out_size,
        ),
        margin=margin,
    )


def representative_rows(rows: list[dict], per_position: int) -> list[dict]:
    grouped: dict[tuple[int | None, str], list[dict]] = {}
    for row in rows:
        grouped.setdefault((row.get("ply"), row["fen"]), []).append(row)
    selected = []
    for group in grouped.values():
        indices = np.linspace(0, len(group) - 1, min(per_position, len(group)), dtype=int)
        selected.extend(group[index] for index in sorted(set(indices.tolist())))
    return sorted(selected, key=lambda row: row["frame"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", nargs="+", type=Path, required=True)
    parser.add_argument("--sessions", type=Path, default=Path("data/sessions"))
    parser.add_argument("--realgames", type=Path, default=Path("data/realgames"))
    parser.add_argument("--per-position", type=int, default=3)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    runners = [OnnxRunner(run) for run in args.runs]
    if any(runner.classes != runners[0].classes for runner in runners[1:]):
        raise SystemExit("all runs must use the same class order")
    scores = {runner.run.name: Score() for runner in runners}
    squares = all_squares()
    board_count = 0
    for session_dir in sorted(path for path in args.sessions.iterdir() if path.is_dir() and path.name.startswith("rg-")):
        game_name = session_dir.name.removeprefix("rg-")
        candidate_path = args.realgames / game_name / "candidate.json"
        if not candidate_path.exists():
            continue
        candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
        if not candidate.get("confirmed"):
            continue
        profile = profile_for(candidate, (runners[0].width, runners[0].height))
        rows = []
        for line in (session_dir / "log.jsonl").read_text(encoding="utf-8").splitlines():
            if line:
                row = json.loads(line)
                if not row.get("dirty"):
                    rows.append(row)
        rows = representative_rows(rows, args.per_position)
        for row in rows:
            frame = cv2.imread(str(session_dir / row["frame"]))
            if frame is None:
                continue
            crops = crops_for_frame(frame, row["corners"], profile, out_size=(runners[0].width, runners[0].height))
            unknown = set(row.get("unknown_squares") or ())
            keep = [i for i, square in enumerate(squares) if square not in unknown]
            if not keep:
                continue
            state = GameState(row["fen"])
            labels = [state.label_for(squares[i]) for i in keep]
            selected = [crops[i] for i in keep]
            for runner in runners:
                truth = np.asarray([runner.class_idx[label] for label in labels])
                pred = runner.predict(selected)
                score = scores[runner.run.name]
                score.add(truth, pred)
                score.sessions.setdefault(game_name, Score()).add(truth, pred)
            board_count += 1
            if board_count % 250 == 0:
                print(f"scored {board_count} labeled quiet boards", flush=True)

    report = {
        name: {"overall": score.report(), "sessions": {key: value.report() for key, value in score.sessions.items()}}
        for name, score in scores.items()
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({name: value["overall"] for name, value in report.items()}, indent=2))
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
