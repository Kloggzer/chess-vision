"""Die fuenf Zustaende einer `matte.jsonl`-Zeile — dasselbe Fixture wie die TS-Seite.

`parity/_matte/matte_states.json` wird von KEINER Seite geschrieben und von beiden gelesen, wie
`parity/_geometry/mesh_crop_parity.json`. Grund: die Zustaende zu verwechseln war am 2026-09-15
und -16 vier Mal ein Bug — SAMs Absage als sauberes Brett, eine fehlende Matte als `coverage 0`.
Ein Fixture, das beide Seiten binden, faengt die fuenfte Instanz vor dem Fund.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab.labeling import read_matte
from chesslab.training.occlusion import PIECE_VISIBLE_MAX

FIXTURE = (Path(__file__).resolve().parents[1]
           / "android/core-engine/src/test/resources/parity/_matte/matte_states.json")


def _case() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _session(tmp_path: Path, rows: list[dict]) -> Path:
    sdir = tmp_path / "s"
    sdir.mkdir()
    (sdir / "matte.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return sdir


def test_a_refused_row_is_not_a_matte(tmp_path):
    case = _case()
    matte = read_matte(_session(tmp_path, case["rows"]))

    for want in case["expect"]:
        stem, state = want["stem"], want["state"]
        if state == "measured":
            continue          # die leere Messung trennt die Seiten — eigener Test darunter
        # `refused` UND `missing` sind beide "keine Messung" — der Unterschied ist, dass
        # `refused` das VERDECKTESTE Brett meint, nicht das freieste.
        assert stem not in matte, f"{stem}: {state} darf keine Matte sein"


@pytest.mark.xfail(reason="Python verwirft `coverage: {}`, TypeScript behaelt es ausdruecklich "
                          "(`label-stream.ts`: 'Nullen BLEIBEN')", strict=True)
def test_an_empty_measurement_is_a_measurement(tmp_path):
    """Gemessen UND frei ist nicht dasselbe wie ungemessen.

    `read_matte` filtert mit `if r.get("coverage")` — ein leeres Dict ist falsy, die Zeile faellt
    weg. Die TS-Seite behaelt sie ausdruecklich und nennt den Grund: ohne sie las `reachesPool`
    das Brett als ungemattet und liess es fallen, "waehrend Python seine 64 Zellen ins Training
    schneidet". Heute null solche Zeilen auf der Platte, also latent — aber die Seiten sind sich
    uneinig, und das aufzuloesen greift in den Trainingsweg (`docs/offene-entscheidungen.md`).
    """
    case = _case()
    matte = read_matte(_session(tmp_path, case["rows"]))

    assert "000020" in matte, "eine leere Messung ist eine Messung, keine fehlende"


def test_the_numbers_match_what_the_fixture_declares(tmp_path):
    case = _case()
    matte = read_matte(_session(tmp_path, case["rows"]))

    for want in case["expect"]:
        cover = matte.get(want["stem"])
        if cover is None:
            continue
        over = sorted(sq for sq, v in cover.items() if v > PIECE_VISIBLE_MAX)
        assert over == want["covered_over_visible_max"], want["stem"]
        assert max(cover.values(), default=0.0) == want["max"], want["stem"]
