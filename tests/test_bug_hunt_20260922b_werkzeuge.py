"""Skript-Jagd: Nachweise, die "gleich" melden, ohne verglichen zu haben."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import board_parity  # noqa: E402
import commit_truth  # noqa: E402
import crop_parity  # noqa: E402
import move_timing_audit  # noqa: E402
import pack_parity  # noqa: E402


def _row(session: str, frame: str, square: str, label: str) -> dict:
    return {"session_id": session, "frame": frame, "square": square, "label": label}


class _FakeStream:
    """Was `Recording(...).frames()` liefert: ein schliessbarer Strom von (Index, Bild)."""

    def __init__(self, items):
        self._items = items

    def __iter__(self):
        return iter(self._items)

    def close(self):
        return None


def _receipt(frame: int, board: int, out: int) -> dict:
    quad = [0, 0, board, 0, board, board, 0, board]
    return {"frame": frame, "boardSize": board, "quad": quad,
            "padSide": 0.05, "outW": out, "outH": out}


def test_board_parity_meldet_keinen_erfolg_ohne_ein_einziges_verglichenes_brett(
        tmp_path, monkeypatch):
    """`board_parity` lief gruen durch, wenn KEIN rektifiziertes Bild zum Receipt passte.

    Der Schleifenrumpf sprang per `continue` ueber jeden Frame, dessen Kotlin-PNG fehlte, und
    danach stand nur noch `print(f"  -> {out}")` und `return 0`. Ein Lauf auf das falsche
    Verzeichnis — oder auf einen `rectify`-Lauf, der nie geschrieben hat — war damit von einem
    Lauf ohne jeden Unterschied nicht zu unterscheiden.
    """
    crop_dir, rect_dir, out = tmp_path / "crops", tmp_path / "rect", tmp_path / "out"
    crop_dir.mkdir()
    rect_dir.mkdir()
    (crop_dir / "crops.jsonl").write_text(
        json.dumps(_receipt(7, 64, 16)) + "\n", encoding="utf-8")

    frame = np.zeros((64, 64, 3), np.uint8)
    monkeypatch.setattr(board_parity, "Recording",
                        lambda _v: type("R", (), {"frames": lambda _s: _FakeStream([(7, frame)])})())
    monkeypatch.setattr(sys, "argv", ["board_parity", str(rect_dir), str(crop_dir),
                                      "video.mp4", "--out", str(out)])

    assert board_parity.main() == 1, "null verglichene Bretter duerfen kein Erfolg sein"


def test_pack_parity_faellt_auf_gleiche_mengen_mit_verschieden_vielen_zeilen_herein():
    """Der Nachweis verglich MENGEN und behauptete danach "Zeilen bitgleich".

    Die alte Bedingung war `only_pool == 0 and only_packs == 0`. Eine doppelte Zeile faellt in
    einer Menge weg, also ging ein Lauf mit 3 gegen 2 Zeilen als Paritaet durch — genau die
    Form, in der ein `--like`-Zwilling schon 228 Zeilen mehr trug.
    """
    pool = [_row("s", "1", "a1", "wP"), _row("s", "1", "a1", "wP"), _row("s", "2", "b2", "empty")]
    packs = [_row("s", "1", "a1", "wP"), _row("s", "2", "b2", "empty")]
    common, counts = pack_parity.row_parity(pool, packs)

    assert counts["only_pool"] == 0 and counts["only_packs"] == 0, "die alte Bedingung haelt"
    assert counts["pool_rows"] != counts["pack_rows"]
    px = {"n": len(common), "mean": 0.0}
    assert pack_parity.parity_problems(counts, px), "Zeilenzahl-Unterschied muss auffallen"


def test_pack_parity_nennt_die_leere_schnittmenge_als_fehlenden_beweis():
    """Zwei leere Manifeste ergaben "symmetric difference 0" — Gleichheit aus dem Nichts."""
    common, counts = pack_parity.row_parity([], [])
    assert counts["only_pool"] == 0 and counts["only_packs"] == 0

    px = pack_parity.pixel_parity(common, {}, {})
    assert px["n"] == 0
    assert any("nichts verglichen" in p for p in pack_parity.parity_problems(counts, px))


def test_crop_parity_zaehlt_die_uebersprungenen_felder_statt_sie_verschwinden_zu_lassen(tmp_path):
    """Eine abweichende Crop-FORM war der Befund und wurde per `continue` verschluckt.

    Danach meldete der Nachweis "byte-identical: n/n" ueber die Ueberlebenden. Hier hat Kotlin
    jedes der 64 Felder in der falschen Groesse geschrieben: alt blieben 0 Ergebnisse und keine
    Spur davon, neu stehen 64 Felder unter "Form verschieden".
    """
    kdir = tmp_path / "crops"
    kdir.mkdir()
    receipts = {3: _receipt(3, 64, 16)}
    frames = {3: np.full((64, 64, 3), 40, np.uint8)}
    for square in ("a1", "h8"):
        cv2.imwrite(str(kdir / f"{3:06d}_{square}.png"), np.zeros((5, 5, 3), np.uint8))

    results, skipped = crop_parity.compare(kdir, receipts, frames)

    assert results == []
    assert skipped["Form verschieden"] == 2
    assert skipped["Kotlin-Datei fehlt"] == 62


def test_crop_parity_meldet_den_frame_der_gar_nicht_dekodiert_wurde(tmp_path):
    """Frames aus dem Receipt, die der Decoder nie lieferte, fielen stumm aus dem Vergleich."""
    kdir = tmp_path / "crops"
    kdir.mkdir()
    results, skipped = crop_parity.compare(kdir, {9: _receipt(9, 64, 16)}, {})

    assert results == []
    assert skipped["Frame nicht im Video"] == 64


def test_move_timing_audit_zaehlt_eine_ungemessene_zelle_nicht_als_risiko():
    """`float(r.get("coverage") or 0.0)` las `None` als "voll sichtbar".

    `None` heisst nicht gemessen, nicht null — dieselbe Falle, die schon 49 % ungemessener
    Zellen als sichtbar gelesen hat. Sie schob jede Zelle ohne Matte in die Spalte `RISIKO`,
    also genau in die Zahl, die das Werkzeug meldet.
    """
    assert move_timing_audit.classify(None, False) == "ungemessen"
    assert move_timing_audit.classify(0.0, False) == "RISIKO"
    assert move_timing_audit.classify(0.9, False) == "maskiert"
    assert move_timing_audit.classify(0.0, True) == "gesichtet"


def test_commit_truth_traegt_die_herkunft_der_referenz_in_jede_zeile(tmp_path, monkeypatch):
    """7 der 11 Logs auf der Platte werden gegen `candidate.json` bewertet, nicht gegen ein PGN.

    `candidate.json` ist die Zugliste eines frueheren Trackerlaufs. Ohne `ref_kind` in der Zeile
    verschmilzt sie in `commits.jsonl` mit den vier PGN-Aufnahmen zu einer einzigen
    Treffer-Quote, die niemand mehr auftrennen kann.
    """
    monkeypatch.chdir(tmp_path)
    rec = tmp_path / "data" / "recordings" / "sitzung"
    rec.mkdir(parents=True)
    (rec / "candidate.json").write_text(json.dumps({"moves": [{"san": "e4"}]}), encoding="utf-8")
    calib = tmp_path / "tmp" / "calib"
    calib.mkdir(parents=True)
    (calib / "sitzung.log").write_text(
        "decision: ply=1 e4 decider=cnn\ndecision-conf: accepted=true p=0,9\n", encoding="utf-8")
    monkeypatch.setattr(commit_truth, "ROOT", Path("data/recordings"))

    assert commit_truth.main() == 0
    rows = [json.loads(x) for x in
            (calib / "commits.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    assert [r["ref_kind"] for r in rows] == ["candidate"]


def test_commit_truth_schreibt_keine_leere_wahrheit(tmp_path, monkeypatch):
    """Ohne ein einziges bewertetes Log wurde eine leere `commits.jsonl` geschrieben und 0 gemeldet."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "tmp" / "calib").mkdir(parents=True)
    (tmp_path / "tmp" / "calib" / "fremd.log").write_text("nichts\n", encoding="utf-8")
    monkeypatch.setattr(commit_truth, "ROOT", Path("data/recordings"))

    assert commit_truth.main() == 1
    assert not (tmp_path / "tmp" / "calib" / "commits.jsonl").exists()


