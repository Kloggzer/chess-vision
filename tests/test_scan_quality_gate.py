"""Die Qualitaetswache der Scan-Einfuhr (`assess_report`) passt zum Bericht von
`prepare_scan`."""
from __future__ import annotations

from pathlib import Path

from chesslab.meshprep import prepare_scan
from chesslab.scan_discover import ScanItem, assess_report

OBJ = "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"


def _item(tmp_path: Path) -> ScanItem:
    src = tmp_path / "scan" / "wP"
    src.mkdir(parents=True)
    obj = src / "mesh_wP.obj"
    obj.write_text(OBJ, encoding="utf-8")
    return ScanItem(name="wP", obj=obj, tex=None, variant="v1")


def test_a_clean_verbatim_import_is_not_reported_as_suspicious(tmp_path):
    """`chesslab scan prepare` schreibt hinter jede einwandfreie Figur ein [WARN]."""
    report = prepare_scan(_item(tmp_path), tmp_path / "out", make_preview=False)
    level, msgs = assess_report(report)

    assert (level, msgs) == ("ok", []), \
        "die Wache warnt ueber eine Zahl, die der Bericht gar nicht traegt"


def test_the_gate_can_still_see_a_real_defect(tmp_path):
    """Gegenprobe: ein Bericht MIT Zahlen muss weiter warnen — die Wache selbst ist in Ordnung,
    nur ihr Eingang ist leer."""
    assert assess_report({"verts": 500})[0] == "warn"
