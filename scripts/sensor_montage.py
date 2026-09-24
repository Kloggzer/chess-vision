"""Build reproducible review sheets for temporal candidates and quiet controls.

Each tile pairs the current crop with the exact 32px peer-median reference used
by the sensor. Pool membership is a sampling rule, never a human label.
"""
from __future__ import annotations

import argparse
import random
from pathlib import Path

import chess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from chesslab.ioutil import read_jsonl, write_json
from chesslab.labeling import _profile_for_session, crop_square
from chesslab.realgames.position import SETTLE_CELL_PX
from chesslab.session_store.log import read_log
from chesslab.session_store.paths import read_session_meta, session_dir


def choose(candidates, count, rng, used):
    candidates = list(candidates)
    rng.shuffle(candidates)
    selected = []
    for cell in candidates:
        if cell['frame'] in used:
            continue
        selected.append(cell)
        used.add(cell['frame'])
        if len(selected) == count:
            break
    return selected


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--audit', type=Path, required=True)
    ap.add_argument('--session', required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--seed', type=int, default=42)
    args = ap.parse_args()
    rec, _ = session_dir(args.session)
    profile = _profile_for_session(read_session_meta(rec), None)
    log = {Path(r['frame']).stem: r for r in read_log(rec)}
    cells = read_jsonl(args.audit)
    cells = [r for r in cells if r['session'] == rec.name and r['group'] == 'neither'
             and r['temporal_normalized'] is not None and r['reference_stock'] == 'boards']
    rng = random.Random(args.seed)
    used = set()
    suspects = []
    for lo, hi in ((.4, .6), (.6, .8), (.8, 1.), (1., float('inf'))):
        suspects += choose([r for r in cells if lo <= r['temporal_normalized'] < hi],
                           4, rng, used)
    controls = []
    for occupied in (True, False):
        pool = [r for r in cells if r['temporal_normalized'] <= .15
                and bool(chess.Board(log[r['frame']]['fen']).piece_at(
                    chess.parse_square(r['square']))) == occupied]
        controls += choose(pool, 8, rng, used)
    font_path = 'C:/Windows/Fonts/segoeui.ttf'
    font = ImageFont.truetype(font_path, 17)
    small = ImageFont.truetype(font_path, 14)
    title_font = ImageFont.truetype(font_path, 30)
    args.out.mkdir(parents=True, exist_ok=True)
    selection = {}
    for name, selected, title, subtitle, accent in (
        ('suspects', suspects, 'Pool A: auffällige Felder',
         'Sensorwert ab 0,40; Matte und Rillen melden nichts. Verdachtsfälle, keine Hand-Labels.',
         '#f2b45e'),
        ('controls', controls, 'Pool B: unauffällige Kontrollfelder',
         'Sensorwert bis 0,15; Matte und Rillen melden nichts. Nicht manuell als sauber bestätigt.',
         '#74c9ba'),
    ):
        width, tile_w, tile_h, header = 1440, 356, 232, 120
        height = header + ((len(selected) + 3) // 4) * tile_h + 50
        sheet = Image.new('RGB', (width, height), '#111820')
        draw = ImageDraw.Draw(sheet)
        draw.text((20, 13), title, font=title_font, fill=accent)
        draw.text((20, 57), subtitle, font=font, fill='#e0e7ed')
        draw.text((20, 86), f'Val-Session {rec.name} | Je Kachel: links Aufnahme, rechts Referenz | Seed {args.seed}',
                  font=small, fill='#a6b4c1')
        selection[name] = selected
        for i, cell in enumerate(selected):
            stem, square = cell['frame'], cell['square']
            row = log[stem]
            peers = [r for key, r in log.items() if key != stem and r.get('ply') == row['ply']
                     and r.get('fen') == row['fen'] and Path(r['board']).parent.name == 'boards']
            if len(peers) != cell['reference_peers']:
                raise ValueError(f'Reference changed since audit for {stem}')
            size = (SETTLE_CELL_PX, SETTLE_CELL_PX)
            reference = np.median(np.stack([
                crop_square(cv2.imread(str(rec / r['board'])), square, profile, size)
                for r in peers]), axis=0).astype(np.uint8)
            current = crop_square(cv2.imread(str(rec / row['board'])), square, profile, (160, 160))
            x, y = 12 + (i % 4) * tile_w, header + (i // 4) * tile_h
            draw.rounded_rectangle((x, y, x + tile_w - 8, y + tile_h - 8), radius=7, fill='#1d2833')
            draw.text((x + 8, y + 6), f'{stem} / {square}   Wert {cell["temporal_normalized"]:.2f}',
                      font=font, fill=accent)
            for offset, arr in ((8, current), (180, reference)):
                image = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB)).resize(
                    (160, 160), Image.Resampling.NEAREST)
                sheet.paste(image, (x + offset, y + 34))
            draw.text((x + 8, y + 200), 'Aufnahme', font=small, fill='#cbd5df')
            draw.text((x + 180, y + 200), 'Referenz (32 px)', font=small, fill='#cbd5df')
        draw.text((20, height - 32), f'{len(selected)} Felder aus verschiedenen Frames. '
                  'Die Stichprobe misst keine Trefferquote.', font=small, fill='#a6b4c1')
        output = args.out / f'{name}.png'
        sheet.save(output)
        print(f'{name}: {len(selected)} -> {output}')
    write_json(args.out / 'selection.json',
               {'seed': args.seed, 'audit': str(args.audit), 'pools': selection})
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
