"""`_write_boards` schreibt ueber einen Zwischennamen, dessen Endung `cv2.imwrite` kennt."""
from __future__ import annotations

import pytest

cv2 = pytest.importorskip("cv2")
np = pytest.importorskip("numpy")


def test_opencv_writes_the_staging_name_this_module_uses(tmp_path):
    from chesslab.retime import staged_name

    image = np.zeros((16, 16, 3), np.uint8)
    target = staged_name(tmp_path, 42)

    assert cv2.imwrite(str(target), image), (
        f"OpenCV kann {target.name} nicht schreiben — der Codec haengt an der Endung")
    assert target.is_file() and target.stat().st_size > 0


def test_the_staging_name_is_not_the_final_one(tmp_path):
    from chesslab.retime import staged_name

    assert staged_name(tmp_path, 42) != tmp_path / "000042.webp"


def test_the_cleanup_does_not_eat_the_staged_files(tmp_path):
    # `out.glob("*.webp")` trifft `<stem>.tmp.webp` MIT. Loeschte die Aufraeumschleife sie, bliebe
    # nach dem Umhaengen nichts uebrig — schlimmer als der Absturz, den der Name behebt.
    from chesslab.retime import staged_name, stale_boards

    staged = [staged_name(tmp_path, 7), staged_name(tmp_path, 8)]
    old = [tmp_path / "000001.webp", tmp_path / "000002.webp"]
    for f in [*staged, *old]:
        f.write_bytes(b"x")

    assert sorted(stale_boards(tmp_path)) == sorted(old)
