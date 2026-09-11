"""Stage 5 — torch-free training logic (board accuracy, split filtering, model card).

The actual train/eval/export need torch (ROCm build) and run on the rig; these cover the
logic that must be correct regardless of hardware.
"""

import pytest

from chesslab import config
from chesslab.training.data import (
    board_accuracy,
    build_model_card,
    checkpoint_metrics,
    checkpoint_score,
    filter_rows_by_split,
    occupancy_board_acc,
    occupancy_piece_breakdown,
)


def _crop(session, frame, square, label):
    return {"session_id": session, "frame": frame, "square": square, "label": label,
            "out_size": [96, 128], "path": f"{session}_{frame}_{square}.png"}


def test_board_accuracy_all_or_nothing():
    # one frame, 64 squares all correct -> board correct
    perfect = [(("s0", "0"), True) for _ in range(64)]
    assert board_accuracy(perfect) == 1.0
    # flip a single square -> whole board wrong
    one_wrong = perfect[:-1] + [(("s0", "0"), False)]
    assert board_accuracy(one_wrong) == 0.0
    # two frames: one perfect, one broken -> 0.5
    two = [(("s0", "0"), True)] * 64 + [(("s0", "1"), True)] * 63 + [(("s0", "1"), False)]
    assert board_accuracy(two) == 0.5


def test_board_accuracy_empty_is_zero():
    assert board_accuracy([]) == 0.0


def test_filter_rows_by_split_respects_sessions():
    rows = [_crop("s0", "0", "e1", "wK"), _crop("s1", "0", "e1", "wK"), _crop("s2", "0", "e1", "wK")]
    split = {"splits": {"train": ["s0", "s2"], "val": ["s1"], "test": []}}
    train = filter_rows_by_split(rows, split, "train")
    val = filter_rows_by_split(rows, split, "val")
    assert {r["session_id"] for r in train} == {"s0", "s2"}
    assert {r["session_id"] for r in val} == {"s1"}
    assert filter_rows_by_split(rows, split, "test") == []


def test_build_model_card_has_required_fields():
    card = build_model_card(
        classes=config.CLASSES, out_size=(96, 128), backbone="smallcnn",
        metrics={"board_acc": 0.9}, torch_version="2.4.1+rocm6.2", hip_version="6.2",
        exported_formats=["torchscript", "onnx"],
    )
    assert card["classes"] == config.CLASSES
    assert card["out_size"] == [96, 128]
    assert card["normalize"]["mean"] == list(config.NORMALIZE_MEAN)
    assert card["normalize"]["std"] == list(config.NORMALIZE_STD)
    assert card["rocm_hip"] == "6.2"
    assert set(card["exported_formats"]) == {"torchscript", "onnx"}
    assert "created_at" in card


# --- Occupancy/piece diagnostics (head-independent, torch-free) --------------------------------

def _ci(label: str) -> int:
    return config.CLASSES.index(label)


def test_occupancy_piece_breakdown_splits_error_sources():
    pairs = [
        ("empty", "empty"),      # occ ok, leer
        ("empty", "wP"),         # occ falsch (leer -> besetzt)
        ("wP", "wP"),            # occ ok, Figur ok
        ("wB", "wN"),            # occ ok, TYP-Fehler (B->N, Farbe gleich)
        ("wB", "bB"),            # occ ok, FARB-Fehler (B==B, w->b)
        ("wK", "empty"),         # occ wrong (occupied -> empty), counts as type error
        ("occluded", "occluded"),  # occ ok, occupied, but no real piece -> no type/color counter
    ]
    trues = [_ci(t) for t, _ in pairs]
    preds = [_ci(p) for _, p in pairs]
    bd = occupancy_piece_breakdown(config.CLASSES, trues, preds)
    assert bd["occupied_acc"] == pytest.approx(5 / 7)
    assert bd["n_occupied"] == 5            # wP,wB,wB,wK,occluded
    assert bd["piece_acc"] == pytest.approx(2 / 5)   # wP und occluded exakt richtig
    assert bd["n_pieces"] == 4              # echte Figuren: wP,wB,wB,wK
    assert bd["type_err"] == pytest.approx(2 / 4)    # wB->wN und wK->empty
    assert bd["color_err"] == pytest.approx(1 / 4)   # wB->bB


