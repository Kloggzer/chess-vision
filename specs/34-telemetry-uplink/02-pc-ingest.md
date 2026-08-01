# Phase 02 — the PC takes it

> Runs in parallel with **01** (disjoint files). **01 owns the envelope schema**; you code against
> what it emits and you are permissive about the rest.

## Why

The sink must be something that is **already running**. A separate daemon is a second process to
start, a second port through the Windows firewall, and a silent-loss failure mode during exactly the
session that mattered. `chesslab web` is already up when the user is working.

## Design (decided — do not redesign)

### Routes — `src/chesslab/web/routers/ingest.py` (new)

```python
POST /api/ingest/rows     # Content-Type: application/x-ndjson, one envelope per line
GET  /api/ingest/hello    # {"server": "<version>", "lastSeq": {"<device>": 1187}}
```

Registered by appending to `ALL_ROUTERS` in `src/chesslab/web/routers/__init__.py` — the file
already carries that list.

### Where it lands

```
data/telemetry/<device>/<YYYY-MM-DD>.jsonl        append-only NDJSON
data/telemetry/<device>/games/<id>.json | .pgn
```

Day-partitioned: bounds file size, greps trivially, deletes trivially, and DuckDB globs
`**/*.jsonl` in one shot. Add `Paths.telemetry` to `src/chesslab/config.py` beside the existing
properties.

### Be permissive, and say why in the code

An envelope with an unknown `v`, an unknown `kind`, or unknown `payload` keys is **written to disk
anyway** and logged **once** per process. Refusing data is worse than storing a shape you cannot yet
parse — the row is on disk, greppable, and re-parseable later. Only two things are rejected:
a malformed line that is not JSON at all, and a body over the size cap.

### Retention — write it down

`data/` carries the project's *park, never delete* rule, and that rule is about the **corpus**.
`data/telemetry/` is derived diagnostic data with no reproduction cost and **is** deletable. Say so
in `docs/` and in the router's module docstring. Without an explicit exemption in writing the taboo
will freeze it and it will grow without bound.

### Discovery — advertise, but not from loopback

`zeroconf` registers `_chesslab._tcp.local.`, TXT `path=/api/ingest ver=1`, port = the port uvicorn
bound. Register in the existing `create_app()` startup hook, unregister in the existing shutdown
hook (both already exist in `src/chesslab/web/app.py`). Lazy import: a checkout without `zeroconf`
must still serve the web UI.

**Guard.** `DEFAULT_WEB_HOST` is `127.0.0.1` (`src/chesslab/config.py:632`). If the server is bound
to loopback, **do not advertise**, and print:

```
phone uplink: not advertising, bound to loopback.
Start with:  chesslab web --host 0.0.0.0
```

**Do not change the default.** Binding an existing checkout to its LAN as a side effect of a logging
feature is not acceptable.

### Security posture — stated, not dressed up

The PC now has a write endpoint, which the spectator server was explicitly proud of not having.
So: a static bearer token generated on first run into `data/ingest_token.txt` and shown in the web
UI; the router refuses source addresses outside RFC1918; body size hard-capped. Plain HTTP, no TLS,
on a home LAN — say that openly in the docstring rather than implying more.

## Steps

### 1. `src/chesslab/config.py` — commit `feat(config): Paths.telemetry and the ingest constants`

### 2. `src/chesslab/web/routers/ingest.py` + `routers/__init__.py` — commit `feat(web): an ingest router for phone telemetry`

### 3. `src/chesslab/web/app.py` — commit `feat(web): advertise the ingest service over mDNS`
Both hooks; the loopback guard and its printed hint.

### 4. `pyproject.toml` — commit `build: zeroconf for ingest discovery`

### 5. `docs/telemetry.md` (new) — commit `docs: the phone uplink, and why data/telemetry is deletable`
What ships, where it lands, how to start the server so the phone can find it, the retention
exemption, the security posture.

## Tests (write, run once, targeted)

`tests/test_web_ingest.py` (new):

- `rows_are_appended_as_jsonl` — POST two envelopes, assert two lines in the right day file.
- `an_unknown_schema_version_is_still_stored` — `{"v": 99, …}` → 2xx and on disk. This is the
  contract, not a nicety.
- `a_malformed_line_is_refused_without_losing_the_batch` — one bad line among three: the two good
  ones land.
- `the_token_is_required` — no/ wrong token → 401, nothing written.
- `a_non_private_source_address_is_refused`.
- `hello_reports_the_last_seq_per_device`.
- **`the_golden_envelope_from_the_phone_is_accepted`** — POST
  `specs/34-telemetry-uplink/golden/envelope-v1.ndjson` **verbatim**. This is the one integration
  test across the module boundary; both sides otherwise test against their own fakes and a mismatch
  would ship. If the golden file does not exist yet (01 not merged), **mark this test
  `pytest.mark.skip` with the reason and record it in `STATUS.md`** — do not fabricate the fixture.

```
.venv/Scripts/python.exe -m pytest -q tests/test_web_ingest.py
.venv/Scripts/python.exe -m ruff check src/chesslab/web/routers/ingest.py src/chesslab/config.py
```

## Acceptance criteria

- `grep -n "DEFAULT_WEB_HOST" src/chesslab/config.py` still reads `127.0.0.1`.
- `grep -rn "zeroconf" src/chesslab/web/app.py` — the import is **inside** a function, not at module
  scope.
- Starting `chesslab web` without `--host` prints the hint and registers nothing.
- `data/telemetry/` is named as deletable in `docs/telemetry.md`.

## Do NOT

- Do **not** add a second server process, and do **not** add Loki, Grafana, OTLP, Vector or
  Fluent Bit. The rejection is argued in the design: another always-on service the user must
  remember to start, a second query language, and the interesting join
  (decision → session → frame → model) reaches into `data/` where no log platform can follow.
- Do **not** use SQLite. `manifest_cache.py` states the project's position: a cache over JSONL, no
  database, nothing to migrate.
- Do **not** import DuckDB here. Phase 03 owns it, lazily.
- Do **not** auto-slice anything. Phase 04, and even there it stays a deliberate human step.
- Do **not** add a control channel PC → phone. Ingest is write-only and one-directional; remote
  config would create a second owner of `TrackerConfig`.
