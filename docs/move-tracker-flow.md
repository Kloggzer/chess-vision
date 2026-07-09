# Move-Tracker — Detection Flow (v3, streamlined pipeline)

`tracker._try_detect` is an ordered pipeline of numbered steps (the method names in
`tracker.py` match the node labels below). Every candidate — single move, fast-play
pair, low-contrast endpoint — flows through the SAME motion gate, confirmer and
dispatch; there is exactly one commit gate (`_dispatch`).

```mermaid
flowchart TD
    START([chesslab track --profile --source --device]) --> S1[Load calibration profile<br/>homography + corners/markers]
    S1 --> S2[Open camera<br/>URL: Grab-Latest MJPEG, auto-reconnect]
    S2 --> S3[Build MoveTracker<br/>config.TRACK_DEFAULTS]
    S3 --> S4[Start Web-UI :8001<br/>loop thread starts]
    S4 --> U0[User sets up start position] --> U1[[reset_to_start<br/>board = start FEN, ref = empty]] --> BT

    %% ===== PER-FRAME PRE-GATES (loop thread) =====
    subgraph FRAME [Per frame: _loop]
        LOOP[Frame → warp → gray+blur] --> MG{Motion gate<br/>% of strongly-changed pixels<br/>board + ROI beyond edge}
        MG -- "> motion_thr: hand/camera" --> MOV[MOVING: clear buffers,<br/>arm motion_since_ref +<br/>motion cooldown] --> LOOP
        MG -- stable --> CD{settled &<br/>cooldown over?}
        CD -- no --> LOOP
        CD -- yes --> GG{Grid-line gate<br/>enough grid visible?}
        GG -- "no (hand/arm covers board)" --> OCC[state occluded<br/>base truth stays] --> LOOP
        GG -- yes --> BT{Base truth<br/>set & FEN matches?}
        BT -- no --> BTset[[Set base truth<br/>ref = image + FEN<br/>+ color gamut]] --> LOOP
        BT -- yes --> P1
    end

    %% ===== DETECTION PIPELINE (_try_detect) =====
    subgraph PIPE [Detection pipeline: _try_detect steps 1–9]
        P1["1 guards<br/>pending? promo? corner jump?"] -->|ok| P2["2 evidence<br/>diff vs ref → median norm → z-scores"]
        P1 -->|abort| LOOP
        P2 --> P3["3 vetoes<br/>shadow (HSV+census, z kept)<br/>occlusion (color gamut, z zeroed)"]
        P3 --> P4["4 noise learning<br/>EMA per square — never from<br/>changed/shadow/occluded squares"]
        P4 --> P5{"5 quiet?<br/>nothing above z_thr"}
        P5 -- "quiet & no evidence" --> REANCH[["Re-anchor: ref pulled forward<br/>+ deferred jobs: gamut rebuild,<br/>session photo (clean frame!)"]] --> LOOP
        P5 -- weak move evidence --> HOLD[HOLD reference,<br/>keep collecting] --> LOOP
        P5 -- changed squares --> P6["6 hypothesis"]
        P6 --> H1{too much change?}
        H1 -- "> max_changed+2" --> STUCK
        H1 -- "pair explains it" --> CAND
        H1 -- no --> H2{"pair clearly better<br/>than best single?<br/>(LL margin)"}
        H2 -- yes --> CAND["candidate<br/>single / pair / endpoint"]
        H2 -- no --> H3{single viable &<br/>net-positive?}
        H3 -- "ambiguous (LL margin)" --> PRI{prior decides?<br/>promotion?}
        PRI -- prior --> CAND
        PRI -- "promotion, no CNN" --> PROMO[UI: choose piece Q/R/B/N] --> COMMIT
        PRI -- no --> AMB[show candidates,<br/>please move cleanly] --> LOOP
        H3 -- yes --> CAND
        H3 -- "no: endpoint-only + CNN" --> CAND
        H3 -- no --> STUCK[STUCK<br/>no_legal_move / too_many_changed]
        CAND --> P7{"7 motion since ref?"}
        P7 -- "no (drift/light)" --> DRIFT[ignore, note] --> LOOP
        P7 -- yes --> P8{"8 confirmer<br/>same candidate N frames<br/>(endpoint skips)"}
        P8 -- collecting --> LOOP
        P8 -- confirmed --> P9{"9 dispatch<br/>CNN verify on?"}
        P9 -- no --> COMMIT[[Commit move / pair<br/>ref = commit frame,<br/>gamut kept, photo deferred]]
        P9 -- yes --> PEND[pending candidate]
    end

    %% ===== CNN (outside the lock) =====
    subgraph CNN [CNN observers: _verify_tick / _cnn_tick]
        PEND --> VER{pre-commit verify<br/>occupancy axes}
        VER -- board unchanged --> SHAD[[shadow: drop candidate,<br/>ref pulled forward]] --> LOOP
        VER -- "to-square still empty" --> GHOST[ghost rejected] --> LOOP
        VER -- confirmed / pair position matches --> COMMIT
        VER -- CNN sees other move --> OVR[[CNN overrules diff]] --> COMMIT
        VER -- window over, occluded --> GHOST
        STUCK --> REC{CNN recovery<br/>1–2 half-moves, voting}
        REC -- move found --> COMMIT
        REC -- board unchanged --> SHAD
        REC -- diverges --> WARN[warning / resync?] --> LOOP
        STUCK --> PATCH[["anomaly patcher (also WITH CNN):<br/>persistent unexplained squares →<br/>cell-patch reference (nudge/drift)"]] --> LOOP
        PERIOD[/every N s: CNN check<br/>board == game state?/] -. deviation .-> WARN
    end

    COMMIT --> M1[Update board + FEN + history<br/>base truth = new position] --> GO{game over?}
    GO -- no --> LOOP
    GO -- yes --> END([Show result])

    UACT[/User at any time/] --> UA1[Undo → hard-negative logged,<br/>deferred photo dropped] --> BT
    UACT --> UA2[Resync to FEN] --> BT
    UACT --> UA3[Resync via CNN] --> M1

    classDef good fill:#14532d,stroke:#22c55e,color:#dcfce7;
    classDef bad fill:#7f1d1d,stroke:#ef4444,color:#fee2e2;
    classDef cnn fill:#1e3a8a,stroke:#3b82f6,color:#dbeafe;
    classDef setup fill:#3730a3,stroke:#818cf8,color:#e0e7ff;
    classDef term fill:#111827,stroke:#9ca3af,color:#f9fafb;
    class COMMIT,BTset,REANCH,PATCH,OVR,SHAD good;
    class STUCK,WARN,AMB,GHOST,DRIFT bad;
    class VER,REC,UA3,PERIOD,PEND cnn;
    class S1,S2,S3,S4 setup;
    class START,END term;
```

