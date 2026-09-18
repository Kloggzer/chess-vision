"""Was nie trainiert werden darf, gehoert aus dem Fold-Schnitt — beide Sperren, nicht nur eine.

`frozen` heisst "genau einmal messen", `benchmark` heisst "beliebig oft messen, nie trainieren".
Fuer den Fold ist der Unterschied egal: er legt jede Aufnahme in k-1 Trainingssaetze, und danach
ist sie als Massstab tot. Am 2026-09-18 wanderte `test-v1` von `frozen` nach `benchmark` und fiel
damit aus der einzigen Pruefung, die es gab.
"""

from __future__ import annotations

import json

from chesslab import config
from chesslab.dataset_build import _frozen_sessions


def _ledger(tmp_path, doc) -> config.Paths:
    (tmp_path / "TEST-USED.json").write_text(json.dumps(doc), encoding="utf-8")
    return config.Paths(root=tmp_path)


def test_frozen_sessions_are_excluded(tmp_path):
    paths = _ledger(tmp_path, {"frozen": ["rg-eingefroren"]})
    assert _frozen_sessions(paths) == ["rg-eingefroren"]


def test_benchmark_sessions_are_excluded_too(tmp_path):
    paths = _ledger(tmp_path, {"benchmark": ["rg-massstab"]})
    assert _frozen_sessions(paths) == ["rg-massstab"]


def test_both_lists_are_unioned_without_duplicates(tmp_path):
    paths = _ledger(tmp_path, {"frozen": ["rg-a", "rg-b"], "benchmark": ["rg-b", "rg-c"]})
    assert _frozen_sessions(paths) == ["rg-a", "rg-b", "rg-c"]


def test_a_missing_ledger_excludes_nothing(tmp_path):
    assert _frozen_sessions(config.Paths(root=tmp_path)) == []


def test_the_real_ledger_protects_test_v1():
    """Die Gegenprobe am echten Hauptbuch: was in test-v1 liegt, darf in keinen Fold."""
    names = set(_frozen_sessions())
    assert {"rg-2026-09-11-20-00-52", "rg-2026-09-15-16-54-44"} <= names
