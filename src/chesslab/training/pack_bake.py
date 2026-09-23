"""Ein abgeleiteter Pack, schon durch den FESTEN Teil der Kette gedreht.

Fest je Crop sind nur `Resize` und CLAHE; Augmentation wuerfelt je Epoche und bleibt im Loader.
Was das kostet, was es bringt und warum `config.json` CLAHE trotzdem behaelt: `docs/packs.md`.
"""

from __future__ import annotations

import json
import shutil
import time

import numpy as np
from PIL import Image

from .. import config
from ..ioutil import write_json
from .packs import _packed_paths

#: Wie viele Crops auf einmal durch den Speicher gehen. 4096 * 80 * 80 * 3 = 79 MB je Puffer.
CHUNK = 4096

#: Was neben den Pixeln mitkommt: der abgeleitete Datensatz muss dieselben Zeilen und dieselben
#: Folds haben, sonst vergleicht ein Lauf auf ihm nichts mehr mit einem Lauf auf dem Original.
#: `split-pin.json` gehoert dazu, weil der Riegel in `train`/`run_eval` an der EXISTENZ der Datei
#: haengt: fehlt sie beim Zwilling, schweigt er und der Lauf misst still den ersetzten Val.
COPIED = ("manifest.jsonl", "dataset.yaml", "split.json", "split-pin.json")


def bake_pack(src: str, dst: str, params: dict, paths: config.Paths = config.DATA,
              force: bool = False) -> dict:
    """`src`s Pack durch CLAHE gedreht, als eigener Datensatz `dst`.

    Gebacken wird in der Groesse, in der der Pack liegt. Ob das die Groesse ist, in der der Lauf
    trainiert, kann hier niemand wissen — `skip_baked` prueft es beim Training.
    """
    from ..dataset_build import dataset_dir
    from .torch_data import _Clahe

    if params["clip"] <= 0:
        raise ValueError("nichts zu backen: clahe_clip ist 0 — der Pack waere eine reine Kopie")

    sd = dataset_dir(src, paths)
    src_img, src_meta_path = _packed_paths(sd)
    if not src_meta_path.exists():
        raise FileNotFoundError(f"{src} hat keinen Pack — erst `chesslab dataset pack {src}`")
    meta = json.loads(src_meta_path.read_text(encoding="utf-8"))
    if meta.get("packed_from"):
        raise ValueError(f"{src} leiht die Pixel von '{meta['packed_from']}' — backe den her")
    if meta.get("baked"):
        raise ValueError(f"{src} ist selbst schon gebacken ({meta['baked']}) — zweimal CLAHE "
                         "ist ein anderer Operator, kein schnellerer")

    n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])
    dd = dataset_dir(dst, paths)
    dst_img, dst_meta_path = _packed_paths(dd)
    if dst_meta_path.exists() and not force:
        raise FileExistsError(f"{dst} hat schon einen Pack — --force ueberschreibt ihn")
    dd.mkdir(parents=True, exist_ok=True)

    clahe = _Clahe(params["clip"], params["tile"], params["min_mean"],
                   params["max_mean"], params["denoise"])
    source = np.memmap(src_img, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    # Zuerst die Pixel, erst danach das Meta: ein abgebrochener Lauf laesst dann eine Datei ohne
    # Meta zurueck, und `load_packed` sieht "nicht gepackt" statt halb geschriebener Zeilen.
    dst_meta_path.unlink(missing_ok=True)
    out = np.memmap(dst_img, dtype=np.uint8, mode="w+", shape=(n, h, w, 3))
    started = time.time()
    # `_Clahe` gibt dasselbe Bild ZURUECK, wenn die Zelle ausserhalb des Helligkeitsbands liegt —
    # die Identitaet ist also die exakte Antwort auf "wie viele hat der Operator angefasst".
    touched = 0
    for start in range(0, n, CHUNK):
        block = np.array(source[start:start + CHUNK])
        for k, arr in enumerate(block):
            img = Image.fromarray(arr)
            done = clahe(img)
            touched += done is not img
            out[start + k] = np.asarray(done)
        print(f"[bake] {min(start + CHUNK, n)}/{n} Crops "
              f"({100.0 * min(start + CHUNK, n) / n:.1f} %)", flush=True)
    out.flush()
    del out, source

    for name in COPIED:
        if (sd / name).exists():
            shutil.copy2(sd / name, dd / name)
    folds = sorted(sd.glob("split-f*.json"))
    for fold in folds:
        shutil.copy2(fold, dd / fold.name)

    # `crop_fingerprint` bleibt: ein Re-Slice macht auch den gebackenen Pack ungueltig, und der
    # Wachhund in `_rewritten_since_pack` ist der einzige, der das merkt.
    new = dict(meta)
    new["baked"] = {"op": "clahe", **params, "from": src, "at": time.time()}
    write_json(dst_meta_path, new, indent=None)
    gb = n * h * w * 3 / 1e9
    print(f"[OK] {n} Crops gebacken -> {dst_img} ({gb:.1f} GB, {time.time() - started:.0f} s, "
          f"{touched} von CLAHE veraendert, {len(folds)} Folds mitkopiert)")
    return {"n": n, "h": h, "w": w, "gb": round(gb, 1), "changed": touched,
            "folds": len(folds), "path": str(dst_img)}
