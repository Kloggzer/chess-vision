"""JSON/JSONL-Audit 2026-09-16, Rest-Bereich: `src/chesslab/` ohne die Matte-Module, plus `scripts/`.

Die Prueflisten-Nummer steht je Test im Docstring. Gemeinsame Regel fuer `.jsonl`: der
ZEILENUMBRUCH entscheidet (`ioutil.read_jsonl`, `platform/app/lib/jsonl.ts`).
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pytest
import yaml

from chesslab import capture_import, composite, config, hand_gate

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"_script_{name}", ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _dies_after(n: int):
    """`json.dumps` des Moduls stirbt beim (n+1)-ten Aufruf — Platte voll, Prozess getoetet."""
    real, calls = json.dumps, {"n": 0}

    def dumps(obj, *a, **kw):
        calls["n"] += 1
        if calls["n"] > n:
            raise OSError("no space left on device")
        return real(obj, *a, **kw)

    return dumps


def _half_write(self, data, *_a, **_kw):
    """Gekuerzt und dann gestorben — genau das, was ein `write_text` ohne Staging hinterlaesst."""
    self.write_bytes(data.encode("utf-8")[: len(data) // 2])
    raise OSError("no space left on device")


# --- 1. Die halbe letzte Zeile ------------------------------------------------------------

def test_a_half_written_timeline_tail_does_not_kill_the_capture_import(tmp_path):
    """Prueflist 1. Das Telefon stroemt in `timeline.jsonl`; eine abgebrochene Aufnahme laesst
    eine halbe LETZTE Zeile zurueck, und `json.loads` darauf verwarf das ganze Buendel."""
    good = json.dumps({"kind": "video_sync", "elapsedNs": 10, "durationNs": 100})
    (tmp_path / "timeline.jsonl").write_text(good + "\n" + '{"kind": "video_sy',
                                             encoding="utf-8")

    assert capture_import.video_syncs(tmp_path) == [(10, 100)]


def test_a_broken_timeline_line_that_ends_in_a_newline_stays_loud(tmp_path):
    """Prueflist 1, Gegenrichtung: eine kaputte Zeile MIT Umbruch kann kein Schreiber erklaeren."""
    good = json.dumps({"kind": "video_sync", "elapsedNs": 10, "durationNs": 100})
    (tmp_path / "timeline.jsonl").write_text('{"kind": "video_sy' + "\n" + good + "\n",
                                             encoding="utf-8")

    with pytest.raises(ValueError):
        capture_import.video_syncs(tmp_path)


def test_the_watchdog_survives_a_metrics_file_that_is_still_being_written(tmp_path):
    """Prueflist 1. `train.py` haengt `metrics.jsonl` je Epoche an; die Wache liest sie WAEHREND
    des Laufs und starb an der halben letzten Zeile — genau dann, wenn sie da sein soll."""
    from chesslab.ioutil import read_jsonl

    watchdog = _load("train_watchdog")
    # Der Nachbau ist weg; was bleibt, ist der Name, den die Wache benutzt. Ein eigener Leser
    # unter diesem Namen faellt hier auf — genau so kam der Nachbau ueberhaupt zustande.
    assert watchdog.read_jsonl is read_jsonl

    path = tmp_path / "metrics.jsonl"
    path.write_text(json.dumps({"epoch": 1}) + "\n" + '{"epoch": 2, "macro', encoding="utf-8")
    assert watchdog.read_jsonl(path) == [{"epoch": 1}]

    path.write_text('{"epoch": 1, "mac' + "\n" + json.dumps({"epoch": 2}) + "\n",
                    encoding="utf-8")
    with pytest.raises(ValueError):
        watchdog.read_jsonl(path)


# --- 2. Schreiben ohne Staging ------------------------------------------------------------

def test_a_killed_capture_import_leaves_the_previous_session_log_intact(tmp_path, monkeypatch):
    """Prueflist 2. `log.jsonl` ist die kanonische Datei der Aufnahme, und
    `provenance.session_stamp` stempelt auch eine halbe — `chain.ts` haelt die Sprosse dann
    fuer frisch."""
    capture_import.write_log(tmp_path, [{"ply": 1, "frame": "frames/000001.png"}])
    before = (tmp_path / "log.jsonl").read_text(encoding="utf-8")

    monkeypatch.setattr(capture_import.json, "dumps", _dies_after(2))
    with pytest.raises(OSError):
        capture_import.write_log(tmp_path, [{"ply": i} for i in range(9)])

    assert (tmp_path / "log.jsonl").read_text(encoding="utf-8") == before
    assert [p.name for p in tmp_path.iterdir()] == ["log.jsonl"], "Rest im Verzeichnis"


def test_a_killed_composite_run_does_not_take_every_earlier_clips_provenance(tmp_path, monkeypatch):
    """Prueflist 2 und 6. `_write_provenance` liest-aendert-schreibt EINE Datei fuer den ganzen
    Pool: `write_text` kuerzte sie, und `read_provenance` wirft danach fuer JEDEN Clip."""
    composite._write_provenance(tmp_path, "comp-a", {"fen": "8/8"})
    monkeypatch.setattr(Path, "write_text", _half_write)

    with pytest.raises(OSError):
        composite._write_provenance(tmp_path, "comp-b", {"fen": "8/8"})

    monkeypatch.undo()
    assert composite.read_provenance(tmp_path) == {"comp-a": {"fen": "8/8"}}
    assert [p.name for p in tmp_path.iterdir()] == [composite.PROVENANCE_FILE]


def test_a_killed_gate_scan_leaves_the_previous_gate_intact(tmp_path, monkeypatch):
    """Prueflist 2. Ein toleranter Leser verwirft die halbe letzte Zeile stumm — ein halber Lauf
    liest sich dann als ganzer, nur ohne `veto` fuer die fehlenden Frames."""
    path = tmp_path / "gate.jsonl"
    hand_gate.write_gate(path, [json.dumps({"frame": "000001", "veto": True})])
    before = path.read_text(encoding="utf-8")

    monkeypatch.setattr(Path, "write_text", _half_write)
    with pytest.raises(OSError):
        hand_gate.write_gate(path, ["{}"] * 5)

    monkeypatch.undo()
    assert path.read_text(encoding="utf-8") == before
    assert [p.name for p in tmp_path.iterdir()] == ["gate.jsonl"]


def test_a_killed_brightness_backfill_leaves_the_shared_manifest_intact(tmp_path, monkeypatch):
    """Prueflist 2. `backfill_brightness` schrieb das GETEILTE Manifest mit `open("w")` neu."""
    backfill = _load("backfill_brightness")
    dd, rows = _brightness_corpus(tmp_path, monkeypatch, backfill)
    before = (dd / "manifest.jsonl").read_text(encoding="utf-8")

    monkeypatch.setattr(backfill.json, "dumps", _dies_after(0))
    monkeypatch.setattr(sys, "argv", ["backfill", "--dataset", "ds"])
    with pytest.raises(OSError):
        backfill.main()

    assert (dd / "manifest.jsonl").read_text(encoding="utf-8") == before
    assert not list(dd.glob("*.tmp")), "Nebendatei liegen geblieben"
    assert rows  # der Korpus stand wirklich


# --- 3. Rueckgabewerte, die niemand liest --------------------------------------------------

def test_the_texture_match_does_not_report_success_on_a_write_that_failed(tmp_path, monkeypatch):
    """Prueflist 3. `cv2.imwrite` WIRFT NICHT — und geschrieben wird hier die Textur selbst."""
    tone = _load("match_texture_tone")
    img = np.full((4, 4, 3), 120, dtype=np.uint8)
    dst, ref = tmp_path / "dst.png", tmp_path / "ref.png"
    tone.cv2.imwrite(str(dst), img)
    tone.cv2.imwrite(str(ref), np.full((4, 4, 3), 30, dtype=np.uint8))
    monkeypatch.setattr(tone.cv2, "imwrite", lambda *_a, **_kw: False)

    with pytest.raises(SystemExit):
        tone.match(dst, ref)


# --- 5. "Nicht gemessen" als gemessener Normalwert -----------------------------------------

def test_sams_refusal_does_not_crash_the_clear_view_audit(tmp_path):
    """Prueflist 5. Eine `skipped`-Zeile traegt `coverage: null` (CLAUDE.md, 2026-09-15);
    `.get("coverage", {})` gab dann `None`, und `complete(None)` starb an `None.keys()`."""
    audit = _load("clear_view_audit")
    rec = tmp_path / "r1"
    rec.mkdir()
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "skipped": "zone too big", "coverage": None}) + "\n",
        encoding="utf-8")
    (rec / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png", "board": "boards/000001.webp"}) + "\n",
        encoding="utf-8")
    # Vollstaendig, sonst faellt `compare` schon am MODELL durch und die Matte wird nie angefasst.
    (rec / "model-reads.jsonl").write_text("".join(
        json.dumps({"frame": "000001", "square": sq, "model_cov": 0.9}) + "\n"
        for sq in sorted(audit.SQUARES)), encoding="utf-8")

    out = audit.audit_session(rec, [0.5], 0.15)

    assert out["thresholds"]["0.5"]["unknown"] == 1, "ungemessen ist kein freies Brett"


# --- 7. Stilles Ueberspringen --------------------------------------------------------------

def test_the_gate_teacher_set_says_what_it_dropped(tmp_path, monkeypatch):
    """Prueflist 7. 318 von 9 423 Matte-Zeilen fielen stumm heraus; `gate_scan` nebenan sagt
    selbst, dass ein halber Lauf sich sonst als ganzer liest."""
    from collections import Counter

    paths = config.Paths(root=tmp_path / "data")
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "log.jsonl").write_text(json.dumps(
        {"frame": "frames/000001.png", "board": "boards/000001.webp", "board_border": 0}) + "\n",
        encoding="utf-8")
    (rec / "matte.jsonl").write_text("".join(json.dumps(r) + "\n" for r in [
        {"frame": "000001", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.9}},
        {"frame": "000002", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.9}},
        {"frame": "000001", "source": "temporal", "concepts": {}, "coverage": {}},
    ]), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", paths)

    dropped = Counter()
    rows = hand_gate.gate_rows(skipped=dropped)

    assert len(rows) == 1
    assert dropped == {"no_board_in_log": 1, "not_sams_own": 1}


def test_the_damage_auditor_counts_the_damage_it_exists_to_find(tmp_path):
    """Prueflist 7. `except JSONDecodeError: pass` verschluckte genau die kaputten Zeilen, die
    der Bericht zaehlen soll — und meldete dann "nichts gefunden"."""
    damage = _load("audit_disk_damage")
    damage.BROKEN_LINES.clear()
    path = tmp_path / "matte.jsonl"
    path.write_text(json.dumps({"frame": "a"}) + "\n" + '{"frame": "b' + "\n"
                    + json.dumps({"frame": "c"}) + "\n", encoding="utf-8")

    assert len(damage._rows(path)) == 2
    assert damage.BROKEN_LINES == {str(path): 1}

    damage.BROKEN_LINES.clear()
    tail = tmp_path / "tail.jsonl"
    tail.write_text(json.dumps({"frame": "a"}) + "\n" + '{"frame": "b', encoding="utf-8")
    assert damage._rows(tail) == [{"frame": "a"}]
    assert damage.BROKEN_LINES == {}, "die halbe LETZTE Zeile ist erwartbar, kein Schaden"


def test_the_brightness_backfill_says_how_many_rows_it_never_found(tmp_path, monkeypatch, capsys):
    """Prueflist 7. Eine Zeile, deren Schluessel nicht im Pack steht, behielt `brightness: None`
    und wurde ungezaehlt uebersprungen — `[OK]` las sich wie ein vollstaendiger Nachtrag."""
    backfill = _load("backfill_brightness")
    dd, _ = _brightness_corpus(tmp_path, monkeypatch, backfill)
    monkeypatch.setattr(sys, "argv", ["backfill", "--dataset", "ds"])

    assert backfill.main() == 0

    assert "1 ohne Eintrag im Pack" in capsys.readouterr().out


# --- 9. Berichte, die aus nichts entstehen -------------------------------------------------

def test_the_matte_audit_does_not_report_zero_of_zero_as_a_result(tmp_path, monkeypatch, capsys):
    """Prueflist 9. Ohne eine einzige blinde Matte druckte der Lauf "0 von 0" und gab 0 zurueck."""
    audit = _load("matte_audit")
    (tmp_path / "recordings" / "r1").mkdir(parents=True)
    (tmp_path / "recordings" / "r1" / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "dirty_reason": "occluded",
                    "concepts": {"hand": 1}, "cells_over_half": 3}) + "\n", encoding="utf-8")
    out = tmp_path / "report.jsonl"
    monkeypatch.setattr(sys, "argv", ["matte_audit", "--recordings",
                                      str(tmp_path / "recordings"), "--out", str(out)])

    assert audit.main() == 1
    assert "nichts gemessen" in capsys.readouterr().out
    assert out.is_file() and not list(tmp_path.glob("*.tmp"))


def test_the_cell_audit_does_not_turn_nothing_measured_into_zero_percent(tmp_path, monkeypatch,
                                                                        capsys):
    """Prueflist 9. `100 * x / max(1, 0)` druckte "0.0 % der geflaggten Felder" auch dann, wenn
    nie ein Feld geflaggt wurde."""
    cell = _load("matte_cell_audit")
    (tmp_path / "recordings").mkdir()
    out = tmp_path / "cells.jsonl"
    monkeypatch.setattr(sys, "argv", ["matte_cell_audit", "--recordings",
                                      str(tmp_path / "recordings"), "--out", str(out)])

    assert cell.main() == 0

    printed = capsys.readouterr().out
    assert "nichts gemessen" in printed and "% der geflaggten Felder" not in printed


# --- Korpus fuer die beiden Backfill-Tests -------------------------------------------------

def _brightness_corpus(tmp_path, monkeypatch, backfill):
    """Ein Datensatz mit zwei Zeilen: eine steht im Pack, eine nicht."""
    dd = tmp_path / "datasets" / "ds"
    dd.mkdir(parents=True)
    rows = [{"session_id": "s", "frame": "000001", "square": "a1",
             "path": "mm://s-80/000001/a1"},
            {"session_id": "s", "frame": "000002", "square": "a1",
             "path": "mm://s-80/000002/a1"}]
    (dd / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    pack = tmp_path / "data" / "packs" / "s-80"
    pack.mkdir(parents=True)
    (pack / "packed_meta.json").write_text(
        json.dumps({"n": 1, "h": 2, "w": 2, "paths": ["mm://s-80/000001/a1"]}), encoding="utf-8")
    np.full((1, 2, 2, 3), 77, dtype=np.uint8).tofile(pack / "packed_images.u8")
    from chesslab import dataset_build

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(dataset_build, "dataset_dir", lambda name, *a, **kw: dd)
    return dd, rows
