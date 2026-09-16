"""JSON/JSONL-Audit der Kern-Module (ioutil, temporal_matte, sessions, retime, occluders).

Jeder Test gehoert zu genau einem Fund; die Begruendung steht am Test, der Fundort als `# TODO:`
im Quelltext. Zwei Klassen dominieren: ein `write_text` ohne Nebendatei (ein Abbruch laesst eine
halbe Datei zurueck, die der naechste Leser fuer vollstaendig haelt) und ein `cv2.imwrite`,
dessen `False` niemand liest.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab import config


def tear_write_text(monkeypatch, target: Path):
    """Der Schreiber stirbt MITTEN in der Datei: die Haelfte steht schon da, dann OSError.

    Ein `write_text`, das gar nicht erst schreibt, wuerde jeden dieser Tests bestehen lassen —
    es ist das Kuerzen-und-neu-Schreiben, das die Datei kostet.
    """
    real = Path.write_text

    def torn(self, data, *a, **kw):
        # Auch die Nebendatei: ein gestagter Schreiber muss ebenso sterben, nur eben daneben.
        if self.parent != target.parent or not self.name.startswith(target.name):
            return real(self, data, *a, **kw)
        real(self, data[:len(data) // 2], *a, **kw)
        raise OSError("no space left on device")

    monkeypatch.setattr(Path, "write_text", torn)


# --- 1. ioutil.read_jsonl: die halbe letzte Zeile auf CRLF ------------------------------------


def test_a_torn_crlf_tail_is_a_tail_and_not_corruption(tmp_path):
    """Gemessen am Korpus: 399 von 519 `.jsonl` auf dieser Platte tragen CRLF, weil jeder
    Schreiber im Textmodus oeffnet. Reisst der Schreiber zwischen `\\r` und `\\n` ab, bleibt ein
    einzelnes `\\r` stehen — und der Universal-Newline-Modus uebersetzt das in `\\n`. Die Regel
    "der Zeilenumbruch entscheidet" schlaegt dann genau auf dem Schwanz an, den sie dulden soll.
    """
    from chesslab.ioutil import read_jsonl

    path = tmp_path / "log.jsonl"
    path.write_bytes(b'{"a": 1}\r\n{"b": 2\r')

    assert read_jsonl(path) == [{"a": 1}], (
        "die abgerissene letzte Zeile wurde als Beschaedigung gemeldet, obwohl ihr der "
        "Zeilenumbruch fehlt — nur das `\\r` der Windows-Folge stand schon da")


def test_a_broken_line_that_really_ended_is_still_corruption_on_crlf(tmp_path):
    """Die Gegenrichtung: eine kaputte Zeile MIT vollstaendigem CRLF ist Beschaedigung."""
    from chesslab.ioutil import read_jsonl

    path = tmp_path / "log.jsonl"
    path.write_bytes(b'{"a": 1}\r\n{"b": 2\r\n{"c": 3}\r\n')

    with pytest.raises(ValueError):
        read_jsonl(path)


# --- 2. occluders.extract: `cv2.imwrite` gibt False zurueck, es wirft nicht --------------------


def test_extract_does_not_count_a_tile_it_could_not_write(tmp_path, monkeypatch):
    """`written` ist die einzige Zahl, die der Aufrufer ueber den Lauf bekommt. Schreibt OpenCV
    nichts (Platte voll, Pfad zu lang, Codec fehlt), zaehlt sie trotzdem hoch, und der Bericht
    liest sich wie ein vollstaendiger Lauf ueber Kacheln, die es nicht gibt.
    """
    cv2 = pytest.importorskip("cv2")
    np = pytest.importorskip("numpy")
    from chesslab import occluders

    monkeypatch.setattr(cv2, "imwrite", lambda *a, **kw: False)

    with pytest.raises(OSError):
        occluders.write_tile(tmp_path / "t.webp", np.zeros((4, 4, 4), np.uint8))


# --- 3. retime._write_boards: ein False verschluckt das Bild UND loescht das alte --------------


def test_the_board_writer_refuses_instead_of_dropping_a_review_picture(tmp_path, monkeypatch):
    """`_write_boards` stagt jedes Brett und loescht danach ALLE alten. Scheitert ein
    `imwrite`, faellt der Frame stumm aus `staged` — und die Aufraeumschleife nimmt ihm gleich
    darauf sein altes Bild weg. Die Confirm-Ansicht meldet dann "kein Bild", ohne dass irgendwo
    ein Fehler stand. Derselbe Defekt wie beim falschen Staging-Namen (2026-09-15), nur diesmal
    als ungelesener Rueckgabewert.
    """
    cv2 = pytest.importorskip("cv2")
    np = pytest.importorskip("numpy")
    from chesslab import retime

    out = tmp_path / "frames"
    out.mkdir()
    (out / "000007.webp").write_bytes(b"alt")
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **kw: False)

    with pytest.raises(OSError):
        retime.stage_board(out, 7, np.zeros((4, 4, 3), np.uint8), [])
    assert (out / "000007.webp").read_bytes() == b"alt", (
        "das alte Review-Bild ist weg, obwohl kein neues geschrieben wurde")


# --- 4. temporal_matte: Herkunftsstempel und Pass-Bericht gehen ungestagt auf die Platte -------


def test_a_torn_meta_write_leaves_no_half_stamp(tmp_path, monkeypatch):
    """`proposals.jsonl` wird ueber eine Nebendatei umgehaengt, `proposals.meta.json` daneben
    nicht. Stirbt der Lauf im Schreiben, liegt eine halbe JSON-Datei da — und
    `require_fresh_proposals` liest sie mit blankem `json.loads`, also stirbt jede Adoption an
    einem JSONDecodeError statt an dem "regenerate them", das genau dafuer dasteht.
    """
    from chesslab import temporal_matte

    path = tmp_path / "proposals.meta.json"
    path.write_text(json.dumps({"source": "alt", "method": "local"}), encoding="utf-8")
    before = path.read_text(encoding="utf-8")
    tear_write_text(monkeypatch, path)

    with pytest.raises(OSError):
        temporal_matte.write_proposal_meta(path, {"source": "neu", "method": "local"})

    assert path.read_text(encoding="utf-8") == before, "der alte Herkunftsstempel ist zerstoert"
    assert not list(tmp_path.glob("*.tmp")), "die Nebendatei blieb liegen"


def test_a_torn_pass_report_leaves_the_previous_one_readable(tmp_path, monkeypatch):
    """`pass.json` ist eine Sprosse der Kette: `chain.ts` vergleicht ihren `_source` gegen die
    `log.jsonl`. Eine halbe Datei ist kein JSON, und die Sprosse laesst sich dann weder oeffnen
    noch schliessen — sie wirft.
    """
    from chesslab import provenance, temporal_matte

    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    sdir = paths.recordings / "s1"
    sdir.mkdir(parents=True)
    monkeypatch.setattr(temporal_matte, "session_dir", lambda _sid: (sdir, False))
    monkeypatch.setattr(provenance, "source", lambda _d: "stamp")
    path = temporal_matte.write_pass_report("s1", {"adopted": 1})
    before = path.read_text(encoding="utf-8")
    tear_write_text(monkeypatch, path)

    with pytest.raises(OSError):
        temporal_matte.write_pass_report("s1", {"adopted": 2})

    assert json.loads(path.read_text(encoding="utf-8")) == json.loads(before)


# --- 5. temporal_matte.sam_matte liest anders als jeder andere Leser derselben Datei ----------


def test_sam_matte_tolerates_the_tail_its_neighbours_tolerate(tmp_path):
    """`matte.jsonl` wird vom Alpha-Worker ANGEHAENGT, waehrend `propose_session` laeuft — eine
    halbe letzte Zeile ist dort der Normalfall, nicht die Ausnahme. `labeling.read_matte` liest
    dieselbe Datei ueber `ioutil.read_jsonl` und duldet sie; `sam_matte` spaltet selbst und
    stirbt. Zwei Leser, eine Datei, zwei Antworten.
    """
    from chesslab.temporal_matte import sam_matte

    (tmp_path / "matte.jsonl").write_bytes(
        json.dumps({"frame": "000001", "coverage": {"a1": 0.2}}).encode() + b"\n"
        + b'{"frame": "000002", "cov')

    assert sam_matte(tmp_path) == {"000001": {"a1": 0.2}}


# --- 6./7./8. sessions: drei Schreiber ohne Nebendatei ----------------------------------------


def test_a_torn_trim_leaves_the_log_intact(tmp_path, monkeypatch):
    """`trim_session` schreibt `log.jsonl` mit einem blanken `write_text` neu — waehrend
    `_write_log` im selben Modul genau dafuer die Nebendatei haelt. Ein Abbruch kuerzt das Log
    auf eine halbe Zeile, und die Frames seines Schwanzes liegen zu diesem Zeitpunkt schon im
    Reject-Ordner: nichts holt sie zurueck.
    """
    import yaml

    from chesslab import sessions

    paths = config.Paths(root=tmp_path)
    sdir = paths.recordings / "s1"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "session.yaml").write_text(yaml.safe_dump({"session_id": "s1"}), encoding="utf-8")
    rows = [{"frame": f"frames/{i:04d}.png", "ply": i, "fen": "f"} for i in range(6)]
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    before = (sdir / "log.jsonl").read_text(encoding="utf-8")
    monkeypatch.setattr(sessions, "session_dir", lambda _sid, _p=None: (sdir, False))
    tear_write_text(monkeypatch, sdir / "log.jsonl")

    with pytest.raises(OSError):
        sessions.trim_session("s1", 3, paths)

    assert (sdir / "log.jsonl").read_text(encoding="utf-8") == before, (
        "das Log ist halb — und die entfernten Frames liegen schon im Reject-Ordner")


def test_a_torn_matte_filter_leaves_the_ledger_intact(tmp_path, monkeypatch):
    """`_filter_matte_frames` und `_filter_jsonl_frames` schreiben direkt, obwohl `_filter_jsonl`
    daneben ausdruecklich stagt ("ein Abbruch mitten im Schreiben traefe jede Session"). Fuer
    `matte.jsonl` gilt dasselbe: die Coverage ist Trainingsziel, und die Frames unter einer
    halben Datei gehen mit `coverage = 0.0` ins Training — die Coverage-Matte-Falle.
    """
    from chesslab import sessions

    path = tmp_path / "matte.jsonl"
    rows = [{"frame": f"{i:04d}", "coverage": {"a1": 0.5}} for i in range(6)]
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    before = path.read_text(encoding="utf-8")
    tear_write_text(monkeypatch, path)

    with pytest.raises(OSError):
        sessions._filter_matte_frames(tmp_path, {"0002"})

    assert path.read_text(encoding="utf-8") == before


def test_a_torn_interval_write_leaves_the_previous_checks_intact(tmp_path, monkeypatch):
    """`session settle-scan` schreibt `interval-check.jsonl` ungestagt.
    `position_flags.interval_flags` liest jede Zeile mit blankem `json.loads` und wirft dann —
    eine halbe Datei nimmt den Report ALLER Aufnahmen mit, nicht nur den dieser einen.
    """
    from chesslab import realgames, sessions

    path = tmp_path / realgames.INTERVAL_FILE
    path.write_text(json.dumps({"ply": 1, "seen": True}) + "\n", encoding="utf-8")
    before = path.read_text(encoding="utf-8")
    tear_write_text(monkeypatch, path)

    with pytest.raises(OSError):
        sessions.write_interval_checks(tmp_path, [{"ply": 1, "seen": True},
                                                  {"ply": 2, "seen": False}])

    assert path.read_text(encoding="utf-8") == before


# --- 9. retime: ein Modell ohne Coverage-Kopf liest sich wie ein freies Brett ------------------


@pytest.mark.xfail(strict=True, reason=(
    "Verhaltensaenderung: die Wache wuerde Laeufe ABLEHNEN, die heute (falsch) durchgehen. "
    "Gemessen auf `data/models`: 9 von 59 Modellen tragen keinen Coverage-Kopf, keines davon "
    "ist Vorgabe. Entscheidung gehoert dem Menschen, nicht diesem Audit."))
def test_retime_refuses_a_model_that_cannot_measure_coverage():
    """`serving.predict_arrays` setzt `coverage` NUR, wenn das Modell die Sigmoid-Spalte hat.
    `_emission` liest sie mit `r.get("coverage", 0.0)`, also gilt "nie gemessen" als "voll
    sichtbar": `COVERED_MAX` schlaegt nie an, `review_covered` und `disputed` sind fuer jeden
    Halbzug 0, und die Review-Bilder werden auf Frames unter einer Hand gewaehlt.
    """
    from chesslab import retime

    reads = [{"probs": [1.0, 0.0]} for _ in range(64)]
    with pytest.raises(ValueError):
        retime._emission(reads, [[0] * 64], retime.COVERED_MAX)
