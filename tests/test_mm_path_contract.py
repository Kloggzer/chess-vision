"""Der Vertrag hinter `mm://` ist NUR das erste Segment: dort steht der Pack-Name.

Drei Schreiber bauen den Pfad, und einer davon ist Kotlin — dessen Form sichert sonst nichts.
Was hinter dem Kopf steht, unterscheidet sich absichtlich je Schreiber; wer es zerlegt, erfindet
einen Vertrag, den es nie gab.
"""

from __future__ import annotations

import pytest

from chesslab.training.packs import MM_PREFIX, mm_path, pack_name_of

#: Genau die Formen, die im Korpus vorkommen.
FORMEN = {
    "synth": "mm://comp13-80/rg-2026-08-08/000300_e4.png",
    "session-python": "mm://2026-08-08-11-55-19-80/000300/e4",
    # `Crops.kt` und `LabeledVideoPack.kt`: "mm://$id/$stem/$square".
    "session-kotlin": "mm://phone-20260824-153751/0042/h7",
}


@pytest.mark.parametrize("form", sorted(FORMEN))
def test_jede_schreiberform_nennt_ihren_pack(form):
    assert pack_name_of(FORMEN[form]) == FORMEN[form][len(MM_PREFIX):].split("/")[0]


def test_der_bauer_erzeugt_beide_python_formen():
    assert mm_path("comp13-80", "rg-2026-08-08", "000300_e4.png") == FORMEN["synth"]
    assert mm_path("2026-08-08-11-55-19-80", "000300", "e4") == FORMEN["session-python"]


def test_ein_pack_name_ist_ein_segment():
    with pytest.raises(ValueError, match="one segment"):
        mm_path("zwei/teile", "000300", "e4")


def test_ein_kopf_ohne_rumpf_ist_kein_pfad():
    # `pack_name_of` weist ihn ab, also darf ihn niemand bauen koennen.
    with pytest.raises(ValueError, match="non-empty tail"):
        mm_path("comp13-80")
    with pytest.raises(ValueError, match="non-empty tail"):
        mm_path("comp13-80", "000300", "")
