# A device platform for chesslab — analysis

> Written 2026-08-06. This is an **analysis**, not a spec pack: it records what was measured, the
> architecture those measurements point at, and the phases it would ship in. Nothing here is built.
> Where it contradicts `specs/38-metrics-to-grafana`, that is deliberate and named in §8.

## 1. The question, and the answer it did not have

The question was whether the open packs — `37/02`, `38`, `39`, `40` — are waiting on client–server
infrastructure. Four claims were checked against the tree. Three of them were false.

| Claim | Verified |
|---|---|
| 37/02, 39, 40 need a server | **No.** `39` and `37/02` are pure on-device Kotlin: `39`'s evidence is the NDJSON file the phone already writes, analysed with `json.loads` on the PC, and `37/02` is one new `ResyncToBoard` action in `:core-engine` plus a UI that renders the position being adopted. `40` needs a human at `chesslab web` for twenty minutes. |
| `40` is blocked | **Stale.** Its STATUS says phase 02 is blocked because "there is no confirmable candidate"; `specs/41` then fixed the geometry (three markers → a projective correction, median quad 29.6 → 2.0 px) and `data/realgames/game-2026-08-02/candidate.json` now holds **22 reviewable plies** — 10 `cnn_occupancy`, 6 `cnn_pair`, 6 `cnn_recovery`, `confirmed: false`, 95 review frames. What it needs is a pair of eyes, not a receiver. |
| `38` is blocked on `specs/34` merging | **Stale.** `feat-diagnostics-log` is an ancestor of `main`. Separately, `38`'s label table names a `kind: perf` that does not exist anywhere in the tree — `34` built exactly two kinds, `run_start` and `decision` (`DiagnosticsRecords.kt:26,28`), so "a file becomes at most three streams" is currently two, and the perf dashboards it promises rest on rows nobody writes. |
| The Android recorder feeds the corpus | **It never has.** Every session in `data/sessions/` and `data/sessions_archive/` carries Python-writer keys — `camera_index: 0`, `reviewed:`, `undistorted:`, `lens_calib_id:`. `record/SessionRecorder.kt:123-137` hardcodes `camera_index: -1` and writes none of them. Four weeks after the recorder and its ZIP exporter shipped (`1f274c4`), **the phone → PC path has zero traffic.** The 14 sessions with `profile: phone` are the phone used as an **IP camera** into the PC's tracker (`camera_source: https://192.168.178.23:4444/video/m.jpeg`) — a workflow that already crosses the LAN and needs none of this. |

So the transfer problem this platform solves has a **measured rate of zero**. That is not an argument
against building it — it may equally mean the current export (file picker → ZIP → USB → unzip) is too
annoying to ever use — but it does mean nobody may claim a pain rate here without inventing one.

What *is* measured, and does hurt:

- **Recording halts permanently at 1 GB, silently.** `SessionCapture.kt:145-153` sets `stoppedReason`
  and stops; there is no rotation, and `stoppedReason` is never cleared except by process death.
  Contrast `DiagnosticsLog.kt:126-141`, which rotates correctly — the same project wrote both.
- **Nothing on the phone can answer "is this safe to delete".** `RecordingSection.kt:202` says it
  outright: *"These frames are the only copy: nothing on the phone reads them back, so a deletion is
  discovered on the PC or not at all."*
- **The model the device runs can silently differ from the one selected.** `bundledModelOrDefault`
  (`CnnModelAssets.kt:66`) coerces any unknown name to `id35-80` with no signal, in two places
  (`CnnModelAssets.kt:130`, `AppSettings.kt:164`). `AppSettings.kt:132` records the consequence: a
  phone found running an asset three model releases behind, so every accuracy number quoted for it had
  been measured on a graph it was not executing.

## 2. The requirement that decides the architecture

> *the phone shall notify me that the backups are not transmitted to the server because it's down*

