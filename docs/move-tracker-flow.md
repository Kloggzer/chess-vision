# Move-Tracker — Detection Flow (v2, Spec 10)

Based on `specs/rework/10-move-detection-v2.md`: probabilistic LL-scoring
(z-scores against per-square noise model), prior tie-break, 2-ply recovery,
nudge/drift re-anchor without CNN, CNN counter-candidate, promotion dialog.

```mermaid
flowchart TD
    START([chesslab track --profile --source --device]) --> S1[Load calibration profile<br/>homography + corners/markers]
    S1 --> S2[Open camera<br/>URL: Grab-Latest MJPEG]
    S2 --> S3[Build MoveTracker<br/>z_thr, LL-Margin, CNN-Run, config.TRACK_DEFAULTS]
    S3 --> S4[Start Web-UI :8001<br/>Loop thread starts]

    S4 --> U0[User sets up start position]
    U0 --> U1[[reset_to_start<br/>board = start FEN, ref = empty]]
    U1 --> BT

    %% ===== BASE-TRUTH =====
    subgraph ACQ [Capture base truth]
        BT{Board calm &<br/>clear view?}
        BT -- no --> BTw[wait for clear view] --> BT
        BT -- yes --> BTset[[Set base truth<br/>ref = image + FEN]]
    end
    BTset --> LOOP

    %% ===== RUNNING ANALYSIS =====
    subgraph ENGINE [Analysis loop per frame]
        LOOP[Frame → Warp → Motion-Gate<br/>incl. ROI BEYOND board edge] --> LG{stable?}
        LG -- no / hand moving --> LOOP
        LG -- yes --> LD[Diff vs base truth → median norm →<br/>z-scores per noise model<br/>+ HSV shadow veto + census]
        LD --> LLS[LL-score per legal move<br/>viable: both endpoints z ≥ z_thr/2]
        LLS --> LDx{Result?}
        LDx -- "quiet (best-LL < Floor)" --> LNM[[Re-Anchor +<br/>noise model learns]] --> LOOP
        LDx -- weak evidence --> LHOLD[HOLD reference<br/>keep collecting] --> LOOP
        LDx -- "ambiguous (LL-Margin)" --> LPRIOR{Prior<br/>decides?}
        LPRIOR -- yes --> LV
        LPRIOR -- Promotion or CNN --> LPROMO[UI: choose piece<br/>Q/R/B/N] --> LCOMMIT
        LPRIOR -- no --> LAMB[Show candidates<br/>please move cleanly] --> LOOP
        LDx -- one viable move --> LV{CNN active?}
        LDx -- many/unexplained --> LSTUCK[STUCK]
        LV -- no --> LCOMMIT
        LV -- yes --> LVER[CNN-Verify<br/>multiple frames]
        LVER -- confirmed --> LCOMMIT[[Commit move<br/>prior decision marked]]
        LVER -- ghost/shadow --> LRE
        LVER -- CNN counter-candidate<br/>substantiated --> LOVR[[CNN overrules diff<br/>different move COMMIT]] --> M1
        LSTUCK --> LREC[CNN Recovery<br/>1–2 half-moves deep]
        LSTUCK -- without CNN,<br/>1–2 squares persistent --> LPATCH[[Nudge/Drift:<br/>patch reference cells]] --> LOOP
        LREC -- real move / move pair --> LCOMMIT
        LREC -- board unchanged --> LRE[[Update reference]]
        LREC -- diverges --> LWARN[Warning / Resync?]
        LRE --> LOOP
        LWARN --> LOOP
    end

    LCOMMIT --> M1[Update board + FEN + history<br/>+ board SVG]
    M1 --> M2[Base truth = new position<br/>side to move switches]
    M2 --> GO{Game over?<br/>Checkmate / Stalemate}
    GO -- no --> LOOP
    GO -- yes --> END([Show result<br/>1-0 / 0-1 / ½-½])

    %% ===== SIDE FLOWS =====
    PERIOD[/every N s: CNN check<br/>board == game state?/] -. deviation .-> LWARN
    PERIOD -. matches .-> LOOP

    UACT[/User at any time/] --> UA1[Undo] --> LOOPr[Re-acquire reference] --> BT
    UACT --> UA2[Resync to FEN] --> LOOPr
    UACT --> UA3[Resync via CNN] --> M1
    UACT --> UA4[Restart] --> U1

    classDef good fill:#14532d,stroke:#22c55e,color:#dcfce7;
    classDef bad fill:#7f1d1d,stroke:#ef4444,color:#fee2e2;
    classDef cnn fill:#1e3a8a,stroke:#3b82f6,color:#dbeafe;
    classDef setup fill:#3730a3,stroke:#818cf8,color:#e0e7ff;
    classDef term fill:#111827,stroke:#9ca3af,color:#f9fafb;
    class LCOMMIT,BTset,LRE,LNM,LPATCH,LOVR good;
    class LSTUCK,LWARN,LAMB bad;
    class LVER,LREC,UA3,PERIOD cnn;
    class S1,S2,S3,S4 setup;
    class START,END term;
```

## Key Decisions (Quick Reference)

| Mechanism | Where | Core |
|---|---|---|
| Noise model | `tracker.SquareNoise` | EMA mean/std per square, updated only at rest, std-floor 1.5 |
| Move score | `tracker.loglik_scores` | Σ k·(z − z_thr) over touched squares, clamped ±12 |
| Viability | `_try_detect` | both endpoints z ≥ z_thr/2 (replaces −1000 penalty) |
| Re-Anchor | `_try_detect` | only when nothing above z_thr AND best-LL < `reanchor_ll_floor` |
| Prior | `tracker.move_prior` | capture +0.5, check +0.3, forward +0.2, cap 1.0; commit marks it |
| Nudge/Drift | `_maybe_patch_anomaly` | without CNN: 1–4 squares persistent → cell patch (occupied 5 s, empty 30 s) |
| Geometry invalidation | `_corners_jumped` | warp corner > 6 px since reference capture → re-acquire base truth |
| 2-Ply | `cnn_recovery.derive_moves_identity` | single move preferred; pair only with margin against pair AND single move |
| Counter candidate | `_verify_tick` | CNN alternative committed when identifiably substantiated |
| Promotion | `_promo_pending` / `/api/promote` | without CNN: UI choice; with CNN: target-square label decides |

All thresholds: `config.TRACK_DEFAULTS`, overridable via `chesslab track` flags.
