"""Ein Re-Import darf ein handbearbeitetes `log.jsonl` nicht stumm ueberschreiben."""

import json

from tests.test_capture_import import _bundle

from chesslab import config
from chesslab.capture_import import import_capture


def test_an_existing_log_is_backed_up_before_the_import_rewrites_it(tmp_path, monkeypatch):
    """`realgames.write_session` sichert per `backup_log`, weil im Log handgesetzte Quads und
    Urteile stehen — der Erfassungs-Import schreibt daneben ohne jede Sicherung."""
    _bundle(tmp_path, monkeypatch)
    session = config.DATA.recordings / "g"
    session.mkdir(parents=True, exist_ok=True)
    hand_set = json.dumps({"frame": "frames/000030.png", "corners": [[1, 2]], "reviewed": True})
    (session / "log.jsonl").write_text(hand_set + "\n", encoding="utf-8")

    import_capture("g")

    backups = list(session.glob("log.jsonl.bak.*"))
    assert backups, "das vorhandene Log wurde ohne Sicherung ueberschrieben"
    assert backups[0].read_text(encoding="utf-8").strip() == hand_set
