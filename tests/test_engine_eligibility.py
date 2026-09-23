"""Die Metrik-Maske haengt an der ZEILE, nicht am Kopf: Korpus- und Aufnahmezahlen auf
derselben Zellmenge."""
from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

CLASSES = ["empty", "wP", "occluded"]


def _dataset(with_coverage: bool):
    rows = [
        {"session_id": "s", "frame": "1", "square": "a1", "label": "wP", "coverage": 0.0, "brightness": 200.0},
        {"session_id": "s", "frame": "1", "square": "b1", "label": "wP", "coverage": 0.9, "brightness": 200.0},
    ]

    class Rows(torch.utils.data.Dataset):
        def __init__(self):
            self.rows = rows
            self.c2i = {c: i for i, c in enumerate(CLASSES)}

        def __len__(self):
            return len(rows)

        def __getitem__(self, i):
            r = rows[i]
            if with_coverage:
                return torch.zeros(3, 8, 8), torch.tensor([1.0, r["coverage"]], dtype=torch.float32)
            return torch.zeros(3, 8, 8), torch.tensor(1, dtype=torch.long)

    class SaysEmptyOnTheCoveredCell(torch.nn.Module):
        def forward(self, x):
            out = torch.zeros(x.shape[0], len(CLASSES) + (1 if with_coverage else 0))
            out[0, 1] = 5.0   # sichtbare Zelle: richtig
            out[1, 0] = 5.0   # verdeckte Zelle: falsch
            return out

    return Rows(), SaysEmptyOnTheCoveredCell()


def _square_acc(with_coverage: bool) -> float:
    from chesslab.training.engine import evaluate_dataset

    ds, model = _dataset(with_coverage)
    return evaluate_dataset(model, ds, "cpu", num_workers=0, keep_workers=False)["square_acc"]


def test_an_occlusion_run_is_untouched_by_dropping_the_special_case():
    # Gemessen vor der Aenderung: die verdeckte Zelle ist ohnehin maskiert, also 1 von 1 richtig.
    assert _square_acc(with_coverage=True) == 1.0


def test_a_run_without_coverage_targets_now_measures_the_same_cells_as_its_neighbours():
    # Vorher: 0.5 — die verdeckte Fehlzelle zaehlte mit, waehrend `per_session_metrics` sie
    # unbedingt wegfilterte. Zwei Zahlen ueber zwei Zellmengen in EINEM Bericht.
    assert _square_acc(with_coverage=False) == 1.0