This one sentence settles the direction. The tempting design is the **PC pulling** from the read-only
Ktor server the phone already runs (`spectate/SpectatorServer.kt:105`, port 8420, site-local `wlan*`
bind, two GETs, no auth because there is no write path). It is cheaper in every respect: no HTTP
client on Android, no scheduler, no retry code, no outbound-cleartext question, and "the PC is off"
stops being a case.

It cannot meet the requirement. Under pull the phone never speaks, so it can only ever observe *"nothing
has been collected for five days"* — it cannot distinguish a PC that is off, a PC that rejected the
credential, and a PC with a full disk. **Naming the cause requires the phone to reach out.** So the
phone is the client, the server has a write path, and that write path needs a credential — the exact
shape that was reviewed and killed as `f00bf0e`. §4 answers that head-on rather than sidestepping it.

## 3. The stack

```
docker compose (dev PC)                                phone (com.chesslab.tracker)
┌──────────────────────────────────────────────┐
│ caddy      :443  TLS, internal CA, one entry │◀──── LinkClient
│ link       FastAPI + Pydantic v2 (our code)  │      ktor-client-cio + WorkManager
│ keycloak   OIDC: phone, admin UI, Grafana    │      OIDC device flow
│ postgres   link state + keycloak's own DB    │      health state + notifications
│ mongo      raw decision / observation rows   │
│ loki       diagnostics as log lines          │      SpectatorServer :8420 untouched
│ grafana    dashboards, SSO via keycloak      │
└──────────────────────────────────────────────┘
   bind mounts   data/incoming  rw   ← the ONLY writable path into the corpus
                 data/models    ro
   volumes       link-state, keycloak-data, pg-data, mongo-data, caddy-data
```

**`link` must not import `chesslab`.** The package pulls torch and OpenCV; an image carrying them is
gigabytes for a service whose job is to write files into a mounted directory and rows into Postgres.
It lives in its own top-level directory with its own `pyproject.toml` and `Dockerfile`.

**`link` never runs `slice`.** Slicing mutates `data/manifests/squares.jsonl` — the corpus every
trained model is measured against. Automating it means a network-facing process can change what "the
dataset" means. Adoption ends at *"verified, in `data/sessions/`, and it wants calibration profile X"*;
the human takes it from there, in the web UI, where `POST /api/sessions/{sid}/slice` already exists.

### 3.1 The data boundary

**The corpus stays files.** `manifest_cache.py` is explicit that it is "a cache over the JSONL source
of truth — no database, nothing to migrate". Sessions, crops, datasets and manifests do not move into
a database as a side effect of building an uploader. The databases serve the **link service only**.

| Store | Owns | Why it and not the other |
|---|---|---|
| **Postgres** | devices, grants, the upload ledger (artifact, device, path, sha256, bytes, state, timestamps), model publications, the audit trail, and Keycloak's own schema | needs consistency and joins; it is what an admin UI lists, filters and paginates |
| **Mongo** | raw `decision` / `run_start` rows, and the observation rows `specs/39` will add | the schema drifts **by design** — `39` adds `repeats` and a `user` decider — and its five queries ("how long do standoffs run", "was a recovery bridge true") are ad-hoc analytics that LogQL is poor at. Loki keeps the dashboards; Mongo keeps the corpus answerable. |

The honest alternative to Mongo is Postgres **JSONB**: document-shaped data with real indexes, one
query language, one backup story, one container fewer. Recorded here so the choice is revisitable
rather than inherited.

## 4. Identity — OIDC removes the credential that was killed

`f00bf0e` (`34-telemetry-uplink`) was reviewed and cut for three specific defects. Keycloak and the
protocol below answer each by removing its premise, not by mitigating it.

**"The token was published by `/img`."** The pack stored its ingest token at `data/ingest_token.txt`;
`web/app.py:32` mounts the entire `data/` tree, unauthenticated, at `/img`, and there is no `Depends`,
no middleware and no auth anywhere in `src/chesslab/web/`. So the read path of the server published the
secret protecting its write path.
→ **There is no token of ours.** The phone runs the OIDC **device authorization grant** (RFC 8628): it
displays a user code, you approve it in a browser, it receives a short-lived access JWT and a refresh
token. `link` validates signatures against Keycloak's JWKS and checks issuer, audience and scope; it
holds **no secret at rest**. Revocation is a click in Keycloak, not a file to find. This is also
`specs/38`'s own stated principle — *"we define no token and store no secret"* — applied to the write
path instead of only to the log path. The refresh token lives on the phone in
`EncryptedSharedPreferences` behind the Android Keystore, never in `AppSettings`, which is serialised
whole into the diagnostics `run_start` row.

