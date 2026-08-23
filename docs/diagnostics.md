# The diagnostics file (Android)

The tracker writes every decision it makes to a rotating file on the phone, next to a header that
says what the config and the model were. "Debug → Decisions → Export diagnostics" hands the set to
the Android file picker as a ZIP.

It exists because of two blind spots that each cost real time.

**The config in force was invisible.** `motionRecencyS` sat at `0.0` in the phone's DataStore for an
unknown length of time. Every diff-path commit was rejected against a stale `age > 0` check, the
deterministic channel produced nothing all evening, and reading the source could never have found it
— the value does not live in the source, it lives in a DataStore on one device.

**So was the model.** Which asset directory is loaded, at which inference size, on which execution
provider. `CLAUDE.md`'s own speed figures were wrong for a day because they described a model that
no longer ships, and nothing on the device said which one does.

## What it is

`filesDir/diagnostics/diag-<n>.ndjson` — one JSON object per line, UTF-8, newest file highest `n`.
Four files of 512 kB each; past that the oldest is deleted. `filesDir` is app-private storage, so
nothing is readable by another app and nothing leaves the phone until the export picker is used.

Read it with one `json.loads` per line:

```python
import json, pathlib
rows = [json.loads(line) for f in sorted(pathlib.Path("diagnostics").glob("*.ndjson"))
        for line in f.read_text(encoding="utf-8").splitlines() if line.strip()]
rejections = [r for r in rows if r["kind"] == "decision" and not r["accepted"]]
```

Two `kind`s.

### `run_start`

Written once per built tracker stack — so once at startup, and again after every settings change
that requires a restart. It is repeated verbatim at the top of each rotated file, with its original
`seq`, because rotation deletes the OLDEST file, which is exactly the one the header would otherwise
live in alone.

- `config` — `ConfigCodec.encode` verbatim, i.e. the same shape the settings persist, generated from
  the same `KNOBS` table. `config.values.motionRecencyS` is the field the incident above was about.
  Three knobs are `Int?` and encode "no override" as `NaN`; Python's `json.loads` accepts that, a
  stricter reader has to be told.
- `model` — requested directory and asset against the ones actually **loaded**, the declared
  `inferSize`, the class count, the requested execution provider against the one actually
  **selected**, and the graph's own input shape. Requested and actual are both there because a
  silent fall-through from the NPU to the CPU costs ten times the latency at the same frame rate,
  and a failed attach leaves the loaded fields null, which is itself the answer.
- `ts`, `appVersionName`, `appVersionCode`, `device`, `androidSdk`.

### `decision`

One per row the engine records — every committed move **and** every refused candidate, which is the
half that is never in doubt when you are actually debugging. Field for field the engine's
`DebugDecision`, plus `kind` and `seq`. `changedVals` is an object keyed by square
(`{"f4": 9.25, "d4": 4.5}`) so the evidence for one square is addressable.

## `seq`, and what a gap in it means

Both kinds carry a monotonic counter assigned the moment the row is offered, not when it is written.
The queue between the engine and the file drops its oldest entry rather than blocking the analyzer
thread — a whole frame there has a measured budget of 23.1 ms median at 26–28 fps — so a dropped row
leaves a hole in the numbering. A gap is therefore "the log could not keep up", not "nothing
happened". The repeated `run_start` is the one exception: it carries the original `seq` because it
is one record written twice.

## What is in it, before you send it

Not sensitive between two machines one person owns, but larger than "logs" suggests, and the export
button hands the file to whatever app you pick:

- every `decision` row carries `fenAfter`, so the file contains **the complete move-by-move
  position stream** of every game since the app started, rejected candidates included;
- `run_start` carries the full tracker config, the model identity, the app build and the device
  model.

**No pixels, ever.** `:core-engine` holds no frame history and does no imaging, `DebugPayload`'s own
tests assert the decision row carries no bitmap-shaped field, and `DiagnosticsLogTest` asserts the
written file never mentions one. Session frames are a different feature with a different button.

## What it is not

There is no network in this. No endpoint, no token, no discovery, no upload — the phone writes a
file and you export it. The predecessor design had all four and its own review found that the token
it invented to protect the write path would have been served, unauthenticated, by the read path of
the same server. See `specs/34-diagnostics-you-can-read/STATUS.md`.

## Reading a desktop replay: what is repeatable, and what is not evidence

From the retired spec tree (`docs/specs-index.md`). The engine's own rules are in
`docs/tracker-flow.md`.

### A replay is a repeatable experiment — two constants make it one (`specs/52`, 2026-08-08)

The same file ran 54 plies once and 39 the next. Two causes, both fixed for replays only:

| Cause | Fix |
|---|---|
| **When** an async inference lands relative to the frames is wall-clock | The observer runs its inference INLINE (`TrackerSeed.observerDispatcher`, `Dispatchers.Unconfined` on the desktop) on a fixed video-time cadence. |
| **4 intra-op ONNX threads make parallel float reductions non-bit-exact** — a logit wobbling in its last digits flipped a thresholded decision at ply 26 of VID | The desktop replay opens the classifier with **ONE** intra-op thread (`DesktopMain`), against the desktop default of 4. Cost: **47 ms vs 19 ms** per observation — a fraction of the cadence. |

Proof: rec-20260808 three times byte-identical at **67 plies**, VID identical across warm runs.

### `REPLAY_OBSERVER_INTERVAL_S = 0.0` (`desktop/ReplayOptions.kt`)

Free-running, and it is **declared** rather than the accident of a race. The honest-looking
"modelled live rate" of 0.15 s was tried on 2026-08-08 and **starved the ladder**:

| run | free (0.0) | throttled (0.15) |
|---|---|---|
| rec-20260808 | 67 plies | **26 plies** |
| rec-20260807 | 25 / 0 / 0 | **23 / 2 / 1 — a phantom, the veto** |

Every "good" run on record had in fact observed free (rec-0808: **5 069 observations against
1 013** throttled), because an async default overwrote the intended throttle within the first
frames. Two rival hypotheses died by A/B on one binary before the cause was accepted:
`set:liveAlign=false` → still 26, and a faster throttle `set:observerIntervalS=0.07` → still 26.
The verify ladder and recovery voting are tuned to observations arriving every 1–2 frames.

A file replay therefore keeps the *replay's* cadence, not the phone's. When the phone's cadence IS
the experiment, `set:observerIntervalS=<s>` says so explicitly. `TrackerStack.init` applies the
seed's interval synchronously before attach, so cold and warm runs start on the same cadence.

### Two numbers on a recovery row that are tautologies, not evidence (`specs/37`)

Both were examined as corroboration levers against a live log and **both are refuted**:

| Field | Why it says nothing |
|---|---|
| `best = -3.12` on every recovery row | It is `bestScore` from the last `tryDetect`, and `Hypothesis.noSingleFitsGate` fires on `best < 0.0` — the branch that marks the tracker stuck, which is the recovery's own trigger. A negative `best` is a **precondition** of a recovery, not evidence against it. "Do not commit against negative frame-diff evidence" would have disabled the feature while looking like a hardening. |
| `motion = 0.0000` on every recovery row | `cnnTick` evaluates only on a stable or stuck board, and `state.motion` is per-frame motion. A legitimate fast sequence also settles before it is read. |

Neither number distinguishes *"the diff is poor because several real moves happened"* from *"the
diff is poor because this bridge is fiction"*. Nothing measured so far does, and that is the
valuable open question.
