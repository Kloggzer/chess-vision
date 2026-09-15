"""Ein SAM-Ladevorgang fuer viele Aufnahmen — auch fuer die GEMELDETEN Frames.

`alpha_worker_all` haelt die Gewichte fuer den ganzen Lauf resident, nahm aber nur `limit` und
`reason` entgegen; `--reported`, `--wanted` und `--temporal` lagen ausschliesslich im
Einzelsession-Zweig (`cli.py`). Gemessen 2026-09-15: 7-9 min Laden gegen 54 s Arbeit, also ~2 h
Laden fuer ~12 min Arbeit bei 186 gemeldeten Frames ueber 14 Aufnahmen.
"""
from __future__ import annotations

import pytest

from chesslab import matte


@pytest.fixture
def worked(monkeypatch) -> list[tuple[str, frozenset[str] | None]]:
    seen: list[tuple[str, frozenset[str] | None]] = []

    def fake(name, *, limit=None, reason=matte.ALPHA_REASON, frames=None, progress=True):
        seen.append((name, None if frames is None else frozenset(frames)))
        return {"frames": 0, "alphas": 0, "already": 0}

    monkeypatch.setattr(matte, "alpha_worker", fake)
    return seen


def test_each_session_gets_its_own_reported_frames(worked):
    per_session = {"a": {"000001"}, "b": {"000007", "000008"}}

    matte.alpha_worker_all(["a", "b"], frames_for=per_session.get, progress=False)

    assert worked == [("a", frozenset({"000001"})), ("b", frozenset({"000007", "000008"}))]


def test_a_session_the_resolver_has_nothing_for_is_skipped_not_run_on_the_whole_pile(worked):
    # Sonst wuerde ein Stapellauf ausgerechnet dort den ganzen Stapel matten, wo ein Mensch
    # NICHTS gemeldet hat — das Gegenteil dessen, wofuer `--reported` da ist.
    matte.alpha_worker_all(["a", "b"], frames_for={"a": {"000001"}}.get, progress=False)

    assert worked == [("a", frozenset({"000001"}))]


def test_without_a_resolver_it_stays_the_pile_run(worked):
    matte.alpha_worker_all(["a", "b"], limit=5, progress=False)

    assert worked == [("a", None), ("b", None)]
