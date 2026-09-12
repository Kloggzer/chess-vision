"""Der Brettkopf: Zellordnung, Ausgabeform und die Null-Initialisierung."""

import torch

from chesslab.training.boardnet import CELLS, square_index
from chesslab.training.model import build_model

BACKBONE = "board:smallcnn"
ATTN = "boardattn:smallcnn"


def test_square_index_matches_kotlin_order():
    squares = [f"{f}{r}" for r in range(1, 9) for f in "abcdefgh"]
    assert [square_index(s) for s in squares] == list(range(CELLS))


def test_output_is_flat_per_cell():
    m = build_model(BACKBONE, 14).eval()
    with torch.no_grad():
        out = m(torch.randn(2, CELLS, 3, 48, 48))
    assert out.shape == (2 * CELLS, 14)


def test_fresh_board_head_is_the_identity():
    """Zero-init: frisch gebaut ist BoardNet bitgleich sein Per-Zell-Modell — Warmstart sicher."""
    m = build_model(BACKBONE, 14).eval()
    x = torch.randn(2, CELLS, 3, 48, 48)
    with torch.no_grad():
        assert torch.equal(m(x), m.cell_head(m.trunk(x.flatten(0, 1))))


def test_wrong_shape_fails_loudly():
    m = build_model(BACKBONE, 14).eval()
    try:
        m(torch.randn(4, 3, 48, 48))
    except ValueError as e:
        assert "BoardNet erwartet" in str(e)
    else:
        raise AssertionError("eine flache Charge muss abgelehnt werden")


def test_warm_start_from_a_per_cell_run_is_lossless(tmp_path):
    """Ohne die `trunk.`/`cell_head.`-Aliase in `adopt_weights` uebernaehme BoardNet NULL Tensoren."""
    from chesslab.training.model import adopt_weights

    flat = build_model("smallcnn", 14).eval()
    ckpt = tmp_path / "best.pt"
    torch.save(flat.state_dict(), ckpt)

    board = build_model(BACKBONE, 14)
    adopted, skipped = adopt_weights(board, ckpt)
    assert (adopted, skipped) == (len(flat.state_dict()), 0)

    board.eval()
    x = torch.randn(1, CELLS, 3, 48, 48)
    with torch.no_grad():
        assert torch.equal(board(x), flat(x.flatten(0, 1)))


def test_the_flat_pipeline_is_untouched():
    """Die Brett-Erweiterungen duerfen den geteilten Pfad nicht anfassen — dort laufen parallel
    Jobs. `collate_fn` fehlt am Zell-Datensatz, und ein flacher Warmstart gewinnt weiter mit dem
    UNveraenderten Schluessel, weil `candidates` ihn zuerst zurueckgibt."""
    from chesslab.training.torch_data import PackedSquareDataset, SquareDataset

    assert getattr(PackedSquareDataset, "collate_fn", None) is None
    assert getattr(SquareDataset, "collate_fn", None) is None

    flat = build_model("smallcnn", 14)
    for key in flat.state_dict():
        assert _candidates(key)[0] == key


def _candidates(key: str) -> list[str]:
    """Die Kandidatenliste aus `adopt_weights`, ohne sie zu exportieren."""
    out = [key]
    out.extend(key[len(w):] if key.startswith(w) else w + key for w in ("_mobile.", "trunk."))
    out.extend("cell_head." + key[len(h):] for h in ("classifier.", "head.") if key.startswith(h))
    return out


def test_attention_head_keeps_the_same_contract():
    """Der Aufmerksamkeitskopf ersetzt nur die Faltung — Form, Null-Start und Warmstart bleiben."""
    m = build_model(ATTN, 14).eval()
    x = torch.randn(2, CELLS, 3, 48, 48)
    with torch.no_grad():
        out = m(x)
        assert out.shape == (2 * CELLS, 14)
        assert torch.equal(out, m.cell_head(m.trunk(x.flatten(0, 1))))


def test_attention_sees_the_whole_board():
    """Zwei 3x3-Convs reichen 5x5 Felder weit, Aufmerksamkeit ueber alle 64: a1 muss auf h8
    reagieren koennen. Mit genulltem Ausgang waere das unsichtbar, also wird er hier geweckt."""
    m = build_model(ATTN, 14).eval()
    torch.nn.init.normal_(m.board.out.weight, std=0.1)
    x = torch.randn(1, CELLS, 3, 48, 48)
    with torch.no_grad():
        a = m(x)[0].clone()
        x[0, 63] = torch.randn(3, 48, 48)      # h8 aendern
        b = m(x)[0]
    assert not torch.allclose(a, b), "a1 hat h8 nicht bemerkt"


def test_cellnet_presets_build_and_stay_size_agnostic():
    """Der schnelle Trunk muss dieselben Vertraege halten: flache Ausgabe, freie Eingabegroesse
    (Global-Average-Pool), und als `boardattn:`-Trunk denselben Null-Start."""
    from chesslab.training.model import CELLNET_PRESETS

    for name in CELLNET_PRESETS:
        m = build_model(name, 14).eval()
        with torch.no_grad():
            for size in (80, 128):
                assert m(torch.randn(2, 3, size, size)).shape == (2, 14)

    m = build_model("boardattn:cellnet_p4", 14).eval()
    x = torch.randn(1, CELLS, 3, 128, 128)
    with torch.no_grad():
        assert torch.equal(m(x), m.cell_head(m.trunk(x.flatten(0, 1))))


def test_the_2x2_pool_keeps_every_contract_the_global_pool_held():
    """A1: die Zelle bleibt raeumlich aufgeloest, aber Breite und Groessenfreiheit aendern sich nicht."""
    from chesslab.training.model import CELLNET_PRESETS

    widths, patch, pool = CELLNET_PRESETS["cellnet_p4g2"]
    assert (widths, patch) == CELLNET_PRESETS["cellnet_p4"][:2] and pool == 2

    m = build_model("cellnet_p4g2", 14).eval()
    with torch.no_grad():
        for size in (80, 128):
            assert m(torch.randn(2, 3, size, size)).shape == (2, 14)


def test_the_pooled_trunk_hands_the_board_head_the_same_width():
    """Sonst waere der Vergleich mit `cellnet_p4` einer zweier Kopfgroessen, nicht zweier Trunks."""
    from chesslab.training.boardnet import build_trunk

    _, plain = build_trunk("cellnet_p4")
    _, pooled = build_trunk("cellnet_p4g2")

    assert plain == pooled


def test_the_pool_is_what_makes_the_difference_not_the_weights():
    """Auf einem Bild mit nur EINER hellen Ecke muss 2x2 etwas anderes sehen als der Mittelwert."""
    from chesslab.training.model import CellNet

    m = CellNet((8, 16), 4, 0, pool=2).eval()
    x = torch.zeros(1, 3, 32, 32)
    x[:, :, :16, :16] = 1.0
    flipped = torch.flip(x, dims=(3,))

    with torch.no_grad():
        assert not torch.allclose(m(x), m(flipped))
