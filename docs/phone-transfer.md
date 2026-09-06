# The recording's way off the phone — LAN transfer

Until 2026-08-13 a phone recording reached the PC over USB and nowhere else:

```bash
adb exec-out run-as com.chesslab.tracker tar cf - files > phone-session.tar   # 1.0 GB, once
```

That is how `data/realgames/2026-08-13-19-34-23/` got here. The cable is the whole cost: the
recording is finished when the user puts the phone down, and every step between that moment and a
`training-video-pack` was a person remembering to do it.

Now the phone pushes. **The layout on the PC is unchanged** — what lands is `filesDir/` off the
phone, so a transferred session is the same tree the tar produced, and every consumer
(`training-video-pack`, the confirm views, `chesslab slice`) reads exactly what it read before.

## The path

```
phone                                          PC (platform/app, next dev)
─────                                          ──────────────────────────
recording ends
  └─ WorkManager one-shot (+3 min settle)
       ├─ GET  /api/ingest/hello               is a chesslab platform here, and is our token its token?
       ├─ POST /api/ingest/session             declare the bundle; answer = what the PC already holds
       ├─ PUT  …/chunk?path=…&offset=…         8 MiB at a time, resumable, streamed to `.partial`
       └─ POST …/complete                      sizes checked, tree moved into data/realgames/<name>/files/
                                                 └─ queue → :desktop training-video-pack (ONE worker)
```

- **Trigger.** The end of a recording queues a one-shot; a periodic job (15 min, WorkManager's own
  floor) is the safety net for a phone that was out of Wi-Fi then. Both carry the same constraints:
  **unmetered network** and battery not low. A gigabyte of QHD over mobile data is a phone bill, not
  a transfer.
- **Settling.** A session is only sent when nothing in it has changed for two minutes
  (`sync/UploadPlan.kt::QUIET_MS`) — the cheapest honest proof that the recorder is done with it. The
  one-shot that a session close triggers therefore waits three minutes before it runs. The same
  quiet window guards the app-start janitor (`sweepEmptyRecordings`), which removes moveless
  leftovers from killed processes and older builds.
- **What is sent.** The session directory (video, `log.jsonl`, `timeline.jsonl`, `session.yaml`,
  `settings.json`, reference frames) plus every game record whose `sessionId` names it — `.json`
  and `.pgn`. The game record is not decoration: `training-video-pack` labels frames off its move
  list, and since 2026-08-16 it labels them at the times `log.jsonl` gives: the ply on the board
  comes from the phone's own commit timestamps, anchored at `session.yaml::video_pre_roll_ns`
  (the ring is flushed exactly at the first commit), not from a replay re-deriving the game. One
  missed opening move used to desync a whole recording — `2026-08-15-22-51-38` packed 0 of 851
  frames, and 332 boards after. Without a `log.jsonl` beside the video the old FEN match still
  runs. `settings.json` is the recording's provenance — the full `TrackerConfig` in ConfigCodec
  envelope form, the app-level choices (model, execution provider, resolution, orientation), the
  build, and a history of any knob that moved mid-session. It exists because
  `2026-08-13-19-34-23` could not answer "which config recorded this?", and it is what
  `:desktop … replay <video> config=<settings.json>` consumes to re-run a session under the
  phone's true knobs.
- **Nothing is deleted on the phone.** A transferred session gets `transfer.json` beside its frames,
  the recordings list marks it *on the PC*, and the delete button says so in its confirmation. The
  storage cap stays the user's decision.

## Pairing

The server prints a token on `/transfers` (generated on first use into
`$CHESSLAB_DATA_DIR/inbox/token`, or set `CHESSLAB_INGEST_TOKEN`). It goes into the tracker under
**Settings → Transfer**, once. Without it every write is refused with 401 — the phone's own Ktor
server has no write endpoint at all (`SpectatorServer.kt`), and this one is not going to be the
first unauthenticated one on the network.

## Discovery: a subnet sweep, not mDNS

The phone probes its own /24 for `/api/ingest/hello`, 32 addresses in flight, starting next to its
own address and stopping at the first PAIRED answer. The address that answered is remembered, so the
usual run is one request.

