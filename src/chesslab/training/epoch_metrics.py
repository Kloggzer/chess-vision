"""Was eine Epoche misst: die `metrics.jsonl`-Zeile, ihre Occlusion-Diagnostik und der Score."""

from __future__ import annotations

from ..cell_rule import brightness_of
from .checkpoint import _checkpoint_rank
from .data import checkpoint_metrics, confidence_auroc, visible_confidence


def _compact_metrics(rec):
    """Remove unmasked or redundant metrics from an occlusion epoch record."""
    redundant = {"val_acc", "val_macro_recall", "val_board_acc", "val_board_acc_tol1",
                 "val_occupied_acc", "val_occupied_board_acc", "val_piece_acc",
                 "val_visible_acc", "val_visible_n", "val_visible_occupied_n",
                 "val_checkpoint_score", "val_conf_right"}
    return {k: v for k, v in rec.items() if k not in redundant}


def _conf_mean(vis_conf, wrong: bool) -> float | None:
    """Mittlere Konfidenz auf falschen bzw. richtigen Vorhersagen."""
    trues, preds, conf = vis_conf
    if not conf:
        return None
    sel = [c for t, p, c in zip(trues, preds, conf, strict=False) if (t != p) is wrong]
    return float(sum(sel) / len(sel)) if sel else None


def _occlusion_diagnostics(val: dict, val_rows: list[dict], classes: list[str],
                           visible_max: float) -> dict[str, float | int]:
    """Derive every coverage/visibility metric from the regular validation's predictions."""
    import numpy as np

    cov_true = val["coverage_trues"]
    cov_pred = val["coverage_probs"]
    true_cls = val["trues"]
    pred_cls = val["preds"]
    from .occlusion import CELL_DARK_MIN

    want, hit = cov_true > 0.5, cov_pred > 0.5
    # Zweiter Grund, dieselbe Zelle nicht zu benoten: zu dunkel zum Lesen. Die Metrik haengt an
    # der KONSTANTE, nicht am Lauf-Flag — sonst waeren zwei Laeufe nicht mehr vergleichbar.
    bright = np.array([brightness_of(r) for r in val_rows], dtype=float)
    visible = (cov_true <= visible_max) & (bright >= CELL_DARK_MIN)
    true_occ = true_cls != classes.index("empty")
    pred_occ = pred_cls != classes.index("empty")
    visible_boards: dict[tuple[str, str], bool] = {}
    for row, is_visible, square_ok in zip(
            val_rows, visible.tolist(), (true_occ == pred_occ).tolist(), strict=True):
        if is_visible:
            key = (row["session_id"], str(row["frame"]))
            visible_boards[key] = visible_boards.get(key, True) and square_ok

    occ_tp = int((want & hit).sum())
    occ_want, occ_hit = int(want.sum()), int(hit.sum())
    vis_n = int(visible.sum())
    vis_occ = visible & true_occ
    vis_occ_n = int(vis_occ.sum())
    return {
        "val_coverage_mae": float(np.abs(cov_pred - cov_true).mean()),
        # Leerer Nenner ist `nan` wie bei den `val_visible_*` darunter: EINE Schreibweise je
        # Datei, und `metrics.jsonl` hat sie schon — 0,0 hiesse "nichts gefunden" statt
        # "nichts zu finden". `sweep_report`/`compare_arms` lesen die Spalte bereits als `nan`.
        "val_coverage_recall": occ_tp / occ_want if occ_want else float("nan"),
        "val_coverage_precision": occ_tp / occ_hit if occ_hit else float("nan"),
        "val_visible_acc": float((pred_cls[visible] == true_cls[visible]).mean())
        if vis_n else float("nan"),
        "val_visible_occupied_acc": float((pred_occ[visible] == true_occ[visible]).mean())
        if vis_n else float("nan"),
        # Die Figurenachse, die `CHECKPOINT_WEIGHTS` benotet. `val_piece_acc` daneben zaehlt
        # verdeckte Zellen mit und haengt damit am Verdeckungsanteil des Splits, nicht am Modell.
        "val_visible_piece_acc": float((pred_cls[vis_occ] == true_cls[vis_occ]).mean())
        if vis_occ_n else float("nan"),
        "val_visible_occupied_n": vis_occ_n,
        "val_visible_occupied_board_acc": (
            sum(visible_boards.values()) / len(visible_boards)
            if visible_boards else float("nan")),
        "val_visible_n": vis_n,
    }


