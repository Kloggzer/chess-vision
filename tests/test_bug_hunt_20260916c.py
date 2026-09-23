"""Bug-Jagd 2026-09-16 (c): Python-Trainingsweg, `training/` und `dataset_build.py`."""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import pytest

from chesslab import config
from chesslab.dataset_build import _donor_pack_size, _donor_policy
from chesslab.training.evaluate import eval_summary
from chesslab.training.train import started_at
from conftest import write_jsonl


def _pack(paths: config.Paths, name: str, h: int, w: int) -> None:
    d = paths.packs / name
    d.mkdir(parents=True, exist_ok=True)
    (d / "packed_meta.json").write_text(
        json.dumps({"n": 1, "h": h, "w": w, "paths": [f"mm://{name}/000001/a1"]}),
        encoding="utf-8")


def _dataset(paths: config.Paths, name: str, rows: list[dict], cfg: dict) -> None:
    import yaml

    d = paths.datasets / name
    d.mkdir(parents=True, exist_ok=True)
    write_jsonl(d / "manifest.jsonl", rows)
    (d / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False), encoding="utf-8")


def test_donor_pack_size_reads_the_pack_and_not_the_pools_out_size(tmp_path):
    """Eine `mm://`-Zeile fuehrt das `out_size` ihres POOLS weiter, nicht das des Packs.

    Auf der Platte nachgewiesen: jede Zeile von `real13-mix-v6-80` sagt `[128, 128]`, waehrend
    die zitierten Packs 80x80 sind. `--like real13-mix-v6-80` baute den Zwilling damit aus
    128er Packs — genau das, was der Docstring der Funktion ausschliessen soll.
    """
    paths = config.Paths(root=tmp_path)
    _pack(paths, "sess-80", 80, 80)
    _dataset(paths, "donor-80",
             [{"path": "mm://sess-80/000001/a1", "label": "empty", "out_size": [128, 128]}],
             {"name": "donor-80", "packs": ["sess-80"]})

    assert _donor_pack_size(paths.datasets / "donor-80", paths) == (80, 80)


def test_donor_pack_size_still_reads_out_size_for_a_file_backed_donor(tmp_path):
    paths = config.Paths(root=tmp_path)
    _dataset(paths, "donor-files",
             [{"path": "data/crops/default/wP/x.webp", "label": "wP", "out_size": [128, 128]}],
             {"name": "donor-files"})

    assert _donor_pack_size(paths.datasets / "donor-files", paths) == (128, 128)


def test_like_refuses_a_donor_that_cannot_state_its_policy(tmp_path):
    """Ein Spender ohne `split:`/`dedup:` liefert ueberall `None`.

    `build_dataset` liest das als "nicht gesetzt": `per_cell_cap`/`phash` fallen auf die HEUTIGEN
    Vorgaben zurueck (der Docstring nennt genau diesen Unterschied als Grund fuer `--like`), und
    `seed=None` macht `dedup_metadata`s Ziehung nicht mehr reproduzierbar. Vier Datensaetze auf
    der Platte sind so gebaut, z. B. `turntable-13bn-80-v2`.
    """
    paths = config.Paths(root=tmp_path)
    _dataset(paths, "legacy", [{"path": "x", "label": "empty", "out_size": [80, 80]}],
             {"name": "legacy", "rotations": [0]})

    with pytest.raises(ValueError, match="dedup|split"):
        _donor_policy("legacy", paths)


def test_a_donor_that_states_its_policy_still_hands_it_over(tmp_path):
    """Die Gegenprobe: nur der SPRACHLOSE Spender wird verweigert, ein vollstaendiger nicht."""
    paths = config.Paths(root=tmp_path)
    _dataset(paths, "legacy2", [{"path": "x", "label": "empty", "out_size": [80, 80]}],
             {"name": "legacy2", "rotations": [0],
              "dedup": {"per_cell_cap": 256, "phash_enabled": False, "phash_hamming": 6},
              "split": {"val_frac": 0.15, "test_frac": 0.15, "seed": 7}})

    pol = _donor_policy("legacy2", paths)
    assert (pol["seed"], pol["per_cell_cap"]) == (7, 256)


