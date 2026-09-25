"""QA 2026-09-25 Runde 6: Ein abgebrochener Lock-Erwerb darf sich nicht selbst blockieren."""

from __future__ import annotations

from pathlib import Path

import pytest

from chesslab import locks


def test_keyboard_interrupt_after_claim_does_not_poison_next_acquire(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    lock = tmp_path / ".publish.lock"
    claim = locks._claim

    def interrupt_after_claim(path: Path, payload: str) -> bool:
        assert claim(path, payload)
        raise KeyboardInterrupt

    monkeypatch.setattr(locks, "_claim", interrupt_after_claim)
    with pytest.raises(KeyboardInterrupt):
        with locks.waiting(lock, "matte", "first", timeout=0):
            pass

    monkeypatch.setattr(locks, "_claim", claim)
    blocked: RuntimeError | None = None
    try:
        with locks.waiting(lock, "matte", "second", timeout=0):
            pass
    except RuntimeError as error:
        blocked = error
    finally:
        lock.unlink(missing_ok=True)

    assert blocked is None, "der abgebrochene eigene Token blockiert den naechsten Lauf 60 Sekunden"
