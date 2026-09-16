"""Stream existing model reads against explicit SAM coverage; never load a model.

This measures sensor agreement, not move correctness or live commit latency.
Missing/incomplete coverage is unknown. Thresholds are experiments, not defaults.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

from chesslab.ioutil import write_json

SQUARES = frozenset(f"{file}{rank}" for rank in range(1, 9) for file in "abcdefgh")


def rows(path):
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            if line.strip():
                yield json.loads(line)


def complete(values):
    return SQUARES <= values.keys() and all(
        isinstance(values[sq], (int, float))
        and math.isfinite(values[sq]) and 0 <= values[sq] <= 1
        for sq in SQUARES
    )


def compare(predicted, measured, threshold, matte_threshold):
    """One complete board, using the most covered square in each sensor."""
    if not complete(predicted) or not complete(measured):
        return "unknown"
    predicted_clear = max(predicted[sq] for sq in SQUARES) <= threshold
    matte_clear = max(measured[sq] for sq in SQUARES) <= matte_threshold
    if predicted_clear:
        return "both_clear" if matte_clear else "false_clear"
    return "false_block" if matte_clear else "both_covered"


def audit_session(directory, thresholds, matte_threshold):
    # Bound memory to one recording's small matte index and one model-read frame.
    # TODO: SAMs ABSAGE (`skipped`, "zone too big") traegt `coverage: null`, und `.get(k, {})`
    # gibt dann `None` zurueck — `complete(None)` starb an `None.keys()` und riss den ganzen Audit
    # mit. Leer statt `None` faellt bei `complete` durch und landet als `unknown` — ungemessen.
    mattes = {str(row["frame"]): (row.get("coverage") or {})
              for row in rows(directory / "matte.jsonl") if "frame" in row}
    result = {str(t): Counter() for t in thresholds}
    current = None
    predicted = {}
    seen = set()
    model = "unknown"
    metadata = {}
    examples = []
    inputs = {name: (directory / name).stat() for name in ["matte.jsonl", "model-reads.jsonl", "log.jsonl"]}
    exported = {Path(row["frame"]).stem: row.get("board")
                for row in rows(directory / "log.jsonl") if "frame" in row}

    def flush():
        if current is None:
            return
        if current in seen:
            raise ValueError(f"noncontiguous frame {current} in {directory}")
        seen.add(current)
        for threshold in thresholds:
            verdict = (compare(predicted, mattes.get(current, {}), threshold, matte_threshold)
                       if current in exported else "not_exported")
            result[str(threshold)][verdict] += 1
            if verdict == "false_clear" and len(examples) < 12:
                examples.append({"frame": current, "board": exported[current], "threshold": threshold,
                                 "model_max": max(predicted.values()),
                                 "matte_max": max(mattes[current].values())})

    for row in rows(directory / "model-reads.jsonl"):
        if "_model" in row:
            model = row["_model"]
            metadata = row
            continue
        if "frame" not in row:
            continue
        frame = str(row["frame"])
        if frame != current:
            flush()
            current, predicted = frame, {}
        square = row.get("square")
        if square in predicted:
            raise ValueError(f"duplicate {frame}/{square} in {directory}")
        if square in SQUARES:
            predicted[square] = row.get("model_cov", row.get("cov"))
    flush()
    for name, before in inputs.items():
        after = (directory / name).stat()
        if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
            raise ValueError(f"input changed during audit: {directory / name}")
    return {"session": directory.name, "model": model, "metadata": metadata,
            "inputs": {name: {"size": stat.st_size, "mtime_ns": stat.st_mtime_ns}
                       for name, stat in inputs.items()},
            "thresholds": result, "disagreement_examples": examples}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recordings", type=Path)
    parser.add_argument("--thresholds", type=float, nargs="+", default=[0.02, 0.05, 0.15])
    parser.add_argument("--matte-threshold", type=float, default=0.01)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if not all(math.isfinite(t) and 0 <= t <= 1 for t in [*args.thresholds, args.matte_threshold]):
        parser.error("coverage thresholds must be finite fractions in [0, 1]")
    sessions = []
    totals = defaultdict(lambda: {str(t): Counter() for t in args.thresholds})
    for directory in sorted(args.recordings.iterdir()):
        if not all((directory / name).is_file() for name in ["matte.jsonl", "model-reads.jsonl", "log.jsonl"]):
            continue
        result = audit_session(directory, args.thresholds, args.matte_threshold)
        sessions.append(result)
        for threshold, counts in result["thresholds"].items():
            totals[result["model"]][threshold].update(counts)
    report = {"matte_threshold": args.matte_threshold, "models": dict(totals), "sessions": sessions}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.out, report)
    print(json.dumps({"sessions": len(sessions), "models": dict(totals)}, indent=2))


if __name__ == "__main__":
    main()
