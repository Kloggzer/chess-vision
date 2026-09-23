"""Befunde vom 2026-09-14 im Trainings-/Serving-Bereich, jeder gegen seinen roten Test."""

import inspect

import pytest

torch = pytest.importorskip("torch")

from chesslab.training.engine import evaluate_dataset  # noqa: E402
from chesslab.training.occlusion import OcclusionLoss  # noqa: E402


class _Echo(torch.nn.Module):
    def forward(self, x):
        return x


class _Rows(torch.utils.data.Dataset):
    def __init__(self, rows):
        self.rows = rows

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        logits = [0.0] * 4
        logits[r["pred"]] = 9.0
        return (torch.tensor(logits, dtype=torch.float32),
                torch.tensor([float(r["label"]), float(r["coverage"]),
                              float(r["brightness"])], dtype=torch.float32))


def _rows():
    return [
        {"session_id": "s", "frame": "f", "label": 0, "pred": 0,
         "coverage": 0.30, "brightness": 255.0},
        {"session_id": "s", "frame": "f", "label": 0, "pred": 1,
         "coverage": 0.30, "brightness": 255.0},
        {"session_id": "s", "frame": "f", "label": 0, "pred": 0,
         "coverage": 0.0, "brightness": 255.0},
    ]


def _eval(criterion):
    return evaluate_dataset(_Echo(), _Rows(_rows()), torch.device("cpu"), criterion=criterion,
                            batch_size=8, num_workers=0, keep_workers=False)


def test_a_wider_training_mask_does_not_move_the_metrics():
    """`train.py` druckt "Bewertung weiterhin bei PIECE_VISIBLE_MAX" — engine.py liest aber
    `visible_max` vom Kriterium und benotet damit auf der TRAININGS-Maske."""
    weights = torch.ones(3)

    default = _eval(OcclusionLoss(weights))
    wider = _eval(OcclusionLoss(weights, visible_max=0.5))

    assert wider["square_acc"] == pytest.approx(default["square_acc"]), (
        "--visible-max hat die Val-Zellmenge verschoben: zwei Laeufe werden auf verschiedenen "
        "Zellen benotet und sind nicht mehr vergleichbar.")


def test_a_darker_training_mask_does_not_move_the_metrics():
    weights = torch.ones(3)

    default = _eval(OcclusionLoss(weights))
    darker = _eval(OcclusionLoss(weights, dark_min=0.0, visible_max=0.5))

    assert darker["classification_eligible"].tolist() == default["classification_eligible"].tolist()


def test_the_occlusion_loss_has_no_unused_bce_module():
    """`forward` ruft `binary_cross_entropy_with_logits` direkt — `self.bce` hat keinen Leser."""
    assert not hasattr(OcclusionLoss(torch.ones(3)), "bce")


def test_board_dataset_has_no_dead_with_coverage_switch():
    """Kein Aufrufer setzt ihn, und `__getitem__` liest ihn nicht — das Ziel ist immer 3-spaltig."""
    from chesslab.training.torch_data import PackedBoardDataset

    assert "with_coverage" not in inspect.signature(PackedBoardDataset.__init__).parameters


def test_fit_temperature_drops_only_the_coverage_column():
    """Die Breite kommt aus den LABELS: fehlt die letzte Klasse im Val, faellt ihre Spalte
    mit der Coverage-Spalte weg und die Temperatur wird auf 12 statt 13 Klassen angepasst."""
    from chesslab.training.temperature import fit_temperature

    generator = torch.Generator().manual_seed(7)
    base = torch.randn(400, 13, generator=generator) * 2.0
    y = torch.multinomial(torch.softmax(base[:, :12] / 1.5, dim=1), 1,
                          generator=generator).squeeze(1)
    base[:, 12] += 4.0
    z = torch.cat([base, torch.randn(400, 1, generator=generator)], dim=1)
    grid = torch.arange(0.20, 4.0, 0.002)
    nll = torch.stack([torch.nn.functional.cross_entropy(z[:, :13] / t, y) for t in grid])

    # Die Breite kann nicht geraten werden — sie kommt vom Aufrufer, der `len(classes)` kennt.
    # Aus den Labels abgeleitet fiel die Spalte der im Val fehlenden letzten Klasse mit weg.
    assert fit_temperature(z, y.tolist(), n_classes=13) == pytest.approx(
        float(grid[int(nll.argmin())]), abs=0.02)


def test_per_position_survives_a_row_without_a_fen():
    """`.get("fen", "")` verteidigt gegen die fehlende Spalte und `"".split()[0]` hebt die
    Verteidigung sofort wieder auf."""
    from chesslab.dataset_build import keep_per_position

    rows = [{"session_id": "s", "frame": f"f{i}", "square": "a1"} for i in range(4)]

    assert len(keep_per_position(rows, 2)) == 2
