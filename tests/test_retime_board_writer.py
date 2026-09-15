"""`cv2.imwrite` waehlt den Codec an der ENDUNG — `.webp.tmp` kennt es nicht.

`_write_boards` legt die Bilder erst daneben und haengt zuletzt um, damit ein Dekoder-Abbruch
nicht den ganzen Review-Satz kostet. Der Zwischenname war aber `<stem>.webp.tmp`, und OpenCV
antwortet darauf mit "could not find a writer for the specified extension". Folge: `phone-record`
stirbt bei der ERSTEN Datei, die alten Bilder bleiben um alte `frame_review`-Werte geschnitten
liegen, und die Confirm-Ansicht sagt bei jedem Halbzug "Kein Bild auf der Platte fuer dieses
Fenster". Gemessen am 2026-09-15 auf `2026-09-15-16-54-44`: 111 von 111 Halbzuegen ohne Bild.

Derselbe Fehler stand in `matte.close_seams` und ist dort am selben Tag behoben worden — dies ist
die zweite Stelle.
"""
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
