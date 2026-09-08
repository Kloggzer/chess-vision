"""Confident-learning label audit into `data/reports/audit-flags.jsonl` (CONCEPT.md 4.2;
method and limits in `docs/cross-labeling-literature.md`). DERIVED, never a ledger: every run
rewrites the file whole. The class space is the proposal file's — 13c rows carry no `occluded`
and can never flag it, while in 14c rows it is a candidate whose threshold comes from the human
ledger, since no FEN label is ever `occluded` and Eqn. 2 needs a support set."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

from . import config
from .labeling import load_corrections

INTERIM_FOLD = 0  # No folds in the interim: the proposals rotate models per session instead.
Cell = tuple[str, str, str]


def ledger_labels(*paths: Path) -> dict[Cell, str]:
    """The label of record over several ledgers, later files winning — and the cells no view may
    ask again. Folded in one dict so a retraction in `corrections.jsonl` reopens what
    `reviewed.jsonl` decided."""
    out: dict[Cell, str] = {}
    for path in paths:
        load_corrections(path, out)
    return out


def read_proposals(path: Path) -> tuple[str | None, list[dict], list[str]]:
    """The model that wrote `model-reads.jsonl`, every row carrying `probs`, and its CLASSES.

    Reads the old `_thresholds` header too: a session whose reads predate `realgames model-read`
    still audits, it just came from a producer that also guessed at occlusion.
    """
    rows = []
    with Path(path).open(encoding="utf-8") as fh:
        head = json.loads(fh.readline() or "{}")
        model = head.get("_model") or head.get("_thresholds", {}).get("model")
        classes = list(head.get("_classes") or [])
        for line in fh:
            row = json.loads(line)
            if "probs" in row:
                rows.append(row)
    return model, rows, classes


def class_thresholds(cells: list[tuple[str, dict[str, float]]]) -> dict[str, float]:
    """Eqn. 2: `t_j` is the mean self-confidence over the cells whose label of record is `j`.

    A class absent from a sparse `probs` dict is below `occluded_model.PROB_FLOOR` and counts as
    0.0 — that lowers `t_j` for a class the model reads badly, which is the formula's intent.
    """
    total: dict[str, float] = {}
    count: dict[str, int] = {}
    for label, probs in cells:
        total[label] = total.get(label, 0.0) + probs.get(label, 0.0)
        count[label] = count.get(label, 0) + 1
    return {label: total[label] / count[label] for label in count}


def confident_class(probs: dict[str, float], thresholds: dict[str, float],
                    known: set[str] | None = None) -> str | None:
    """Eqn. 1: the argmax over the classes that reach their own threshold, `None` if none does.

    The given label competes in that argmax — dropping it would flag every cell where any other
    class passes. `known` bounds it to what the MODEL outputs (`docs/audit-classes.md`).
    """
    items = thresholds.items() if known is None else [(c, t) for c, t in thresholds.items() if c in known]
    passing = [(probs.get(c, 0.0), c) for c, t in items if probs.get(c, 0.0) >= t]
    return max(passing)[1] if passing else None


def session_flags(rows: list[dict], judged: dict[Cell, str], *, model: str, ts: str,
                  classes: list[str] | None = None) -> list[dict]:
    """Every undecided cell of one session whose confident class differs from its label of record.

    A decided cell still carries the thresholds — Eqn. 2 is estimated over all labels, and the
    human's `occluded` is the only support that class ever gets.
    """
    labels = [judged.get((r["session_id"], r["frame"], r["square"]), r["fen_label"]) for r in rows]
    thresholds = class_thresholds(list(zip(labels, (r["probs"] for r in rows), strict=True)))
    flags = []
    known = set(classes) if classes else None
    for row, label in zip(rows, labels, strict=True):
        predicted = confident_class(row["probs"], thresholds, known)
        if predicted is None or predicted == label:
            continue
        if (row["session_id"], row["frame"], row["square"]) in judged:
            continue
        prob = row["probs"].get(predicted, 0.0)
        flags.append({
            "session_id": row["session_id"],
            "frame": row["frame"],
            "square": row["square"],
            "fen_label": row["fen_label"],
            "predicted": predicted,
            "prob": round(prob, 4),
            # Die 14. Spalte des Modells — ein EIGENER Sigmoid, keine Klasse. Die Matte bleibt
            # das Mass (`--visible`); dies ist die zweite Meinung, wo SAM eine Hand uebersah.
            **({"model_cov": row["cov"]} if row.get("cov") is not None else {}),
            "margin": round(prob - row["probs"].get(label, 0.0), 4),
            "fold": INTERIM_FOLD,
            "model": model,
            "ts": ts,
        })
    return flags


def circularity_reason(model: str, session_id: str) -> str | None:
    """`None` unless the named model was trained on this session (checked when it is on disk).

    `propose_occluded` already refused that pair at generation time; this re-reads the split in
    case it changed since, and stays silent when the run dir is gone — the header is the record.
    """
    from .occluded_model import check_not_circular

    run = Path(model)
    if not run.is_dir():
        return None
    try:
        check_not_circular(run, session_id)
    except (ValueError, OSError, KeyError) as e:
        return str(e)
    return None


def write_flags(path: Path, rows: list[dict]) -> Path:
    """One flag per line, in the order given. Atomic (tmp + `os.replace`) like the proposals."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path


