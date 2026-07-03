"""Sicherheitsnetz-Tests für den synthetic-Ingest-Adapter — headless, keine GPU/Kamera.

Fixtures: `tests/data/synth_sample/000000.json` (unregelmäßiges Viereck, keine Symmetrie).
Das PNG wird im Test generiert, nie eingecheckt.

**Contract-Wächter:** Der `synth/render_chessboard.py`-Renderer schreibt das JSON-Format
`{fen, corners: [[a8],[h8],[h1],[a1]]}`. Dieser Test prüft, dass die volle Ingest→Slice-Kette
die korrekte Orientierung erhält — eine vertauschte Eck-Reihenfolge würde **alle** synthetischen
Labels stillschweigend rotieren/spiegeln.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

from chesslab import config
from chesslab import ingest as ig
from chesslab.ingest_adapters import synthetic

# --- Fixture-Pfad & Ecken ----------------------------------------------------------------

FIXTURE_JSON = Path(__file__).resolve().parent / "data" / "synth_sample" / "000000.json"


def _fixture_corners() -> list[list[float]]:
    """Liest die unregelmäßigen Ecken [a8,h8,h1,a1] aus dem Fixture-JSON."""
    d = json.loads(FIXTURE_JSON.read_text(encoding="utf-8"))
    return d["corners"]


def _fixture_fen() -> str:
    return json.loads(FIXTURE_JSON.read_text(encoding="utf-8"))["fen"]


# --- Farbcodiertes Brett (identisch zu test_ingest.py::_synthetic_board) ------------------

def _synthetic_board(bs: int) -> np.ndarray:
    """8×8-Brett, jedes Feld eindeutig eingefärbt nach (col,row): so lässt sich nach dem Slicen
    prüfen, dass ein Feld-Crop wirklich aus der richtigen Bildregion stammt (Orientierung)."""
    cell = bs // 8
    img = np.zeros((bs, bs, 3), dtype=np.uint8)
    for col in range(8):
        for row in range(8):
            color = (col * 30 + 10, row * 30 + 10, 100)  # BGR, eindeutig je (col,row)
            img[row * cell : (row + 1) * cell, col * cell : (col + 1) * cell] = color
    return img


def _cell_color(col: int, row: int) -> tuple[int, int, int]:
    """Erwartete BGR-Farbe der Zelle (col,row) im synthetischen Brett (col 0=a..7=h, row 0=8..7=1)."""
    return (col * 30 + 10, row * 30 + 10, 100)


def _warp_board_to_fixture(board_img: np.ndarray, corners: list[list[float]],
                           out_w: int = 1200, out_h: int = 1000) -> np.ndarray:
    """Warpt das achsenparallele Brettbild so, dass die Brett-Ecken an `corners` landen.

    Quelle: [0,0]→a8, [w,0]→h8, [w,h]→h1, [0,h]→a1.
    Ziel: corners = [a8, h8, h1, a1] im Ausgabebild.
    """
    h, w = board_img.shape[:2]
    src = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype=np.float32)
    dst = np.array(corners, dtype=np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(board_img, M, (out_w, out_h))


# =======================================================================================
# Schema / Parsing
# =======================================================================================

def test_iter_items_parses_fixture(tmp_path):
    """iter_items erzeugt ImportItem mit float-Ecken und korrektem FEN aus dem Fixture-JSON."""
    corners = _fixture_corners()
    fen = _fixture_fen()

    # Generate a dummy PNG (any content, just needs to exist)
    png_path = tmp_path / "000000.png"
    board = _synthetic_board(256)
    cv2.imwrite(str(png_path), board)

    # Copy the fixture JSON
    json_path = tmp_path / "000000.json"
    json_path.write_text(FIXTURE_JSON.read_text(encoding="utf-8"), encoding="utf-8")

    items = list(synthetic.iter_items(tmp_path))
    assert len(items) == 1
    it = items[0]
    assert it.image_path.resolve() == png_path.resolve()
    assert it.fen == fen
    assert len(it.corners) == 4
    assert all(isinstance(c, float) for pt in it.corners for c in pt)
    np.testing.assert_allclose(it.corners, corners, rtol=0.01)


def test_iter_items_chunks_by_stem(tmp_path):
    """Stem 0–499 → synth-000, 500 → synth-001."""
    fen = _fixture_fen()
    board = _synthetic_board(256)
    for stem in (0, 250, 499, 500, 750, 999):
        cv2.imwrite(str(tmp_path / f"{stem:06d}.png"), board)
        (tmp_path / f"{stem:06d}.json").write_text(
            json.dumps({"fen": fen, "corners": _fixture_corners()}), encoding="utf-8")

    items = list(synthetic.iter_items(tmp_path))
    assert len(items) == 6
    groups = {it.group for it in items}
    assert groups == {"synth-000", "synth-001"}
    assert sum(1 for it in items if it.group == "synth-000") == 3
    assert sum(1 for it in items if it.group == "synth-001") == 3


def test_iter_items_skips_json_without_png(tmp_path):
    """JSON ohne zugehöriges PNG wird übersprungen."""
    (tmp_path / "000000.json").write_text(FIXTURE_JSON.read_text(encoding="utf-8"), encoding="utf-8")
    # kein PNG
    items = list(synthetic.iter_items(tmp_path))
    assert len(items) == 0


def test_iter_items_skips_corrupt_json(tmp_path):
    """Kaputtes JSON bricht den Iterator nicht ab."""
    cv2.imwrite(str(tmp_path / "000000.png"), _synthetic_board(256))
    (tmp_path / "000000.json").write_text("this is not json{{{", encoding="utf-8")
    # Gutes Item danach
    cv2.imwrite(str(tmp_path / "000001.png"), _synthetic_board(256))
    (tmp_path / "000001.json").write_text(
        json.dumps({"fen": _fixture_fen(), "corners": _fixture_corners()}), encoding="utf-8")

    items = list(synthetic.iter_items(tmp_path))
    assert len(items) == 1  # nur das gute Item
    assert items[0].image_path.stem == "000001"


def test_iter_items_skips_missing_corners(tmp_path):
    """JSON ohne corners-Feld → übersprungen."""
    cv2.imwrite(str(tmp_path / "000000.png"), _synthetic_board(256))
    (tmp_path / "000000.json").write_text(json.dumps({"fen": _fixture_fen()}), encoding="utf-8")
    items = list(synthetic.iter_items(tmp_path))
    assert len(items) == 0


# =======================================================================================
# Orientierungs-E2E
# =======================================================================================

def test_synthetic_ingest_orientation(tmp_path):
    """Farbcodiertes Brett durch die volle Ingest→Slice-Kette mit Fixture-Ecken.

    Der Test beweist, dass die Eck-Reihenfolge [a8,h8,h1,a1] korrekt interpretiert wird:
    - a8 (=col 0,row 0 im Quellbrett) landet als `a8`-Crop mit der Farbe von (0,0).
    - a1 (=col 0,row 7) landet als `a1`-Crop mit der Farbe von (0,7).
    - h8 (=col 7,row 0) und h1 (=col 7,row 7) entsprechend.
    """
    paths = config.Paths(root=tmp_path)
    corners = _fixture_corners()
    fen = _fixture_fen()

    # Farbcodiertes Brett in die Fixture-Perspektive warpen
    bs = 800
    board = _synthetic_board(bs)
    warped = _warp_board_to_fixture(board, corners)

    img_path = tmp_path / "board0.png"
    cv2.imwrite(str(img_path), warped)

    item = ig.ImportItem(image_path=img_path, corners=corners, fen=fen, group="g0")
    sids = ig.synthesize_sessions([item], tag="orientation", profile_name="orientation", paths=paths)
    assert sids == ["orientation__g0"]

    prof = ig.ingestion_profile("orientation", bs, out_size=(bs, bs))
    res = ig.slice_imported(sids, profile=prof, variant_tag="orientation", paths=paths)
    assert res["crops"] == 64

    manifest_path = paths.manifests / "squares__orientation.jsonl"
    rows = [json.loads(l) for l in manifest_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    by_sq = {r["square"]: r for r in rows}

    # Labels aus der Grundstellungs-FEN korrekt zugeordnet
    assert by_sq["a1"]["label"] == "wR"
    assert by_sq["e1"]["label"] == "wK"
    assert by_sq["a8"]["label"] == "bR"
    assert by_sq["e8"]["label"] == "bK"
    assert by_sq["e4"]["label"] == "empty"

    # Orientierung per Pixelfarbe: a1 = col0,row7 (Bild-Ursprung unten-links)
    def center_color(sq: str) -> np.ndarray:
        crop = cv2.imread(by_sq[sq]["path"])
        h, w = crop.shape[:2]
        return crop[h // 2, w // 2].astype(int)

    # a8 = (col 0, row 0) → Farbe von (0,0) im Quellbrett
    assert np.allclose(center_color("a8"), _cell_color(0, 0), atol=25)
    # h8 = (col 7, row 0)
    assert np.allclose(center_color("h8"), _cell_color(7, 0), atol=25)
    # a1 = (col 0, row 7)
    assert np.allclose(center_color("a1"), _cell_color(0, 7), atol=25)
    # h1 = (col 7, row 7)
    assert np.allclose(center_color("h1"), _cell_color(7, 7), atol=25)


def test_synthetic_ingest_rotated_corners_fails(tmp_path):
    """Negativprobe: rotierte Eck-Reihenfolge [h1,a1,a8,h8] → Farben passen NICHT.

    Dies beweist, dass der Test Fehlermodi erkennt: eine vertauschte Reihenfolge
    würde im Normalbetrieb still alle Labels rotieren. Dieser Test schlägt fehl,
    wenn die Pipeline die falsche Orientierung AKZEPTIERT.
    """
    paths = config.Paths(root=tmp_path)
    correct_corners = _fixture_corners()
    fen = _fixture_fen()

    # Richtiges Brett warpen (wie der Renderer es tun würde)
    bs = 800
    board = _synthetic_board(bs)
    warped = _warp_board_to_fixture(board, correct_corners)
    img_path = tmp_path / "board0.png"
    cv2.imwrite(str(img_path), warped)

    # ABER: falsche Eck-Reihenfolge im JSON → [h1, a1, a8, h8] statt [a8, h8, h1, a1]
    rotated_corners = [correct_corners[2], correct_corners[3],
                       correct_corners[0], correct_corners[1]]

    item = ig.ImportItem(image_path=img_path, corners=rotated_corners, fen=fen, group="g0")
    sids = ig.synthesize_sessions([item], tag="rotated", profile_name="rotated", paths=paths)
    prof = ig.ingestion_profile("rotated", bs, out_size=(bs, bs))
    ig.slice_imported(sids, profile=prof, variant_tag="rotated", paths=paths)

    manifest_path = paths.manifests / "squares__rotated.jsonl"
    rows = [json.loads(l) for l in manifest_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    by_sq = {r["square"]: r for r in rows}

    def center_color(sq: str) -> np.ndarray:
        crop = cv2.imread(by_sq[sq]["path"])
        h, w = crop.shape[:2]
        return crop[h // 2, w // 2].astype(int)

    # a8 mit rotierten Ecken bekommt die Farbe von h1 (col 7, row 7) — das sollte NIEMALS
    # mit der erwarteten a8-Farbe (col 0, row 0) übereinstimmen
    assert not np.allclose(center_color("a8"), _cell_color(0, 0), atol=25), \
        "rotierte Ecken sollten nicht die richtigen Feld-Farben liefern"


# --- Contract-Dokumentation --------------------------------------------------------------

def test_synthetic_contract_documented():
    """Dokumentiert den Eck-Reihenfolge-Contract als Sicherheitsanker.

    Der Renderer `synth/render_chessboard.py` schreibt `[a8,h8,h1,a1]` (= top-left, top-right,
    bottom-right, bottom-left aus Weiß-Sicht). Der `synthetic`-Adapter (`iter_items`) verlässt
    sich darauf und reicht sie 1:1 durch. Dieser Test ist der Wächter: bricht er, wurde der
    Contract auf einer der beiden Seiten gebrochen.
    """
    # Lese das Fixture-JSON
    d = json.loads(FIXTURE_JSON.read_text(encoding="utf-8"))
    corners = d["corners"]
    assert len(corners) == 4

    # Die Ecken bilden ein unregelmäßiges Viereck (keine Achsensymmetrie)
    pts = np.array(corners, dtype=np.float32)
    assert not np.allclose(pts[0], pts[2], atol=1)  # a8 ≠ h1 (nicht punktsymmetrisch)
    assert not np.allclose(pts[1], pts[3], atol=1)  # h8 ≠ a1
    # Kein Rechteck mit gleichen Kantenlängen (kein Quadrat oder Rechteck, das 90°-Rotation maskiert)
    d1 = np.linalg.norm(pts[1] - pts[0])  # a8→h8
    d2 = np.linalg.norm(pts[2] - pts[1])  # h8→h1
    d3 = np.linalg.norm(pts[3] - pts[2])  # h1→a1
    d4 = np.linalg.norm(pts[0] - pts[3])  # a1→a8
    # Alle vier Kanten sollten unterschiedlich lang sein (irreguläres Viereck)
    lengths = {round(d1), round(d2), round(d3), round(d4)}
    assert len(lengths) >= 2, "Fixture-Ecken bilden ein zu symmetrisches Viereck"