def test_started_at_compares_the_two_writers_on_one_clock():
    """`locks.acquire` schreibt Ortszeit ohne Zone, die Web-App UTC mit `Z` — dieselbe Datei.

    Als Zeichenkette verglichen lag `_trainings_ahead_of_us` um den UTC-Versatz daneben, und
    damit trat der falsche Lauf zurueck.
    """
    local = datetime(2026, 9, 16, 14, 30, 0, 123456).astimezone()
    python_side = local.replace(tzinfo=None).isoformat()          # `datetime.now().isoformat()`
    web_side = local.astimezone(UTC).isoformat().replace("+00:00", "Z")   # `toISOString()`

    assert started_at(python_side) == pytest.approx(local.timestamp())
    assert started_at(web_side) == pytest.approx(local.timestamp())

    # Und die Ordnung stimmt ueber die Schreiber hinweg: der spaetere Lauf ist der spaetere,
    # egal welche der beiden Schreibweisen ihn notiert hat.
    earlier_web = (local - timedelta(hours=1)).astimezone(UTC).isoformat().replace("+00:00", "Z")
    assert started_at(earlier_web) < started_at(python_side)


def test_started_at_does_not_read_a_missing_stamp_as_the_oldest():
    """Ohne Stempel ist ein Lock UNBEKANNT. Als `""` sortierte er ganz nach vorn und trat
    damit nie zurueck — ein ungemessener Wert als Normalwert gelesen."""
    assert started_at(None) == float("inf")
    assert started_at("") == float("inf")
    assert started_at("2026-09-16T14:30:00") < started_at(None)


def _res(trues, preds, eligible):
    return {"trues": trues, "preds": preds,
            "classification_eligible": eligible,
            "board_acc": 0.5,
            # Was `evaluate_dataset` liefert: die Genauigkeit NUR auf den sichtbaren Zellen.
            "square_acc": sum(t == p for t, p, e in zip(trues, preds, eligible, strict=True) if e)
            / max(sum(eligible), 1)}


def test_square_acc_in_eval_json_is_corpus_wide_like_its_neighbours():
    """`eval_test.json` geht woertlich in `model_card.json["metrics"]`.

    `tests/test_eval_metric_names.py` pinnt fuer `piece_acc`/`occupied_acc`, dass ein
    unqualifizierter Name korpusweit ist. `square_acc` kam aus `evaluate_dataset` und war
    sichtbar-gefiltert — dieselbe Zahl unter dem Namen der anderen Zellmenge.
    """
    classes = ["wP", "empty"]
    trues, preds = [0, 0, 0, 0], [0, 0, 0, 1]
    eligible = [True, True, True, False]
    bd = {"piece_acc": 1.0, "occupied_acc": 1.0, "type_err": 0.0, "color_err": 0.0}

    summary = eval_summary(_res(trues, preds, eligible), classes, [1.0, 1.0], bd, 0.5, {}, {},
                           split_name="test", ds_name="d")

    assert summary["visible_square_acc"] == pytest.approx(1.0)
    assert summary["square_acc"] == pytest.approx(0.75), (
        "korpusweit muss die verdeckte Fehlzeile zaehlen")
    json.dumps(summary)


@pytest.mark.xfail(strict=True, reason="`recall` kommt als Argument aus `run_eval`s Konfusion "
                                       "ueber die sichtbaren Zellen; korpusweit zu rechnen "
                                       "braucht dort eine zweite Matrix und aendert die Zahl "
                                       "in jeder `eval_*.json`. Fund benannt, Fix nicht gebaut.")
def test_recall_in_eval_json_is_corpus_wide_too():
    """Derselbe Vertrag wie fuer `square_acc` — `recall` verletzt ihn weiter."""
    import numpy as np

    from chesslab.training.engine import confusion_matrix, per_class_recall

    classes = ["wP", "empty"]
    trues, preds = [0, 0, 0, 0], [0, 0, 0, 1]
    eligible = [True, True, True, False]
    vis = np.flatnonzero(eligible)
    cm = confusion_matrix(np.array(trues)[vis], np.array(preds)[vis], len(classes))
    visible_recall = per_class_recall(cm)

    bd = {"piece_acc": 1.0, "occupied_acc": 1.0, "type_err": 0.0, "color_err": 0.0}
    summary = eval_summary(_res(trues, preds, eligible), classes, visible_recall, bd, 0.5, {}, {},
                           split_name="test", ds_name="d")

    assert summary["recall"]["wP"] == pytest.approx(0.75)