def test_occupancy_board_acc_is_easier_than_full_board():
    rows = [_crop("s0", "0", sq, "empty") for sq in ("a1", "a2")]
    classes = config.CLASSES
    # wahres Brett: a1 besetzt (wP), a2 leer. Vorhersage verwechselt nur die FIGUR auf a1 (wP->wN),
    # but hits occupancy everywhere -> full board-acc 0, occupancy-board-acc 1.
    trues = [_ci("wP"), _ci("empty")]
    preds = [_ci("wN"), _ci("empty")]
    assert occupancy_board_acc(rows, classes, trues, preds) == 1.0
    full = board_accuracy([((r["session_id"], str(r["frame"])), t == p)
                           for r, t, p in zip(rows, trues, preds, strict=False)])
    assert full == 0.0


_TIMM_BACKBONE = "mobilenetv4_conv_small_03"

# --- Zweistufiger Kopf (braucht torch) ----------------------------------------------------
def _relu_count(module) -> int:
    import torch.nn as nn

    return sum(1 for m in module.modules() if isinstance(m, nn.ReLU))


def test_convert_bn_to_gn_keeps_the_activation():
    torch = pytest.importorskip("torch")
    timm = pytest.importorskip("timm")
    import torch.nn as nn

    from chesslab.training.model import _convert_bn_to_gn, _resolve_timm_backbone

    m = timm.create_model(_resolve_timm_backbone(_TIMM_BACKBONE), pretrained=False, num_classes=0)
    before = _relu_count(m)   # 30 with timm 1.0.x
    assert before > 0
    _convert_bn_to_gn(m)
    assert _relu_count(m) == before
    assert not any(isinstance(x, nn.BatchNorm2d) for x in m.modules())
    assert any(isinstance(x, nn.GroupNorm) for x in m.modules())
    assert m(torch.randn(2, 3, 128, 128)).ndim == 2   # the replacement is wired in correctly


def test_convert_bn_to_gn_still_handles_a_plain_batchnorm():
    torch = pytest.importorskip("torch")
    import torch.nn as nn

    from chesslab.training.model import _convert_bn_to_gn

    m = nn.Sequential(nn.Conv2d(3, 8, 3, padding=1), nn.BatchNorm2d(8), nn.ReLU())
    _convert_bn_to_gn(m)
    assert isinstance(m[1], nn.GroupNorm)   # one-for-one, no Sequential wrapper
    assert m(torch.randn(2, 3, 8, 8)).shape == (2, 8, 8, 8)


def test_the_exported_graph_contains_activations(tmp_path):
    """The bug was invisible in the module tree and visible in the ONNX — assert on the graph."""
    torch = pytest.importorskip("torch")
    pytest.importorskip("timm")
    onnx = pytest.importorskip("onnx")

    from chesslab.training.model import build_model

    model = build_model(_TIMM_BACKBONE, len(config.CLASSES), pretrained=False,
                        norm="groupnorm", head="combined").eval()
    out = tmp_path / "model.onnx"
    # same export call as training.evaluate.run_export
    torch.onnx.export(model, torch.randn(2, 3, 128, 128), str(out),
                      input_names=["input"], output_names=["logits"],
                      dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
                      opset_version=17, dynamo=False)
    ops = [n.op_type for n in onnx.load(str(out)).graph.node]
    assert "Relu" in ops


# --- checkpoint_score (torch-frei) -------------------------------------------------------


def _crop_row(session="s0", frame=0, square="a1"):
    return {"session_id": session, "frame": frame, "square": square, "label": "empty",
            "out_size": [128, 128], "path": f"{session}_{frame}_{square}.png"}


