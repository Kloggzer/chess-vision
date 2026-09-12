"""Der Brett-Hand-Report: welche exportierten Frames eine Hand tragen."""

from chesslab import frame_hands


def log(*stems):
    return [{"frame": f"frames/{s}.png", "ply": 1} for s in stems]


def test_nur_exportierte_frames_mit_hand():
    scan = [
        {"idx": 100, "gate": 0.97, "grid": ["e4", "e5"]},
        {"idx": 103, "gate": 0.01, "grid": []},
        # Gescannt, aber nie exportiert — die Lane zeigt es nicht, also steht es nicht im Report.
        {"idx": 106, "gate": 0.99, "grid": []},
    ]
    rows = frame_hands.session_hands(log("000100", "000103"), scan, "rg-g")
    assert rows == [{"session_id": "rg-g", "frame": "000100", "gate": 0.97, "grid": ["e4", "e5"]}]


def test_alter_scan_ohne_gate_erfindet_keine_zahl():
    # `occupied` faellt dann auf die drei alten Sensoren zurueck; eine Zahl daneben waere erfunden.
    rows = frame_hands.session_hands(log("000100"), [{"idx": 100, "grid": ["a1", "a2"]}], "rg-g")
    assert rows == [{"session_id": "rg-g", "frame": "000100", "gate": None, "grid": ["a1", "a2"]}]


def test_frame_ohne_scanzeile_wird_uebersprungen():
    # Stride 3: ein Frame, das der Scan nie gesehen hat, ist ungemessen und nicht handfrei.
    assert frame_hands.session_hands(log("000101"), [{"idx": 100, "gate": 0.9}], "rg-g") == []