mDNS was not chosen: Next has no daemon to advertise from, Android would need a second discovery
stack, and multicast is the one mechanism a router filters by itself (client isolation, guest VLAN).
A wider prefix than /24 is **not** swept — 65 000 probes is a portscan, not discovery — and the
manual address field in Settings is the answer for a network of that shape.

## What has to be true on the PC

1. `next dev` is running and prints a **Network:** URL (it binds the LAN address by default).
2. Windows Firewall lets the port through. Once, elevated:

```powershell
New-NetFirewallRule -DisplayName "chesslab platform 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

3. The app may speak cleartext HTTP. `targetSdk = 35` blocks it by default, which is exactly how the
   first live run failed — every probe threw, the sweep reported "no chesslab server on this Wi-Fi",
   and the phone's own `curl` reached the same URL fine. `res/xml/network_security_config.xml` is
   what permits it; a build without that file cannot transfer anything.
4. For the chain, the desktop distribution exists — otherwise the job says so, in those words:

```bash
cd android && ./gradlew.bat :desktop:installDist
```

## Where things land

| what | where |
|---|---|
| in-flight tree | `data/inbox/<name>/…` (`.partial` per file) |
| landed session | `data/realgames/<name>/files/{sessions,games}/…` |
| transfer ledger | `data/inbox/transfers.jsonl` |
| pack job ledger / logs | `data/inbox/jobs.jsonl`, `data/inbox/jobs/<name>.log` |
| pairing token | `data/inbox/token` |
| verified training pack | `data/realgames/<name>/training-pack/{accepted,quarantine,occluded-proposals}/...` |

`<name>` is the phone's session id in the dashed form `data/realgames/` has always used:
`20260813-193423` → `2026-08-13-19-34-23`.

## The rules the code keeps

- **An existing target is never written into.** A session already on this machine makes the transfer
  a duplicate: it stays in `data/inbox/<name>/`, the ledger row reads `held`, and the page says
  where it is. Parking, not merging and not deleting.
- **A file already on disk is not sent again.** `declare` counts the landed tree as well as the
  staging one, so a session copied over USB costs one round trip, not a gigabyte.
- **The server's count wins.** A wrong offset is answered with 409 and the true length, never a
  write; the phone seeks to it. Three answers without progress and the transfer gives up rather than
  sitting on the radio.
- **A skipped pack states why.** No `video.mp4`, or no game record naming the session, is a normal
  outcome (a recording without the QHD bundle, a game the phone never finished) — it appears on
  `/transfers` as `skipped` with the reason. The files are landed either way.
- **One pack at a time.** A replay JVM holds ~6 GB, mostly native; two of them is the 2026-08-08
  incident that filled 32 GB.
- **An empty FILE is sent; an empty RECORDING is not.** A 0-byte file gets one zero-length PUT,
  because the server seals only when every declared file is there and "never sent" is not "empty" —
  `20260813-122407` carries an empty `log.jsonl` beside a 1.9 GB video. A recording with no video,
  no frames and no log rows carries nothing to label: it is skipped, and NAMED on both screens
  ("4 empty, nothing to label") rather than left in a waiting count that never reaches zero.
  Since the pre-roll (below) such recordings should no longer exist on the phone at all — the
  skip stays as defence in depth, for kill leftovers and for phones on older builds.

## The video starts with the first move — and reaches 45 s back

Measured 2026-08-13/14: of eleven transferred recordings, TWO carried a game; the rest were board
setup, ArUco taping, calibration and empty-board tests — 4.7 GB deleted by hand. The recorder
therefore starts ARMED (`CameraVideo` + `PreRollRing`): the encoder runs from tracking start, but
its samples stay in a memory ring capped at `PRE_ROLL_SECONDS` (45) and 80 MB, trimmed only at
key-frame boundaries. The `timeline.jsonl` frame rows get the same window since 2026-08-30
(`RecordingBundleHost.preRollFrames`): they used to fall on a null timeline, so the recording's
own per-frame record began at the commit while the footage reached back past it, and the replay
read its start position off the first row. The first committed ply opens the muxer, writes the
buffered pre-roll with timestamps rebased to zero and continues live — one recording per game, minute-segmentation unchanged, because the quiet
stretches BETWEEN moves are the labeled training data. No commit means no muxer, no `video.mp4`,
and — since the session directory itself now opens on the first commit
(`SessionCaptureController`) — no session at all: a calibration run leaves nothing to transfer,
and a kill before the first move takes the buffer down with the process, which is the desired
outcome. The settings screen names the state honestly: "Armed — video starts with the first
move".

## A recording is segmented, and that is why a kill is survivable

`video.mp4`, `video-001.mp4`, … — the recorder closes its muxer every minute at an encoder sync
frame. An MP4's index is written when the muxer closes, so a running recording is a file nothing can
open; measured 2026-08-13, four of eleven transferred recordings (1.99 GB) were exactly that, and
Android's exit log named the cause: `reason=16 (PACKAGE UPDATED)`, an install over a live recording.
A SIGKILL runs no callback, so the only defence is to have finalised already.

Reproduced on the device on 2026-08-14: three segments, an `adb install` fired into the third —
segments one and two carry their index and decode as **one 3 600-frame stream**, four seconds were
lost. `:desktop` reads them through `openRecording` (`RecordingSource.kt`); a last segment with no
index ends the stream with its reason printed instead of throwing, because everything before it is
intact. The segment list is read from the DIRECTORY, never from `session.yaml` — the same kill that
truncates the video also prevents the metadata from being written.

## An unfinalized recording can be rebuilt, and what that costs

`:desktop repair-recording <broken.mp4> <reference.mp4> <out.mp4>` gives an interrupted recording
the index it never got. It works because the payload is intact and self-describing: inside an MP4,
AVC samples are length-prefixed NALs, so walking `mdat` from its first byte recovers every frame
boundary — and the walk lands exactly on the file's last byte, or the tool refuses. What `mdat`
does NOT hold is the codec configuration: `MediaMuxer` consumes SPS/PPS into `avcC`, which died with
the index, so they are copied verbatim from a reference recording made by the same app on the same
phone. The bytes are never re-encoded: the payload keeps its offsets, the `mdat` length placeholder
is corrected, and a `moov` built from the walk is appended (`Mp4Index.kt`).

**The timing is the part that cannot be recovered.** The per-sample durations died with the index,
so the reference's frame rate is assumed and stated in the output. Geometry does not care; a claim
about how long a player thought does.

Measured 2026-08-14 on the four recordings killed by `adb install` on 2026-08-13:

| recording | frames | duration | boards found | worst square offset |
|---|---|---|---|---|
| `2026-08-13-12-12-18` | 15 488 | 9:01 | 39 of 39 | 2.83 px |
| `2026-08-13-12-39-04` | 3 794 | 2:12 | 10 of 10 | 2.69 px |
| `2026-08-13-12-45-12` | 1 337 | 0:46 | 4 of 4 | 2.74 px |
| `2026-08-13-12-46-24` | 6 564 | 3:49 | 17 of 17 | 2.52 px |

Sixteen minutes of usable footage, not one missed frame, every sample inside the 4 %-of-a-cell
criterion. The repaired file takes the recording's place and the unreadable original is parked
(`data/_parked/2026-08-14-unfinalized-originals/`) — a repair is an interpretation, and the original
is the evidence.

## The pack's id is the transfer name, not the video's

Every transferred recording is `files/sessions/<id>/video.mp4`, so the verb's default id — the
video's stem — is the constant `"video"` for all of them. The pack keys every manifest row with it
and `corrections.jsonl` dedups on `(session_id, frame, square)` with LAST LINE WINNING: without an
explicit `id=`, a human's verdict on one recording would silently rule on another recording's crop
at the same frame number. The job passes `id=<transfer name>` (`platform/app/lib/jobs.ts::packArgs`),
and `training-video-pack` takes `[id=name]` for the same reason. Found 2026-08-13, while checking
the first per-frame pack of a transferred recording.

## Reading the state

The pack job is fail-closed: it is only marked `done` after the server has verified
`model=p4a-80-clahe` (the bundled default, `DESKTOP_MODEL` in `lib/jobs.ts`), all manifest and binary counts, valid FEN labels exclusively in `accepted/`,
and `label=unreviewed` in both review streams. A legacy, partial, or mixed pack is
shown as `failed`.

The transfer deliberately does not merge the result into a shared training dataset. `accepted/`
is the ready-to-train staging area. `quarantine/` and `occluded-proposals/` remain review material;
promoting reviewed crops into a versioned aggregate is a separate step so session-level splits are
preserved.

- PC: `/` — every recording with the one chain step it can take next (Label → Confirm → Export →
  Propose → Relabel), including the transferred ones that have no game record and must be labelled
  by replay. `/transfers` — in flight, arrived, and what each pack did (polls every 5 s).
- The phone's browser reads the same UI: `next dev` blocks cross-origin dev assets, so the LAN
  ranges are listed in `allowedDevOrigins` (`platform/app/next.config.ts`) — without it the page
  loads and none of its JavaScript does, which looks exactly like a broken app.
- A bundle whose `files/games/*.json` names its session shows **Züge vom Handy übernehmen**. The
  button queues `phone-candidate <recordingDir>`, which writes the same `candidate.json` a replay
  would (`decider: "phone_log"`, `source.kind: "phone"`, `confirmed: false`) without running the
  tracker or the CNN: the phone already decided the moves, so all that is missing is the geometry
  scan and a frame index per ply. The scan's median is taken over the frames of the FIRST
  SEGMENT only (up to the last ply's frame): on 2026-08-30-16-20-19 the board was nudged a
  seventh of a cell at the seam after move 12, 55 % of the video lies after it, and the
  whole-video median stood on the moved board while every sample passed the absolute gate. The
  median is then checked against the quad the phone logged at the session's start, both measured
  on a dozen sampled frames against the board's own grooves (`grooveOffset`, in cells); the closer
  one is the candidate's, and `source.quad` records which and by how much. The plies' FRAMES are then re-timed off the video
  by `realgames retime` (`docs/retime.md`), because the phone's commits lag fast hands. Beyond that median every
  ply carries `corners`: the phone's own quad from the timeline's frame row at the commit (the
  replay writes the engine's `TrackerStatus.corners` the same way), and both the export
  (`known_segments` → row `corners`) and the review boards (`AnnotatedFrames.quadFor`) cut each
  ply through its own quad — a board moved mid-game moves the geometry with it. A second, decode-only
  pass then writes the rectified board at every ply's frame ±2 to `frames/` (the label verb's
  directory; `/confirm` and the Züge stream read it) — the scan pass cannot, its quad is a median
  it only has at the end (2026-09-06).
  - **The time rule**, per ply and monotone (a batch commit may put several plies on one instant):
    the first `frame` row after the previous ply that shows the ply's placement and side to move,
    else the accepted `decision` row for this ply, else the `frame`/`event` row nearest in
    `wallTsMs` to the record's `tsEpochMs`; the chosen `elapsedNs` goes through
    `RecordedFrames.videoNsAt` and lands on the first decoded frame at or after it.
    `PHONE_FRAME_OFFSET` is **0** — measured, no constant shift is warranted.
  - **Measured against a replay of the same bundle** (`2026-08-16-20-41-33`, 66 plies, 2026-09-06):
    the same 66 plies with identical SAN and `fen_after`, median frame delta **0**, max 4 frames
    (0.13 s at 30 fps), 31 of 66 plies off by 1–4. Cost: **440 s against the replay's 1 325 s** —
    a third, not "seconds", because the whole video is still decoded once for the geometry.
  - **A refusal falls back to the replay**: the card then offers **Züge am PC neu erkennen**, and
    `/api/chain` lets that press through even though the disk still says `phone-record`. The verb
    prints exactly one `refused: ` line — no session dir or several, no record naming the session,
    no timeline, no `video_sync` rows, no video, no frame aligned to the grid, an illegal move, a
    ply with no time, out of order, outside the video, an existing candidate without `force=1`.
  - **Only the first segment** of a record becomes the candidate; the rest is a `note` ("<n> plies
    after a seam omitted"). A seam restarts the position, and the flat `moves` list is illegal
    across it — that is what crashes the replay's own `gameMarks` (`2026-08-30-16-20-19`).
  - **`hasSession` needs a `board` key**, not merely a `log.jsonl`: a mirrored bundle keeps the
    phone's own commit log under that name (`frame`, `ply`, `fen`, `ts`, `move_san`), which used to
    read as an export and skipped the export rung outright (`2026-08-30-14-33-02`).
- A video without a matching game record shows **Züge erkennen**. The button queues
  `replay <video> label lens name=<transfer> model=real14-80` on the same single worker. Geometry
  measurement, replay and review frames all use the same accepted per-recording lens fit; a refused
  fit writes no candidate. After it writes `candidate.json`, **zur Label-Seite** opens the normal
  confirm view. Existing candidates are never overwritten.
- Phone: **Settings → Transfer** — paired, what is still waiting, and the last run's own words
  ("no chesslab server on this Wi-Fi", "2 sent · 1.4 GB", "1 recording still being written").

## Measured on the first live run, 2026-08-13

Phone (192.168.178.23) to PC (192.168.178.20), 33 stored sessions, 6.0 GB:

- **29 sessions landed, 6.43 GB**, found by the sweep with no address typed anywhere.
- The two sessions already on the PC landed as `held` at **0 MB transferred** — the have-check
  recognised 1.5 GB of video that did not need to travel again.
- Byte check against the source: `20260813-122407` phone 1 951 176 689 = PC 1 951 176 689,
  `20260813-121218` 924 149 789 = 924 149 789.
- Four recordings were skipped as empty, and named as such on both screens.
- **No pack ran, and that is the honest outcome**: the eight midday recordings carry video but no
  game record (the phone holds games at 01:10, 13:51, 19:41 only), so nothing states what was
  played. Those videos take the manual route — `:desktop replay <video> label` → `realgames confirm`
  — exactly like the rig recordings.

Three bugs the run found, all fixed and covered by tests:

1. **Cleartext HTTP was blocked** (`targetSdk = 35`, no network security config). Every probe threw
   and the sweep honestly reported "nothing found" — while `curl` on the same phone reached the
   same URL. This is the reason `res/xml/network_security_config.xml` exists.
2. **A 0-byte file could never be sealed.** The chunk loop has nothing to send for an empty file, so
   the server never saw it and refused `complete` — forever, on every retry. `20260813-011731` hit
   it with an empty `log.jsonl`.
3. **A failure reported the PREVIOUS run's reason.** Job logs are appended per run — worth keeping —
   but the reason was searched over the whole file, so a run that never asked for a lens fit was
   blamed on a lens refusal from an earlier attempt, while its real refusal (the 23.6 px quad
   spread above) sat unread. Both the reason and the progress readout now start at the last
   `$ <command>` line.
4. **No job had ever run.** Node refuses `spawn("x.bat")` since 18.20 / 20.12 (CVE-2024-27980) and
   throws EINVAL *synchronously*; inside a Promise executor that rejects the promise instead of
   firing `error`, and the queue's `.catch(() => undefined)` dropped the job at "running" with no
   exit line and no reason. Every pack "queued" on 2026-08-13 died there, looking busy. The fix
   spawns a `.bat` through `cmd /s /c` with its own quoting, and a throw is now recorded as a
   FAILED job. A ledger row left "running" by a restarted server is reported as such, not as work
   in progress.

What the chain then measured on the transferred recordings, with the buttons on `/`:

- `2026-08-13-01-39-15` (68 MB, 52 s) labels cleanly without the lens gate and produces a candidate
  with **zero committed plies** — three decision rows, all `rejected`.
- `2026-08-13-12-10-55` (184 MB, 77 s) cannot become a candidate at all: 16 of 232 sampled frames
  align to the grid (100 needed) and the quad spread p90 is 70 px, i.e. **the board moved during
  filming**. The verb says so and names the re-encode command.
- `2026-08-13-19-34-23` (952 MB, 412 s), the one recording with a game record, aligns beautifully —
  **1 122 of 1 154 sampled frames (97.2 %)** — and is still refused: quad spread p90 **23.6 px**
  against a 4 px criterion. Good frames, moving board; one static quad cannot stand for it.

So the 4.2 GB rescued from the phone is not automatically training material; two of the eight
midday recordings are already known to carry no usable game. The transfer's job was to get them off
a device with a storage cap, and that it did.

The lab round trip before it (12 MB in two chunks over `127.0.0.1`) covers what the live run does
not: `cmp`-identical bytes, a re-declare returning full size, a short file refusing to complete, and
a duplicate landing as `held` with the original untouched.