def test_checkpoint_score_occ_perfect_types_wrong():
    """Belegung perfekt, alle Typen falsch: das Brett-Mass ist 1,0, der SCORE aber nur 0,5.

    Bis 2026-08-24 stand hier der Brett-Wert an erster Stelle, ein Modell ohne jede richtige
    Figur war damit bestbewertet. Der gewichtete Score haelt beide Ebenen auseinander."""
    classes = config.CLASSES
    # 64 Felder, alle occupied, alle Figuren falsch geraten
    rows = [_crop_row(frame=0, square=f"{(chr(97+c//8))}{8-(c%8)}") for c in range(64)]
    # All truly occupied (wP), prediction guesses other pieces — occupancy remains correct
    trues = [classes.index("wP")] * 64
    preds = [classes.index("wN")] * 64
    score, occ_board, mr = checkpoint_score(rows, classes, trues, preds)
    assert occ_board == 1.0        # alle Felder occupancy-korrekt
    assert score == pytest.approx(0.5)   # 0,45*0 + 0,45*1 + 0,10*0,5 (Kalibrierung neutral)
    assert mr < 1.0                # Typen falsch → macro_recall nicht perfekt


def test_checkpoint_score_one_occ_flip_per_frame():
    """Exactly one occupancy flip per frame → occ_board_acc == 0.0."""
    classes = config.CLASSES
    # 4 frames, je 1 Feld. Alle 4 Frames haben einen occ-Flip (empty→besetzt).
    rows = [_crop_row(frame=i, square="a1") for i in range(4)]
    trues = [classes.index("empty")] * 4
    preds = [classes.index("wP")] * 4
    score, occ_board, mr = checkpoint_score(rows, classes, trues, preds)
    assert occ_board == 0.0
    assert score == pytest.approx(0.05)   # beide Ebenen 0, nur die neutrale Kalibrierung


def test_checkpoint_metrics_reuses_the_score_breakdown():
    rows = [_crop_row(frame=0, square="a1"), _crop_row(frame=0, square="a2")]
    classes = config.CLASSES
    trues = [_ci("wP"), _ci("empty")]
    preds = [_ci("wN"), _ci("empty")]

    score, breakdown = checkpoint_metrics(rows, classes, trues, preds)

    assert score == checkpoint_score(rows, classes, trues, preds)
    plain = occupancy_piece_breakdown(classes, trues, preds)
    # `checkpoint_metrics` haengt das Brett-Mass an, sonst identisch.
    extra = {"occupied_board_acc", "calibration",   # von checkpoint_metrics angehaengt
             "visible_piece_acc", "visible_occupied_acc"}
    assert {k: v for k, v in breakdown.items() if k not in extra} == plain


def test_checkpoint_score_tuple_ordering_sortable():
    """Score-Tupel lassen sich korrekt vergleichen (lexikografisch)."""
    assert (1.0, 0.5, 0.3) > (0.9, 0.9, 0.9)  # der gewichtete Score sticht
    assert (0.8, 0.9, 0.3) > (0.8, 0.8, 0.9)  # bei gleichem Score: occupied_board_acc sticht
    assert (0.8, 0.8, 0.5) > (0.8, 0.8, 0.3)  # macro_recall als letzter Tiebreaker


