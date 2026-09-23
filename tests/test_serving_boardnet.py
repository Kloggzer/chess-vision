"""Brett-Netz und CLAHE-Lauf durch `predict_arrays`."""

import json

import numpy as np
import pytest

torch = pytest.importorskip("torch")

from chesslab import config, serving  # noqa: E402
from chesslab.training.boardnet import CELLS  # noqa: E402

CLASSES = config.IDENTITY_CLASSES
SIZE = 32


def _run(tmp_path, backbone: str, clahe: float = 0.0, name: str = "r"):
    from chesslab.training.model import build_model

    d = tmp_path / name
    d.mkdir()
    model = build_model(backbone, len(CLASSES), norm="batchnorm", head="combined",
                        board_width=16, board_layers=1)
    torch.save(model.state_dict(), str(d / "best.pt"))
    (d / "config.json").write_text(json.dumps({
        "backbone": backbone, "classes": CLASSES, "out_size": [SIZE, SIZE],
        "norm": "batchnorm", "head": "combined", "board_width": 16, "board_layers": 1,
        **({"clahe_clip": clahe, "clahe_tile": 8} if clahe else {}),
    }), encoding="utf-8")
    serving.clear_cache()
    return d


def _crops(n: int, seed: int = 0):
    rng = np.random.default_rng(seed)
    return [rng.integers(0, 256, (SIZE, SIZE, 3), dtype=np.uint8) for _ in range(n)]


def test_board_cells_names_the_board_runs():
    assert serving.board_cells({"backbone": "boardattn:cellnet_p4"}) == CELLS
    assert serving.board_cells({"backbone": "board:smallcnn"}) == CELLS
    assert serving.board_cells({"backbone": "mobilenetv4_conv_small_035"}) is None
    assert serving.board_cells({}) is None


def test_a_board_net_reads_a_whole_board(tmp_path):
    """Der Fall, an dem `model-read` mit den Fold-Modellen gestorben ist."""
    run = _run(tmp_path, "board:smallcnn")
    out = serving.predict_arrays(run, _crops(CELLS), device="cpu", return_probs=True)
    assert len(out) == CELLS
    assert all(r["pred_label"] in CLASSES for r in out)


def test_a_board_net_refuses_a_partial_board(tmp_path):
    """Lieber laut abbrechen als 63 Zellen still auf ein Brett aufrunden."""
    run = _run(tmp_path, "board:smallcnn")
    with pytest.raises(ValueError, match="ganze Bretter"):
        serving.predict_arrays(run, _crops(CELLS - 1), device="cpu")


def test_two_boards_at_once_keep_their_order(tmp_path):
    run = _run(tmp_path, "board:smallcnn")
    crops = _crops(2 * CELLS, seed=1)
    both = serving.predict_arrays(run, crops, device="cpu", return_probs=True)
    first = serving.predict_arrays(run, crops[:CELLS], device="cpu", return_probs=True)
    assert len(both) == 2 * CELLS
    # Das erste Brett muss dasselbe ergeben, ob es allein oder als Teil zweier kommt.
    for a, b in zip(both[:CELLS], first, strict=True):
        assert np.allclose(a["probs"], b["probs"], atol=1e-5)


def test_clahe_closes_the_hand_rolled_fast_path(tmp_path):
    """Der Schnellpfad kennt CLAHE nicht — mit CLAHE muss er zu bleiben, sonst faellt der
    Operator still weg und das Modell inferiert mit einer anderen Vorverarbeitung."""
    from PIL import Image

    from chesslab.training.torch_data import eval_transform_for

    run = _run(tmp_path, "smallcnn", clahe=2.0, name="clahe")
    cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
    assert not serving._is_plain_rgb(cfg), "der CUDA-Graph-Pfad darf CLAHE nicht ueberspringen"

    crops = _crops(8, seed=2)                       # schon in Inferenzgroesse
    got = serving.predict_arrays(run, crops, device="cpu", return_probs=True)

    model, _ = serving.load_run(run, "cpu", None)
    tf = eval_transform_for(cfg, (SIZE, SIZE))
    batch = torch.stack([tf(Image.fromarray(c[:, :, ::-1].copy())) for c in crops])
    with torch.no_grad():
        want = torch.softmax(model(batch).float(), dim=1).numpy()
    assert np.allclose([r["probs"] for r in got], want, atol=1e-5)


def test_without_clahe_the_fast_path_stays_open(tmp_path):
    """Sonst haette der Fix jede Live-Inferenz auf den langsamen PIL-Weg gezwungen."""
    run = _run(tmp_path, "smallcnn", name="plain")
    cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
    assert serving._is_plain_rgb(cfg)


def test_an_onnx_board_export_is_not_reshaped(tmp_path):
    """Der ONNX-Export eines Brett-Netzes traegt die Brettachse SELBST (`_BoardExport` macht
    `unsqueeze(0)`), sein Graph nimmt (64, C, H, W). Die Umformung hier hat am 2026-09-07 jeden
    `retime`-Lauf blockiert: 5-D hinein, 4-D erwartet."""
    onnxruntime = pytest.importorskip("onnxruntime")
    assert onnxruntime is not None

    run = _run(tmp_path, "board:smallcnn", name="onnx")
    model, cfg = serving.load_run(run, "cpu", None)

    class _Export(torch.nn.Module):
        def __init__(self, inner):
            super().__init__()
            self.inner = inner

        def forward(self, x):
            return self.inner(x.unsqueeze(0))

    torch.onnx.export(_Export(model).eval(), torch.randn(CELLS, 3, SIZE, SIZE),
                      str(run / "model.onnx"), input_names=["input"],
                      output_names=["logits"], opset_version=17, dynamo=False)
    serving.clear_cache()

    onnx_model, _ = serving.load_run(run, "cpu", None)
    assert isinstance(onnx_model, serving._ONNXModel), "der Test prueft den ONNX-Pfad"
    # Ohne den Guard fliegt hier ein Shape-Fehler aus der ORT-Session.
    out = serving.predict_arrays(run, _crops(CELLS, seed=7), device="cpu", return_probs=True)
    assert len(out) == CELLS