**"mDNS auto-adoption."** The pack promoted a discovered endpoint after N failures and validated it
with a `hello` any LAN host can answer — so blackholing the real server was enough to *trigger* the
promotion.
→ **No discovery, ever.** One base URL, typed or scanned once. The `iss` claim is checked against the
configured issuer, so a squatter on a recycled DHCP lease produces a mismatch and a notification, not a
credential. **No code path changes the configured endpoint without a human typing it, and there is no
fallback address.**

**"The spool raced its appender."** `append`/`readBatch`/`truncatePrefix` rewrote a file its own writer
was appending to, which is why it then needed torn-last-line tolerance. `specs/34` replaced it with
rotation (`DiagnosticsLog.kt:51-53` still carries the tombstone).
→ **Only immutable units cross the wire.** A session is offered only while
`SessionCapture.recorder == null`; the in-progress `diag-N.ndjson` is never touched, exactly as
`specs/38` already requires; per-file sha256 in a manifest means there is no torn read to tolerate. The
one in-place rewrite in the tree — `SessionRecorder.undoLast()` (`:109-116`) — only ever touches the
active session, and deserves a test saying so.

### 4.1 TLS, which OIDC forces and which is a gain

The phone is now the client, so `NetworkSecurityPolicy` applies and outbound cleartext is blocked on
targetSdk 35 (there is no `network_security_config.xml` and no `usesCleartextTraffic` in the manifest).
OIDC over cleartext on a shared LAN is not defensible anyway.

Caddy terminates TLS with its internal CA. The root is exported once
(`docker compose exec caddy cat /data/caddy/pki/authorities/local/root.crt`) and embedded in the debug
APK as a trust anchor via `network_security_config.xml`. Android 7+ ignores user-installed CAs unless
an app opts in; embedding **is** the opt-in, and it scopes trust to this one CA rather than weakening
cleartext policy globally. One documented setup step, and it retires both the cleartext exception and a
separate certificate-pinning phase.

Do **not** build on the observation that `ktor-client-cio` is a raw-socket engine which may bypass the
policy. An accidental platform bypass is not a foundation, and a reviewer will read it as one.

## 5. The health surface

Persisted on the phone as `link_state.json`: `lastSuccessAt`, `lastAttemptAt`,
`lastError{kind, detail}`, `pendingSessions`, `pendingBytes`, `issuer`. Settings carries one row that
reads the truth at a glance — *"Backup · last success 2 days ago · 12 sessions, 3.4 GB pending"* —
opening a page with the same detail and a "Back up now".

**Failure is normal.** The PC is off at night. A notification per failed attempt is noise that teaches
you to ignore the channel. Notifications therefore fire on **elapsed time with pending data**, at most
one a day, replaced rather than stacked.

| Category | Fires when | Says |
|---|---|---|
| **Backup not getting through** | N days since the last success **and** data is pending (default 3, settable) | the classified cause: `server not reachable` (connect/timeout) · `sign-in expired` (401, refresh failed) · `a different server answered` (issuer mismatch) · `server out of space` (507/413) · `server error` (5xx). No Wi-Fi is not a failure and never notifies. |
| **Recording is about to stop** | recorded bytes ≥ 80 % of the cap, and again at the halt | how much is already safe on the server, and the one action that frees space. Today this state is silent and permanent. |
| **A new model is available** | the server publishes a model the phone lacks | offers it; never installs silently. The same surface carries the **fallback** notice — *"running `id35-80`, not the `x` you chose, because …"* — which is the silence described in §1. |
| **Tracker / analysis trouble** | tracker stopped unexpectedly, camera lost, an alarm latched while you were away, an analysis run died | **needs no server at all** — on-device state on an existing foreground notification. It can ship before any of this exists. |

