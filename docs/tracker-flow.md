# From camera frame to committed move

The tracker runs on the phone and, through `:desktop`, on a PC — the same modules either way.
This is the shape of one frame's journey, at the level where you can point at a stage and ask
"did it happen". For the numbers each stage costs, see `chesslabPerf`; for what it decided, the
`chesslabDecision` row.

Two paths leave the pipeline and only one of them is per-frame. The **diff path** is synchronous:
every frame goes through it and a move can be committed inside that call. The **CNN path** is
asynchronous and sparse: it is asked for a reading a few times a second at most, off the frame
thread, and its answer arrives later as a snapshot the engine drains on some subsequent frame.

```mermaid
flowchart TD
    CAM["camera frame<br/>(ImageProxy on the phone, Mat from a file or webcam)"]
    CONVERT["convert — YUV → BGR<br/><i>host-specific; the only typed seam</i>"]
    LENS["Stage.LENS — undistort<br/><i>off unless a calibration matches</i>"]
    PUBLISH["publish frame<br/>→ preview, calibration tap, live align"]
    WARP["detection warp<br/><i>boardSize × detectScale</i>"]
    DARK["dark gate<br/><i>luma before CLAHE</i>"]
    GRAY["gray + CLAHE"]
    MOTION["ROI motion<br/><i>board quad + margin</i>"]
    GRID["grid coverage"]
    INPUT(["FrameInput"])

    CAM --> CONVERT --> LENS --> PUBLISH --> WARP --> DARK
    DARK -->|too dark| SKIP["skipped — no detection this frame"]
    DARK -->|usable| GRAY --> MOTION --> GRID --> INPUT

    INPUT --> ENGINE

    subgraph ENGINE["engine — synchronous, same frame"]
        DIFF["per-square evidence z<br/><i>gray + census, fused</i>"]
        VETO["vetoes<br/>shadow · occlusion · CNN conflict"]
        HYPO["score hypotheses<br/><i>which legal move explains the changed set</i>"]
        GATES["commit gates<br/>settle · confirm · evidence floor · motion recency"]
        COMMIT["board.push(move)"]
        REJECT["rejected — reason recorded"]
        DIFF --> VETO --> HYPO --> GATES
        GATES -->|passes| COMMIT
        GATES -->|fails| REJECT
    end

    COMMIT --> RESULT(["MoveCommitted<br/>new FEN, decider, SAN"])
    REJECT --> ROW(["chesslabDecision row"])
    COMMIT --> ROW

    WARP -.->|"only when asked"| CROPS["crop store<br/><i>bordered full-res warp</i>"]

    subgraph CNNPATH["CNN — asynchronous, a few times a second"]
        CROPS --> OBS["CnnObserver<br/><i>64 crops → ONNX</i>"]
        OBS --> SNAP["CnnSnapshot<br/><i>per-square occupancy + identity</i>"]
        SNAP --> QUEUE["snapshot queue"]
    end

    QUEUE -.->|drained on a later frame| ROUTE{"pending candidate?"}
    ROUTE -->|yes| VERIFY["VerifySingle / pair ladder"]
    ROUTE -->|no| TICK["cnnTick<br/><i>evaluator? due?</i>"]
    VERIFY --> GATES
    TICK --> VETO

    classDef broken fill:#5a1a1a,stroke:#ff6b6b,stroke-width:2px,color:#fff
    class CROPS,OBS,SNAP,QUEUE broken
```

## Where it is currently broken

The red band is measured, not suspected. On `rec-20260807-135238.mp4`, 8,820 frames, with the
classifier attached and verified (`CNN EP verified: CPU, classes=13`):

```
cnn=run  cnnAgree=0.000  cnnReads=0/0  cnnSnaps=0/0/0/0
```

`cnnSnaps` counts snapshots as they arrive and splits them by where they go — to the verify
ladder, to a missing evaluator, to a closed schedule gate. All four are zero, so **no snapshot
ever reached the engine**. Neither engine-side gate closed; nothing got that far.

That places the break in the dotted edge from the detection warp to the crop store, or in the
observer behind it — not in the engine, which is where six earlier rounds looked.

## What the diff path does without it

Everything, minus arbitration. With no snapshot the occlusion filter falls through to a
">2 changed squares = a hand" heuristic instead of asking the model per square, and the pair
ladder has nothing to verify against. On the same footage the engine reads the first move
perfectly — `changed=[e2, e4]`, `best=e2e4`, no stuck reason — and the position never advances.

## Reading a run

```bash
./gradlew :desktop:run --args="replay <video> quiet lens"        # numbers only
./gradlew :desktop:run --args="replay <video> dump=10 lens"      # + annotated board PNGs
./gradlew :desktop:run --args="replay <video> nocnn"             # the diff path alone
```

Without `quiet` or `dump` a window opens showing the rectified board with each square tinted by
what the engine did with it, and it STOPS when the engine gets stuck.