class TestTrainLock:
    """Single-training GPU guard (prevents concurrent-run OOM)."""

    def test_acquire_and_reclaim(self, monkeypatch, tmp_path):
        import json as _json

        from chesslab import locks
        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        assert tr._acquire_train_lock("smallcnn bs=512") is True
        assert tr._train_lock_path().exists()
        # A foreign LIVE lock blocks a second training.
        tr._train_lock_path().write_text(_json.dumps({"pid": 999999, "ts": "now", "desc": "other"}))
        monkeypatch.setattr(locks, "pid_alive", lambda pid: pid == 999999)
        assert tr._acquire_train_lock("x") is False
        # A stale lock (dead PID) is reclaimed.
        monkeypatch.setattr(locks, "pid_alive", lambda pid: False)
        assert tr._acquire_train_lock("y") is True
        tr._release_train_lock()
        assert not tr._train_lock_path().exists()

    def test_release_only_own_lock(self, monkeypatch, tmp_path):
        import json as _json

        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        tr._train_lock_path().parent.mkdir(parents=True, exist_ok=True)
        tr._train_lock_path().write_text(_json.dumps({"pid": 424242, "ts": "now"}))
        tr._release_train_lock()                       # not our pid -> must NOT delete
        assert tr._train_lock_path().exists()

    @staticmethod
    def _foreign_slots(tmp_path, *slots):
        """Fremde Slot-Locks, alle mit einem `startedAt` VOR unserem (sonst haengt der Test am
        heutigen Datum). Gibt die PIDs zurueck, die `pid_alive` als lebend melden soll."""
        import json as _json

        inbox = tmp_path / "inbox"
        inbox.mkdir(parents=True, exist_ok=True)
        pids = []
        for i, slot in enumerate(slots):
            pid = 111000 + i
            pids.append(pid)
            (inbox / f"heavy-{slot}.lock").write_text(_json.dumps(
                {"pid": pid, "childPid": pid, "job": "train", "name": f"slot {slot}",
                 "startedAt": f"2020-01-01T00:0{i}:00"}), encoding="utf-8")
        return pids

    def test_two_slots_allowed(self, monkeypatch, tmp_path):
        """Zwei parallele Laeufe sind der dokumentierte Fall (+7 % Laufzeit, doppelter Durchsatz)."""
        from chesslab import locks
        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        pids = self._foreign_slots(tmp_path, "C")
        monkeypatch.setattr(locks, "pid_alive", lambda pid: pid in pids)
        monkeypatch.setenv("CHESSLAB_TRAIN_SLOT", "D")
        assert tr._acquire_train_lock("zweiter") is True
        assert tr._train_lock_path().exists()

    def test_third_slot_refused_and_own_lock_released(self, monkeypatch, tmp_path):
        """Der dritte Lauf tritt zurueck — und laesst keinen Lock liegen, der den Slot blockiert.

        Slot-Locks kennen einander nicht; ohne diese Grenze liefen am 2026-08-29 drei Laeufe
        gleichzeitig und trieben den Datensatz-Pack aus dem Seitencache.
        """
        from chesslab import locks
        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        pids = self._foreign_slots(tmp_path, "C", "D")
        monkeypatch.setattr(locks, "pid_alive", lambda pid: pid in pids)
        monkeypatch.setenv("CHESSLAB_TRAIN_SLOT", "E")
        assert tr._acquire_train_lock("dritter") is False
        assert not tr._train_lock_path().exists()

    def test_cap_counts_the_default_lock_too(self, monkeypatch, tmp_path):
        """Ein Slot neben einem Lauf OHNE Slot ist derselbe Speicher — der Default zaehlt mit."""
        import json as _json

        from chesslab import locks
        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        pids = self._foreign_slots(tmp_path, "C")
        config.DATA.heavy_lock.write_text(_json.dumps(
            {"pid": 222222, "childPid": 222222, "job": "train", "name": "autopilot",
             "startedAt": "2020-01-01T00:00:30"}), encoding="utf-8")
        monkeypatch.setattr(locks, "pid_alive", lambda pid: pid in (*pids, 222222))
        monkeypatch.setenv("CHESSLAB_TRAIN_SLOT", "E")
        assert tr._acquire_train_lock("dritter") is False

    def test_stale_slot_lock_does_not_count(self, monkeypatch, tmp_path):
        """Ein Slot-Lock mit totem PID hat nie Speicher belegt und darf niemanden aussperren."""
        from chesslab import locks
        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        pids = self._foreign_slots(tmp_path, "C", "D")
        monkeypatch.setattr(locks, "pid_alive", lambda pid: pid == pids[0])   # D ist verwaist
        monkeypatch.setenv("CHESSLAB_TRAIN_SLOT", "E")
        assert tr._acquire_train_lock("dritter") is True

    def test_cap_can_be_raised_deliberately(self, monkeypatch, tmp_path):
        """`CHESSLAB_MAX_TRAININGS` ist der bewusste Ausweg auf einer groesseren Maschine."""
        from chesslab import locks
        from chesslab.training import train as tr
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        pids = self._foreign_slots(tmp_path, "C", "D")
        monkeypatch.setattr(locks, "pid_alive", lambda pid: pid in pids)
        monkeypatch.setenv("CHESSLAB_TRAIN_SLOT", "E")
        monkeypatch.setenv("CHESSLAB_MAX_TRAININGS", "3")
        assert tr._acquire_train_lock("dritter") is True


