"""Bug-Hunt: Skripte, die Zahlen liefern, auf denen Entscheidungen stehen."""

from __future__ import annotations

from pathlib import Path

import pytest

from conftest import load_script

ROOT = Path(__file__).resolve().parents[1]


# --- mine_hard_empty: der mm://-Filter warf den ganzen Datensatz weg ---------------------

def test_mine_hard_empty_keeps_packed_rows_when_a_reader_exists():
    mod = load_script("mine_hard_empty")
    rows = [{"path": f"mm://rg-2026-08-07-13-52-38-128/000117/{sq}", "label": "empty"}
            for sq in ("a1", "a2", "a3")]
    kept, dropped = mod.drop_packed_rows(rows, have_reader=True)
    assert dropped == 0
    assert len(kept) == len(rows)


def test_mine_hard_empty_reports_the_packed_rows_it_drops():
    mod = load_script("mine_hard_empty")
    rows = [{"path": "mm://x/0/a1", "label": "empty"},
            {"path": "data/crops/default/x.png", "label": "empty"}]
    kept, dropped = mod.drop_packed_rows(rows, have_reader=False)
    assert dropped == 1
    assert [r["path"] for r in kept] == ["data/crops/default/x.png"]


# --- commit_calibrate: verweigerte Aufnahmen fielen aus dem Nenner ------------------------

def _commit_rows(session: str, n_ok: int, n_bad: int, margin_ok: float, margin_bad: float):
    rows = [{"session": session, "san": f"ok{i}", "correct": True, "margin": margin_ok}
            for i in range(n_ok)]
    rows += [{"session": session, "san": f"bad{i}", "correct": False, "margin": margin_bad}
             for i in range(n_bad)]
    return rows


def test_commit_calibrate_counts_refused_recordings_in_the_denominator():
    mod = load_script("commit_calibrate")
    # Gegen A allein (nur Erfindungen) findet sich keine Schwelle, B wird also verweigert. Seine
    # 200 Referenz-Plies duerfen trotzdem nicht aus dem Nenner fallen.
    by_sess = {
        "A": _commit_rows("A", 0, 30, 1.0, 1.0),
        "B": _commit_rows("B", 200, 0, 1.0, 1.0),
    }
    refs = {"A": ["x1", "x2", "x3"], "B": [f"ok{i}" for i in range(200)]}
    tot = mod.loo_eval(by_sess, refs, mod.SCORES["margin"], alpha=0.02)
    assert tot["refused"] == 1
    assert tot["ref"] == 203, "eine verweigerte Aufnahme findet 0 von IHREN Plies, nicht 0 von 0"
    assert tot["found"] == 0


# --- bump_replay: `found` auf den SAN geschluesselt verlor Wiederholungen ------------------

_LOG = """  found 3
  missed 0
  invented 0
  beyond 0
    e4       label frame    100   run frame    103  (cnn)
    e5       label frame    140   run frame    142  (cnn)
    e4       label frame    900   run frame    905  (cnn)
"""


def test_bump_replay_score_keeps_a_repeated_san(tmp_path: Path):
    mod = load_script("bump_replay")
    log = tmp_path / "video.log"
    log.write_text(_LOG, encoding="utf-8")
    found = mod.score(log)["found"]
    assert len(found) == 3, "19 von 32 Aufnahmen wiederholen einen SAN; keine Zeile darf fehlen"
    assert found[("e4", 100)] == 103
    assert found[("e4", 900)] == 905


# --- adabn_recalibrate: NaN-Statistik und fehlendes CLAHE ---------------------------------

def test_adabn_channelstats_refuses_an_empty_pass():
    mod = load_script("adabn_recalibrate")
    with pytest.raises(SystemExit, match="nothing to calibrate"):
        mod.ChannelStats(4).finish()


def test_adabn_channelstats_still_measures_a_real_pass():
    torch = pytest.importorskip("torch")
    mod = load_script("adabn_recalibrate")
    stats = mod.ChannelStats(2)
    stats.observe(torch.ones(4, 2, 3, 3))
    mean, var = stats.finish()
    assert mean.tolist() == [1.0, 1.0]
    assert var.tolist() == [0.0, 0.0]


def test_adabn_refuses_a_clahe_run():
    mod = load_script("adabn_recalibrate")
    with pytest.raises(SystemExit, match="clahe_clip"):
        mod.require_no_clahe("mnv3s128-bn-all", {"clahe_clip": 2.0, "norm": "batchnorm"})
    mod.require_no_clahe("occ-v4bn-f3", {"clahe_clip": 0.0})


# --- sweep_warp_resolution: ein nicht erreichter Betriebspunkt sah erreicht aus -------------

def test_sweep_warp_phantoms_at_miss_target_counts_an_unreachable_budget():
    np = pytest.importorskip("numpy")
    mod = load_script("sweep_warp_resolution")
    trues = np.array([True, True, False, False])
    probs = np.array([0.9, 0.8, 0.1, 0.2])
    phantoms, misses, _t = mod.phantoms_at_miss_target(trues, probs, target=10)
    assert misses == 2, "das Budget uebersteigt die besetzten Zellen — das muss die Zahl sagen"
    assert phantoms == 0


def test_sweep_warp_phantoms_at_miss_target_without_occupied_cells():
    np = pytest.importorskip("numpy")
    mod = load_script("sweep_warp_resolution")
    trues = np.array([False, False, False])
    probs = np.array([0.1, 0.5, 0.9])
    phantoms, misses, _t = mod.phantoms_at_miss_target(trues, probs, target=5)
    assert misses == 0
    assert phantoms == 3, "ohne besetzte Zelle ist die freieste Schwelle 0 — jede Leere ist Phantom"


def test_sweep_warp_report_marks_the_unmatched_cell():
    np = pytest.importorskip("numpy")
    mod = load_script("sweep_warp_resolution")
    lines: list[str] = []
    trues = np.array([True, True, False, False])
    probs = np.array([0.9, 0.8, 0.1, 0.2])
    data = {("r", 800, 96): (trues, probs >= 0.5, probs)}
    mod.report(lines.append, "r", "test", (800,), (96,), data, target=10)
    row = next(line for line in lines if line.strip().startswith("800"))
    assert "!" in row, "der Zellwert selbst muss markiert sein"
