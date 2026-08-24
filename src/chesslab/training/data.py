"""Stage 5 — torch-free dataset logic.

Everything that works WITHOUT PyTorch and is therefore testable headless:
split filtering, frame grouping, **board accuracy** reconstruction, and
model card construction. The torch-bound parts (dataset, transforms) live in
`torch_data.py`.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from .. import config
from ..work_audit import measure


def load_manifest(path: Path) -> list[dict]:
    from ..ioutil import read_jsonl

    p = Path(path)
    if not p.exists():
        # Semantics as before Rework 05: missing manifest is a hard error, not an empty
        # dataset — otherwise one silently "trains" on nothing.
        raise FileNotFoundError(f"Manifest not found: {p}")
    st = p.stat()
    with measure("manifest loads", (p.resolve(), st.st_mtime_ns, st.st_size),
                 processed_bytes=st.st_size):
        return read_jsonl(p)


def crop_of_rows(rows: list[dict]) -> tuple[float, float] | None:
    """`(pad_side, pad_up)` EVERY row was cut with — or None when they cannot agree on one.

    None has two causes and one meaning. The rows may predate the fields (every crop written
    before 2026-08-06 does), or they may disagree because the sessions were sliced under
    different profiles. Either way the run must declare nothing: a consumer crops to what the
    model declares, so a wrong value is worse than an absent one — an absent one is at least
    visible as legacy (specs/45).
    """
    pads: set[tuple[float, float]] = set()
    for row in rows:
        if "pad_side" not in row or "pad_up" not in row:
            return None
        pads.add((float(row["pad_side"]), float(row["pad_up"])))
        if len(pads) > 1:
            return None
    return next(iter(pads)) if len(pads) == 1 else None


def load_split(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def filter_rows_by_split(rows: list[dict], split: dict, which: str) -> list[dict]:
    """Only crops whose session belongs to the desired split (train/val/test)."""
    sids = set(split["splits"][which])
    return [r for r in rows if r["session_id"] in sids]


def class_to_idx(classes: list[str]) -> dict[str, int]:
    return {c: i for i, c in enumerate(classes)}


def board_accuracy(items: list[tuple[tuple, bool]]) -> float:
    """Fraction of frames where ALL squares are correct.

    `items`: list of ((session, frame), is_correct). A single wrong crop makes
    the whole board wrong — this is the metric that counts in real operation.
    """
    groups: dict[tuple, list[bool]] = defaultdict(list)
    for key, correct in items:
        groups[key].append(bool(correct))
    if not groups:
        return 0.0
    boards = [all(v) for v in groups.values()]
    return sum(boards) / len(boards)


def _piece_type(label: str) -> str:
    """'wP'->'P', 'bN'->'N', 'empty'/'occluded' stay as-is."""
    return label if label in ("empty", "occluded") else label[1]


def _piece_color(label: str) -> str | None:
    """'wP'->'w', 'bN'->'b', empty/occluded -> None (no color)."""
    return None if label in ("empty", "occluded") else label[0]


def occupancy_piece_breakdown(classes: list[str], trues: list[int], preds: list[int]) -> dict:
    """Head-INDEPENDENT error diagnosis from the 14-class output — shows WHERE errors occur
    (the central question from research: occupancy vs. type vs. color).

    - `occupied_acc`: empty-vs-occupied per square correct (quality of the occupancy level; `occluded` counts as occupied).
    - `piece_acc`: among the TRULY occupied squares, the piece is exactly right (quality of the piece level).
    - `type_err` / `color_err`: fraction of true REAL pieces (12 classes) with type or pure
      color confusion (`wB→wN` = type; `wB→bB` = color). Sum ≤ (1−piece_acc on real pieces).
    """
    occ_ok = occ_n = 0
    piece_ok = occ_total = 0          # over TRULY occupied squares (incl. occluded)
    real_n = type_err_n = color_err_n = 0   # over true real pieces (12)
    for t, p in zip(trues, preds, strict=False):
        tl, pl = classes[t], classes[p]
        t_occ, p_occ = tl != "empty", pl != "empty"
        occ_n += 1
        occ_ok += int(t_occ == p_occ)
        if t_occ:
            occ_total += 1
            piece_ok += int(t == p)
            if tl != "occluded":                       # true real piece -> type/color defined
                real_n += 1
                if _piece_type(pl) != _piece_type(tl):
                    type_err_n += 1
                elif _piece_color(pl) != _piece_color(tl):
                    color_err_n += 1
    return {
        "occupied_acc": occ_ok / occ_n if occ_n else 0.0,
        "piece_acc": piece_ok / occ_total if occ_total else 0.0,
        "type_err": type_err_n / real_n if real_n else 0.0,
        "color_err": color_err_n / real_n if real_n else 0.0,
        "n_occupied": occ_total,
        "n_pieces": real_n,
    }


def _macro_recall(trues: list[int], preds: list[int], n_classes: int) -> float:
    """Per-class recall, averaged over all classes with support (true>0)."""
    per_class_correct = [0] * n_classes
    per_class_total = [0] * n_classes
    for t, p in zip(trues, preds, strict=False):
        per_class_total[t] += 1
        if t == p:
            per_class_correct[t] += 1
    recalls = [per_class_correct[i] / per_class_total[i] for i in range(n_classes) if per_class_total[i] > 0]
    return sum(recalls) / len(recalls) if recalls else 0.0


def checkpoint_score(rows: list[dict], classes: list[str],
                     trues: list[int], preds: list[int]) -> tuple[float, float, float]:
    """Sortable score for checkpoint/early-stopping:
    (gewichteter Score, occupied_board_acc, macro_recall) — Gewichte in CHECKPOINT_WEIGHTS."""
    return checkpoint_metrics(rows, classes, trues, preds)[0]


#: Die beiden Ebenen eines SICHTBAREN Feldes — belegt, und wenn ja welche Figur — plus die
#: Kalibrierung. Die ersten beiden gleich, weil keine vorgeht. `calibration` ist die AUROC der
#: Konfidenz als Falsch-Detektor: skaleninvariant, misst Trennschaerfe statt Niveau. Klein
#: gewichtet, weil sie mit der Figurengenauigkeit ohnehin mitlaeuft und nur entscheiden soll,
#: wenn zwei Epochen gleich genau sind.
CHECKPOINT_WEIGHTS = {"visible_piece_acc": 0.45, "visible_occupied_acc": 0.45,
                      "calibration": 0.10}


def checkpoint_metrics(rows: list[dict], classes: list[str], trues: list[int],
                       preds: list[int],
                       auroc: float | None = None) -> tuple[tuple[float, float, float], dict]:
    """Gewichteter Checkpoint-Score plus die geteilte Belegungs-Aufschluesselung, in einem Durchgang."""
    bd = occupancy_piece_breakdown(classes, trues, preds)
    bd["occupied_board_acc"] = occupancy_board_acc(rows, classes, trues, preds)
    # Benotet wird, was der Verlust auch lernt: alles ueber PIECE_VISIBLE_MAX ist ausmaskiert,
    # es mitzuzaehlen waehlt Checkpoints nach Zellen, die das Modell nie treffen sollte. Ohne
    # Coverage-Spalte bleibt jede Zelle sichtbar und die Zahlen sind die alten.
    from .occlusion import PIECE_VISIBLE_MAX

    vis = [i for i, r in enumerate(rows) if r.get("coverage", 0.0) <= PIECE_VISIBLE_MAX]
    bd_vis = occupancy_piece_breakdown(classes, [trues[i] for i in vis], [preds[i] for i in vis])         if 0 < len(vis) < len(rows) else bd
    bd["visible_piece_acc"] = bd_vis["piece_acc"]
    bd["visible_occupied_acc"] = bd_vis["occupied_acc"]
    # Ohne gemessene Konfidenz zaehlt die Kalibrierung neutral (0,5 = Zufall), damit ein
    # Aufrufer ohne sie nicht stillschweigend bestraft oder belohnt wird.
    bd["calibration"] = auroc if auroc is not None else 0.5
    score = sum(w * bd[k] for k, w in CHECKPOINT_WEIGHTS.items())
    mr = _macro_recall(trues, preds, len(classes))
    return (score, bd["occupied_board_acc"], mr), bd


def occupancy_board_acc(rows: list[dict], classes: list[str], trues: list[int], preds: list[int]) -> float:
    """Board accuracy ONLY at the occupancy level: a board is correct if all 64 squares
    are correctly classified as empty vs. occupied (significantly easier than full board accuracy)."""
    items = [((r["session_id"], str(r["frame"])),
              (classes[t] != "empty") == (classes[p] != "empty"))
              for r, t, p in zip(rows, trues, preds, strict=False)]
    return board_accuracy(items)


def per_session_metrics(rows: list[dict], classes: list[str],
                        trues: list[int], preds: list[int]) -> dict[str, dict]:
    """The same three numbers as the corpus line, but one row per session.

    `evaluate_dataset` runs with `shuffle=False`, so `trues[i]`/`preds[i]` line up with `rows[i]`.
    A corpus mean hides the one session that carries the whole error — which is exactly the
    question when a model is pointed at a dataset it was not trained on.
    """
    by_sid: dict[str, list[tuple[dict, int, int]]] = defaultdict(list)
    for r, t, p in zip(rows, trues, preds, strict=False):
        by_sid[r["session_id"]].append((r, t, p))
    out: dict[str, dict] = {}
    for sid, items in by_sid.items():
        rs = [r for r, _, _ in items]
        ts = [t for _, t, _ in items]
        ps = [p for _, _, p in items]
        ok = [t == p for t, p in zip(ts, ps, strict=True)]
        boards = [((r["session_id"], str(r["frame"])), c) for r, c in zip(rs, ok, strict=True)]
        out[sid] = {"crops": len(items), "square_acc": sum(ok) / len(ok),
                    "board_acc": board_accuracy(boards),
                    "occupied_board_acc": occupancy_board_acc(rs, classes, ts, ps)}
    return out


def visible_confidence(rows, trues, preds, conf):
    """(trues, preds, conf) nur auf sichtbaren Zellen — leere Konfidenz reicht sie durch."""
    from .occlusion import PIECE_VISIBLE_MAX

    if not conf:
        return trues, preds, conf
    vis = [i for i, r in enumerate(rows) if r.get("coverage", 0.0) <= PIECE_VISIBLE_MAX]
    if not 0 < len(vis) < len(rows):
        return trues, preds, conf
    return [trues[i] for i in vis], [preds[i] for i in vis], [conf[i] for i in vis]


def confidence_auroc(trues, preds, conf) -> float:
    """Wie gut trennt die Konfidenz richtig von falsch — 0,5 = zufaellig, 1,0 = perfekt.

    Skaleninvariant, anders als `conf_right - conf_wrong`: `conf_right` liegt flach
    (StdAbw 0,008 gegen 0,029), ein Abstandsmass misst darum fast nur `conf_wrong` neu.
    Nur diese Trennschaerfe macht Temperature Scaling hinterher etwas nuetzlich.
    """
    import numpy as np

    t, p, c = np.asarray(trues), np.asarray(preds), np.asarray(conf, dtype=float)
    if not len(c):
        return 0.5
    ok = t == p
    n_pos, n_neg = int(ok.sum()), int((~ok).sum())
    if not n_pos or not n_neg:
        return 0.5
    # Rangbasiert (Mann-Whitney) mit DURCHSCHNITTSRAENGEN: ohne die faellt der Fall
    # "alle gleich sicher" je nach Sortierreihenfolge auf 0,0 oder 1,0 statt auf 0,5.
    order = np.argsort(c, kind="mergesort")
    s = c[order]
    ranks = np.empty(len(c), dtype=float)
    i = 0
    while i < len(s):
        j = i
        while j + 1 < len(s) and s[j + 1] == s[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2.0 + 1.0
        i = j + 1
    return float((ranks[ok].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def confident_confusions(classes: list[str], trues, preds, conf, top: int = 8) -> list[dict]:
    """Welche Verwechslungen tragen die UEBERZEUGTEN Fehler — (wahr, vorhergesagt, n, mean_conf).

    `conf_wrong` ist ein Mittelwert ueber alle Fehler. Ob er aus vielen mittelmaessig
    sicheren oder wenigen sehr sicheren Fehlern kommt, aendert die Gegenmassnahme.
    Sortiert nach n * mean_conf: was am meisten Schaden anrichtet, steht oben.
    """
    import numpy as np

    t, p, c = np.asarray(trues), np.asarray(preds), np.asarray(conf, dtype=float)
    wrong = t != p
    if not wrong.any():
        return []
    out: dict[tuple[int, int], list[float]] = {}
    for ti, pi, ci in zip(t[wrong], p[wrong], c[wrong], strict=True):
        out.setdefault((int(ti), int(pi)), []).append(float(ci))
    rows = [{"true": classes[k[0]], "pred": classes[k[1]], "n": len(v),
             "mean_conf": sum(v) / len(v)} for k, v in out.items()]
    rows.sort(key=lambda r: r["n"] * r["mean_conf"], reverse=True)
    return rows[:top]


def fit_temperature(logits, trues, iters: int = 200) -> float:
    """Ein Skalar, der die Wahrscheinlichkeiten ehrlich macht — der Argmax bleibt unberuehrt.

    Post-hoc auf val angepasst (Guo et al. 2017). Deshalb aendert sich KEINE Genauigkeit,
    nur die Konfidenz — der Dekoder braucht dann keine handgesetzte Konstante mehr.
    """
    import torch

    if logits is None or not len(trues):
        return 1.0
    z = logits.detach().float()
    y = torch.as_tensor(trues, dtype=torch.long)
    if z.shape[1] > 1 and z.shape[1] != int(y.max()) + 1:
        z = z[:, :int(y.max()) + 1]          # Coverage-Logit gehoert nicht dazu
    log_t = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([log_t], lr=0.1, max_iter=iters)
    loss_fn = torch.nn.CrossEntropyLoss()

    def step():
        opt.zero_grad()
        loss = loss_fn(z / log_t.exp(), y)
        loss.backward()
        return loss

    opt.step(step)
    return float(log_t.exp().item())


def build_model_card(
    *,
    classes: list[str],
    out_size: tuple[int, int],
    backbone: str,
    metrics: dict,
    torch_version: str,
    hip_version: str | None,
    exported_formats: list[str],
    infer_size: tuple[int, int] | None = None,
    coverage_gate: float | None = None,
) -> dict:
    """`out_size` = the size the crops were built at; `infer_size` = the size the exported graph
    takes (specs/22). They are the same number for every run predating that pack, which is what
    `infer_size=None` records."""
    from .occlusion import PIECE_VISIBLE_MAX

    size = infer_size or out_size
    return {
        "classes": list(classes),
        "out_size": [int(out_size[0]), int(out_size[1])],
        "infer_size": [int(size[0]), int(size[1])],
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD)},
        "backbone": backbone,
        # Ab welcher Verdeckung ein Feld nicht mehr zaehlt; die App liest es als `coverage_gate`
        # (ModelSpec.kt). Ueber 0,25 faellt die Genauigkeit auf 0,42 — schlechter als Raten.
        "coverage_gate": PIECE_VISIBLE_MAX if coverage_gate is None else float(coverage_gate),
        "metrics": metrics,
        "torch_version": torch_version,
        "rocm_hip": hip_version,
        "exported_formats": list(exported_formats),
        "created_at": datetime.now(UTC).isoformat(),
    }
