"""Was das Schema zusagt — gegen die laufende Datenbank, nicht gegen den Text des SQL.

Eine `CHECK`-Bedingung beweist man, indem man sie verletzt. Ohne Container wird uebersprungen
(`docker compose up -d`); jede Einfuegung wird zurueckgerollt.
"""
from __future__ import annotations

import os

import pytest

psycopg = pytest.importorskip("psycopg")

URL = os.environ.get("CHESSLAB_DB_URL", "postgresql://chesslab:chesslab@127.0.0.1:5432/chesslab")
WEB = os.environ.get("CHESSLAB_DB_URL_WEB", "postgresql://chesslab_web:chesslab_web@127.0.0.1:5432/chesslab")
PIPELINE = os.environ.get(
    "CHESSLAB_DB_URL_PIPELINE", "postgresql://chesslab_pipeline:chesslab_pipeline@127.0.0.1:5432/chesslab")

FULL = [0.0] * 64


@pytest.fixture
def db():
    try:
        conn = psycopg.connect(URL, connect_timeout=3)
    except psycopg.Error as exc:                                    # pragma: no cover
        pytest.skip(f"keine Datenbank erreichbar ({exc}) — `docker compose up -d`")
    conn.autocommit = False
    with conn:
        with conn.cursor() as cur:
            cur.execute("insert into recording values ('t_r','rg-t_r','desktop')")
            cur.execute("insert into frame (recording, stem) values ('t_r','000001')")
            yield cur
        # Nie committen: jeder Test laesst die Entwicklungs-DB so zurueck, wie er sie fand.
        conn.rollback()
    conn.close()


def _refused(cur, sql: str, *args) -> str:
    with pytest.raises(psycopg.errors.CheckViolation) as got:
        cur.execute(sql, args)
    cur.connection.rollback()
    return str(got.value)


@pytest.mark.parametrize(
    ("was", "sql", "args"),
    [
        ("weder Absage noch Messung",
         "insert into matte (recording, stem, source) values ('t_r','000001','sam')", ()),
        ("Absage UND Messung",
         "insert into matte (recording, stem, source, skipped, coverage)"
         " values ('t_r','000001','sam','zone too big',%s)", (FULL,)),
        ("leeres Array als Messung",
         "insert into matte (recording, stem, source, coverage) values ('t_r','000001','sam',%s)", ([],)),
        ("63 statt 64 Felder",
         "insert into matte (recording, stem, source, coverage) values ('t_r','000001','sam',%s)",
         (FULL[:-1],)),
        ("Brett ohne Inhaltsstempel",
         "insert into frame (recording, stem, board_path) values ('t_r','000002','boards/2.webp')", ()),
        ("Urteil fuer Frame UND Ply",
         "insert into review_note (recording, stem, ply, verdict) values ('t_r','000001',3,'matte-ok')", ()),
    ],
)
def test_the_database_refuses(db, was, sql, args) -> None:
    assert _refused(db, sql, *args), was


def test_the_three_valid_states_come_back_as_three(db) -> None:
    db.execute("insert into matte (recording, stem, source, skipped) values ('t_r','000001','sam','zone too big')")
    db.execute("insert into frame (recording, stem) values ('t_r','000003')")
    db.execute("insert into matte (recording, stem, source, coverage) values ('t_r','000003','sam',%s)", (FULL,))
    db.execute("insert into frame (recording, stem) values ('t_r','000004')")

    db.execute(
        "select stem, case when skipped is not null then 'abgelehnt'"
        " when coverage is not null then 'gemessen' end"
        " from frame f left join matte m using (recording, stem)"
        " where recording = 't_r' order by stem")

    assert db.fetchall() == [("000001", "abgelehnt"), ("000003", "gemessen"), ("000004", None)]


@pytest.mark.parametrize(
    ("url", "table", "sql"),
    [
        (WEB, "matte",
         "insert into matte (recording, stem, source, skipped) values ('t_r','000001','sam','x')"),
        (PIPELINE, "review_note",
         "insert into review_note (recording, stem, verdict) values ('t_r','000001','matte-ok')"),
    ],
)
def test_neither_role_may_write_the_other_side(url, table, sql) -> None:
    """Eine Aufteilung, an die sich jemand halten muss, ist keine."""
    try:
        conn = psycopg.connect(url, connect_timeout=3)
    except psycopg.Error as exc:                                    # pragma: no cover
        pytest.skip(f"keine Datenbank erreichbar ({exc})")
    with conn, conn.cursor() as cur, pytest.raises(psycopg.errors.InsufficientPrivilege):
        cur.execute(sql)
    conn.close()
