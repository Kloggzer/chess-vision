"""Bug hunt 2026-09-22 — Datensatzbau, Sessions, Crop-Pool.

Vier Funde derselben Familie: eine Politik, die nirgends steht, ist beim naechsten Bau weg; ein
Name, der nichts beigetragen hat, wird trotzdem als Beitrag gefuehrt; und zwei Tueren am
Treuhaender vorbei, die eine tolerierte halbe Zeile in echte Beschaedigung verwandeln.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest
import yaml

from chesslab import config, labeling, sessions
from chesslab import dataset_build as DB
from chesslab.ioutil import read_jsonl


def _crop_row(paths: config.Paths, label: str, sid: str, frame: str, square: str,
              fill: int, fen: str = "x") -> dict:
    d = paths.crop_pool / label
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{sid}_{frame}_{square}.png"
    img = np.zeros((16, 16, 3), dtype=np.uint8)
    img[:8] = fill
    cv2.imwrite(str(p), img)
    return {"path": p.as_posix(), "label": label, "session_id": sid, "frame": frame,
            "ply": int(frame), "square": square, "square_color": "light",
            "fen": fen, "out_size": [16, 16]}


def _pool(paths: config.Paths, rows: list[dict]) -> None:
    mp = paths.crop_pool / "manifest.jsonl"
    mp.parent.mkdir(parents=True, exist_ok=True)
    mp.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def _corpus(paths: config.Paths) -> list[dict]:
    """Zwei Aufnahmen, je zwei Stellungen zu vier Frames — genug, damit `per_position` greift."""
    rows = []
    for sid in ("s1", "s2"):
        for pos, fen in enumerate(("fen-a", "fen-b")):
            for i in range(4):
                frame = f"{pos * 4 + i:04d}"
                rows.append(_crop_row(paths, "wP", sid, frame, "e2", 180, fen=fen))
                rows.append(_crop_row(paths, "wK", sid, frame, "e1", 90, fen=fen))
                rows.append(_crop_row(paths, "empty", sid, frame, "c4", 40, fen=fen))
    _pool(paths, rows)
    return rows


def _cfg(paths: config.Paths, name: str) -> dict:
    return yaml.safe_load((paths.datasets / name / "dataset.yaml").read_text(encoding="utf-8"))


# --- 1. `per_position` war die einzige Ausduenn-Politik, die nirgends landete ------------

def test_per_position_steht_im_dataset_yaml(tmp_path):
    """Auf der Platte: `real13-v7-thin16` fuehrt raw 979 363 -> after_dedup 634 594 (Faktor
    1,543) und einen `dedup`-Block, der `per_cell_cap: 0, phash_enabled: false` sagt. Die 35 %
    sind `per_position 16`, und nichts in der Datei nennt sie."""
    paths = config.Paths(root=tmp_path)
    _corpus(paths)
    res = DB.build_dataset("thin", ["s1", "s2"], per_position=1, rotations=(0,),
                           val_frac=0.0, test_frac=0.0, paths=paths, allow_degenerate=True)
    assert res["counts"]["after_dedup"] < res["counts"]["raw"], "der Aufbau duennt nicht aus"
    assert _cfg(paths, "thin")["dedup"]["per_position"] == 1


def test_like_erbt_per_position(tmp_path):
    """`--like` existiert, damit ein Zwilling dieselben Zeilen traegt. Ohne die aufgezeichnete
    Zahl baute er den vollen Korpus unter einem Namen, der das Gegenteil versprach."""
    paths = config.Paths(root=tmp_path)
    _corpus(paths)
    DB.build_dataset("donor", ["s1", "s2"], per_position=1, rotations=(0,),
                     val_frac=0.0, test_frac=0.0, paths=paths, allow_degenerate=True)
    twin = DB.build_dataset("twin", ["s1", "s2"], rotations=(0,), paths=paths,
                            allow_degenerate=True, like="donor")
    donor_final = _cfg(paths, "donor")["counts"]["final"]
    assert twin["counts"]["final"] == donor_final


# --- 2. Ein benannter Name ohne eine einzige Zeile ---------------------------------------

def test_leere_session_im_bau_wird_abgelehnt(tmp_path):
    """`_pack_manifests` verweigert denselben Fall seit je; der Pool-Weg liess den Namen fallen
    und `dataset.yaml` fuehrte ihn weiter unter `session_ids`."""
    paths = config.Paths(root=tmp_path)
    _corpus(paths)
    with pytest.raises(ValueError, match="gespenst"):
        DB.build_dataset("geister", ["s1", "gespenst"], rotations=(0,), val_frac=0.0,
                         test_frac=0.0, paths=paths, allow_degenerate=True)


def test_add_test_ohne_zeilen_wird_abgelehnt(tmp_path):
    """Eine Aufnahme, die eigens zum Messen aufgenommen wurde, still zu verschlucken ist genau
    der Fehler, gegen den `_split_from` seine uebrigen Absagen schreibt."""
    paths = config.Paths(root=tmp_path)
    _corpus(paths)
    DB.build_dataset("donor2", ["s1", "s2"], rotations=(0,), val_frac=0.0, test_frac=0.0,
                     paths=paths, allow_degenerate=True)
    with pytest.raises(ValueError, match="gespenst"):
        DB.build_dataset("twin2", ["s1", "s2"], rotations=(0,), paths=paths,
                         allow_degenerate=True, like="donor2", add_test=["gespenst"])


# --- 3. Der rohe Anhang an `sessions_archive/index.jsonl` --------------------------------

def _make_session(paths: config.Paths, sid: str) -> Path:
    d = paths.sessions / sid
    d.mkdir(parents=True, exist_ok=True)
    (d / "session.yaml").write_text(yaml.safe_dump({"session_id": sid}), encoding="utf-8")
    (d / "log.jsonl").write_text("", encoding="utf-8")
    return d


def test_archiv_index_ueberlebt_einen_abgerissenen_schwanz(tmp_path):
    """Ein mitten im Anhaengen erschlagener Schreiber laesst eine halbe LETZTE Zeile zurueck.
    `read_jsonl` traegt die; roh daran geklebt wird sie zur Beschaedigung MITTENDRIN, auf die
    danach JEDES Lesen wirft."""
    paths = config.Paths(root=tmp_path)
    _make_session(paths, "s-neu")
    index = paths.sessions_archive
    index.mkdir(parents=True, exist_ok=True)
    (index / "index.jsonl").write_text(
        json.dumps({"session_id": "s-alt", "reason": "r"}) + "\n" + '{"session_id": "s-hal',
        encoding="utf-8")

    sessions.archive_session("s-neu", "Testgrund", paths=paths)

    rows = read_jsonl(index / "index.jsonl")           # wirft heute ValueError
    assert [r["session_id"] for r in rows] == ["s-alt", "s-neu"]


# --- 4. Der Manifest-Schnitt las strenger als jeder andere Leser -------------------------

def _manifest_line(sid: str, frame: str) -> str:
    return json.dumps({"path": f"p/{sid}_{frame}.webp", "session_id": sid, "label": "wP"})


def test_manifest_schnitt_ueberlebt_ein_bom(tmp_path):
    """PowerShells `Out-File` stempelt hier ein BOM. `read_jsonl` liest `utf-8-sig`; dieser
    Schnitt las `utf-8` und starb an der ERSTEN Zeile jedes so beruehrten Pools."""
    mp = tmp_path / "manifest.jsonl"
    mp.write_bytes(b"\xef\xbb\xbf" + (_manifest_line("s1", "0001") + "\n").encode("utf-8")
                   + (_manifest_line("s2", "0001") + "\n").encode("utf-8"))

    labeling._replace_session_in_manifest(mp, "s2", [_manifest_line("s2", "0009")])

    rows = read_jsonl(mp)
    assert [(r["session_id"], r["path"]) for r in rows] == [
        ("s1", "p/s1_0001.webp"), ("s2", "p/s2_0009.webp")]


def test_manifest_schnitt_ueberlebt_einen_abgerissenen_schwanz(tmp_path):
    """Denselben Schwanz, den `read_jsonl` seit je verwirft, warf dieser Schnitt als
    `JSONDecodeError` — und damit starb jeder `slice` in diesen Pool."""
    mp = tmp_path / "manifest.jsonl"
    mp.write_text(_manifest_line("s1", "0001") + "\n" + '{"path": "p/s2_00',
                  encoding="utf-8")

    labeling._replace_session_in_manifest(mp, "s2", [_manifest_line("s2", "0009")])

    assert [r["session_id"] for r in read_jsonl(mp)] == ["s1", "s2"]


def test_manifest_schnitt_wirft_auf_kaputte_zeile_mittendrin(tmp_path):
    """Die Gegenprobe: eine kaputte Zeile MITTENDRIN ist Korruption und bleibt laut — sonst
    schriebe der Schnitt ein stillschweigend gekuerztes Manifest zurueck."""
    mp = tmp_path / "manifest.jsonl"
    mp.write_text(_manifest_line("s1", "0001") + "\n" + '{"path": "p/kaputt\n'
                  + _manifest_line("s3", "0001") + "\n", encoding="utf-8")
    with pytest.raises(ValueError):
        labeling._replace_session_in_manifest(mp, "s2", [])
