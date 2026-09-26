# The diagnostics file (Android)

The tracker writes every decision it makes to a rotating file on the phone, next to a header that
says what the config and the model were. "Debug → Decisions → Export diagnostics" hands the set to
the Android file picker as a ZIP.

It exists because of two blind spots. **The config in force was invisible:** `motionRecencyS` sat
at `0.0` in one phone's DataStore, every diff-path commit was rejected all evening, and no reading
of the source could have found it. **So was the model:** which asset, at which inference size, on
which execution provider — speed figures were wrong for a day because they described a model that
no longer shipped.

## What it is

`filesDir/diagnostics/diag-<n>.ndjson` — one JSON object per line, UTF-8, newest file highest `n`.
Four files of 512 kB each; past that the oldest is deleted. App-private; nothing leaves the phone
until the export picker is used.

```python
import json, pathlib
rows = [json.loads(line) for f in sorted(pathlib.Path("diagnostics").glob("*.ndjson"))
        for line in f.read_text(encoding="utf-8").splitlines() if line.strip()]
rejections = [r for r in rows if r["kind"] == "decision" and not r["accepted"]]
```

### `run_start`

Once per built tracker stack (startup, and after every settings change that needs a restart),
repeated verbatim with its original `seq` at the top of each rotated file — rotation deletes the
oldest file, which is where the header would otherwise live alone.

- `config` — `ConfigCodec.encode` verbatim, generated from the same `KNOBS` table. Three knobs are
  `Int?` and encode "no override" as `NaN`; `json.loads` accepts that, a stricter reader must be told.
- `model` — requested directory, asset and execution provider against the ones actually **loaded**
  and **selected**, the declared `inferSize`, class count and the graph's input shape. A silent
  fall-through from NPU to CPU costs ten times the latency; a failed attach leaves the loaded fields
  null, which is itself the answer.
- `ts`, `appVersionName`, `appVersionCode`, `device`, `androidSdk`.

### `decision`

One per row the engine records — every committed move **and** every refused candidate. Field for
field the engine's `DebugDecision`, plus `kind` and `seq`. `changedVals` is keyed by square
(`{"f4": 9.25}`).

## `seq`, and what a gap in it means

A monotonic counter assigned when the row is offered, not written. The queue to the file drops its
oldest entry rather than block the analyzer thread (a frame's budget is 23.1 ms median at 26–28
fps), so a gap means "the log could not keep up", not "nothing happened".

## What is in it, before you send it

- every `decision` row carries `fenAfter`: **the complete position stream** of every game since the
  app started, rejected candidates included;
- `run_start` carries the full config, the model identity, the app build and the device model.

**No pixels, ever.** `DebugPayload`'s tests assert no bitmap-shaped field, and `DiagnosticsLogTest`
asserts the written file never mentions one. **No network either:** no endpoint, no token, no
upload. The predecessor design had all four, and its own review found the write-path token would
have been served unauthenticated by the read path.

How to read a desktop replay's rows: `docs/desktop-replay.md`.
