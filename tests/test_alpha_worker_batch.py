"""`alpha_worker_all` nimmt `--reported`, `--wanted` und `--temporal` mit einem SAM-Ladevorgang."""
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


def test_the_flag_resolver_answers_per_recording(monkeypatch, tmp_path):
    # Die Naht, die dem Stapellauf gefehlt hat: `--reported` muss JE AUFNAHME aufloesen, sonst
    # bekaeme die zweite Session die Frames der ersten.
    from chesslab.session_store import recording as store_rec

    monkeypatch.setattr(store_rec, "reported_dirty",
                        lambda sid, verdict="dirty-frame": {1} if sid == "rg-a" else {7, 8})

    assert matte.flagged_frames("a", reported=True) == {"000001"}
    assert matte.flagged_frames("b", reported=True) == {"000007", "000008"}


def test_without_a_flag_the_resolver_means_the_whole_pile():
    assert matte.flagged_frames("a") is None
