# The recording's way off the phone — LAN transfer

The phone pushes finished recordings to the PC over Wi-Fi. **The layout on the PC is the same as a
USB copy** — what lands is `filesDir/` off the phone, so `training-video-pack`, the confirm views
and `chesslab slice` read exactly what they read before.

## The path

```
phone                                          PC (platform/app, next dev)
recording ends
  └─ WorkManager one-shot (+3 min settle)
       ├─ GET  /api/ingest/hello               a chesslab platform here, and our token its token?
       ├─ POST /api/ingest/session             declare the bundle; answer = what the PC already holds
       ├─ PUT  …/chunk?path=…&offset=…         8 MiB at a time, resumable, streamed to `.partial`
       └─ POST …/complete                      sizes checked, tree moved into data/realgames/<name>/files/
                                                 └─ queue → :desktop training-video-pack (ONE worker)
```

- **Trigger:** a one-shot at the end of a recording, plus a periodic job (15 min) as safety net.
  Both require an **unmetered network** and battery not low.
- **Settling:** a session is sent only after two quiet minutes (`sync/UploadPlan.kt::QUIET_MS`);
  the same window guards the app-start janitor `sweepEmptyRecordings`.
- **What is sent:** the session directory (video segments, `log.jsonl`, `timeline.jsonl`,
  `session.yaml`, `settings.json`, reference frames) plus every game record (`.json`, `.pgn`) whose
  `sessionId` names it. `training-video-pack` labels frames at the phone's own commit times from
  `log.jsonl`, anchored at `session.yaml::video_pre_roll_ns`. `settings.json` is the provenance
  (full `TrackerConfig`, model, EP, resolution, build, knob history) that
  `:desktop … replay <video> config=<settings.json>` consumes.
- **Nothing is deleted on the phone.** A sent session gets `transfer.json`; the list marks it
  *on the PC*.

## Setup

1. **Pairing:** the server prints a token on `/transfers` (`$CHESSLAB_DATA_DIR/inbox/token`, or
   `CHESSLAB_INGEST_TOKEN`); enter it once under **Settings → Transfer**. Without it every write is
   refused with 401.
2. `next dev` running, printing a **Network:** URL.
3. Windows Firewall, once, elevated:

