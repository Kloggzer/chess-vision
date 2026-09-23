"""Ein Backbone-Name, den timm nicht kennt, wird sofort und deutlich abgewiesen."""

from __future__ import annotations

import pytest

pytest.importorskip("timm")


def test_an_unknown_backbone_is_refused_by_name() -> None:
    from chesslab.hand_gate import GateNet

    with pytest.raises(ValueError, match="gibtsnicht"):
        GateNet("gibtsnicht")


def test_the_old_default_was_never_a_timm_model() -> None:
    """Der Grund fuer diesen Test: `mobilenet_v3_small` stand als Vorgabe im Befehl."""
    import timm

    assert not timm.is_model("mobilenet_v3_small")
    assert timm.is_model("mobilenetv3_small_100")


def test_the_command_default_is_a_model_that_exists() -> None:
    import inspect

    import timm

    from chesslab.hand_gate import train_gate

    default = inspect.signature(train_gate).parameters["backbone"].default

    assert timm.is_model(default), f"{default} ist kein timm-Modell"
