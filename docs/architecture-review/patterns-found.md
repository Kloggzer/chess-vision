# Design Patterns in the Project

Inventory of patterns used consciously or implicitly, with evaluation of their application.

**Note (2026-08-20):** written against the 2026-07 tree. `collect.py`, `experiment.py`,
`geometry3d.py` and `photometric.py` have since been deleted; the examples that name them
describe how the code was, not where to look now.

## Correctly Applied

### Pipeline / Staged Architecture (Core)
The entire core library is a file-based pipeline with clear stage contracts
(Profile-YAML → Session-JSONL → Manifest-JSONL → split.json → Run directory). Each stage is
individually repeatable (`collect` and `slice` separated → re-slicing without re-recording). This is the
foundational architectural decision of the project and works well.
**Files:** collect.py, labeling.py, dataset.py, training/

### Adapter (ingest_adapters/)
Clean plugin pattern: uniform contract `iter_items(root) -> Iterator[ImportItem]`,
`ImportItem` dataclass as schema, three implementations (chesscog, chessred, synthetic) that
normalize different corner-orderings/FEN-formats to the internal format. Stateless,
functional, easily testable (chesscog/chessred tested; synthetic not yet — see Issues C3).
**Files:** ingest_adapters/__init__.py, chesscog.py, chessred.py, synthetic.py

### Single Source of Truth (config.py)
Class list `CLASSES`, crop defaults, augment policy, photometry defaults, `Paths` abstraction —
everything defined exactly once, imported everywhere. `Paths` as a parameter makes tests isolatable.
The CLAUDE.md principle "config before code" is largely followed.
**Limitation:** Crop parameters additionally exist as `calibration.CropParams` (duplicate, M5).

### Lazy Import (torch, UI)
torch is consistently imported only inside functions (web/inference.py, training/*), so that
CLI/Web can start without a GPU stack; OpenCV-GUI likewise. Conscious, documented decision
(Memory: "lazy torch"). Correctly applied.
**Counterexample:** the lazy import in geometry3d.py:159 is not a feature, but rather masks
an import cycle (M1).

### Strategy (Training Heads & Photometry)
Model heads (`combined` / `factored` / `twostage`) and photometry operators
(`none`/`clahe`/`gamma`/`grayworld`) are selected as interchangeable strategies via config strings
and systematically crossed in the bake-off (`experiment.py`). Clean application; the
bake-off grid is practically a small experiment framework.
**Files:** training/model.py:68–137, photometric.py, experiment.py

### Guarded Shared State + Producer/Consumer (move_tracker)
`MoveTracker`: capture daemon thread produces state (board, overlays, note), FastAPI handlers
consume under a shared `threading.Lock`. Consistent within the class; the pattern
ends, however, at the class boundary (`_STATE` dict of the app is unprotected, H1).

### Smoothing/Tracker Object (MarkerTracker)
EMA smoothing + dead zone + hold during occlusion + seed from calibration as its own stateful
object, reused by web camera and move_tracker (live_align). Good reuse; the
state logic is complex enough that it deserves documentation/tests.

## Implicitly Present / Room for Improvement

### Singleton via Module Globals (Web Layer) — Anti-Pattern in this Form
`_TRAIN`, `_COLLECT`, `_INFER`, `_MANUAL`, `CAMERA`, `_STATE` are module-level singletons.
Pragmatic for a local tool, but without locks and without a lifecycle (no timeout, no
cleanup on feature switch). Recommendation: keep, but add one lock per dict + explicit
reset semantics (H1).

### Model Run as Artifact Contract (Run Directory)
`data/models/<run>/` with `config.json` + `best.pt` acts as an implicit
"model registry" pattern. Good: consumers load the model **and** preprocessing config together.
Bad: the loading entry point is private (`_load_run`, H4) and the preprocessing application
(photometry!) is not part of the contract (C1).

### Missing Patterns That Would Be Beneficial
- **Observer/Voter Seam in move_tracker:** frame-diff and (planned) CNN observer as
  uniform candidate providers `(move, score)`, combined by a voting instance (M3).
- **Facade for "frame → model-ready crops":** a function that encapsulates geometry + photometry from
  the run config — eliminates the train/serve duplication (C1/R1).
- **Schema Objects for Wire Formats:** Pydantic models for API bodies (M2) and a documented
  manifest/session schema (M5) — today the schemas live only in the writer code.