# --- Focal loss + class-weight override — specs/18-occupancy-model/02-two-class-model.md -

def test_focal_gamma_zero_equals_weighted_ce():
    torch = pytest.importorskip("torch")
    from chesslab.training.losses import FocalLoss

    torch.manual_seed(0)
    logits = torch.randn(64, 2)
    target = torch.randint(0, 2, (64,))
    w = torch.tensor([0.86, 1.19])
    ce = torch.nn.CrossEntropyLoss(weight=w)(logits, target)
    fl = FocalLoss(weight=w, gamma=0.0)(logits, target)
    assert torch.allclose(ce, fl, atol=1e-6)
    # and without a weight vector
    ce0 = torch.nn.CrossEntropyLoss()(logits, target)
    fl0 = FocalLoss(gamma=0.0)(logits, target)
    assert torch.allclose(ce0, fl0, atol=1e-6)


def test_focal_downweights_easy_examples():
    torch = pytest.importorskip("torch")
    from chesslab.training.losses import FocalLoss

    easy = torch.tensor([[8.0, -8.0]])          # confident AND correct
    hard = torch.tensor([[0.05, -0.05]])        # barely correct
    y = torch.tensor([0])
    f0, f2 = FocalLoss(gamma=0.0), FocalLoss(gamma=2.0)
    easy_ratio = (f2(easy, y) / f0(easy, y)).item()
    hard_ratio = (f2(hard, y) / f0(hard, y)).item()
    assert easy_ratio < 1e-4                    # the solved example is all but removed
    assert hard_ratio > 0.2                     # the hard one keeps most of its gradient
    assert easy_ratio < hard_ratio


def test_class_weight_override_applies():
    pytest.importorskip("torch")
    from chesslab.training.torch_data import class_weights_tensor

    classes = ["empty", "occupied"]
    split = {"classes": classes, "class_weights": {"empty": 0.86, "occupied": 1.19}}
    base = class_weights_tensor(split, classes)
    assert pytest.approx(base.tolist(), abs=1e-6) == [0.86, 1.19]
    override = {**split, "class_weights": {**split["class_weights"], "occupied": 2.0}}
    assert pytest.approx(class_weights_tensor(override, classes).tolist(), abs=1e-6) == [0.86, 2.0]


def test_occupancy_breakdown_on_two_classes():
    """`occupancy_piece_breakdown` / `checkpoint_score` must survive a 2-class list."""
    classes = ["empty", "occupied"]
    trues = [0, 1, 1, 0]
    preds = [0, 1, 0, 0]
    bd = occupancy_piece_breakdown(classes, trues, preds)
    assert bd["occupied_acc"] == 0.75
    rows = [_crop("s0", "0", sq, "x") for sq in ("a1", "a2", "a3", "a4")]
    score, occ_board, _ = checkpoint_score(rows, classes, trues, preds)
    assert occ_board == 0.0                       # ein Flip im einzigen Brett
    assert score == pytest.approx(0.6125)        # 0,45*0,5 + 0,45*0,75 + 0,10*0,5


# =======================================================================================
# PrimitiveBatchNorm2d — training around MIOpen, folding at export
# =======================================================================================

