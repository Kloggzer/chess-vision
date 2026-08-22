"""Find work a conventional profiler cannot call semantically redundant.

The observational audit never caches or changes results: callers attach small stable keys to
expensive work, and a ContextVar-backed report counts repeats, bytes, ranges and call paths.
"""

from __future__ import annotations

import json
import random
import time
import weakref
from collections import Counter, defaultdict
from collections.abc import Hashable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar, Token
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from typing import Any

_ACTIVE: ContextVar[WorkAudit | None] = ContextVar("chesslab_work_audit", default=None)
_SPANS: ContextVar[tuple[str, ...]] = ContextVar("chesslab_work_audit_spans", default=())


def _stable(value: Any) -> Hashable:
    """Turn a small semantic key into a hashable value without inspecting image contents."""
    if value is None or isinstance(value, (str, int, float, bool, bytes)):
        return value
    if isinstance(value, Path):
        return str(value.resolve())
    if isinstance(value, dict):
        return tuple(sorted((str(k), _stable(v)) for k, v in value.items()))
    if isinstance(value, (list, tuple)):
        return tuple(_stable(v) for v in value)
    if isinstance(value, (set, frozenset)):
        return tuple(sorted((_stable(v) for v in value), key=repr))
    raise TypeError(f"work-audit keys must be small semantic values, got {type(value).__name__}")


@dataclass
class _Operation:
    calls: int = 0
    avoidable_calls: int = 0
    total_seconds: float = 0.0
    avoidable_seconds: float = 0.0
    total_bytes: int = 0
    avoidable_bytes: int = 0
    keys: set[Hashable] = field(default_factory=set)
    avoidable_paths: Counter[tuple[str, ...]] = field(default_factory=Counter)


@dataclass(frozen=True)
class _Interval:
    resource: Hashable
    start: int
    end: int
    path: tuple[str, ...]


class WorkAudit:
    """Aggregate semantically repeated operations during one command or fuzzy execution."""

    def __init__(self, **metadata: Any) -> None:
        self.metadata = dict(metadata)
        self._operations: dict[str, _Operation] = defaultdict(_Operation)
        self._intervals: dict[str, list[_Interval]] = defaultdict(list)
        self._objects: dict[int, tuple[weakref.ReferenceType, int]] = {}
        self._next_object_revision = 0
        self._lock = Lock()

    def object_revision(self, value: Any) -> tuple[str, int]:
        """Stable identity while an object lives, without keeping large arrays alive."""
        ident = id(value)
        with self._lock:
            known = self._objects.get(ident)
            if known is not None and known[0]() is value:
                return type(value).__name__, known[1]
            self._next_object_revision += 1
            revision = self._next_object_revision

            def forget(_ref) -> None:
                with self._lock:
                    known_now = self._objects.get(ident)
                    if known_now is not None and known_now[1] == revision:
                        self._objects.pop(ident, None)

            try:
                ref = weakref.ref(value, forget)
            except TypeError:
                # Instrumented image objects (NumPy arrays) support weakrefs. This fallback keeps
                # other native wrappers usable, though their identity can only be process-local.
                return type(value).__name__, ident
            self._objects[ident] = (ref, revision)
            return type(value).__name__, revision

    def record_work(
        self,
        name: str,
        key: Any,
        *,
        seconds: float = 0.0,
        processed_bytes: int = 0,
        relevant: bool = True,
        path: tuple[str, ...] | None = None,
    ) -> None:
        """Record completed work; repeated semantic keys are classified as avoidable."""
        stable_key = _stable(key)
        call_path = path if path is not None else (*_SPANS.get(), name)
        with self._lock:
            op = self._operations[name]
            avoidable = not relevant or stable_key in op.keys
            op.calls += 1
            op.total_seconds += max(0.0, float(seconds))
            op.total_bytes += max(0, int(processed_bytes))
            if avoidable:
                op.avoidable_calls += 1
                op.avoidable_seconds += max(0.0, float(seconds))
                op.avoidable_bytes += max(0, int(processed_bytes))
                op.avoidable_paths[call_path] += 1
            op.keys.add(stable_key)

    def record_interval(
        self, name: str, resource: Any, start: int, end: int,
        *, path: tuple[str, ...] | None = None,
    ) -> None:
        """Record an inclusive requested range; the report measures overlap by resource."""
        lo, hi = sorted((int(start), int(end)))
        call_path = path if path is not None else (*_SPANS.get(), name)
        with self._lock:
            self._intervals[name].append(_Interval(_stable(resource), lo, hi, call_path))

    def report(self) -> dict[str, Any]:
        operations = {}
        dominant: Counter[tuple[str, ...]] = Counter()
        with self._lock:
            for name, op in self._operations.items():
                dominant.update(op.avoidable_paths)
                operations[name] = {
                    "calls": op.calls,
                    "unique_keys": len(op.keys),
                    "avoidable_calls": op.avoidable_calls,
                    "total_seconds": round(op.total_seconds, 6),
                    "avoidable_seconds": round(op.avoidable_seconds, 6),
                    "total_bytes": op.total_bytes,
                    "avoidable_bytes": op.avoidable_bytes,
                }
            intervals = {name: self._interval_report(items)
                         for name, items in self._intervals.items()}
        path = list(dominant.most_common(1)[0][0]) if dominant else []
        return {
            "metadata": dict(self.metadata),
            "operations": operations,
            "intervals": intervals,
            "dominant_avoidable_call_path": path,
        }

    @staticmethod
    def _interval_report(items: list[_Interval]) -> dict[str, int]:
        requested = 0
        unique = 0
        by_resource: dict[Hashable, list[tuple[int, int]]] = defaultdict(list)
        for item in items:
            requested += item.end - item.start + 1
            by_resource[item.resource].append((item.start, item.end))
        for ranges in by_resource.values():
            ranges.sort()
            lo, hi = ranges[0]
            for start, end in ranges[1:]:
                if start <= hi + 1:
                    hi = max(hi, end)
                else:
                    unique += hi - lo + 1
                    lo, hi = start, end
            unique += hi - lo + 1
        return {
            "requests": len(items),
            "requested_units": requested,
            "unique_units": unique,
            "avoidable_units": requested - unique,
        }

    def write_json(self, path: Path) -> Path:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.report(), indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
        return path

    def format_text(self) -> str:
        report = self.report()
        lines = [f"{key.replace('_', ' ').title()}: {value}"
                 for key, value in report["metadata"].items()]
        lines.extend(["", "Avoidable work:"])
        findings = []
        for name, op in report["operations"].items():
            if not op["avoidable_calls"] and not op["avoidable_bytes"]:
                continue
            detail = f"{op['avoidable_calls']} of {op['calls']} {name}"
            if op["avoidable_bytes"]:
                detail += f" ({op['avoidable_bytes'] / 2**20:,.1f} MiB)"
            if op["avoidable_seconds"]:
                detail += f" ({op['avoidable_seconds']:.3f} s)"
            findings.append(f"- {detail}")
        for name, interval in report["intervals"].items():
            if interval["avoidable_units"]:
                findings.append(
                    f"- {interval['avoidable_units']} of {interval['requested_units']} repeated {name}"
                )
        lines.extend(findings or ["- none detected"])
        path = report["dominant_avoidable_call_path"]
        if path:
            lines.extend(["", "Dominant avoidable call path:", "\n-> ".join(path)])
        return "\n".join(lines)


