"""Audit sensor agreement; missing visibility is not a negative measurement.

--temporal adds a SAM-free image residual against OTHER boards/ frames of the same ply
and FEN. Scores are anomalies, not coverage; logs and labels are never modified.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np

from chesslab.grid_occlusion import hand_squares, missing_edges
from chesslab.labeling import (
    MATTE_DIRTY,
    SETTLE_SEEN_MIN,
    _profile_for_session,
    all_squares,
    crop_square,
    read_matte,
    read_session_meta,
    usable_board,
)
from chesslab.realgames.position import SETTLE_CELL_PX, SETTLE_MIN_FRAMES, cell_deviations
from chesslab.session_store.log import read_log
from chesslab.session_store.names import BOARD_DIR
from chesslab.session_store.paths import session_dir

GROUPS = ('both', 'matte_only', 'grooves_only', 'neither', 'matte_unknown')


def measured_deviation(dev, seen, seen_min=SETTLE_SEEN_MIN):
    """Zero visible pixels never constitute evidence of an unchanged square."""
    if dev is None or seen is None:
        return None, 'missing'
    if not math.isfinite(dev) or not math.isfinite(seen) or dev < 0 or not 0 <= seen <= 1:
        return None, 'invalid'
    if seen == 0 or seen < seen_min:
        return None, 'unseen'
    return float(dev), 'measured'


def temporal_residual(cells, reference, contrast_floor=8.0):
    """Unmasked, brightness-centred residual and residual / reference contrast.

    The contrast floor avoids amplifying noise on flat/dark squares. Wrong FEN,
    geometry and shadows can also cause residuals: this does not prove occlusion.
    """
    dev, _ = cell_deviations(cells, reference, np.ones(cells.shape[:3], bool))
    centred = reference - reference.mean(axis=(1, 2), keepdims=True)
    contrast = np.sqrt(np.mean(centred ** 2, axis=(1, 2, 3)))
    return dev, dev / np.maximum(contrast, contrast_floor)


def peer_reference(stack, target, minimum=SETTLE_MIN_FRAMES, eligible=None):
    """Exclude the scored frame; insufficient temporal evidence stays missing."""
    keep = np.ones(len(stack), bool) if eligible is None else np.array(eligible, dtype=bool)
    keep[target] = False
    peers = stack[keep]
    return np.median(peers, axis=0) if len(peers) >= minimum else None


def summary(values):
    if not values:
        return {'n': 0, 'median': None, 'p90': None}
    return {'n': len(values), 'median': float(np.median(values)),
            'p90': float(np.quantile(values, .9))}


def audit(rec, *, temporal=False, seen_min=SETTLE_SEEN_MIN, contrast_floor=8.0,
          reference_stock="boards", skipped=None):
    # `skipped` is the caller's counter: a generator that prints leaves nobody a silent
    # audit, and `temporal_flags.scan_session` writes JSON, not prose.
    profile = _profile_for_session(read_session_meta(rec), None)
    mattes = read_matte(rec)
    rows = read_log(rec)
    by_interval = defaultdict(list)
    skipped = Counter() if skipped is None else skipped
    for row in rows:
        if not usable_board(row, profile) or not row.get('board_straightened'):
            skipped['unsupported_geometry'] += 1
            continue
        by_interval[(row.get('ply'), row.get('fen'))].append(row)
    squares = all_squares()
    for interval, entries in by_interval.items():
        loaded = []
        for row in entries:
            board = cv2.imread(str(rec / row['board']))
            if board is None:
                skipped['unreadable_board'] += 1
                continue
            gray = cv2.cvtColor(board, cv2.COLOR_BGR2GRAY)
            grooves = hand_squares(missing_edges(
                gray, board_size=row['board_size'], pad=row['board_border'],
                white_pov=profile.white_pov,
            ))
            cells = None
            if temporal:
                cells = np.stack([crop_square(board, s, profile,
                                             (SETTLE_CELL_PX, SETTLE_CELL_PX))
                                  for s in squares]).astype(np.float32)
            loaded.append((row, grooves, cells))
        stack = np.stack([x[2] for x in loaded]) if temporal and loaded else None
        eligible = [reference_stock == "all" or Path(x[0]['board']).parent.name == BOARD_DIR
                    for x in loaded]
        for index, (row, grooves, cells) in enumerate(loaded):
            stem = Path(row['frame']).stem
            cover = mattes.get(stem, {})
            ds, ss = row.get('settle_dev') or [], row.get('settle_seen') or []
            raw = norm = reference = None
            if temporal and interval[0] is not None and interval[1]:
                reference = peer_reference(stack, index, eligible=eligible)
                if reference is not None:
                    raw, norm = temporal_residual(cells, reference, contrast_floor)
            for i, square in enumerate(squares):
                d, s = ds[i] if i < len(ds) else None, ss[i] if i < len(ss) else None
                value, status = measured_deviation(d, s, seen_min)
                coverage = cover.get(square)
                covered = coverage > MATTE_DIRTY if coverage is not None else None
                g = square in grooves
                group = ('matte_unknown' if covered is None else 'both' if g and covered
                         else 'grooves_only' if g else 'matte_only' if covered else 'neither')
                yield {'session': rec.name, 'frame': stem, 'ply': row.get('ply'),
                       'square': square, 'group': group, 'coverage': coverage,
                       'grooves': g,
                       'settle_dev': d if d is not None and math.isfinite(d) else None,
                       'settle_seen': s if s is not None and math.isfinite(s) else None,
                       'settle_status': status, 'settle_valid': value,
                       'temporal_raw': float(raw[i]) if raw is not None else None,
                       'temporal_normalized': float(norm[i]) if norm is not None else None,
                       'reference_stock': reference_stock,
                       'reference_peers': sum(eligible) - int(eligible[index])
                       if reference is not None else 0}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--session', required=True, help='Canonical session ID (rg- for recordings).')
    ap.add_argument('--seen-min', type=float, default=SETTLE_SEEN_MIN)
    ap.add_argument('--temporal', action='store_true')
    ap.add_argument('--contrast-floor', type=float, default=8.0)
    ap.add_argument('--reference-stock', choices=('boards', 'all'), default='boards',
                    help='Use export-selected boards/ peers, or all peers for a sensitivity check.')
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    if not 0 <= args.seen_min <= 1 or not math.isfinite(args.contrast_floor) or args.contrast_floor <= 0:
        ap.error('seen-min must be in [0, 1]; contrast-floor must be finite and positive')
    rec, _ = session_dir(args.session)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    groups = defaultdict(list)
    with args.out.open('w', encoding='utf-8') as output:
        skipped = Counter()
        for cell in audit(rec, temporal=args.temporal, seen_min=args.seen_min,
                          contrast_floor=args.contrast_floor,
                          reference_stock=args.reference_stock, skipped=skipped):
            output.write(json.dumps(cell, allow_nan=False) + '\n')
            groups[cell['group']].append(cell)
    print('Skipped frames:', dict(skipped), flush=True)
    for group in GROUPS:
        cells = groups[group]
        print(group, 'total', len(cells), 'settle status',
              dict(Counter(c['settle_status'] for c in cells)))
        for metric in ('settle_valid', 'temporal_raw', 'temporal_normalized'):
            print(' ', metric, summary([c[metric] for c in cells if c[metric] is not None]))
    print('Agreement is not accuracy. Temporal scores are experimental; no labels changed.')
    print(args.out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