def test_emission_persistence_meldet_die_uebersprungenen_aufnahmen(tmp_path, monkeypatch, capsys):
    """Der Code stand auf oberster Ebene und sprang Aufnahmen ohne `model-reads.jsonl` stumm an.

    Danach summierte er ueber eine Teilmenge, die im Ausdruck nirgends stand; mit null
    messbaren Aufnahmen druckte er `nan`-Quoten und "0 Stellungsintervalle" wie ein Ergebnis.
    """
    import emission_persistence

    monkeypatch.setattr(emission_persistence, "ROOT", tmp_path)
    assert emission_persistence.main(["fehlt-a", "fehlt-b"]) == 1
    out = capsys.readouterr().out
    assert "fehlt-a" in out and "fehlt-b" in out
    assert "nan" not in out


def test_occlusion_sensitivity_verschweigt_die_pack_zeilen_nicht(tmp_path, monkeypatch):
    """`Path(r["path"]).exists()` filterte jede `mm://`-Zeile weg — auf v7-128 alle 979 361.

    Uebrig blieb eine leere Zeilenliste, ein "[i] 0 Zellen" und danach ein TypeError tief im
    Lauf. Die Absage muss vorne stehen und sagen, WARUM nichts uebrig ist.
    """
    import occlusion_sensitivity

    rows = [dict(_row("s1", "1", "a1", "wP"), path="mm://s1-128/0"),
            dict(_row("s1", "2", "b2", "wP"), path="mm://s1-128/1")]
    with pytest.raises(SystemExit) as exc:
        occlusion_sensitivity.pick_rows(rows, ["s1"], 120)
    assert "mm://" in str(exc.value) and "2" in str(exc.value)