## Key Decisions (Quick Reference)

| Mechanism | Where | Core |
|---|---|---|
| Motion gate | `tracker.motion_score` | % of pixels with delta > `motion_px_thr` (20) — desk wobble/jitter shifts everything sub-threshold (score ~0), a hand is a compact strong region; threshold `motion_thr` 0.25 % (slow hands only move a thin edge band between frames) |
| Noise model | `tracker.SquareNoise` | EMA mean/std per square, std-floor 3.0; learns every stable frame but never from changed/shadow-vetoed/occluded squares |
| Move score | `tracker.loglik_scores` | Σ k·(z − z_thr) over touched squares, clamped ±12 |
| Viability | `_try_detect` step 5 | both endpoints z ≥ z_thr/2 (replaces −1000 penalty) |
| Pair preference | `_pair_candidate` | pair must beat best single AND second pair by `ambiguity_margin_ll` — catches the reply landing in the same window (a net-positive single would silently swallow it) |
| One commit gate | `_dispatch` | every candidate (single/pair/endpoint) passes motion gate + confirmer + CNN verify; pairs are verified against the post-pair position (`_verify_pair_tick`) |
| Re-anchor | `_try_detect` step 5 | only when nothing above z_thr AND best-LL < `reanchor_ll_floor`; this clean moment also rebuilds the color gamut and takes the deferred session photo |
| Gamut hygiene | `_set_ref(from_commit=True)` | commit frames may contain hand residue → occlusion gamut is NOT rebuilt from them (a poisoned gamut blinds the hand veto) |
| Session photo | `_queue/_flush_session_capture` | deferred to the next clean stable view; skipped if the next move comes first; dropped on undo |
| Structural evidence | `_compute_evidence` | census change vs reference, own noise model (floor 2.0); fused z_eff = max(z_gray, `census_z_weight`·z_census) — census is illumination-invariant structure, lifts dark-on-dark moves the gray mean-diff dilutes (weight 1.0 default, 0 = off) |
| Shadow veto | `hsv_shadow_squares` + census | HSV per Cucchiara, census < `census_thr` (160, live-tuned) confirms "no structure"; vetoed squares keep their z (vacate evidence) |
| Occlusion vs shadow | `_baseline_occlusion_and_shadow` | strong absdiff is classified: census > `occl_census_thr` (24) → occluded; chroma outlier vs gamut → occluded (flat hand); flat + darker + chroma-consistent → cast shadow (no occlusion latch, no stall); `occl_census_thr` 0 = old brightness-only behavior |
| Occlusion veto | `occlusion_color_squares` | NEAREST-NEIGHBOR Mahalanobis vs all 64 reference square features (Lab a*/b* + saturation), thr 1.5σ (live-tuned); z zeroed. NN, not global mean: a dark piece on a light square matches some dark-piece square; skin matches none |
| Occlusion latch | `_tainted` in `_try_detect` | a once-occluded square stays hard-blocked until occlusion-free for `motion_cooldown` frames (the hand leaving must not be forgotten one frame later); latched+occluded squares still COUNT toward the max_changed gate; no re-anchor while latched; persistent taints are WHITELISTED per square (never gamut re-learn from a live frame — a resting hand would blind the veto) after `drift_window_s` (≤2 squares: `nudge_timeout_s`), cleared at the next clean re-anchor; a latched quiet-hold marks `stuck` so CNN recovery resolves the standoff in ~2 s |
| Grid-line gate | `_grid_line_coverage` | < 0.5 of interior grid lines visible → large opaque occluder, skip detection |
| Prior | `tracker.move_prior` | capture +0.5, check +0.3, forward +0.2, cap 1.0; commit marks it |
| Nudge/Drift patcher | `_maybe_patch_anomaly` | runs also WITH CNN: persistent unexplained squares → cell patch (occupied 5 s, empty 30 s), regions include `overhang` |
| Geometry invalidation | `_corners_jumped` | warp corner > 6 px since reference capture → re-acquire base truth |
| Camera reattach | `reattach_camera` | feed dropout → capture rebuilt, base truth KEPT (fast resume; a move made during the gap is detected against the kept reference; geometry changes caught by `_corners_jumped`) |
| 2-Ply recovery | `cnn_recovery.derive_moves_identity` | stuck state: CNN searches 1–2 half-moves, multi-frame voting |
| Promotion | `_promo_pending` / `/api/promote` | without CNN: UI choice; with CNN: target-square label decides |

All thresholds: `config.TRACK_DEFAULTS`, overridable via `chesslab track` flags.