**Retention is the user's decision only.** The ack writes `uploaded.json` into the session directory;
`SessionStore.list()` (`SessionStore.kt:23-25`) grows an `uploaded` flag; the UI shows "on the server"
and offers a bulk delete of exactly the confirmed set. Nothing deletes on a timer, at a threshold, or
from the server side. An ack is a per-file sha256 match, not a 200.

## 6. Protocols

### 6.1 Upload

Per-file under a manifest, **not a ZIP**. `SessionExporter.zipSession` streams and would be convenient,
but a ZIP is not resumable, not per-file idempotent, and hides integrity behind one blob. Measured on
the current corpus, a session runs from **13 MB to 1.6 GB**; a drop at 90 % must not cost the whole
transfer.

- `GET /api/artifacts` — what exists, and what has been acked.
- `GET /api/artifacts/{kind}/{id}/manifest` — files with bytes and sha256, cached beside the session
  and invalidated by mtime.
- Upload per file; skip any whose sha256 the ledger already holds. Server-side paths are validated
  **against the manifest's own list** — a whitelist, not a sanitiser, which is strictly stronger than
  the `_safe_id` pattern in `sessions.py:30`.
- Land as `<sid>-<device8>`. `generate_session_id()` is `%Y%m%d-%H%M%S` on both platforms
  (`collect.py:38`, `record/SessionStore.kt:32`) and `data/sessions/` is flat, so two devices — or a
  phone and `chesslab track` — collide on a coin flip. The directory name is the corpus key
  (`labeling.py:441`), so it must be unique and stable; `session.yaml` gains `origin_device` and
  `origin_session_id`, which `_read_meta`'s `yaml.safe_load` tolerates for free.
- **Quarantine in `data/incoming/`, never `data/sessions/`.** A partial upload inside `data/sessions/`
  is picked up by `run_slice(slice_all=True)`, which enumerates every directory holding a `log.jsonl`.
  And `_profile_for_session` (`labeling.py:37-54`) raises `FileNotFoundError` unless the PC happens to
  have a calibration profile of the name the phone recorded — the first real phone session will hit
  this, and `adopt` should say so rather than emit a traceback. In the container this rule is enforced
  by the mount table, not by discipline: `data/incoming` is the only writable bind.

### 6.2 Models

The transport is the small half. The blocker is the compile-time allowlist:

1. **Make it runtime** — `BUNDLED_MODELS ∪ { d ∈ filesDir/cnn_model/* : has config.json and model.onnx }`.
   `CnnModelAssets` is already abstracted over `open: (String) -> InputStream?` plus a staging `dir`
   (`:83`), and the unit tests already drive it from plain files, so a downloaded source is a new
   factory, not a new architecture.
2. **Make it loud** — return `Resolved(name)` or `FellBack(requested, to, reason)` and surface the
   fallback in Settings, in the notification above, and in the diagnostics `run_start` row that
   `specs/34` built for exactly this question. Silence is the defect.
3. Integrity by **sha256**, never `stageFile`'s length-only guard (`:107`) — the class doc itself warns
   that two models of the same architecture produce graphs within bytes of each other.
4. Commit into a **fresh directory** so no stale compiled `model.qnn_ctx.onnx` can survive a re-push.
5. **Bundled models are never overwritten.** They are the floor a bad push cannot take away.
6. Validate before commit: sha256 → `ModelSpec.parse` (which throws on a reordered class list) → open
   an ORT session off the main thread. What cannot be caught automatically is a model that loads, runs,
   and is simply worse; that is `scripts/sweep_infer_size.py`'s job, on the PC, before publishing.

**`specs/45` is a hard prerequisite.** None of the seven bundled `config.json` declares `pad_side` or
`pad_up`, while the corpus is cut at 0.05 and the Android default is 0.10
(`core-geometry/Corners.kt:65`). A deployed model therefore arrives **without its input contract**, and
a wrong padding shifts all 64 squares of every frame with nothing failing. Deployment turns that from a
per-release mistake into a per-push one.