def write_summary(path: Path, summary: dict) -> Path:
    """The sidecar the Audit lane and `/corpus` read instead of the whole flag file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(json.dumps(summary) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path


def is_occupancy(flag: dict) -> bool:
    """Does this flag dispute whether the square is OCCUPIED, rather than by what?"""
    return (flag["fen_label"] == "empty") != (flag["predicted"] == "empty")


def visible_cells(session_dir: Path) -> set[tuple[str, str]]:
    """(frame, square) of every cell this recording's matte measured as COVERED, over the cut.

    The matte is the only place coverage lives — `model-reads.jsonl` never carried it.
    """
    from .labeling import MATTE_DIRTY, read_matte

    return {(frame, square)
            for frame, cells in read_matte(session_dir).items()
            for square, value in cells.items() if value > MATTE_DIRTY}


def newest_input(rec: Path) -> str | None:
    """Der juengste Produzenten-Zeitstempel — Matten und Modell-Lesarten. Ist er neuer als
    `written_at`, sind die Flags veraltet und die Lane zeigt Arbeit, die es nicht mehr gibt."""
    ts = [p.stat().st_mtime for pat in ("*/matte.jsonl", "*/model-reads.jsonl")
          for p in rec.glob(pat)] if rec.exists() else []
    return datetime.fromtimestamp(max(ts), UTC).isoformat() if ts else None


def audit_flags(occupancy_only: bool = False, visible_only: bool = False) -> dict:
    """Rewrite both audit files from every proposal file that names the model it was scored with.

    A file without one is skipped and said so — non-circularity would rest on nothing. What the
    two narrowings cost: `docs/cross-labeling-literature.md`, "Narrowing a foreign proposer".
    """
    rec = config.DATA.recordings
    # BOTH ledgers: `reviewed.jsonl` is where the lane's "FEN stimmt" lands, and without it every
    # confirmation comes back as a flag on the next run — the lane could never be worked empty.
    # Corrections last, so a retraction there reopens what a confirmation closed.
    ledgers = (sorted(rec.glob("*/reviewed.jsonl")) + sorted(rec.glob("*/corrections.jsonl"))
               if rec.exists() else [])
    judged = ledger_labels(*ledgers)
    ts = datetime.now(UTC).isoformat()
    flags: list[dict] = []
    sessions: list[str] = []
    skipped: list[dict] = []
    scanned = 0
    dropped_covered = 0
    for path in sorted(rec.glob("*/model-reads.jsonl")):
        model, rows, classes = read_proposals(path)
        reason = None
        if not rows:
            reason = "no row carries `probs` — nothing to audit"
        elif not model:
            reason = "no model in the header — provenance and non-circularity unknown"
        else:
            reason = circularity_reason(model, rows[0]["session_id"])
        if reason:
            skipped.append({"session": path.parent.name, "reason": reason})
            continue
        scanned += len(rows)
        sessions.append(rows[0]["session_id"])
        found = session_flags(rows, judged, model=model, ts=ts, classes=classes)
        if visible_only:
            covered = visible_cells(path.parent)
            kept = [f for f in found if (f["frame"], f["square"]) not in covered]
            dropped_covered += len(found) - len(kept)
            found = kept
        flags += found
    dropped_type = 0
    if occupancy_only:
        kept = [f for f in flags if is_occupancy(f)]
        dropped_type = len(flags) - len(kept)
        flags = kept
    flags.sort(key=lambda f: (-f["margin"], f["session_id"], f["frame"], f["square"]))
    per_class: dict[str, int] = {}
    for flag in flags:
        per_class[flag["fen_label"]] = per_class.get(flag["fen_label"], 0) + 1
    summary = {
        "flags": len(flags),
        "cells_scanned": scanned,
        "scope": "occupancy" if occupancy_only else "all",
        "coverage_scope": "visible" if visible_only else "any",
        "dropped_by_scope": dropped_type,
        "dropped_as_covered": dropped_covered,
        "sessions": sessions,
        "skipped": skipped,
        "per_class": dict(sorted(per_class.items(), key=lambda kv: (-kv[1], kv[0]))),
        "written_at": ts,
        # Die Lane hat am 26.8. einen Stand vom 21.8. ausgeliefert: die Matten kamen erst am
        # 22./23., also hatte der Coverage-Filter beim Bauen nichts zum Wegwerfen und es lagen
        # Handzellen mit cov 0,93 drin. Der Zeitstempel macht das nachpruefbar.
        "inputs_newest_at": newest_input(rec),
    }
    path = write_flags(config.DATA.reports / "audit-flags.jsonl", flags)
    write_summary(config.DATA.reports / "audit-flags.summary.json", summary)
    return {"path": path, **summary}
