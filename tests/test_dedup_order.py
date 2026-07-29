"""The visual filter must run BEFORE the per-cell cap.

The other way round, the cap decides what phash is even allowed to judge: a cell whose 227 crops
differ only because the light moved gets cut to 4 before anything looks at them, and "the piece
never moved" is indistinguishable from "the light did".
"""
from chesslab import dataset_build as db


def test_phash_runs_before_the_cap(tmp_path, monkeypatch):
    from tests.test_dataset import _build_pool

    sids, _ = _build_pool(tmp_path, monkeypatch)
    order: list[str] = []
    real_phash, real_cap = db.dedup_phash, db.dedup_metadata
    monkeypatch.setattr(db, "dedup_phash",
                        lambda r, h: (order.append("phash"), real_phash(r, h))[1])
    monkeypatch.setattr(db, "dedup_metadata",
                        lambda r, c, seed=0: (order.append("cap"), real_cap(r, c, seed))[1])
    db.build_dataset("ord", sids, phash_enabled=True, pack=False, per_cell_cap=4)
    assert order[:2] == ["phash", "cap"], f"ran in the order {order[:2]}"


def test_the_cap_is_skipped_but_phash_is_not_when_disabled(tmp_path, monkeypatch):
    """phash off must not also disable the cap — they are independent policies."""
    from tests.test_dataset import _build_pool

    sids, _ = _build_pool(tmp_path, monkeypatch)
    order: list[str] = []
    real_cap = db.dedup_metadata
    monkeypatch.setattr(db, "dedup_phash",
                        lambda r, h: (order.append("phash"), r)[1])
    monkeypatch.setattr(db, "dedup_metadata",
                        lambda r, c, seed=0: (order.append("cap"), real_cap(r, c, seed))[1])
    db.build_dataset("ord2", sids, phash_enabled=False, pack=False, per_cell_cap=4)
    assert "phash" not in order
    assert "cap" in order
