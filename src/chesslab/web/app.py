"""FastAPI-Backend der lokalen chesslab-Web-UI.

Bedient drei Bereiche über JSON-APIs: Datensatz-Einsicht, Review/Relabeln und Training.
Nutzt die vorhandene chesslab-Logik wieder (dataset, labeling, training). Bilder werden als
statische Dateien aus `data/` ausgeliefert. Kamera ist in v1 NICHT dabei.
"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from pathlib import Path

import chess

from .. import config
from .. import dataset as dataset_mod
from .. import dataset_build as dataset_build_mod
from .. import labeling as labeling_mod
from .. import serving
from .. import sessions as sessions_mod
from ..calibration import (
    CalibrationProfile, CropParams, MarkerTracker, compute_homography, detect_board_markers,
    draw_board_grid, draw_calibration_overlay, generate_markers, load_profile, profile_path,
    resolve_board_corners, square_center,
)
from ..collect import SessionWriter, generate_session_id
from ..state import (
    GameState, castling_rook_squares, en_passant_captured_square,
    random_game_positions, stockfish_game_positions,
)

_STATIC = Path(__file__).parent / "static"

log = logging.getLogger("chesslab.web")

# --- Kamera: EINE geteilte Instanz + Geometrie-Helfer (siehe web/camera.py) ------------
from .camera import CAMERA, BoardTracker, mjpeg
from .scan import SCANNER

# Geteilter, gelockter Zustand (TRAIN/COLLECT/INFER/MANUAL/CALIB) lebt in web/state.py.
# Request-Handler schreiben via update()/mutate(); MJPEG-Generatoren lesen genau EINEN
# snapshot() pro Frame-Iteration (Rework 04, specs/rework/04-web-hardening.md).
from .state import CALIB, COLLECT, INFER, MANUAL, TRAIN, train_derive_and_update

# Nach so vielen None-Frames in Folge zeigt der Stream ein Fehlerbild statt still zu idlen.
_NONE_FRAME_LIMIT = 50


def _camera_error_frame(width: int = 960, height: int = 540):
    """Gerendertes Fehlerbild für Streams, deren Kamera keine Frames liefert."""
    import cv2
    import numpy as np

    img = np.zeros((height, width, 3), dtype=np.uint8)
    cv2.putText(img, "Kamera liefert keine Frames — Quelle pruefen", (20, height // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
    return img


def _label_to_fen_char(label: str) -> str | None:
    """Klassenlabel -> FEN-Figurenbuchstabe ('wP'->'P', 'bN'->'n'); empty/occluded/leer -> None."""
    if not label or label in ("empty", "occluded") or len(label) != 2:
        return None
    return label[1].upper() if label[0] == "w" else label[1].lower()


def _labels_to_fen(labels: dict) -> str:
    """64 Per-Feld-Labels -> FEN-Stellungsteil (occluded zählt als leer)."""
    rows = []
    for rank in range(8, 0, -1):
        run_empty, row = 0, ""
        for f in "abcdefgh":
            ch = _label_to_fen_char(labels.get(f"{f}{rank}", "empty"))
            if ch is None:
                run_empty += 1
            else:
                if run_empty:
                    row += str(run_empty); run_empty = 0
                row += ch
        if run_empty:
            row += str(run_empty)
        rows.append(row)
    return "/".join(rows)


def _collect_state() -> dict:
    c = COLLECT.snapshot()
    w = c["writer"]
    if w is None:
        return {"active": False}
    pos, i = c["positions"], c["i"]
    n = len(pos)
    cur = pos[min(i, n - 1)]
    return {
        "active": True, "session_id": w.session_id, "index": i, "n_positions": n,
        "done": i >= n, "fen": cur["fen"], "ply": cur["ply"],
        # Zug, um die aktuell zu fotografierende Stellung zu erreichen (None = Startstellung).
        "move_san": (pos[i]["san"] if 0 <= i < n else None),
        # coverage-Modus: ganze Stellung neu aufbauen (Namen im Bild), kein Einzelzug.
        "build_target": bool(c.get("show_target")),
        "gains": (cur.get("gains") if isinstance(cur, dict) else None),
        "captures": w.count,
    }


# Figurennamen (ASCII, da OpenCV-Hershey-Fonts keine Umlaute rendern) für das Ziel-Overlay
# beim Nachbauen einer Stellung (v.a. coverage-Modus, der keine einzelnen Züge hat).
_PIECE_NAMES_DE: dict[str, str] = {
    "K": "Koenig", "Q": "Dame", "R": "Turm", "B": "Laeufer", "N": "Springer", "P": "Bauer",
}


def _put_centered_name(view, text: str, cx: int, cy: int, is_white: bool) -> None:
    """Figurennamen mittig auf ein Feld schreiben, mit Kontrast-Halo (weiße Figur = heller
    Text auf dunklem Halo, schwarze Figur umgekehrt) — lesbar auf beliebigem Bretthintergrund."""
    import cv2

    font, scale, thick = cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1
    (tw, th), _ = cv2.getTextSize(text, font, scale, thick)
    x, y = cx - tw // 2, cy + th // 2
    fill = (255, 255, 255) if is_white else (20, 20, 20)
    halo = (20, 20, 20) if is_white else (235, 235, 235)
    cv2.putText(view, text, (x, y), font, scale, halo, thick + 2, cv2.LINE_AA)
    cv2.putText(view, text, (x, y), font, scale, fill, thick, cv2.LINE_AA)


def _draw_target_pieces(view, prof, fen: str) -> None:
    """Die komplette Ziel-Stellung als Figuren-NAMEN auf das (entzerrte) Brett zeichnen, damit
    man beim Nachbauen sieht, welche Figur auf welches Feld gehört. Liest das FEN-Platzierungsfeld
    direkt (keine Legalitätsprüfung — coverage-FENs sind bewusst nicht spielbar)."""
    placement = fen.split()[0]
    rank = 8
    for row in placement.split("/"):
        file_idx = 0
        for ch in row:
            if ch.isdigit():
                file_idx += int(ch)
                continue
            if file_idx > 7 or rank < 1:
                continue
            sqname = "abcdefgh"[file_idx] + str(rank)
            name = _PIECE_NAMES_DE.get(ch.upper())
            if name:
                cx, cy = square_center(sqname, prof)
                _put_centered_name(view, name, cx, cy, is_white=ch.isupper())
            file_idx += 1
        rank -= 1


def _draw_move_arrow(view, prof, fen, san):
    import cv2

    try:
        b = chess.Board(fen)
        mv = b.parse_san(san)
        c0 = square_center(chess.square_name(mv.from_square), prof)
        c1 = square_center(chess.square_name(mv.to_square), prof)
        cv2.arrowedLine(view, c0, c1, (0, 0, 255), 3, cv2.LINE_AA, tipLength=0.25)
        cv2.circle(view, c0, 10, (0, 200, 255), 2, cv2.LINE_AA)
        rook = castling_rook_squares(b, mv)
        if rook is not None:
            r0 = square_center(chess.square_name(rook[0]), prof)
            r1 = square_center(chess.square_name(rook[1]), prof)
            cv2.arrowedLine(view, r0, r1, (0, 165, 255), 3, cv2.LINE_AA, tipLength=0.25)
        ep = en_passant_captured_square(b, mv)
        if ep is not None:
            e = square_center(chess.square_name(ep), prof)
            d = 16
            cv2.line(view, (e[0] - d, e[1] - d), (e[0] + d, e[1] + d), (0, 0, 255), 3, cv2.LINE_AA)
            cv2.line(view, (e[0] - d, e[1] + d), (e[0] + d, e[1] - d), (0, 0, 255), 3, cv2.LINE_AA)
    except Exception:  # noqa: BLE001 — reine Overlay-Deko, darf den Stream nie reißen
        log.debug("Zug-Pfeil-Overlay übersprungen (FEN/SAN nicht zeichenbar)", exc_info=True)


# --- Hilfen ---------------------------------------------------------------------------

def _manifest() -> list[dict]:
    p = config.DATA.manifests / "squares.jsonl"
    try:
        return dataset_mod.load_manifest(p)
    except FileNotFoundError:
        return []


def _img_url(path: str) -> str:
    """Manifest-Pfad 'data/squares/..' -> '/img/squares/..' (statischer Mount auf data/)."""
    path = path.replace("\\", "/")
    root = config.DATA.root.as_posix() + "/"
    return "/img/" + (path[len(root):] if path.startswith(root) else path)


def _run_dirs() -> list[Path]:
    root = config.DATA.models
    if not root.exists():
        return []
    return sorted((p for p in root.iterdir() if (p / "config.json").exists()), key=lambda p: p.name)


def _read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


# --- App ------------------------------------------------------------------------------

def create_app():
    import cv2
    from fastapi import Body, FastAPI, HTTPException, Query
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    config.ensure_dirs(config.DATA)
    app = FastAPI(title="chesslab", docs_url="/api/docs")

    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")
    app.mount("/img", StaticFiles(directory=str(config.DATA.root)), name="img")

    @app.get("/")
    def index():
        return FileResponse(str(_STATIC / "index.html"))

    # -- Datensatz --
    def _dataset_manifest(name: str | None) -> list[dict]:
        if not name:
            return _manifest()
        mp = dataset_build_mod.dataset_dir(name) / "manifest.jsonl"
        try:
            return dataset_mod.load_manifest(mp)
        except FileNotFoundError:
            return []

    @app.get("/api/stats")
    def stats(dataset: str | None = Query(None)):
        rows = _dataset_manifest(dataset)
        s = dataset_mod.compute_stats(rows)
        s["classes"] = list(config.CLASSES)
        s["min_samples"] = config.MIN_CLASS_SAMPLES
        return s

    @app.get("/api/class/{cls}")
    def class_crops(cls: str, offset: int = 0, limit: int = 60, dataset: str | None = Query(None)):
        if cls not in config.CLASSES:
            raise HTTPException(404, f"unbekannte Klasse {cls}")
        # `dataset` gesetzt -> die echten Crops DIESES Datensatzes; sonst der globale Pool.
        rows = [r for r in _dataset_manifest(dataset) if r["label"] == cls]
        page = rows[offset: offset + limit]
        return {"label": cls, "total": len(rows), "dataset": dataset,
                "crops": [{"url": _img_url(r["path"]), "session_id": r["session_id"],
                           "frame": r["frame"], "square": r["square"]} for r in page]}

    # -- Sessions / Runs --
    @app.get("/api/sessions")
    def sessions():
        by_session: dict[str, set] = {}
        for r in _manifest():
            by_session.setdefault(r["session_id"], set()).add(str(r["frame"]))
        return [{"session_id": sid, "frames": sorted(frames), "n_frames": len(frames)}
                for sid, frames in sorted(by_session.items())]

    @app.get("/api/sessions/manage")
    def sessions_manage():
        """Alle aufgenommenen Sessions (aktiv + archiviert) mit Eckdaten für die Verwaltung."""
        return sessions_mod.list_sessions()

    @app.post("/api/sessions/{sid}/archive")
    def session_archive(sid: str):
        try:
            return sessions_mod.archive_session(sid)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except FileNotFoundError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/sessions/{sid}/restore")
    def session_restore(sid: str):
        try:
            return sessions_mod.restore_session(sid)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except FileNotFoundError as e:
            raise HTTPException(404, str(e))
        except FileExistsError as e:
            raise HTTPException(409, str(e))

    @app.delete("/api/sessions/{sid}")
    def session_delete(sid: str):
        try:
            return sessions_mod.delete_session(sid)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except FileNotFoundError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/sessions/{sid}/slice")
    def session_slice(sid: str, pad_up: float | None = Query(None), pad_side: float | None = Query(None)):
        rc = labeling_mod.run_slice(session=sid, pad_up=pad_up, pad_side=pad_side)
        crops = sum(1 for r in _manifest() if r.get("session_id") == sid)
        if rc != 0:
            raise HTTPException(400, f"Slicing für '{sid}' fehlgeschlagen.")
        return {"ok": True, "session": sid, "crops": crops}

    # -- Datensätze (kuratierte Session-Mengen) --
    @app.get("/api/datasets")
    def datasets_list():
        return dataset_build_mod.list_datasets()

    @app.get("/api/datasets/{name}")
    def dataset_get(name: str):
        try:
            return dataset_build_mod.get_dataset(name)
        except FileNotFoundError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/datasets")
    def dataset_create(name: str = Body(...), session_ids: list[str] = Body(...),
                       per_cell_cap: int = Body(config.DEDUP.per_cell_cap),
                       phash_enabled: bool = Body(config.DEDUP.phash_enabled),
                       phash_hamming: int = Body(config.DEDUP.phash_hamming),
                       rotate: bool = Body(True),
                       max_empty_ratio: float = Body(config.DEFAULT_MAX_EMPTY_RATIO),
                       seed: int = Body(config.SEED),
                       allow_degenerate: bool = Body(False)):
        try:
            return dataset_build_mod.build_dataset(
                name, session_ids, per_cell_cap=per_cell_cap, phash_enabled=phash_enabled,
                phash_hamming=phash_hamming, rotations=(config.DEDUP.rotations if rotate else (0,)),
                max_empty_ratio=max_empty_ratio, seed=seed,
                allow_degenerate=allow_degenerate)
        except (ValueError, FileNotFoundError) as e:
            raise HTTPException(400, str(e))

    @app.post("/api/datasets/{name}/rebuild")
    def dataset_rebuild(name: str):
        try:
            cfg = dataset_build_mod.get_dataset(name)["config"]
        except FileNotFoundError as e:
            raise HTTPException(404, str(e))
        d, sp = cfg.get("dedup", {}), cfg.get("split", {})
        res = dataset_build_mod.build_dataset(
            name, cfg.get("session_ids", []), per_cell_cap=d.get("per_cell_cap"),
            phash_enabled=d.get("phash_enabled"), phash_hamming=d.get("phash_hamming"),
            rotations=tuple(cfg.get("rotations", (0,))),
            max_empty_ratio=sp.get("max_empty_ratio"),
            allow_degenerate=True,   # rebuild: original split war bereits akzeptiert
            seed=sp.get("seed", config.SEED))
        return res

    @app.delete("/api/datasets/{name}")
    def dataset_delete(name: str):
        try:
            return dataset_build_mod.delete_dataset(name)
        except (ValueError, FileNotFoundError) as e:
            raise HTTPException(404, str(e))

    @app.get("/api/runs")
    def runs():
        out = []
        for d in _run_dirs():
            cfg = json.loads((d / "config.json").read_text(encoding="utf-8"))
            metrics = _read_jsonl(d / "metrics.jsonl")
            ev = d / "eval_test.json"
            test_board = (json.loads(ev.read_text(encoding="utf-8")).get("board_acc") if ev.exists() else None)
            out.append({
                "run": d.name, "backbone": cfg.get("backbone"), "dataset": cfg.get("dataset"),
                "n_classes": len(cfg.get("classes", [])), "resumed_from": cfg.get("resumed_from"),
                "has_occluded": "occluded" in cfg.get("classes", []),
                "epochs_done": len(metrics),
                "best_board_acc": max((m.get("val_board_acc", 0) for m in metrics), default=0),
                "best_square_acc": max((m.get("val_acc", 0) for m in metrics), default=0),
                "best_macro_recall": max((m.get("val_macro_recall", 0) for m in metrics), default=0),
                "test_board_acc": test_board,
                "last": metrics[-1] if metrics else None,
            })
        return sorted(out, key=lambda r: r["run"], reverse=True)   # neueste zuerst

    @app.delete("/api/runs/{run}")
    def run_delete(run: str):
        import shutil
        d = config.DATA.models / run
        if "/" in run or "\\" in run or ".." in run or not (d / "config.json").exists():
            raise HTTPException(404, f"Run '{run}' nicht gefunden.")
        serving.clear_cache()
        shutil.rmtree(d)
        return {"ok": True, "run": run}

    @app.get("/api/runs/{run}/metrics")
    def run_metrics(run: str):
        return {"run": run, "metrics": _read_jsonl(config.DATA.models / run / "metrics.jsonl")}

    @app.get("/api/runs/{run}/eval")
    def run_eval(run: str):
        d = config.DATA.models / run
        evals = {}
        for f in sorted(d.glob("eval_*.json")):
            split = f.stem.replace("eval_", "")
            evals[split] = json.loads(f.read_text(encoding="utf-8"))
            png = d / f"confusion_{split}.png"
            if png.exists():
                evals[split]["confusion_png"] = _img_url(png.as_posix())
        return {"run": run, "evals": evals}

    # -- Review / Relabel --
    @app.get("/api/review")
    def review(session: str, frame: str, run: str | None = Query(None)):
        rows = [r for r in _manifest() if r["session_id"] == session and str(r["frame"]) == str(frame)]
        if not rows:
            raise HTTPException(404, "keine Crops für diese Session/Frame (erst slicen?)")
        rows.sort(key=lambda r: r["square"])
        preds = []
        if run:
            try:
                preds = labeling_predict(run, rows)
            except Exception as e:  # noqa: BLE001
                raise HTTPException(500, f"Inferenz fehlgeschlagen: {e}")
        cells = []
        for i, r in enumerate(rows):
            p = preds[i] if i < len(preds) else {}
            pred = p.get("pred_label")
            cells.append({
                "square": r["square"], "square_color": r["square_color"],
                "url": _img_url(r["path"]), "label": r["label"],
                "pred_label": pred, "confidence": p.get("confidence"),
                "disagree": bool(pred and pred != r["label"]),
            })
        return {"session": session, "frame": frame, "run": run, "fen": rows[0]["fen"], "cells": cells}

    @app.post("/api/corrections")
    def corrections(items: list[dict] = Body(...)):
        for it in items:
            if it.get("label") not in config.CLASSES:
                raise HTTPException(400, f"ungültiges Label {it.get('label')!r}")
            if not all(k in it for k in ("session_id", "frame", "square")):
                raise HTTPException(400, "session_id/frame/square erforderlich")
        n = labeling_mod.upsert_corrections(items, config.DATA.corrections)
        return {"ok": True, "applied": len(items), "total_corrections": n}

    @app.post("/api/reslice")
    def reslice(session: str = Query(...), pad_up: float | None = Query(None),
                pad_side: float | None = Query(None)):
        rc = labeling_mod.run_slice(session=session, pad_up=pad_up, pad_side=pad_side)
        crops = sum(1 for r in _manifest() if r.get("session_id") == session)
        return {"ok": rc == 0, "session": session, "crops": crops}

    # -- Training / Split --
    @app.post("/api/split")
    def split(max_empty_ratio: float = Body(config.DEFAULT_MAX_EMPTY_RATIO),
              max_class_ratio: float | None = Body(None),
              seed: int = Body(config.SEED),
              allow_degenerate: bool = Body(False)):
        rc = dataset_mod.run_split(val_frac=config.DEFAULT_VAL_FRAC, test_frac=config.DEFAULT_TEST_FRAC,
                                   max_empty_ratio=max_empty_ratio, seed=seed, max_class_ratio=max_class_ratio,
                                   allow_degenerate=allow_degenerate)
        if rc != 0:
            raise HTTPException(400, "Split fehlgeschlagen — Datensatzdegenerierung (--allow-degenerate im Web-Tab setzen).")
        return {"ok": True}

    @app.post("/api/train")
    def train(backbone: str = Body("smallcnn"), epochs: int = Body(config.DEFAULT_EPOCHS),
              batch_size: int = Body(32), no_amp: bool = Body(True),
              lr: float = Body(config.DEFAULT_LR), dataset: str | None = Body(None),
              resume: str | None = Body(None), patience: int = Body(config.DEFAULT_PATIENCE),
              head: str = Body("combined")):
        t_proc = TRAIN.get("proc")
        if t_proc is not None and t_proc.poll() is None:
            raise HTTPException(409, "es läuft bereits ein Training.")
        if resume and not (config.DATA.models / resume / "config.json").exists():
            raise HTTPException(400, f"Resume-Run '{resume}' nicht gefunden.")

        # Bevorzugter Weg: auf einem gebauten, benannten Datensatz trainieren (eigener Split).
        if dataset:
            dd = dataset_build_mod.dataset_dir(dataset)
            if not (dd / "split.json").exists():
                raise HTTPException(400, f"Datensatz '{dataset}' nicht gebaut — erst im Datensätze-Tab bauen.")
            sp = json.loads((dd / "split.json").read_text(encoding="utf-8"))
            if sp["counts"]["train"] == 0:
                raise HTTPException(400, "train-Split leer — der Datensatz braucht mind. 2-3 getrennte "
                                    "Sessions (Split pro Session gegen Data Leakage).")
            cmd = [sys.executable, "-m", "chesslab.cli", "train", "--backbone", backbone,
                   "--epochs", str(epochs), "--batch-size", str(batch_size), "--lr", str(lr),
                   "--patience", str(patience), "--dataset", dataset, "--head", head]
            if resume:
                cmd += ["--resume", resume]
            if no_amp:
                cmd.append("--no-amp")
            config.DATA.models.mkdir(parents=True, exist_ok=True)
            before = {d.name for d in _run_dirs()}
            log_path = config.DATA.models / "web_train.log"
            log_fh = open(log_path, "w", encoding="utf-8")
            proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(Path.cwd()))
            log_fh.close()   # Kind hält sein eigenes dupliziertes Handle; Windows-Sperre weg (H3)
            TRAIN.update(proc=proc, log=log_path, cmd=" ".join(cmd), before=before,
                         state="running")
            return {"ok": True, "cmd": TRAIN.get("cmd")}

        # Legacy-Pfad (globales Manifest/Split) — bleibt für Rückwärtskompatibilität.
        # Split ist eine abgeleitete Backend-Datei; der Frontend-Nutzer legt sie nicht selbst an.
        # Er muss zur AKTUELLEN Datenlage passen, sonst trainiert man auf einem veralteten Split
        # (häufigster Fall: Sessions dazugekommen -> alter Split hat train leer/falsche Sessions).
        # Darum hier deterministisch neu splitten, sobald die Session-Menge nicht (mehr) passt.
        manifest_sessions = {r["session_id"] for r in _manifest()}
        if not manifest_sessions:
            raise HTTPException(400, "Kein Datensatz — erst im Tab 'Sammeln' aufnehmen und slicen.")
        split_file = config.DATA.manifests / "split.json"

        def _split_sessions() -> set[str] | None:
            if not split_file.exists():
                return None
            try:
                sp = json.loads(split_file.read_text(encoding="utf-8"))
                return {s for sids in sp["splits"].values() for s in sids}
            except Exception:  # noqa: BLE001
                log.warning("split.json nicht lesbar — wird neu erzeugt.", exc_info=True)
                return None

        if _split_sessions() != manifest_sessions:
            rc = dataset_mod.run_split(val_frac=config.DEFAULT_VAL_FRAC, test_frac=config.DEFAULT_TEST_FRAC,
                                       max_empty_ratio=config.DEFAULT_MAX_EMPTY_RATIO, seed=config.SEED,
                                       max_class_ratio=None, allow_degenerate=False)
            if rc != 0:
                raise HTTPException(400,
                    "Split fehlgeschlagen — Datensatz ist degeneriert (Klassen nur in einer Session oder "
                    "Val/Test-Split leer). Mehr Sessions mit zufälliger Figur-Linien-Zuordnung aufnehmen, "
                    "oder im Datensätze-Tab mit 'Degeneriert zulassen' neu bauen.")

        split = json.loads(split_file.read_text(encoding="utf-8"))
        if split["counts"]["train"] == 0:
            raise HTTPException(400,
                f"Zu wenige Sessions für ein sauberes Training (aktuell {len(manifest_sessions)}). "
                "Train/Val/Test werden pro Session getrennt, um Data Leakage zu vermeiden — dafür "
                "brauchst du mind. 2–3 getrennte Aufnahme-Sessions. Nimm weitere Partien auf, slice "
                "sie und starte erneut.")
        cmd = [sys.executable, "-m", "chesslab.cli", "train", "--backbone", backbone,
               "--epochs", str(epochs), "--batch-size", str(batch_size), "--head", head]
        if no_amp:
            cmd.append("--no-amp")
        log_path = config.DATA.models / "web_train.log"
        config.DATA.models.mkdir(parents=True, exist_ok=True)
        before = {d.name for d in _run_dirs()}
        log_fh = open(log_path, "w", encoding="utf-8")
        proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(Path.cwd()))
        log_fh.close()   # Kind hält sein eigenes dupliziertes Handle; Windows-Sperre weg (H3)
        TRAIN.update(proc=proc, log=log_path, cmd=" ".join(cmd), before=before,
                     state="running")
        return {"ok": True, "cmd": TRAIN.get("cmd")}

    @app.get("/api/train/status")
    def train_status():
        # Zustandsableitung (running/done/crashed/stopped/idle) lebt atomar in web/state.py —
        # ein abnormal beendetes Training (Abbruch/Crash) muss erkennbar bleiben, damit das
        # Frontend den Teil-Fortschritt weiter zeigt statt ihn (wegen rc!=0) zu verstecken.
        t = train_derive_and_update()
        state = t["_derived_state"]
        proc = t.get("proc")
        rc = proc.poll() if proc is not None else None
        running = state == "running"
        # Neuestes Run-Verzeichnis (ggf. das gerade gestartete) + dessen Metriken.
        run, metrics = None, []
        dirs = _run_dirs()
        if dirs:
            run = dirs[-1].name
            metrics = _read_jsonl(dirs[-1] / "metrics.jsonl")
        tail = ""
        if t.get("log") and Path(t["log"]).exists():
            tail = "\n".join(Path(t["log"]).read_text(encoding="utf-8").splitlines()[-8:])
        return {"running": running, "state": state, "run": run, "metrics": metrics,
                "log_tail": tail, "returncode": rc}

    @app.post("/api/train/stop")
    def train_stop():
        """Laufendes (oder nach einem GPU/MIOpen-Crash hängendes) Training beenden + Zustand lösen.
        Das Run-Verzeichnis mit den bis dahin geschriebenen Metriken bleibt erhalten (Teil-Fortschritt)."""
        proc = TRAIN.get("proc")
        killed = False
        if proc is not None and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except Exception:  # noqa: BLE001
                log.warning("Trainingsprozess reagierte nicht auf terminate — kill.")
                proc.kill()
            killed = True
        # Letztes (gerade abgebrochenes) Run-Verzeichnis zurückgeben, damit das Frontend dessen
        # Teil-Metriken nachladen kann.
        dirs = _run_dirs()
        run = dirs[-1].name if dirs else None
        TRAIN.update(proc=None, state="stopped")
        return {"ok": True, "killed": killed, "run": run}

    # -- Kamera / Live-Kalibrierung --
    def _build_profile(f, pts, board_size, margin, camera, name="_live"):
        return CalibrationProfile(
            profile=name, camera_index=camera, frame_size=(f.shape[1], f.shape[0]),
            board_size=board_size, image_corners=pts,
            homography=compute_homography(pts, board_size, margin),
            white_pov=True, crop=CropParams.default(board_size),
            margin=margin, marker_dict="DICT_4X4_50",
        )

    def _capture_frame_corners(prof, board):
        """(frame, corners) fürs SPEICHERN. Ist eine hochauflösende Capture-Quelle gesetzt
        (`--source` ist der flüssige Stream, `CHESSLAB_CAMERA_CAPTURE` der scharfe Snapshot),
        wird der Snapshot geholt und die Ecken DARAUF neu erkannt (andere Auflösung/Orientierung
        als die Vorschau). Sonst Live-Frame + die im Stream verifizierten Ecken."""
        f, hires = CAMERA.grab_capture()
        if f is None:
            return None, None
        if hires:
            mk = detect_board_markers(f, prof.marker_dict)
            res = resolve_board_corners(mk, board_size=prof.board_size) if len(mk) >= 4 else None
            return f, (res[0] if res else None)
        return f, (board.last_corners if board else None)

    @app.get("/api/camera/calibrate.mjpg")
    def camera_calibrate(camera: int = 0, board_size: int = config.DEFAULT_BOARD_SIZE):
        CAMERA.ensure(camera)
        tracker = MarkerTracker()
        CALIB.update(tracker=tracker)

        def frames():
            none_count = 0
            try:
                while True:
                    f = CAMERA.read()
                    if f is None:
                        none_count += 1
                        yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                        if none_count >= _NONE_FRAME_LIMIT:
                            none_count = 0
                        continue
                    none_count = 0
                    tracker.update(detect_board_markers(f, "DICT_4X4_50", corner="center"))
                    seen, held = len(tracker.last), tracker.n_held()
                    CAMERA.markers_found = seen >= 4
                    CAMERA.markers_count = seen
                    CAMERA.markers_live = tracker.n_live()
                    CAMERA.markers_held = held
                    m = CALIB.get("margin")
                    res = resolve_board_corners(tracker.last, board_size=board_size) if seen >= 4 else None
                    if res is not None:
                        pts, n = res
                        img = draw_calibration_overlay(f, pts, _build_profile(f, pts, board_size, m, camera),
                                                       labels=True)
                        held_txt = f"  ({held} gehalten)" if held else ""
                        cv2.putText(img, f"margin={m:.3f}  {n}/4 Marker{held_txt}", (10, 28),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                    else:
                        img = f.copy()
                        cv2.putText(img, f"Warte auf alle 4 Marker ({seen}/4)...", (10, 28),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                    yield img
            finally:
                log.info("Stream beendet: calibrate")

        return mjpeg(frames())

    @app.get("/api/camera/status")
    def camera_status():
        return {"open": CAMERA.cap is not None, "markers_found": CAMERA.markers_found,
                "markers_count": CAMERA.markers_count, "markers_live": CAMERA.markers_live,
                "markers_held": CAMERA.markers_held, "margin": CALIB.get("margin")}

    @app.post("/api/camera/release")
    def camera_release():
        CAMERA.release()
        return {"ok": True}

    @app.post("/api/calibrate/margin")
    def calibrate_margin(margin: float = Body(..., embed=True)):
        CALIB.update(margin=max(0.0, float(margin)))
        return {"margin": CALIB.get("margin")}

    @app.post("/api/calibrate/markers")
    def calibrate_markers():
        p = generate_markers(config.DATA.calibration / "markers.png")
        return {"url": _img_url(p.as_posix())}

    @app.post("/api/calibrate/save")
    def calibrate_save(profile: str = Body("default"), board_size: int = Body(config.DEFAULT_BOARD_SIZE),
                       margin: float = Body(None), camera: int = Body(0)):
        tracker = CALIB.get("tracker")
        if tracker is None or len(tracker.last) < 4:
            raise HTTPException(400, "noch nicht alle 4 Marker erkannt (kurz die Hand wegnehmen).")
        f = CAMERA.read()
        if f is None:
            raise HTTPException(400, "Kamera nicht aktiv / kein Frame.")
        pts = resolve_board_corners(tracker.last, board_size=board_size)[0]
        m = CALIB.get("margin") if margin is None else float(margin)
        prof = _build_profile(f, pts, board_size, m, camera, name=profile)
        prof.save(profile_path(profile))
        return {"ok": True, "profile": profile, "margin": m}

    # -- Sammeln (Trainingsdaten aufnehmen) --
    @app.post("/api/collect/start")
    def collect_start(strategy: str = Body("random"), max_plies: int = Body(40), seed: int = Body(42),
                      stockfish_path: str = Body(None), start_fen: str = Body(None),
                      profile: str = Body("default"), camera: int = Body(0),
                      sets: int = Body(1), count: int = Body(20), passes: int = Body(1),
                      pieces: str = Body("special"), together: bool = Body(False),
                      offset: int = Body(0), auto_offset: bool = Body(False),
                      target: int = Body(config.UI_TARGET_PER_CLASS)):
        try:
            prof = load_profile(profile)
        except FileNotFoundError as e:
            raise HTTPException(400, str(e))

        show_target = False
        # coverage: keine Partie, sondern dichte Aufbauten gegen die seltensten Klassen. Jeder
        # Eintrag ist eine FRISCHE Vollaufstellung (kein Einzelzug) -> ganze Stellung als Namen zeigen.
        if strategy == "coverage":
            from ..collect_ui import coverage_from_sessions, coverage_plan

            cov = coverage_from_sessions(config.DATA.sessions)
            inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
            positions = coverage_plan(cov["light"], cov["dark"], target, count, inventory=inventory)
            if not positions:
                raise HTTPException(400, f"Alle Klassen erreichen bereits das Ziel ({target}/Klasse) "
                                         "— nichts zu generieren. Ziel im Feld erhöhen oder eine "
                                         "Spiel-Engine wählen.")
            show_target = True
        elif strategy == "sweep":
            # Systematischer Sweep: eine Figurenreihe wandert Rang für Rang übers Brett (je eine je
            # Linie). `offset` verschiebt die Linien→Figur-Zuordnung (konstant je Session); `auto`
            # zählt bisherige Sweep-Sessions und nimmt den nächsten Offset -> jede Figur über mehrere
            # Sessions auf verschiedenen Linien (gegen Positions-Overfitting).
            from ..collect_ui import auto_sweep_offset, sweep_plan

            sweep_offset = auto_sweep_offset(config.DATA.sessions) if auto_offset else int(offset)
            inventory = {k: v * max(sets, 1) for k, v in config.DEFAULT_INVENTORY.items()}
            positions = sweep_plan(pieces=pieces, passes=max(1, passes), inventory=inventory,
                                   together=together, offset=sweep_offset)
            if not positions:
                raise HTTPException(400, "Sweep leer — Inventar/pieces prüfen (special|pawn|all).")
            show_target = True
        else:
            engine_path = None
            if strategy == "stockfish":
                # Der Pfad ist eine Backend-Sache: bevorzugt das mitgelieferte Binary unter
                # tools/stockfish/, sonst CHESSLAB_STOCKFISH oder PATH. Das Frontend muss ihn nicht kennen.
                engine_path = stockfish_path or config.find_stockfish()
                if not engine_path:
                    raise HTTPException(400, "Keine Schach-Engine gefunden. Lege ein Stockfish-Binary "
                                             "unter tools/stockfish/ ab (oder setze CHESSLAB_STOCKFISH) "
                                             "— oder wähle die Engine 'random'.")
            try:
                if strategy == "stockfish":
                    steps = stockfish_game_positions(engine_path, max_plies=max_plies, start_fen=start_fen)
                else:
                    steps = random_game_positions(max_plies=max_plies, seed=seed, start_fen=start_fen)
            except Exception as e:  # noqa: BLE001
                raise HTTPException(400, f"Partie-Generierung fehlgeschlagen: {e}")

            start = GameState(start_fen) if start_fen else GameState()
            positions = [{"ply": start.ply(), "san": None, "fen": start.fen()}] + steps

        sid = generate_session_id()
        CAMERA.ensure(camera)
        notes = (f"web:sweep offset={sweep_offset} pieces={pieces} together={together}"
                 if strategy == "sweep" else f"web:{strategy}")
        writer = SessionWriter(config.DATA.sessions / sid, session_id=sid, profile=profile, mode="play",
                               camera_index=camera, frame_size=prof.frame_size, notes=notes)
        COLLECT.update(writer=writer, positions=positions, i=0, profile=prof,
                       camera=camera, board=BoardTracker(prof), show_target=show_target)
        return _collect_state()

    @app.get("/api/collect/state")
    def collect_state():
        return _collect_state()

    @app.post("/api/collect/shoot")
    def collect_shoot():
        # Ein Klick: aktuelle Stellung fotografieren UND weiterschalten. Sofort gespeichert.
        c = COLLECT.snapshot()
        w = c["writer"]
        if w is None:
            raise HTTPException(400, "keine aktive Aufnahme-Session.")
        pos, i = c["positions"], c["i"]
        if i >= len(pos):
            return _collect_state()
        # Vorschau läuft über den Stream; gespeichert wird (falls Capture-Quelle gesetzt) der
        # hochauflösende Snapshot mit auf IHM neu erkannten Ecken — sonst Live-Frame + Stream-Ecken.
        # (Kamera-I/O bewusst OHNE Lock — Locks schützen nur den Zustands-Zugriff.)
        f, corners = _capture_frame_corners(c["profile"], c["board"])
        if f is None:
            raise HTTPException(400, "kein Frame von der Kamera.")
        w.capture(f, pos[i]["ply"], pos[i]["fen"], pos[i]["san"], corners=corners)
        COLLECT.mutate(lambda d: d.update(i=d["i"] + 1))
        return _collect_state()

    @app.post("/api/collect/skip")
    def collect_skip():
        COLLECT.mutate(lambda d: d.update(i=d["i"] + 1) if d["i"] < len(d["positions"]) else None)
        return _collect_state()

    @app.post("/api/collect/undo")
    def collect_undo():
        w = COLLECT.get("writer")
        if w is not None:
            w.undo()
            COLLECT.mutate(lambda d: d.update(i=max(0, d["i"] - 1)))
        return _collect_state()

    @app.post("/api/collect/finish")
    def collect_finish():
        w = COLLECT.get("writer")
        if w is None:
            return {"ok": True, "captures": 0}
        w.close()
        n, sid = w.count, w.session_id
        COLLECT.update(writer=None, positions=[], i=0, profile=None)
        # Mechanischen Schritt automatisieren: die gerade beendete Session direkt slicen,
        # damit die Crops sofort im Datensätze-Tab verfügbar sind.
        sliced, sliced_error = 0, None
        if n > 0:
            try:
                labeling_mod.run_slice(session=sid)
                sliced = sum(1 for r in _manifest() if r.get("session_id") == sid)
            except Exception as e:  # noqa: BLE001 — Komfortschritt, aber der Fehler muss sichtbar sein (H2)
                log.exception("Auto-Slice nach Collect-Finish fehlgeschlagen (Session %s)", sid)
                sliced_error = f"Auto-Slice fehlgeschlagen: {e}"
        resp = {"ok": True, "captures": n, "session": sid, "sliced": sliced}
        if sliced_error:
            resp["sliced_error"] = sliced_error
        return resp

    @app.get("/api/camera/collect.mjpg")
    def camera_collect():
        def frames():
            none_count = 0
            try:
              while True:
                f = CAMERA.read()
                c = COLLECT.snapshot()   # genau EIN Snapshot pro Frame (H1)
                prof, board, pos, i = c["profile"], c["board"], c["positions"], c["i"]
                show_target = c.get("show_target")
                if f is None:
                    none_count += 1
                    yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                    if none_count >= _NONE_FRAME_LIMIT:
                        none_count = 0
                    continue
                none_count = 0
                if prof is None or board is None:
                    img = f.copy()
                    cv2.putText(img, "keine Aufnahme aktiv — Start druecken", (10, 28),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                else:
                    warped, _ = board.process(f)   # Ecken/Warp aus dem geteilten BoardTracker
                    if warped is None:
                        img = f.copy()
                        cv2.putText(img, "Box aus Profil — warte auf Marker...", (10, 28),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                    else:
                        img = draw_board_grid(warped, prof)
                        if show_target and 0 <= i < len(pos):
                            # coverage: ganze Ziel-Stellung als Figurennamen zum Nachbauen
                            _draw_target_pieces(img, prof, pos[i]["fen"])
                        elif 0 < i < len(pos):   # Spielmodus: Zug, der zur aktuellen Stellung führt
                            _draw_move_arrow(img, prof, pos[i - 1]["fen"], pos[i]["san"])
                yield img
            finally:
                log.info("Stream beendet: collect")

        return mjpeg(frames())

    @app.post("/api/slice")
    def slice_all(pad_up: float | None = Body(None), pad_side: float | None = Body(None)):
        rc = labeling_mod.run_slice(slice_all=True, pad_up=pad_up, pad_side=pad_side)
        return {"ok": rc == 0}

    # -- Live-Inference (Modell auswerten + daraus Trainingsdaten gewinnen) --
    @app.post("/api/inference/start")
    def inference_start(run: str = Body(...), profile: str = Body("default"), camera: int = Body(0)):
        try:
            prof = load_profile(profile)
        except FileNotFoundError as e:
            raise HTTPException(400, str(e))
        if not (config.DATA.models / run / "config.json").exists():
            raise HTTPException(400, f"Modell-Run '{run}' nicht gefunden.")
        CAMERA.ensure(camera)
        spec = serving.run_spec(config.DATA.models / run)
        INFER.update(profile=prof, board=BoardTracker(prof),
                     run=run, camera=camera, last=None,
                     geometry=spec.geometry, photometry=spec.photometry,
                     piece_height=spec.piece_height_cells)
        log.info("Inference '%s': geometry=%s photometry=%s", run, spec.geometry, spec.photometry)
        return {"ok": True, "run": run, "geometry": spec.geometry, "photometry": spec.photometry}

    @app.get("/api/inference/state")
    def inference_state():
        s = INFER.snapshot()
        last = s.get("last")
        return {"active": s["run"] is not None, "run": s["run"],
                "fen": last["fen"] if last else None, "mean_conf": last["mean_conf"] if last else None}

    @app.get("/api/camera/inference.mjpg")
    def camera_inference():
        def frames():
            CONF_COL = lambda c: (0, 200, 0) if c >= 0.8 else (0, 215, 255) if c >= 0.5 else (0, 0, 255)
            none_count = 0
            try:
              while True:
                f = CAMERA.read()
                s = INFER.snapshot()   # genau EIN Snapshot pro Frame (H1)
                prof, board, run = s["profile"], s["board"], s["run"]
                if f is None:
                    none_count += 1
                    yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                    if none_count >= _NONE_FRAME_LIMIT:
                        none_count = 0
                    continue
                none_count = 0
                if prof is None or board is None or run is None:
                    yield None
                    continue
                warped, corners = board.process(f)   # geteilter BoardTracker (Ecken/Warp, edge-to-edge fürs Display)
                if warped is None or corners is None:
                    img = f.copy()
                    cv2.putText(img, "warte auf Marker...", (10, 28), cv2.FONT_HERSHEY_SIMPLEX,
                                0.6, (0, 0, 255), 2, cv2.LINE_AA)
                    yield img
                    continue
                # Crops + Vorhersage: kanonische Pipeline aus `serving.predict_frame`.
                # (Inference bewusst OHNE Lock — Locks schützen nur den Zustands-Zugriff.)
                try:
                    preds = serving.predict_frame(config.DATA.models / run, f, corners, prof, device="cpu")
                except Exception as e:  # noqa: BLE001 — Fehler wird im Stream sichtbar gemacht
                    log.warning("Live-Inference fehlgeschlagen: %s", e)
                    img = warped.copy()
                    cv2.putText(img, f"Modell-Fehler: {e}", (10, 28), cv2.FONT_HERSHEY_SIMPLEX,
                                0.6, (0, 0, 255), 2, cv2.LINE_AA)
                    yield img
                    continue
                labels = {p["square"]: p["pred_label"] for p in preds}
                img = draw_board_grid(warped, prof)
                for p in preds:
                    sq, lab, conf = p["square"], p["pred_label"], p["confidence"]
                    if lab == "empty":
                        continue
                    ch = "#" if lab == "occluded" else _label_to_fen_char(lab) or "?"
                    cx, cy = square_center(sq, prof)
                    cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                                CONF_COL(conf), 2, cv2.LINE_AA)
                fen = _labels_to_fen(labels)
                cv2.putText(img, fen, (8, prof.board_size - 10), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (255, 255, 0), 1, cv2.LINE_AA)
                INFER.update(last={"corners": corners, "frame": f.copy(), "labels": labels,
                                   "fen": fen, "mean_conf": round(sum(p["confidence"] for p in preds) / len(preds), 3)})
                yield img
            finally:
                log.info("Stream beendet: inference")

        return mjpeg(frames())

    @app.post("/api/inference/capture")
    def inference_capture():
        s = INFER.snapshot()
        last = s.get("last")
        if not last:
            raise HTTPException(400, "noch keine Vorhersage — Stream offen lassen, bis Marker stehen.")
        prof = s["profile"]
        sid = generate_session_id() + "-inf"
        w = SessionWriter(config.DATA.sessions / sid, session_id=sid, profile="default", mode="inference",
                          camera_index=s["camera"], frame_size=prof.frame_size, notes=f"inference:{s['run']}")
        w.capture(last["frame"], ply=0, fen=_labels_to_fen(last["labels"]) + " w - - 0 1",
                  corners=last["corners"], labels=last["labels"])
        w.close()
        labeling_mod.run_slice(session=sid)
        crops = sum(1 for r in _manifest() if r.get("session_id") == sid)
        return {"ok": True, "session": sid, "crops": crops,
                "hint": "Im Review die verdeckten Felder als 'occluded' korrigieren, dann neu slicen."}

    # -- Manuelles Labeln (Figuren frei stellen + pro Feld labeln -> Eintrag) --
    def _manual_state() -> dict:
        w = MANUAL.get("writer")
        return {"active": w is not None, "session": w.session_id if w else None,
                "captures": w.count if w else 0}

    @app.post("/api/manual/start")
    def manual_start(profile: str = Body("default"), camera: int = Body(0)):
        try:
            prof = load_profile(profile)
        except FileNotFoundError as e:
            raise HTTPException(400, str(e))
        CAMERA.ensure(camera)
        sid = generate_session_id() + "-man"
        writer = SessionWriter(config.DATA.sessions / sid, session_id=sid, profile=profile,
                               mode="manual", camera_index=camera, frame_size=prof.frame_size,
                               notes="manual")
        MANUAL.update(profile=prof, board=BoardTracker(prof), camera=camera, writer=writer)
        return _manual_state()

    @app.get("/api/manual/state")
    def manual_state():
        return _manual_state()

    @app.get("/api/camera/manual.mjpg")
    def camera_manual():
        def frames():
            none_count = 0
            try:
              while True:
                f = CAMERA.read()
                m = MANUAL.snapshot()   # genau EIN Snapshot pro Frame (H1)
                prof, board = m["profile"], m["board"]
                if f is None:
                    none_count += 1
                    yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                    if none_count >= _NONE_FRAME_LIMIT:
                        none_count = 0
                    continue
                none_count = 0
                if prof is None or board is None:
                    img = f.copy()
                    cv2.putText(img, "keine Sitzung — Start druecken", (10, 28),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                else:
                    warped, _ = board.process(f)   # Ecken/Warp aus dem geteilten BoardTracker
                    if warped is None:
                        img = f.copy()
                        cv2.putText(img, "Box aus Profil — warte auf Marker...", (10, 28),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                    else:
                        img = draw_board_grid(warped, prof)   # nur das 8x8-Raster, kein Zug-Pfeil
                yield img
            finally:
                log.info("Stream beendet: manual")

        return mjpeg(frames())

    @app.post("/api/manual/capture")
    def manual_capture(labels: dict = Body(default={}, embed=True)):
        m = MANUAL.snapshot()
        w, board = m["writer"], m["board"]
        if w is None:
            raise HTTPException(400, "keine aktive manuelle Sitzung — erst Start.")
        f, corners = _capture_frame_corners(m["profile"], board)
        if f is None:
            raise HTTPException(400, "kein Frame von der Kamera.")
        clean = {str(sq): str(lab) for sq, lab in (labels or {}).items() if lab and lab != "empty"}
        # FEN ist nur Platzhalter (slice nutzt die expliziten labels). Ecken: hochauflösender
        # Snapshot -> auf ihm neu erkannt, sonst die im Stream verifizierten.
        w.capture(f, ply=0, fen=_labels_to_fen(clean) + " w - - 0 1",
                  corners=corners, labels=clean)
        return _manual_state()

    @app.post("/api/manual/undo")
    def manual_undo():
        w = MANUAL.get("writer")
        if w is not None:
            w.undo()
        return _manual_state()

    @app.post("/api/manual/finish")
    def manual_finish():
        w = MANUAL.get("writer")
        if w is None:
            return {"ok": True, "captures": 0}
        w.close()
        n, sid = w.count, w.session_id
        MANUAL.update(writer=None, profile=None, board=None)
        sliced, sliced_error = 0, None
        if n > 0:
            try:
                labeling_mod.run_slice(session=sid)
                sliced = sum(1 for r in _manifest() if r.get("session_id") == sid)
            except Exception as e:  # noqa: BLE001 — Komfortschritt, aber der Fehler muss sichtbar sein (H2)
                log.exception("Auto-Slice nach Manual-Finish fehlgeschlagen (Session %s)", sid)
                sliced_error = f"Auto-Slice fehlgeschlagen: {e}"
        resp = {"ok": True, "captures": n, "session": sid, "sliced": sliced}
        if sliced_error:
            resp["sliced_error"] = sliced_error
        return resp

    # -- Turntable-Scan (Tab „Scan"): Photogrammetrie-Frames für RealityScan aufnehmen ------------
    @app.get("/api/scan/status")
    def scan_status():
        return SCANNER.status()

    @app.post("/api/scan/open")
    def scan_open(source: str = Body(...), width: int = Body(3840), height: int = Body(2160)):
        try:
            return SCANNER.open(source, width, height)
        except Exception as e:  # noqa: BLE001 — Nutzerfehler (Quelle/URL) sauber ans Frontend
            raise HTTPException(400, str(e))

    @app.post("/api/scan/config")
    def scan_config(crop: list[int] | None = Body(None), interval: float | None = Body(None),
                    count: int | None = Body(None), quality: int | None = Body(None),
                    out: str | None = Body(None)):
        return SCANNER.configure(crop=crop, interval=interval, count=count, quality=quality, out=out)

    @app.post("/api/scan/start")
    def scan_start(out: str | None = Body(None, embed=True)):
        try:
            return SCANNER.start(out)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, str(e))

    @app.post("/api/scan/stop")
    def scan_stop():
        return SCANNER.stop()

    @app.post("/api/scan/close")
    def scan_close():
        SCANNER.close()
        return SCANNER.status()

    @app.get("/api/scan/preview.mjpg")
    def scan_preview():
        def frames():
            last = -1
            try:
                while True:
                    img, fid = SCANNER.preview(last_id=last)
                    last = fid
                    yield img      # None -> mjpeg wartet kurz (kein neuer Frame, kein Fehlerbild:
                                   # der Scanner liefert bewusst nur bei neuen Frames)
            finally:
                log.info("Stream beendet: scan-preview")
        return mjpeg(frames())

    # SPA-Catch-all (MUSS zuletzt stehen): Deep-Links/F5 auf Client-Routen (/datensaetze ...)
    # liefern index.html; React-Router übernimmt. /api/* hier ist unbekannt -> 404.
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "unbekannter API-Endpunkt")
        return FileResponse(str(_STATIC / "index.html"))

    return app


def labeling_predict(run: str, rows: list[dict]) -> list[dict]:
    """Wrapper, damit der torch-Import lazy bleibt (Web läuft auch ohne Modell-Ansicht)."""
    from .inference import predict_rows

    return predict_rows(config.DATA.models / run, rows, device="cpu")


def run(host: str = config.DEFAULT_WEB_HOST, port: int = config.DEFAULT_WEB_PORT) -> int:
    try:
        import uvicorn
    except ImportError:
        print("[FAIL] fastapi/uvicorn fehlen. Installieren mit:  uv sync --extra web")
        return 1
    # Für Direktstarts ohne CLI (python -m …): Logger sichtbar machen (no-op, wenn schon konfiguriert).
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    print(f"chesslab Web-UI: http://{host}:{port}")
    uvicorn.run(create_app(), host=host, port=port, log_level="warning")
    return 0
