import numpy as np

from chesslab import matte_publish
from chesslab.ioutil import append_rows, read_jsonl


def test_staging_does_not_remove_a_successfully_published_file(tmp_path):
    final = tmp_path / "alpha.webp"
    with matte_publish.staging() as staged:
        matte_publish.stage(staged, "f", np.full((4, 4), 255, np.uint8), final)
        tmp, target = staged["f"]
        tmp.replace(target)

    assert final.is_file()
    assert not tmp.exists()


def test_append_publish_retracts_only_its_failed_row(tmp_path):
    session = tmp_path / "recording"
    session.mkdir()
    ledger = session / "matte.jsonl"
    append_rows(ledger, [{"frame": "old", "coverage": {"a1": 0.0}}])
    final = session / "mattes" / "new.webp"
    final.parent.mkdir()

    with matte_publish.staging() as staged:
        matte_publish.stage(staged, "new", np.full((4, 4), 255, np.uint8), final)

        def retract(rows, failed):
            return [row for row in rows if row.get("frame") not in failed]

        try:
            matte_publish.publish(
                session,
                "test",
                lambda: append_rows(ledger, [{"frame": "new", "coverage": {"a1": 1.0}}]),
                staged,
                retract,
                place=lambda *_args: (_ for _ in ()).throw(PermissionError("busy")),
            )
        except OSError:
            pass
        else:
            raise AssertionError("the injected placement failure must escape")

    assert read_jsonl(ledger) == [{"frame": "old", "coverage": {"a1": 0.0}}]
    assert not final.exists()