## 7. Phasing

| Phase | What | Containers | Stop after it if… |
|---|---|---|---|
| **A** | runtime + loud allowlist; tracker/analysis notifications; the cap warning; two `adb run-as` scripts | none | …two weeks pass and nothing hurts. `adb push` into `filesDir/cnn_model/<name>/` deploys a model the moment the allowlist is runtime; the models are ~2.5 MB. |
| **B** | `specs/45` steps 1–5 | none | …0.05 vs 0.10 measures as free — itself a result worth having |
| **C** | `/img`, `_safe_id`, eviction (§9) | none | never optional before anything binds a LAN address |
| **D** | compose skeleton: caddy + keycloak + postgres + a `link` health endpoint; CA into the debug APK | 4 | …you want to judge the stack before building on it |
| **E** | phone OIDC device flow, uploads, ledger, health notifications | +0 | D and E are worth nothing apart |
| **F** | model publish → offer → install → rollback | +0 | needs B for correctness |
| **G** | mongo + loki + grafana, SSO, dashboards, `specs/39`'s five queries | +3 | `39` answerable without exporting a ZIP by hand |
| **H** | admin UI: devices, uploads, models, audit | +0 | — |

`{A, B, C}` are independent and parallelisable — disjoint files (`cnn/` + `scripts/`;
`training/evaluate.py` + `cnn/ModelSpec.kt` + geometry; `web/**` + `analysis/ReviewStore.kt`). Assign
`labeling.py` and `web/routers/sessions.py` to exactly one of B or C; they collide there.

**Resources.** The full stack is on the order of a gigabyte of RAM on a machine that also runs ROCm
training and the user's games. It belongs behind `docker compose up` on demand, with memory limits set
— an unattended full-tilt job on this machine has crashed a game before.

## 8. What this changes in `specs/38`

`38` chose Loki and Grafana as **native Windows binaries**, explicitly no Docker, because "ingest,
storage, schema, query and auth are all somebody else's software" and nothing should be ours to run.
Moving them into the compose stack keeps that principle — they are still not our code — and trades two
manually-managed Windows services for one versioned compose file. It is a deliberate override of a
written decision and should be recorded in `specs/38/STATUS.md` rather than left for a future reader to
discover as a contradiction.

Two of `38`'s own details need correcting when it is next touched: it is **no longer blocked** on
`specs/34`, and its `kind: perf` stream has no producer in the tree.

## 9. Defects this design inherits, and should not build on top of

- **`web/app.py:32` mounts all of `data/` unauthenticated at `/img` — measured 2026-08-06 at 101 GB.**
  Only `DEFAULT_WEB_HOST = "127.0.0.1"` protects it, and it cannot simply be deleted — `_img_url`
  (`web/util.py:46`) feeds the datasets, sessions, gradcam and reliance views. Fix: refuse the mount
  when the bind host is not loopback (the `create_app`/`run` split makes this two lines), and mount
  explicit subtrees instead of the root, so a `data/<secret>` mistake stops being possible by
  construction. Blocking for any document that tells a user to type a LAN address, because the
  predecessor pack's own hint was `--host 0.0.0.0`.
- **`_safe_id` is not applied** to `session_slice`, `reslice`, `run_metrics`, `run_eval`,
  `run_eval_trigger`, `run_export_trigger`, `run_gradcam`, `run_reliance` — and two of those spawn
  `python -m chesslab.cli` with a caller-influenced `--run` path. `run_delete` does validate, which
  shows the author knew. Adding validation is additive, so `tests/test_web_contract.py` stays green.
- **No eviction anywhere on the phone.** `.analysis-cache/` is `specs/46`'s own recorded open item and
  now grows *speculatively* — `PositionLibraryWarmer` creates up to 8 entries per finished review — and
  the session recorder's 1 GB cap halts rather than rotates. The ack loop in §5 is what makes retention
  answerable at all; a phase that ships uploads without acks has not solved it.
