# Phase 04 — What the shipping engine actually does

> **Measurement only. This phase is forbidden from fixing anything it finds.**

## Why

Every number on record for `VID_20260802_222741.mp4` came from the **Python** tracker: 22 plies of a
game that ran 83 live, three pair commits, six recoveries, and a terminal
`"Much change (18 squares + 0 occluded)"` at t = 130.37 s of a 319 s video — 41 % in.

Nobody has ever run the **phone's** engine on it. This phase does exactly that and records the
result, whatever it is.

It also settles a question left open on 2026-08-06 without chasing it: the Python writer paired
frames with stale indices (`entry.md`), and if the same defect also affected what the *tracker* was
fed, then the 22-ply result and the lag diagnosis built on it are both artefacts. A clean Kotlin run
answers that by existing.

## The two competing explanations, named

The agent must choose between these and justify the choice with evidence — not attribute everything
to whichever is mentioned first.

**A — the lag hypothesis.** The tracker fell progressively behind and could not catch up. Evidence
that would support it: commits pacing at ~5.9 s/ply against a live pace of ~3.8 s/ply; the gap
exceeding `recoveryMaxPlies = 4` around ply 22; recoveries clustering just before the stop. The
mechanism: once the gap is wider than the bridge, the conflict-guided search cannot close it, every
frame then shows more than `maxChanged = 6` changed squares, no commit happens — and **the reference
is only re-anchored on a commit**, so it never recovers. That last clause is `specs/40`'s own second
finding, recorded there as worth its own fix regardless of this video.

**B — the harness-artefact hypothesis.** The Python replay fed the tracker duplicated or misindexed
frames, so the observation stream it saw was not the video. Evidence that would support it: the
Kotlin run committing materially more plies, or stopping somewhere else entirely.

A third outcome is possible and must be reported plainly if it happens: **the Kotlin engine behaves
differently for a reason that is neither** — for example a crop, warp or threshold that differs
between the two implementations. That is the most valuable finding this pack can produce, because it
is a real parity gap in the code that ships.

## What to run

One run, CNN attached, the shipped default model (`id35-80`), the `phone` profile. **This is minutes
of CPU on a 9576-frame 1080p video — run it once, never in parallel, never as a loop.** The user's
machine also runs their games.

```
gradlew.bat :app:testDebugUnitTest --tests "*LabelRealGameTest*" \
  -Dchesslab.realgame.video=data/testclip-raw/VID_20260802_222741.mp4 \
  -Dchesslab.realgame.name=game-2026-08-02-kotlin \
  -Dchesslab.realgame.profile=phone
```

Write to a **new name**. Do not overwrite `data/realgames/game-2026-08-02/` — it is the Python
result and the comparison depends on it surviving.

## What to record in STATUS.md

A table, Python against Kotlin, on the same video:

| | Python (on record) | Kotlin (this run) |
|---|---|---|
| plies committed | 22 | |
| last commit frame / t | 3910 / 130.37 s | |
| deciders | occ 10 · pair 6 · recovery 6 | |
| alarms | 0 | |
| terminal note | `Much change (18 squares + 0 occluded)` | |
| observations | 958 | |
| markers decoded (histogram) | 3:940 · 2:17 · 1:1 | |
| worst square offset | median 2.003 / p90 2.448 / max 23.821 | |

Then: **which explanation the evidence supports, and why.** If the SANs agree ply for ply, say so —
that is a parity result worth having. If they diverge, give the first divergent ply, its frame and
both deciders.

"The Kotlin run reproduces the Python result exactly" is a **good** outcome and must be reported as
plainly as any other. So is "it is worse". Do not narrate a win.

## Steps

### 1. run it — commit `docs(specs): 52 — what the shipping engine does on real footage`
`STATUS.md` only. No source changes.

## Acceptance criteria

- `data/realgames/game-2026-08-02-kotlin/candidate.json` exists with `confirmed: false`.
- `STATUS.md` carries the filled table, the chosen explanation, and the evidence for it.
- The 2026-08-02 Python candidate is untouched — `git status` clean, file mtime unchanged.
- No source file changed in this phase's commit.

## Do NOT / Out of scope

- **Do not fix anything.** Not the reference re-anchoring, not `recoveryMaxPlies`, not a threshold.
  Findings go in `STATUS.md` with file, line and evidence. A speculative repair here would mask the
  measurement this whole pack exists to take.
- Do not tune config to make the number look better. The shipped defaults are the subject.
- Do not adopt either candidate into the manifest.
- Do not re-run to get a nicer result. If a run is invalid, say why and run once more.