def test_primitive_batchnorm_matches_the_stock_module_in_eval():
    """The swap at export is only legitimate if the two are the SAME function, not merely similar.

    Training runs through the primitive because ROCm-Windows cannot compile MIOpen's BatchNorm
    training kernel; the export puts the stock module back so it folds into the convolution. That
    is a re-wrapping, and this is what makes it one.
    """
    import torch
    import torch.nn as nn

    from chesslab.training.model import PrimitiveBatchNorm2d

    stock, primitive = nn.BatchNorm2d(16), PrimitiveBatchNorm2d(16)
    with torch.no_grad():
        stock.weight.uniform_(0.5, 1.5)
        stock.bias.uniform_(-1.0, 1.0)
        stock.running_mean.uniform_(-2.0, 2.0)
        stock.running_var.uniform_(0.5, 3.0)
    primitive.load_state_dict(stock.state_dict())
    stock.eval()
    primitive.eval()
    x = torch.randn(4, 16, 8, 8)
    assert torch.allclose(stock(x), primitive(x), atol=1e-6)


def test_primitive_batchnorm_tracks_the_same_running_stats():
    """`running_var` is the UNBIASED estimate — getting that wrong shifts every eval-mode output."""
    import torch
    import torch.nn as nn

    from chesslab.training.model import PrimitiveBatchNorm2d

    stock, primitive = nn.BatchNorm2d(8), PrimitiveBatchNorm2d(8)
    primitive.load_state_dict(stock.state_dict())
    stock.train()
    primitive.train()
    torch.manual_seed(0)
    for _ in range(3):
        x = torch.randn(6, 8, 5, 5)
        stock(x)
        primitive(x)
    assert torch.allclose(stock.running_mean, primitive.running_mean, atol=1e-6)
    assert torch.allclose(stock.running_var, primitive.running_var, atol=1e-5)


def test_stock_batchnorm_restores_the_module_without_touching_activations():
    """The conversion must not eat the ReLU — that is exactly how the shipped model lost all 30."""
    import torch.nn as nn

    from chesslab.training.model import PrimitiveBatchNorm2d, stock_batchnorm

    net = nn.Sequential(nn.Conv2d(3, 8, 3), nn.Sequential(PrimitiveBatchNorm2d(8), nn.ReLU()))
    stock_batchnorm(net)
    kinds = [type(m).__name__ for m in net.modules()]
    assert "PrimitiveBatchNorm2d" not in kinds
    assert kinds.count("BatchNorm2d") == 1
    assert kinds.count("ReLU") == 1, "the activation must survive the swap"


def test_a_batchnorm_backbone_keeps_its_activations():
    """Guards the same trap on the real backbone: the primitive conversion is not a norm deletion."""
    import torch.nn as nn

    from chesslab.training.model import build_model

    m = build_model(backbone="mobilenetv4_conv_small_035", num_classes=2, norm="batchnorm",
                    head="combined")
    relus = sum(1 for mod in m.modules() if isinstance(mod, nn.ReLU))
    assert relus > 0, "a batchnorm backbone must keep its nonlinearities"


def test_every_backbone_path_converts_batchnorm_when_the_kernel_is_broken(monkeypatch):
    """One construction branch per head — the `combined` one was missed and only the run crashed.

    `build_model` reaches the timm backbone through a different branch per head, and each has to
    apply the conversion. Missing one is invisible until training dies inside MIOpen, which is a
    two-hour feedback loop; this is a two-second one.
    """
    import torch.nn as nn

    from chesslab.training import model as M

    monkeypatch.setattr(M, "_BN_KERNEL_OK", False)
    m = M.build_model(backbone="mobilenetv4_conv_small_035", num_classes=2, norm="batchnorm",
                      head="combined")
    stock = [mod for mod in m.modules()
             if type(mod) is nn.BatchNorm2d]                      # exact type, not the subclass
    assert not stock, f"{len(stock)} stock BatchNorm2d survived — that branch will crash on ROCm"
    assert any(isinstance(mod, M.PrimitiveBatchNorm2d) for mod in m.modules())
    assert any(isinstance(mod, nn.ReLU) for mod in m.modules()), "and the activations must survive"