```powershell
New-NetFirewallRule -DisplayName "chesslab platform 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

4. The app must be allowed cleartext HTTP: `targetSdk = 35` blocks it, every probe throws and the
   sweep reports "no chesslab server on this Wi-Fi". `res/xml/network_security_config.xml`
   permits it; a build without it transfers nothing.
5. For the pack chain: `cd android && ./gradlew.bat :desktop:installDist`.
6. The phone's browser reads the same UI only because the LAN ranges are in `allowedDevOrigins`
   (`platform/app/next.config.ts`); without it the page loads and none of its JavaScript does.

**Discovery** is a sweep of the phone's own /24 (32 in flight, stops at the first PAIRED answer,
remembers it). Not mDNS: Next has no daemon, and routers filter multicast. Wider networks: type the
address in Settings.

## Where things land

| what | where |
|---|---|
| in-flight tree | `data/inbox/<name>/…` (`.partial` per file) |
| landed session | `data/realgames/<name>/files/{sessions,games}/…` |
| ledgers / logs | `data/inbox/transfers.jsonl`, `jobs.jsonl`, `jobs/<name>.log` |
| verified pack | `data/realgames/<name>/training-pack/{accepted,quarantine,occluded-proposals}/` |

`<name>` is the session id in dashed form: `20260813-193423` → `2026-08-13-19-34-23`.

## The rules the code keeps

- **An existing target is never written into:** a duplicate stays in `data/inbox/<name>/` as
  `held`. Parking, not merging.
- **A file already on disk is not sent again** — `declare` counts landed and staged trees.
- **The server's count wins:** a wrong offset gets 409 and the true length; three answers without
  progress and the transfer gives up.
- **An empty FILE is sent** (one zero-length PUT — the server seals only when every declared file
  arrived), **an empty RECORDING is not**; it is skipped and named on both screens.
- **One pack at a time** — a replay JVM holds ~6 GB.
- **The pack's id is the transfer name**, not the video stem (always `"video"`): `corrections.jsonl`
  dedups on `(session_id, frame, square)`, so one recording's verdict would rule on another's crop.
  The job passes `id=<transfer name>` (`lib/jobs.ts::packArgs`).
- **Fail-closed:** a pack job is `done` only after `model=p4a-80-clahe` (`DESKTOP_MODEL`), all
  counts, valid FEN labels only in `accepted/` and `label=unreviewed` are verified. `accepted/` is
  staging, not a merged dataset — promotion is a separate step so splits stay session-level.
- A failure reason is read from the last `$ <command>` line of the appended job log only. A `.bat`
  is spawned through `cmd /s /c` (Node refuses `spawn("x.bat")` since CVE-2024-27980), and a throw
  is recorded as a FAILED job.

## A recording survives a kill

The recorder is ARMED until the first commit and writes nothing before it (`docs/camera.md`), so a
calibration run leaves no session. After that, `video.mp4`, `video-001.mp4`, … are cut every minute
and each segment carries its own index: an install over a live recording loses at most the open
segment. `:desktop` reads segments through `openRecording` (`RecordingSource.kt`) from the
DIRECTORY, never from `session.yaml` — the kill that truncates the video also stops the metadata.

`:desktop repair-recording <broken.mp4> <reference.mp4> <out.mp4>` rebuilds a missing index: it
walks the length-prefixed NALs in `mdat` (must land exactly on the last byte, or it refuses) and
copies SPS/PPS from a reference recording of the same phone. **Timing is not recoverable** — the
reference frame rate is assumed and stated. The original is parked, not deleted.

## From transfer to candidate

On `/` every recording shows the next chain step it can take.

- **Züge vom Handy übernehmen** (a game record names the session): `phone-candidate <recordingDir>`
  writes `candidate.json` (`decider: "phone_log"`, `confirmed: false`) without running the tracker.
  - The geometry median is taken over the FIRST SEGMENT only, then checked against the quad the
    phone logged at session start (`grooveOffset`); `source.quad` records which won. Every ply also
    carries the phone's own `corners` from the timeline, and export and review cut each ply through
    its own quad. A decode-only pass writes boards at each ply's frame ±2 to `frames/`.
  - **Time rule**, per ply and monotone: the first `frame` row after the previous ply showing the
    placement and side to move, else the accepted `decision` row, else the row nearest in
    `wallTsMs`; `RecordedFrames.videoNsAt` maps it to video. `PHONE_FRAME_OFFSET` is **0**, measured
    2026-09-06 against a replay of the same bundle (median delta 0, max 4 frames, a third of the
    replay's time). Frames are re-timed afterwards by `realgames retime` (`docs/retime.md`).
  - Only the first segment of a record becomes the candidate; plies after a seam are a `note`.
  - A refusal prints exactly one `refused: ` line and the card offers **Züge am PC neu erkennen**.
  - `hasSession` needs a `board` key: a mirrored bundle's `log.jsonl` is the phone's commit log.
- **Züge erkennen** (no game record): queues `replay <video> label lens name=<transfer>
  model=p4a-80-clahe`; a refused lens fit writes no candidate, existing candidates are never
  overwritten.
- Phone: **Settings → Transfer** shows pairing, what waits, and the last run in its own words.

## Backup before touching the install

On 2026-08-20 six source videos (2.4 GB) existed only on the device. `adb install -r` with the SAME
signing key keeps all sessions; what wipes `files/` is a signature mismatch (Android uninstalls
first) or an instrumented test run. Back up with
`adb exec-out "run-as com.chesslab.tracker tar cf - files" > files.tar`.
