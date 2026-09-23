

def test_the_plate_carries_its_own_resolution_and_the_composite_reads_it(tmp_path):
    """Die Kachel wird seit 2026-08-23 in QUELLauflösung geschnitten, die Maske weiter klein.

    Wer die beiden verwechselt, setzt jede Hand um den Faktor zwei falsch ins Bild — deshalb steht
    die Quellgröße im Index und wird gelesen, statt aus `WORK_SIZE` erschlossen zu werden.
    """
    import json

    from chesslab.composite import plate_long_side
    from chesslab.occluders import WORK_SIZE

    assert plate_long_side(tmp_path) == max(WORK_SIZE), "ohne Index gilt die alte Annahme"

    (tmp_path / "occluders.json").write_text(
        json.dumps([{"video": "a.mp4", "source": [3840, 2160]},
                    {"video": "b.mp4", "source": [2160, 3840]}]), encoding="utf-8")
    assert plate_long_side(tmp_path) == 3840

    (tmp_path / "occluders.json").write_text(json.dumps([{"video": "a.mp4"}]), encoding="utf-8")
    assert plate_long_side(tmp_path) == max(WORK_SIZE), "ein Index ohne Quellgröße ist keiner"


def test_the_source_sets_the_warp_size_so_nothing_is_invented_and_thrown_away():
    """Der Composite warpte fest auf 1280 — auf einem 1080p-Clip ist das Brett aber nur 668 px
    breit, also 1,93x hoch, und der 80er Schnitt warf die erfundenen Pixel sofort wieder weg.

    62 % des Pretrains kamen 2026-08-23 aus solchen Clips. An `out_size` koppeln waere derselbe
    Fehler von der anderen Seite: dann skaliert man zweimal statt einmal.
    """
    from chesslab.realgames.mesh import measured_board_size

    def quad(edge: int):
        return [[0, 0], [edge, 0], [edge, edge], [0, edge]]

    for edge in (664, 668, 1216, 1293):
        size = measured_board_size(quad(edge))
        assert size <= edge + 16, f"{edge} px Quelle darf nicht auf {size} hochgerechnet werden"
        crop = (size / 8) * 1.10          # Zelle plus pad_side 0.05 auf beiden Seiten
        assert crop >= 80, f"{edge} px Quelle liefert nur {crop:.0f} px fuer einen 80er Crop"


def test_a_generic_filename_is_no_clip_id():
    """Vier Turntable-Quellen heissen `video.mp4` in verschiedenen Ordnern. Ueber den Stem benannt
    wurden sie alle zu `comp-video` — das Manifest behielt einen, und die Crops ueberschrieben sich
    gegenseitig auf der Platte, weil auch der Dateiname aus der Kennung kommt.
    """
    from pathlib import Path

    from chesslab.composite import clip_id

    assert clip_id(Path("data/footage/turntable/VID_20260731_092133/video.mp4")) == "VID_20260731_092133"
    assert clip_id(Path("data/footage/turntable/VID_20260731_222043/video.mp4")) == "VID_20260731_222043"
    assert clip_id(Path("data/footage/turntable/VID_20260817_214400.mp4")) == "VID_20260817_214400"