def test_primitive_batchnorm_keeps_finite_stats_in_half_precision():
    """Autocast hands fp16 activations; a variance reduction over them overflows.

    The first real training run produced 12 `running_var` entries at +inf and its eval accuracy
    collapsed from 0.91 to 0.65 while the training loss kept falling — the loss uses batch
    statistics, so the damage is invisible until eval. The earlier equivalence test missed it
    because well-behaved `randn` inputs never reach the fp16 ceiling.
    """
    import torch

    from chesslab.training.model import PrimitiveBatchNorm2d

    bn = PrimitiveBatchNorm2d(8)
    bn.train()
    x = (torch.randn(64, 8, 32, 32) * 120.0).half()      # ~1.4e4 peak: fine in fp32, not in fp16
    bn(x)
    assert torch.isfinite(bn.running_var).all(), "running_var overflowed — statistics must be fp32"
    assert torch.isfinite(bn.running_mean).all()
    assert bn(x).dtype == x.dtype, "and the output dtype must follow the input"


def test_neighbour_paste_only_touches_empty_cells(tmp_path):
    """Der Nachbar-Uebersprung darf nur `empty` treffen — auf einer besetzten Zelle waere er
    eine falsche Figur. Default 0,0, damit kein Altlauf sein Verhalten aendert."""
    import numpy as np
    import torch

    from chesslab.training.torch_data import PackedSquareDataset, build_transform

    n, side = 12, 32
    mm = np.random.RandomState(0).randint(0, 255, (n, side, side, 3), dtype=np.uint8)
    path = tmp_path / "packed_images.u8"
    np.memmap(path, dtype=np.uint8, mode="w+", shape=mm.shape)[:] = mm
    labels = ["empty" if i % 2 else "wR" for i in range(n)]
    rows = [{"path": f"p{i}", "label": labels[i], "_packed_idx": i} for i in range(n)]
    packed = (str(path), (n, side, side), None)
    classes = ["empty", "wR"]
    tf = build_transform((side, side), train=False)

    off = PackedSquareDataset(rows, classes, tf, packed)
    on = PackedSquareDataset(rows, classes, tf, packed, neighbour_p=1.0)
    assert off.neighbour_p == 0.0
    for i in range(n):
        same = torch.equal(off[i][0], on[i][0])
        assert same == (labels[i] != "empty"), f"Zeile {i} ({labels[i]}) falsch behandelt"


def test_pread_reader_matches_the_memmap(tmp_path, monkeypatch):
    """Beide Leser muessen dieselben Bytes liefern — der eine haelt sie nur nicht fest."""
    import numpy as np

    from chesslab.training.pack import open_packed_memmap

    n, side = 9, 16
    data = np.random.RandomState(1).randint(0, 255, (n, side, side, 3), dtype=np.uint8)
    path = tmp_path / "packed_images.u8"
    np.memmap(path, dtype=np.uint8, mode="w+", shape=data.shape)[:] = data

    monkeypatch.setenv("CHESSLAB_PACK_READER", "memmap")
    mm = open_packed_memmap(str(path), (n, side, side))
    monkeypatch.setenv("CHESSLAB_PACK_READER", "pread")
    pr = open_packed_memmap(str(path), (n, side, side))
    assert type(pr).__name__ == "_PreadRows"
    for i in range(n):
        assert np.array_equal(np.array(mm[i]), np.array(pr[i]))


