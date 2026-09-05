# STATUS — plan/02-phone-candidate

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-measure.md | todo | |
| 01 | 01-verb.md | todo | |
| 02 | 02-platform.md | todo | |
| 03 | 03-parity.md | todo | |

## Dependencies

00 first, alone (it decides `PHONE_FRAME_OFFSET`). 01 ∥ 02 after 00 is merged into
`feat/phone-candidate`. 03 after both, in the root checkout.

## Manual steps

- Phase 00 runs up to three `replay … label` jobs, one at a time, minutes each, on the user's machine.
- Phase 03 needs a fresh `:desktop:installDist` after the 01 merge.

## Notes / discrepancies

- Pack review 2026-09-06 (fresh Opus agent, pack only): 17 findings, all phases "not alone
  implementable". Folded in: the time bridge is TWO hops (`tsEpochMs` is wall time, `video_sync`
  rows carry only `elapsedNs`; the `frame`/`event` rows carry both clocks) plus a decoded-index
  frame clock instead of `round(t·fps)` (`ConcatFrameSource.fps` is nominal); bundle layouts differ
  (top level vs `files/sessions/<sid>/`) and one bundle has no record — Phase 00 lists instead of
  asserting; a two-segment record yields segment 0 plus a note instead of a refusal; paired plies
  share one instant and therefore one frame; `LabelVerb.kt` untouched (the verb owns its decode
  loop), `RecordedFrames.videoNsAt` goes `internal`; anchors `chain.ts:34/:87`, `nextStep :118-129`,
  `chain-run.ts:13/:30`, `chain.test.ts:16-25/:86-88`, `DesktopMain.kt:283`; `refusalOf` takes the
  last `refused:` line; the heavy lock is claimed as `label` under the fallback.

## Session log

(empty)
