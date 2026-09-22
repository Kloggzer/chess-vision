"""Bugjagd 2026-09-22b — vier Hypothesen um die Matten-Kette und die leere Menge.

Jede Zahl im Bericht ist an `data/recordings/*/matte.jsonl` bzw. `data/occluders/occluders.json`
gemessen; hier steht nur der rote Test je Befund.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from chesslab import config, ioutil, temporal_matte
from chesslab.cli import app
from chesslab.labeling import MATTE_DIRTY


def _recording(tmp_path: Path) -> Path:
    rec = tmp_path / "recordings" / "g"
    rec.mkdir(parents=True)
    return rec


def _matte(rec: Path, rows: list[dict]) -> Path:
    path = rec / "matte.jsonl"
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return path


# H1 — die zwei Schwellen derselben Entscheidung


def test_a_sam_cut_below_the_dirty_threshold_does_not_evict_the_upsert_row(tmp_path, monkeypatch):
    """`upsert_proposals` existiert genau dann, wenn SAMs `max(coverage) <= MATTE_DIRTY` ist.

    `prune_dead_rows` fragte dieselbe Frage mit `any(...)`, also ab 0,0001. Auf der Platte
    gemessen: 37 wirksame SAM-Zeilen im Band `0 < max <= 0,15`, 8 davon mit Upsert-Zeile in
    4 Aufnahmen, 27 Zellen kippen dabei von `> 0,15` auf `<= 0,15`.
    """
    rec = _recording(tmp_path)
    _matte(rec, [
        {"frame": "000001", "source": "sam", "coverage": {"a1": 0.05, "b1": 0.0}},
        {"frame": "000001", "source": "upsert", "coverage": {"a1": 0.9, "b1": 0.4}},
    ])
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))

    result = temporal_matte.prune_dead_rows("rg-g")

    assert result["dropped"] == 0
    kept = ioutil.read_jsonl(rec / "matte.jsonl")
    assert [r["source"] for r in kept] == ["sam", "upsert"]


def test_a_sam_cut_above_the_dirty_threshold_still_evicts_the_upsert_row(tmp_path, monkeypatch):
    """Die Gegenrichtung bleibt: ein Schnitt MIT Verdeckung ueberholt den Upsert."""
    rec = _recording(tmp_path)
    _matte(rec, [
        {"frame": "000001", "source": "sam", "coverage": {"a1": MATTE_DIRTY + 0.01}},
        {"frame": "000001", "source": "upsert", "coverage": {"a1": 0.9}},
    ])
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))

    assert temporal_matte.prune_dead_rows("rg-g")["dropped"] == 1


# H2 — drei unbewachte Schreiber auf eine Datei, an der der Alpha-Worker anhaengt


def test_pruning_refuses_to_overwrite_a_matte_written_while_it_worked(tmp_path, monkeypatch):
    """`matte.py` schreibt diese Datei seit je mit `write_rows_guarded`; die Temporal-Schreiber
    ersetzten sie unbewacht, waehrend `matte.alpha_worker` parallel anhaengt.
    """
    rec = _recording(tmp_path)
    path = _matte(rec, [
        {"frame": "000001", "source": "sam", "coverage": {"a1": 0.9}},
        {"frame": "000001", "source": "temporal", "coverage": {"a1": 0.9}},
    ])
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    real = temporal_matte.read_jsonl

    def read_then_someone_else_appends(target):
        rows = real(target)
        if Path(target) == path:
            ioutil.append_rows(path, [{"frame": "000002", "source": "sam", "coverage": {"a1": 0.9}}])
        return rows

    monkeypatch.setattr(temporal_matte, "read_jsonl", read_then_someone_else_appends)

    with pytest.raises(ioutil.Contested):
        temporal_matte.prune_dead_rows("rg-g")
    assert len(ioutil.read_jsonl(path)) == 3


def test_update_rows_still_guards_the_write_itself(tmp_path, monkeypatch):
    """Der Riegel sass VOR einem unbewachten `write_rows`: wer im Fenster dazwischen schrieb,
    war still verloren. Heute null produktive Aufrufer, der Riegel gilt trotzdem.
    """
    path = tmp_path / "rows.jsonl"
    ioutil.write_rows(path, [{"a": 1}])
    real = ioutil.rows_text

    fired = []

    def serialise_then_someone_else_writes(rows, **kw):
        text = real(rows, **kw)
        if not fired:
            fired.append(True)
            ioutil.append_rows(path, [{"b": 2}])
        return text

    monkeypatch.setattr(ioutil, "rows_text", serialise_then_someone_else_writes)

    with pytest.raises(ioutil.Contested):
        ioutil.update_rows(path, lambda rows: [*rows, {"c": 3}])
    assert ioutil.read_jsonl(path) == [{"a": 1}, {"b": 2}]


# H3 — die leere Menge meldet keine Null mehr


def _all_covered_dataset():
    torch = pytest.importorskip("torch")
    classes = ["empty", "wP"]
    rows = [{"session_id": "s", "frame": "1", "square": "a1", "label": "wP",
             "coverage": 0.9, "brightness": 200.0}]

    class Rows(torch.utils.data.Dataset):
        def __init__(self):
            self.rows = rows
            self.c2i = {c: i for i, c in enumerate(classes)}

        def __len__(self):
            return len(rows)

        def __getitem__(self, i):
            return torch.zeros(3, 8, 8), torch.tensor([1.0, rows[i]["coverage"]], dtype=torch.float32)

    class Model(torch.nn.Module):
        def forward(self, x):
            return torch.zeros(x.shape[0], len(classes) + 1)

    return Rows(), Model()


def test_a_run_without_a_single_gradable_cell_reports_unmeasured(tmp_path):
    """Jede Zelle ueber `PIECE_VISIBLE_MAX`: es gibt nichts zu benoten, und `0.0` waere die
    schlechteste denkbare Note statt der fehlenden. Die Konvention stand seit `fafc4f7d`
    in `per_session_metrics` und `coverage_metrics` schon da.
    """
    from chesslab.training.engine import evaluate_dataset

    ds, model = _all_covered_dataset()
    res = evaluate_dataset(model, ds, "cpu", num_workers=0, keep_workers=False)

    assert res["square_acc"] is None
    assert res["macro_recall"] is None
    # `conf_wrong`/`conf_right` tragen denselben leeren Nenner und bleiben trotzdem 0.0:
    # `test_training_bug_hunt` pinnt die Zahl, das ist eine eigene Entscheidung.
    assert res["conf_wrong"] == 0.0


def test_the_veto_metric_without_a_single_covered_cell_is_unmeasured():
    """`occlusion.coverage_metrics` meldet dieselbe Groesse schon als `None`; der Zwilling
    in `engine` meldete 0,0 — also "der Veto-Arm hat alles verpasst".
    """
    from chesslab.training.engine import _hit_rate

    assert _hit_rate([0.9, 0.9], [0.0, 0.0]) is None
    assert _hit_rate([0.9, 0.1], [0.9, 0.9]) == 0.5


# H4 — ein unlesbarer Clip ist kein erfolgreicher Lauf


def test_occluders_extract_fails_loudly_on_an_unreadable_clip(tmp_path, monkeypatch):
    """`extract` meldet `{"error": "unreadable"}` regulaer; die CLI zaehlte 0 Kacheln, schrieb
    den Fehler nach `occluders.json` und druckte `[OK]` mit Exit 0. Auf der Platte heute:
    3 Quellclips, 3 Eintraege, 0 mit `error` — der Fall ist ungeloest, nicht ausgeloest.
    """
    src = tmp_path / "clips"
    src.mkdir()
    (src / "broken.mp4").write_bytes(b"not a video")
    from chesslab import occluders

    monkeypatch.setattr(occluders, "extract",
                        lambda clip, out, **kw: {"video": clip.name, "error": "unreadable"})

    out = tmp_path / "out"
    out.mkdir()
    result = CliRunner().invoke(app, ["occluders", "extract", "--in", str(src), "--out", str(out)])

    assert result.exit_code != 0
    assert "unreadable" in result.output
