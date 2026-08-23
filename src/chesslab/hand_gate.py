"""Das billige Ja/Nein vor der Auswahl: liegt eine Hand auf diesem Brett?

Destilliert aus SAM 3 — dessen Alpha ist der Lehrer, dieser Kopf der Zeuge, der in Millisekunden
statt Sekunden antwortet. Warum die drei Scan-Sensoren das nicht können: `docs/hand-gate.md`.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from . import config

#: Ab dieser Fläche (in Feldern) ist SAMs Fund eine Hand und kein Maskenrand. Darunter liegt ein
#: unklarer Streifen von 125 der 11.110 Bretter — der taugt als Prüfung, nicht als Lehrer.
GATE_AREA_MIN = 0.25
#: Wohin Gewichte und Modellkarte gehen. `bn` im Namen ist Pflicht (CLAUDE.md, Model Guidelines).
GATE_DIR = "hand-gate-bn"
#: Der Lauf, den die Pipeline benutzt, wenn niemand einen anderen nennt. NICHT der namenlose
#: Ordner: dort liegt der erste Versuch mit global gepooltem Kopf, den `GateNet` gar nicht laden
#: kann — und ein leerer Vorgabewert hat genau deshalb einen ganzen Korpus-Rescan gekostet.
DEFAULT_GATE = "mnv4-640"
CARD_FILE = "card.json"
WEIGHTS_FILE = "gate.pt"


def gate_label(row: dict) -> bool | None:
    """SAMs Urteil über ein Brett als Ja/Nein — `None` für den unklaren Streifen dazwischen.

    Beides muss zusammenkommen: ein Konzept, das feuert, UND Fläche. Ein Konzept ohne Fläche ist
    eine verworfene Box, Fläche ohne Konzept ein Maskenrand.
    """
    concepts = {k for k, v in (row.get("concepts") or {}).items() if v}
    area = sum((row.get("coverage") or {}).values())
    if concepts and area > GATE_AREA_MIN:
        return True
    if not concepts and area == 0.0:
        return False
    return None


def gate_rows(unclear: bool = False) -> list[dict]:
    """`{session, stem, board, hand, coverage}` über jede Session mit Matte — der Lehrer-Datensatz.

    `coverage` sind SAMs 64 Werte in `all_squares()`-Reihenfolge; `board` der Pfad relativ zu
    `config.DATA.recordings`, damit eine Zeile allein reicht.
    """
    from .ioutil import read_jsonl
    from .labeling import all_squares, read_session_meta

    squares = all_squares()

    out = []
    for path in sorted(config.DATA.recordings.glob("*/matte.jsonl")):
        session_dir = path.parent
        session = read_session_meta(session_dir)["session_id"]
        log = read_jsonl(session_dir / "log.jsonl")
        boards = {Path(r["frame"]).stem: r.get("board") for r in log}
        borders = {Path(r["frame"]).stem: r.get("board_border") for r in log}
        for row in read_jsonl(path):
            hand = gate_label(row)
            rel = boards.get(row["frame"])
            if rel is None or (hand is None and not unclear):
                continue
            cover = row.get("coverage") or {}
            out.append({"session": session, "stem": row["frame"],
                        "board": f"{session_dir.name}/{rel}", "hand": hand,
                        "border": int(borders.get(row["frame"]) or 0),
                        "coverage": [float(cover.get(sq, 0.0)) for sq in squares]})
    return out


def holdout_sessions(rows: list[dict], count: int) -> list[str]:
    """Die `count` Sessions, die geprüft werden — GANZE Sessions, nie einzelne Frames.

    Eine Session ist eine Beleuchtung und ein Aufbau. Frameweise geteilt misst man, ob der Kopf
    dasselbe Brett wiedererkennt, nicht ob er eine Hand findet.
    """
    order = sorted({r["session"] for r in rows})
    step = max(1, len(order) // max(count, 1))
    return order[::step][:count]


def _read_board(path: Path, size: int, border: int = 0):
    """Ein gespeichertes Brett als RGB-Array in der Größe, die der Kopf sieht — OHNE seinen Rand.

    Der Rand muss weg, weil der 8x8-Kopf sein Raster über das Bild legt: 12 px auf 952 sind ein
    Viertel Feld Versatz, und dann sagt jede Zelle etwas über die Nachbarzelle.
    """
    import cv2

    board = cv2.imread(str(path))
    if board is None:
        return None
    if border:
        board = board[border:board.shape[0] - border, border:board.shape[1] - border]
    return cv2.cvtColor(cv2.resize(board, (size, size), interpolation=cv2.INTER_AREA),
                        cv2.COLOR_BGR2RGB)


#: ImageNet, weil der Backbone vortrainiert startet — 11.000 Bretter reichen für kein Stem.
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)


def _augment(image, rng):
    """Was zwischen zwei Aufnahmen wirklich variiert: das Licht.

    Kein Versatz, keine Drehung, keine Spiegelung — das Ziel sind 64 Werte auf FESTEN Feldern, und
    schon 8 px Verschiebung sind ein Fünftel Feld. Die Kamera steht ohnehin still.
    """
    import numpy as np

    out = image.astype(np.float32) * rng.uniform(0.75, 1.3) + rng.uniform(-25, 25)
    return np.clip(out, 0, 255)


class BoardSet:
    """Die gespeicherten Bretter als Ja/Nein-Paare, von Platte gelesen.

    Kein Memmap-Pack wie beim Zell-Training: 11.000 Bilder sind zu wenig, um dafür eins zu bauen.
    """

    def __init__(self, rows: list[dict], size: int, train: bool, seed: int = 0):
        import numpy as np

        self.rows, self.size, self.train = rows, size, train
        self.rng = np.random.default_rng(seed)
        self.root = config.DATA.recordings

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int):
        import numpy as np
        import torch

        row = self.rows[i]
        image = _read_board(self.root / row["board"], self.size, row.get("border", 0))
        if image is None:
            image = np.zeros((self.size, self.size, 3), np.uint8)
        if self.train:
            image = _augment(image, self.rng)
        # uint8 über die Prozessgrenze: als float32 sind das 4,9 MB je Brett bei 640 px, und die
        # angepinnten Puffer sprengten damit den HIP-Host-Speicher. Normalisiert wird auf der GPU.
        x = torch.from_numpy(np.ascontiguousarray(image, dtype=np.uint8)).permute(2, 0, 1)
        target = torch.tensor([float(bool(row["hand"])), *row["coverage"]], dtype=torch.float32)
        return x, target


def sweep_thresholds(probs, labels, steps: int = 41) -> list[dict]:
    """Je Schwelle: wie viele Hände der Kopf fängt, und was er an sauberen Brettern kostet.

    Für ein Veto zählt der Recall: ein Fehlalarm kostet ein Brett von zwölf, eine verpasste Hand
    kostet einen Frame im Trainingssatz.
    """
    import numpy as np

    p, y = np.asarray(probs), np.asarray(labels, bool)
    out = []
    for t in np.linspace(0.0, 1.0, steps):
        flag = p >= t
        out.append({"thr": round(float(t), 3),
                    "recall": round(float((flag & y).sum() / max(y.sum(), 1)), 4),
                    "false_pos": int((flag & ~y).sum()),
                    "clean_lost": round(float((flag & ~y).sum() / max((~y).sum(), 1)), 4)})
    return out


def pick_threshold(rows: list[dict], recall_min: float = 0.99) -> dict:
    """Die höchste Schwelle, die den geforderten Recall noch hält — sonst die niedrigste."""
    good = [r for r in rows if r["recall"] >= recall_min]
    return max(good, key=lambda r: r["thr"]) if good else rows[0]


def measure_speed(model, device, size: int, batch: int = 32, rounds: int = 6) -> float:
    """Millisekunden je Brett, gebatcht — die Zahl, gegen die SAMs 3 s stehen."""
    import time

    import torch

    model.eval()
    x = torch.zeros(batch, 3, size, size, device=device).contiguous(memory_format=torch.channels_last)
    with torch.inference_mode(), torch.autocast("cuda", dtype=torch.bfloat16, enabled=device == "cuda"):
        for _ in range(2):
            model(x)
        if device == "cuda":
            torch.cuda.synchronize()
        start = time.perf_counter()
        for _ in range(rounds):
            model(x)
        if device == "cuda":
            torch.cuda.synchronize()
    return round((time.perf_counter() - start) * 1000 / (rounds * batch), 2)


def grid_to_squares(cover):
    """`(B, 1, 8, 8)` über dem Bild -> 64 Werte in `all_squares()`-Reihenfolge.

    Bildzeile 0 ist Reihe 8 (weiße POV, a8 oben links), `all_squares()` beginnt bei a1 — zwischen
    beiden liegt genau ein Kippen um die Zeilenachse.
    """
    return cover.flip(-2).flatten(1)


class GateNet:
    """Ein Backbone, zwei Köpfe: ein Veto über das Brett, und 64 Werte auf ihren EIGENEN Feldern.

    Global gepoolt müsste ein Vektor alle 64 Zahlen tragen; hier sieht jede Zelle ihren eigenen
    Ausschnitt. Das Raster sitzt nur, weil `_read_board` den Brettrand abschneidet.
    """

    def __new__(cls, backbone: str, pretrained: bool = True):
        import timm
        import torch
        from torch import nn

        from .training.model import _convert_bn_to_primitive

        # `mobilenetv4_conv_small_035` und andere schmale Varianten liefern KEINE Gewichte; ohne
        # den Rückfall stirbt der Lauf erst nach dem Datensatz-Aufbau. `_create_timm_model` fängt
        # dasselbe für den Zell-Klassifikator ab.
        if pretrained and not timm.is_model_pretrained(backbone):
            print(f"[WARN] {backbone} hat keine vortrainierten Gewichte — zufällige Initialisierung.")
            pretrained = False
        body = timm.create_model(backbone, pretrained=pretrained, num_classes=0, global_pool="")
        # Gemessen statt `num_features` gelesen: bei den MobileNets ist das die Zahl VOR dem
        # Head-Conv, und die Karte kommt mit 1024 statt 576 heraus.
        with torch.no_grad():
            channels = body(torch.zeros(1, 3, 256, 256)).shape[1]

        class _Net(nn.Module):
            def __init__(self):
                super().__init__()
                self.body, self.cover, self.veto = body, nn.Conv2d(channels, 1, 1), nn.Linear(channels, 1)

            def forward(self, x):
                f = self.body(x)
                cover = grid_to_squares(self.cover(nn.functional.adaptive_avg_pool2d(f, 8)))
                return torch.cat([self.veto(f.mean(dim=(2, 3))), cover], 1)

        return _convert_bn_to_primitive(_Net())


class GateLoss:
    """Das Veto und die 64 Felder aus EINER 65 Spalten breiten Ausgabe.

    Gegen die FRAKTION regressiert, nicht gegen ein Ja/Nein je Feld — `training/occlusion.py` macht
    es je Crop genauso, und eine kalibrierte Zahl macht `PIECE_VISIBLE_MAX` zu einem Regler.
    """

    def __init__(self, hand_weight: float, cover_weight: float = 4.0) -> None:
        import torch

        self.hand = torch.nn.BCEWithLogitsLoss(pos_weight=torch.tensor(hand_weight))
        self.cover = torch.nn.BCEWithLogitsLoss()
        self.cover_weight = cover_weight

    def to(self, device):
        self.hand = self.hand.to(device)
        return self

    def __call__(self, out, target):
        return (self.hand(out[:, 0], target[:, 0])
                + self.cover_weight * self.cover(out[:, 1:], target[:, 1:]))


def _run_epoch(model, loader, device, criterion, optimizer=None) -> tuple[float, list, list]:
    """Eine Epoche; ohne [optimizer] eine Auswertung. Gibt Verlust, Veto und die 64 Werte je Brett.

    Nichts in der Schleife liest eine Zahl aus: ein `float(loss)` je Batch hält die GPU an jedem
    Schritt an, und der Kopf ist klein genug, dass genau das der Flaschenhals wird.
    """
    import torch

    model.train(optimizer is not None)
    amp = device == "cuda"
    mean = torch.tensor(MEAN, device=device).view(1, 3, 1, 1) * 255.0
    std = torch.tensor(STD, device=device).view(1, 3, 1, 1) * 255.0
    total, seen, said, truth = torch.zeros((), device=device), 0, [], []
    with torch.set_grad_enabled(optimizer is not None):
        for x, y in loader:
            x = x.to(device, non_blocking=True).contiguous(memory_format=torch.channels_last)
            x = (x.float() - mean) / std
            y = y.to(device, non_blocking=True)
            with torch.autocast("cuda", dtype=torch.bfloat16, enabled=amp):
                out = model(x)
                loss = criterion(out, y)
            if optimizer is not None:
                optimizer.zero_grad(set_to_none=True)
                loss.backward()
                optimizer.step()
            total += loss.detach().float() * len(y)
            seen += len(y)
            said.append(torch.sigmoid(out.detach().float()))
            truth.append(y)
    return (float(total) / max(seen, 1),
            torch.cat(said).cpu().tolist(), torch.cat(truth).cpu().tolist())


def gate_score(cover: dict) -> float:
    """Wonach ein Lauf seine beste Epoche wählt: das F1 über die Felder.

    Das Veto liegt in jeder Epoche über 0,99 und trennt deshalb nicht; die 64 Werte sind ohnehin
    das Produkt. Ein Lauf ohne diese Wahl behält die letzte Epoche, auch wenn sie die schlechteste war.
    """
    r, p = cover["recall"], cover["precision"]
    return round(2 * r * p / max(r + p, 1e-9), 4)


def coverage_report(said: list, truth: list, visible_max: float = 0.15) -> dict:
    """Was der Schüler auf den Feldern taugt: der mittlere Fehler, und — was allein zählt — ob er
    dieselben Felder über `PIECE_VISIBLE_MAX` hebt wie SAM."""
    import numpy as np

    p = np.asarray(said, np.float32)[:, 1:]
    y = np.asarray(truth, np.float32)[:, 1:]
    hit, want = p >= visible_max, y >= visible_max
    return {"mae": round(float(np.abs(p - y).mean()), 4),
            "cells_over": int(want.sum()),
            "recall": round(float((hit & want).sum() / max(want.sum(), 1)), 4),
            "precision": round(float((hit & want).sum() / max(hit.sum(), 1)), 4)}


def train_gate(*, backbone: str = "mobilenet_v3_small", size: int = 320, epochs: int = 8,
               holdout: int = 4, batch: int = 32, workers: int = 4, lr: float = 3e-4,
               seed: int = 0, tag: str = "", progress: bool = True) -> dict:
    """Den Kopf auf SAMs Urteil trainieren und ihn auf ZURÜCKGEHALTENEN Sessions prüfen."""
    miopen_fast()
    import torch
    from torch.utils.data import DataLoader

    torch.manual_seed(seed)
    rows = gate_rows()
    if not rows:
        raise RuntimeError("keine Matte auf der Platte — `occluders alpha-worker` lief nie")
    held = set(holdout_sessions(rows, holdout))
    train_rows = [r for r in rows if r["session"] not in held]
    val_rows = [r for r in rows if r["session"] in held]
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 65 Spalten: das Veto, dann die 64 Felder — eine Ausgabe, am Lesepunkt geteilt.
    model = GateNet(backbone, pretrained=True).to(device, memory_format=torch.channels_last)
    # Gegen das Ungleichgewicht (6.343 Hand zu 4.642 frei) und FÜR den Recall: die Hand wiegt
    # schwerer, weil eine verpasste Hand einen Frame im Trainingssatz kostet.
    hands = sum(1 for r in train_rows if r["hand"])
    criterion = GateLoss(max(len(train_rows) - hands, 1) / max(hands, 1) * 2.0).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    schedule = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(epochs, 1))

    # `persistent_workers`, weil Windows die Prozesse sonst je Epoche neu startet und jeder torch
    # neu importiert. KEIN `pin_memory`: die angepinnten Puffer beider Loader zusammen sprengten
    # den HIP-Host-Speicher, und der GPU-Schritt ist ohnehin zwanzigmal teurer als die Kopie.
    keep = config.loader_kwargs(workers, pin_memory=False, prefetch_factor=2)
    loader = DataLoader(BoardSet(train_rows, size, True, seed), batch_size=batch, shuffle=True,
                        drop_last=True, **keep)
    val_loader = DataLoader(BoardSet(val_rows, size, False), batch_size=batch * 2, **keep)

    history, best = [], None
    for epoch in range(epochs):
        loss, _, _ = _run_epoch(model, loader, device, criterion, optimizer)
        schedule.step()
        val_loss, said, truth = _run_epoch(model, val_loader, device, criterion)
        probs = [s[0] for s in said]
        labels = [t[0] > 0.5 for t in truth]
        table = sweep_thresholds(probs, labels)
        chosen = pick_threshold(table)
        cover = coverage_report(said, truth)
        score = gate_score(cover)
        history.append({"epoch": epoch + 1, "loss": round(loss, 4), "val_loss": round(val_loss, 4),
                        **chosen, "coverage": cover, "score": score})
        if best is None or score > best["score"]:
            best = {"epoch": epoch + 1, "score": score, "coverage": cover, "chosen": chosen,
                    "sweep": table,
                    "weights": {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}}
        if progress:
            print(f"  Epoche {epoch + 1}/{epochs}: loss {loss:.4f} val {val_loss:.4f} — "
                  f"Veto thr {chosen['thr']}: recall {chosen['recall']}, "
                  f"{chosen['false_pos']} saubere Bretter verworfen | Felder > 0.15: "
                  f"recall {cover['recall']} praezision {cover['precision']}, MAE {cover['mae']}",
                  flush=True)

    speed = measure_speed(model, device, size)
    card = {"backbone": backbone, "size": size, "epochs": epochs, "lr": lr, "seed": seed,
            "train_boards": len(train_rows), "val_boards": len(val_rows),
            "val_hands": sum(1 for r in val_rows if r["hand"]), "holdout": sorted(held),
            "teacher": "sam3", "chosen": best["chosen"], "sweep": best["sweep"],
            "coverage": best["coverage"],
            # Der Preis, um den es geht: SAM 3 braucht 3 s je Brett, gebatcht.
            "ms_per_board": speed, "perfect_recall": pick_threshold(best["sweep"], 1.0),
            "history": history, "written_at": datetime.now(UTC).isoformat(),
            "best": {k: v for k, v in best.items() if k not in ("weights", "sweep")}}
    out = config.DATA.models / (f"{GATE_DIR}-{tag}" if tag else GATE_DIR)
    out.mkdir(parents=True, exist_ok=True)
    # Gespeichert wird die BESTE Epoche, nicht die letzte: auf 20-40-33 lag Epoche 8 deutlich
    # unter Epoche 4, und ein Lauf, der dort endet, verschenkt sein eigenes Ergebnis.
    torch.save(best["weights"], out / WEIGHTS_FILE)
    torch.save(model.state_dict(), out / "last.pt")
    (out / CARD_FILE).write_text(json.dumps(card, indent=2), encoding="utf-8")
    return {"path": out, **{k: card[k] for k in
            ("train_boards", "val_boards", "val_hands", "chosen", "perfect_recall",
             "ms_per_board", "coverage")}}


def miopen_fast() -> None:
    """ROCm sucht auf Windows sonst je Conv-Form erschöpfend nach Kerneln — 20 Minuten für nichts.

    Muss stehen, BEVOR die erste Faltung läuft, deshalb hier und nicht im Aufrufer: den Scan hätte
    es sonst genauso getroffen wie das Training, nur ohne dass es jemandem auffällt.
    """
    import os

    os.environ.setdefault("MIOPEN_FIND_MODE", "FAST")


def load_gate(tag: str = ""):
    """Gewichte und Modellkarte eines Laufs -> `(model, card, device)`, bereit zum Lesen."""
    miopen_fast()
    import torch

    out = config.DATA.models / f"{GATE_DIR}-{tag or DEFAULT_GATE}"
    card = json.loads((out / CARD_FILE).read_text(encoding="utf-8"))
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = GateNet(card["backbone"], pretrained=False)
    model.load_state_dict(torch.load(out / WEIGHTS_FILE, map_location=device))
    return model.to(device, memory_format=torch.channels_last).eval(), card, device


def _forward(model, device, images: list, batch: int) -> list:
    """Fertige RGB-Bilder in Modellgröße durch den Kopf — `(Veto, 64 Coverage-Werte)` je Bild."""
    import numpy as np
    import torch

    # uint8 zur GPU, dort erst float: als float32 sind 640 px 4,9 MB je Bild, und das Rechnen
    # davon auf der CPU kostete im Scan mehr als der ganze Rest zusammen.
    mean = torch.tensor(MEAN, device=device).view(1, 3, 1, 1) * 255.0
    std = torch.tensor(STD, device=device).view(1, 3, 1, 1) * 255.0
    out = []
    with torch.inference_mode(), torch.autocast("cuda", dtype=torch.bfloat16,
                                                enabled=device == "cuda"):
        for i in range(0, len(images), batch):
            raw = np.ascontiguousarray(np.stack(images[i:i + batch]))
            x = torch.from_numpy(raw).to(device).permute(0, 3, 1, 2)
            x = ((x.contiguous(memory_format=torch.channels_last).float() - mean) / std)
            out += torch.sigmoid(model(x).float()).cpu().tolist()
    return out


def read_gate(model, device, paths: list[Path], size: int, batch: int = 24):
    """Die Bretter unter [paths] durch den Kopf — je Brett `(Veto, 64 Coverage-Werte)`."""
    images = [_read_board(p, size) for p in paths]
    said = iter(_forward(model, device, [im for im in images if im is not None], batch))
    return [next(said) if im is not None else None for im in images]


def read_boards(model, device, boards: list, size: int, batch: int = 16) -> list:
    """Schon gewarpte Bretter durch den Kopf — der Frame-Scan hält sie ohnehin in der Hand.

    Ohne Randschnitt: `scan_video` gibt das reine Brett weiter, den Rand schneidet `_read_board`
    nur dort ab, wo er auf der Platte mitgespeichert ist.
    """
    import cv2

    images = [cv2.cvtColor(cv2.resize(b, (size, size), interpolation=cv2.INTER_AREA),
                           cv2.COLOR_BGR2RGB) for b in boards]
    return _forward(model, device, images, batch)


def gate_scan(name: str, *, tag: str = "", batch: int = 24) -> dict:
    """Eine Session durch den Schüler -> `gate.jsonl` neben `matte.jsonl`.

    Getrennte Datei mit Absicht: SAMs Messung und die des Schülers dürfen nie in derselben Zeile
    stehen, sonst weiß später niemand mehr, wessen Zahl in den Trainingssatz gelaufen ist.
    """
    from .ioutil import read_jsonl
    from .labeling import all_squares
    from .realgames import game_dir

    session_dir = game_dir(name)
    model, card, device = load_gate(tag)
    rows = [r for r in read_jsonl(session_dir / "log.jsonl") if r.get("board")]
    said = read_gate(model, device, [session_dir / r["board"] for r in rows], card["size"], batch)
    squares = all_squares()
    thr = card["perfect_recall"]["thr"]
    lines = []
    for row, got in zip(rows, said, strict=True):
        if got is None:
            continue
        lines.append(json.dumps({
            "frame": Path(row["frame"]).stem, "ply": row.get("ply"),
            "hand": round(got[0], 4), "veto": got[0] >= thr,
            "coverage": {sq: round(v, 4) for sq, v in zip(squares, got[1:], strict=True) if v > 0.01},
        }))
    path = session_dir / "gate.jsonl"
    path.write_text("".join(x + "\n" for x in lines), encoding="utf-8")
    return {"path": path, "frames": len(lines), "veto": sum(1 for x in lines if '"veto": true' in x)}