def score_epoch(val: dict, score_rows: list[dict], classes: list[str]):
    """`(vis_conf, auroc, breakdown, score)` einer Epoche — `score` waehlt den Checkpoint."""
    true_labels = val["trues"].tolist()
    pred_labels = val["preds"].tolist()
    # Auf denselben Zellen wie die Genauigkeits-Terme: verdeckte Zellen irren zu 55-63 %,
    # dabei aber unsicher — sie druecken conf_wrong um acht Punkte und schoenen damit
    # genau das Mass, das ueberzeugte Fehler aufdecken soll (gemessen 2026-08-24).
    # Die Vorhersagen folgen der Reihenfolge des DATENSATZES, nicht der von `val_rows`:
    # der Brettdatensatz behaelt nur vollstaendige Bretter und sortiert sie nach Feld.
    vis_conf = visible_confidence(score_rows, true_labels, pred_labels, val.get("conf") or [])
    auroc = confidence_auroc(*vis_conf)
    _, bd = checkpoint_metrics(score_rows, classes, true_labels, pred_labels,
                               auroc=auroc)
    # Select actual epoch weights by visible identity accuracy; calibration breaks ties.
    score = _checkpoint_rank(bd, auroc)
    return vis_conf, auroc, bd, score


def occlusion_diagnostics(val: dict, score_rows: list[dict], classes: list[str],
                          occluding: bool) -> dict:
    occ_diag = {}
    if occluding:
        from .occlusion import PIECE_VISIBLE_MAX

        occ_diag = _occlusion_diagnostics(val, score_rows, classes, PIECE_VISIBLE_MAX)
    return occ_diag


def epoch_record(epoch: int, train_loss: float, val: dict, bd: dict, vis_conf, auroc,
                 score, lr: float, timings: dict, occ_diag: dict) -> dict:
    rec = {
        "epoch": epoch,
        "train_loss": train_loss,
        "val_loss": val["loss"],
        "val_acc": val["square_acc"],
        "val_macro_recall": val["macro_recall"],
        "val_board_acc": val["board_acc"],
        "val_visible_board_acc": val["visible_board_acc"],
        "val_board_acc_tol1": val["board_acc_tol1"],
        "val_occupied_acc": bd["visible_occupied_acc"],
        "val_occupied_board_acc": bd["occupied_board_acc"],
        "val_piece_acc": bd["visible_piece_acc"],
        # Die Zahl, die zwei gleich genaue Modelle trennt: ueberzeugte Fehler brechen
        # die Dekodierung, unsichere lassen sich korrigieren.
        "val_conf_wrong": _conf_mean(vis_conf, wrong=True),
        "val_conf_auroc": auroc,
        "val_conf_right": _conf_mean(vis_conf, wrong=False),
        # TODO: das ist `visible_piece_acc`, also dieselbe Zahl wie `val_piece_acc` eine
        # Zeile hoeher — der gewichtete Score aus CHECKPOINT_WEIGHTS wird in `_` verworfen.
        "val_checkpoint_score": score[0],
        "lr": lr,
        # Where the wall clock went. Without it "the GPU idles between epochs" is a guess:
        # the eval loader, the metric block and the checkpoint are three different suspects.
        **timings,
    }
    if occ_diag:
        rec.update(occ_diag)
        rec = _compact_metrics(rec)
    rec["metrics_schema"] = 3
    return rec


def print_epoch(epoch: int, rec: dict, score, occ_diag: dict) -> None:
    print(f"epoch {epoch:>3} | train_loss {rec['train_loss']:.4f} | val_loss {rec['val_loss']:.4f} "
          f"| visible_piece_acc {score[0]:.4f}")

    if occ_diag:
        print(
            f"          coverage_mae {occ_diag['val_coverage_mae']:.4f} "
            f"| cov_recall@0.5 {occ_diag['val_coverage_recall']:.4f} "
            f"| cov_precision@0.5 {occ_diag['val_coverage_precision']:.4f} "
            f"| visible_acc {occ_diag['val_visible_acc']:.4f} "
            f"| visible_occupied_acc {occ_diag['val_visible_occupied_acc']:.4f} "
            f"| visible_piece_acc {occ_diag['val_visible_piece_acc']:.4f} "
            f"| visible_occupied_board_acc {occ_diag['val_visible_occupied_board_acc']:.4f}"
        )