def test_blas_cap_runs_before_torch_is_imported():
    """`cap_blas_threads` wirkt nur VOR dem Import — danach hat OpenBLAS seine Arenen reserviert.

    Gemessen 2026-08-29: der Hauptprozess stand bei 2,9 GB Commit, seine Worker bei 0,6, weil
    `loader_kwargs` erst lange nach `import torch` kappt und nur die Worker die Umgebung erben.
    """
    from pathlib import Path

    from chesslab.training import train as tr
    body = Path(tr.__file__).read_text(encoding="utf-8").split("def run_train(", 1)[1]
    assert body.index("cap_blas_threads()") < body.index("\n    import torch")


def test_board_accuracy_tolerance_counts_boards_with_one_slip():
    """Der Ausweg aus dem Exponenten: bei 32 Figuren ist "alle richtig" fast immer 0."""
    from chesslab.training.data import board_accuracy

    one_wrong = [(("s", "1"), True), (("s", "1"), False), (("s", "1"), True)]
    two_wrong = [(("s", "2"), False), (("s", "2"), False), (("s", "2"), True)]
    items = one_wrong + two_wrong

    assert board_accuracy(items) == 0.0
    assert board_accuracy(items, tolerance=1) == 0.5
    assert board_accuracy(items, tolerance=2) == 1.0


def test_visible_board_items_drop_the_cells_the_loss_masks():
    """Verdeckte Zellen lernt das Modell nie — sie duerfen ein Brett nicht falsch machen."""
    from chesslab.training.data import board_accuracy, visible_board_items
    from chesslab.training.occlusion import PIECE_VISIBLE_MAX

    rows = [
        {"session_id": "s", "frame": 1, "coverage": 0.0},
        {"session_id": "s", "frame": 1, "coverage": PIECE_VISIBLE_MAX + 0.1},
    ]
    trues, preds = [0, 0], [0, 1]          # nur die VERDECKTE Zelle ist falsch

    assert board_accuracy([(("s", "1"), True), (("s", "1"), False)]) == 0.0
    assert board_accuracy(visible_board_items(rows, trues, preds)) == 1.0


class TestLockSurvivesReboot:
    """Ein Lock aus einer frueheren Sitzung darf niemanden aussperren.

    Am 2026-09-11 fror der Rechner waehrend eines Laufs ein; nach dem Neustart gehoerte dessen PID
    einem `taskhostw`, `pid_alive` meldete brav "lebt", und kein Training startete mehr.
    """

    @staticmethod
    def _lock(tmp_path, **extra):
        import json as _json

        from chesslab import locks
        path = tmp_path / "heavy.lock"
        path.write_text(_json.dumps({"pid": 424242, "childPid": 424242, "job": "train",
                                     "name": "vorige Sitzung",
                                     "startedAt": "2020-01-01T00:00:30", **extra}), encoding="utf-8")
        return locks, path

    def test_lock_from_an_earlier_boot_is_free(self, monkeypatch, tmp_path):
        from datetime import timedelta
        locks, path = self._lock(tmp_path)
        boot = locks._boot_time()
        monkeypatch.setattr(locks, "pid_alive", lambda pid: True)
        path.write_text(path.read_text(encoding="utf-8").replace(
            '"startedAt"', f'"boot": "{(boot - timedelta(hours=3)).isoformat()}", "startedAt"'),
            encoding="utf-8")
        assert locks.held_by(path) is None

    def test_lock_from_this_boot_still_holds(self, monkeypatch, tmp_path):
        locks, path = self._lock(tmp_path, boot=None)
        boot = locks._boot_time()
        monkeypatch.setattr(locks, "pid_alive", lambda pid: True)
        path.write_text(path.read_text(encoding="utf-8").replace(
            '"boot": null', f'"boot": "{boot.isoformat()}"'), encoding="utf-8")
        assert locks.held_by(path) is not None

    def test_lock_without_boot_field_still_holds(self, monkeypatch, tmp_path):
        """Altbestand ohne das Feld bleibt gueltig — die Pruefung darf nicht rueckwirkend freigeben."""
        locks, path = self._lock(tmp_path)
        monkeypatch.setattr(locks, "pid_alive", lambda pid: True)
        assert locks.held_by(path) is not None