def current() -> WorkAudit | None:
    return _ACTIVE.get()


def object_revision(value: Any) -> Hashable:
    audit = current()
    return audit.object_revision(value) if audit is not None else (type(value).__name__, id(value))


def activate(audit: WorkAudit) -> Token:
    return _ACTIVE.set(audit)


def deactivate(token: Token) -> None:
    _ACTIVE.reset(token)


@contextmanager
def span(name: str) -> Iterator[None]:
    if current() is None:
        yield
        return
    token = _SPANS.set((*_SPANS.get(), name))
    try:
        yield
    finally:
        _SPANS.reset(token)


@contextmanager
def measure(name: str, key: Any, *, processed_bytes: int = 0,
            relevant: bool = True) -> Iterator[None]:
    """Time a block only when an audit is active; never suppress or memoize the work."""
    audit = current()
    if audit is None:
        yield
        return
    started = time.perf_counter()
    try:
        yield
    finally:
        audit.record_work(name, key, seconds=time.perf_counter() - started,
                          processed_bytes=processed_bytes, relevant=relevant)


def record_interval(name: str, resource: Any, start: int, end: int) -> None:
    audit = current()
    if audit is not None:
        audit.record_interval(name, resource, start, end)


def run_fuzzy(seed: int = 847291, frames: int = 500,
              board_revisions: int = 2) -> WorkAudit:
    """Exercise the auditor with a deterministic frame-pipeline workload.

    This is a profiler self-test and budget fixture, not a simulation of tracker correctness.
    The semantic revisions make intentionally redundant operations machine-detectable.
    """
    if frames < 1 or board_revisions < 1 or board_revisions > frames:
        raise ValueError("frames must be positive and board_revisions must be in 1..frames")
    rng = random.Random(seed)
    audit = WorkAudit(seed=seed, frames=frames, board_revisions=board_revisions)
    token = activate(audit)
    try:
        board_change_at = set(rng.sample(range(1, frames), board_revisions - 1))
        grid_revisions = min(frames, max(board_revisions, frames // 6))
        grid_change_at = set(rng.sample(range(1, frames), grid_revisions - 1))
        board_revision = grid_revision = 0
        for frame in range(frames):
            board_revision += frame in board_change_at
            grid_revision += frame in grid_change_at
            with span("FramePipeline.onFrame"):
                audit.record_work("FEN serializations", ("board", board_revision))
                frame_key = ("frame", frame, "bgr-to-gray")
                audit.record_work("BGR to Gray conversions", frame_key)
                audit.record_work("BGR to Gray conversions", frame_key)
                with span("BoardWarps.gridCoverage"):
                    with span("GridCoverage.of"):
                        audit.record_work("Grid sweeps", ("grid", grid_revision))
                        audit.record_work(
                            "Frame copies", ("copy", frame, rng.randrange(4)),
                            processed_bytes=1920 * 1080 * 3,
                            relevant=rng.random() >= 0.55,
                        )
                legal_key = ("legal-request", frame)
                audit.record_work("Legal move generations", legal_key)
                if rng.random() < 0.055:
                    audit.record_work("Legal move generations", legal_key)
        # A representative sequence of overlapping settle windows.
        for commit in range(180, frames, 60):
            audit.record_interval("video frames", "fuzzy-video", commit - 180, commit + 40)
    finally:
        deactivate(token)
    return audit
