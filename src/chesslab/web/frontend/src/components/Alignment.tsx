import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check, ChevronDown, ChevronRight, Gauge, Images, Loader2, SkipForward, SlidersHorizontal,
  Undo2, Wand2, ZoomIn,
} from "lucide-react";
import { api, post } from "../api";
import { buildPreviewUrl, cornersKey, ptsParam, useCorners, type CornerRow } from "./corners";
import { nudgeInRectified, rectifiedOffset, type Pt } from "./homography";
import { Button } from "./ui";

/*  Two levels, deliberately kept apart — mixing them is what made this panel a wall of controls.
 *
 *  `SessionAlign` is about the SESSION: how many frames are out of tolerance, which ones, the
 *  tolerance itself, measuring them all, correcting them all. It sits above the review images,
 *  is keyed on the session, and its flagged list stays open while the reviewer walks it.
 *
 *  `QuickTune` is about the FRAME on screen: its offset, a zoom into its worst square, a fit of
 *  its own corners, a nudge of them. It sits directly under the picture it corrects and is keyed
 *  on `session:frame`, so a pending edit can never leak into the next frame.
 */

const numField = "w-14 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-center "
  + "text-[11px] text-zinc-200";
const chevron = (open: boolean) =>
  (open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />);

/** Per-corner fine adjustment, expressed where the user is looking: the RECTIFIED board.
 *
 *  The stored quad is in original-frame pixels, but the picture being judged is the warp. Editing
 *  the stored numbers means nudging a crop around on an image you are not looking at, and watching
 *  the effect arrive transformed — and mirrored — in the one you are. So the fields here are
 *  offsets in rectified pixels with a single convention: **positive shows more of the board on
 *  that side**, negative crops it away. `nudgeInRectified` turns that back into frame pixels.
 */
export function FineTune({ names, offsets, boardSize, onNudge, onReset, dirty }: {
  names: string[]; offsets: Pt[]; boardSize: number;
  onNudge: (slot: number, dx: number, dy: number) => void; onReset: () => void; dirty: boolean;
}) {
  const cell = "w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-center "
    + "text-[11px] text-zinc-200";
  return (
    <div className="mt-2 rounded border border-zinc-800 bg-zinc-950/50 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">
          Fine adjustment — rectified pixels, <span className="text-zinc-300">+ shows more</span>
        </span>
        <Button onClick={onReset} disabled={!dirty} className="px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                title="Back to the measured/clicked corners.">
          <Undo2 className="h-3 w-3" /> Reset
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {offsets.map((o, i) => (
          <div key={names[i] ?? i} className="flex items-center gap-1">
            <span className="w-6 text-[11px] font-medium text-zinc-400">{names[i] ?? i}</span>
            {([0, 1] as const).map((axis) => (
              <span key={axis} className="flex items-center gap-0.5">
                <span className="text-[10px] text-zinc-600">{axis ? "vert" : "horiz"}</span>
                <input type="number" step={1} className={cell} value={Math.round(o[axis])}
                       onChange={(e) => {
                         const v = Number(e.target.value);
                         if (!Number.isFinite(v)) return;
                         onNudge(i, axis ? o[0] : v, axis ? v : o[1]);
                       }} />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-zinc-600">
        Or drag a dot on the frame. One unit is one pixel of the {boardSize}px rectified board, so
        {" "}{Math.round(boardSize / 8)}px is a whole square.
      </div>
    </div>
  );
}

/** Green under tolerance, red over it, grey when nobody has measured — this frame's headline
 *  number, so it never moves behind a disclosure. */
function OffsetBadge({ px, maxOff }: { px: number | null; maxOff: number }) {
  let tone = "bg-zinc-800 text-zinc-400";
  if (px != null) tone = px > maxOff ? "bg-red-900/70 text-red-200" : "bg-emerald-900/60 text-emerald-300";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] ${tone}`}
          title="The worst square's distance from the nominal grid, in rectified pixels.">
      {px == null ? "offset not measured" : `${px.toFixed(1)} px worst square`}
    </span>
  );
}

/** One flagged frame: what is wrong with it, and a click that goes there. */
function FlagChip({ row, current, onJump }: {
  row: CornerRow; current: boolean; onJump: (idx: number) => void;
}) {
  const broken = !row.has_corners;
  const tone = broken ? "bg-amber-950/70 text-amber-300 hover:bg-amber-900/70"
                      : "bg-red-950/70 text-red-300 hover:bg-red-900/70";
  return (
    <button type="button" onClick={() => onJump(row.index)}
            title={broken ? "No corners — this frame cannot be sliced." : "Jump to this frame."}
            className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums transition ${tone} ${
              current ? "ring-1 ring-sky-400" : ""}`}>
      <span className="text-zinc-400">#</span>{row.index + 1}
      <span className="ml-1 opacity-80">
        {broken ? "no corners" : `${(row.align_worst_px as number).toFixed(1)} px`}
      </span>
    </button>
  );
}

/** Every frame that needs a look, as a list rather than a "next" button pressed N times.
 *
 *  Frames with no corners at all come first — they cannot be sliced, which outranks being a few
 *  pixels crooked — then the ones over tolerance, worst first. `align_worst_px` is already on
 *  every row after a scan, so this costs no extra request. */
function FlaggedList({ missing, over, idx, onJump }: {
  missing: CornerRow[]; over: CornerRow[]; idx: number; onJump: (idx: number) => void;
}) {
  if (!missing.length && !over.length) {
    return (
      <div className="mt-2 rounded border border-dashed border-zinc-800 px-2 py-3 text-center text-[11px] text-zinc-600">
        Nothing flagged — every measured frame is within tolerance and every frame has corners.
      </div>
    );
  }
  return (
    <div className="mt-2 max-h-56 overflow-auto rounded border border-zinc-800 bg-zinc-950/60 p-1.5">
      <div className="flex flex-wrap gap-1">
        {missing.map((r) => <FlagChip key={`m${r.index}`} row={r} current={r.index === idx} onJump={onJump} />)}
        {over.map((r) => <FlagChip key={`o${r.index}`} row={r} current={r.index === idx} onJump={onJump} />)}
      </div>
    </div>
  );
}

/** The two numbers a reviewer reads constantly, plus the tolerance that defines them. Always
 *  visible; everything that ACTS on them is one disclosure away. */
function AlignSummary({ nOver, nMeasured, nMissing, maxOff, onMaxOff }: {
  nOver: number; nMeasured: number; nMissing: number; maxOff: number; onMaxOff: (v: number) => void;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-zinc-500">
      {nMeasured
        ? <><span className="font-medium text-zinc-200 tabular-nums">{nOver}</span> of {nMeasured} frames over</>
        : <span className="text-zinc-600">no scan yet — tolerance</span>}
      <input type="number" step={1} min={1} value={maxOff} aria-label="tolerance in pixels"
             onChange={(e) => onMaxOff(Math.max(1, Number(e.target.value) || 1))}
             className={numField} />
      px
      {nMissing > 0 && <span className="text-amber-400">· {nMissing} without corners</span>}
    </span>
  );
}

/** Before/after for every frame whose corners were replaced. Rendered fresh every time it is
 *  opened: `corners_prev` moves whenever a quad is replaced, so a cached picture would show a
 *  comparison that no longer holds. */
function FixedMontage({ enc, stamp }: { enc: string; stamp: number }) {
  return (
    <div className="mt-2">
      <img alt="corrected frames, before and after"
           src={`/api/sessions/${enc}/corners/fixed?limit=6&v=${stamp}`}
           className="max-h-[60vh] rounded border border-zinc-800" />
      <div className="mt-0.5 text-[10px] text-zinc-600">
        The frames whose corners were replaced, biggest gain first. Left the old quad, right
        the current one, both at 1:1 on that frame's worst square.
      </div>
    </div>
  );
}

function Notes({ note, err }: { note: string; err: string }) {
  return (
    <>
      {note && <div className="mt-2 rounded bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-300">{note}</div>}
      {err && <div className="mt-2 rounded bg-red-950/60 px-2 py-1 text-[11px] text-red-300">{err}</div>}
    </>
  );
}

/** SESSION-level alignment: the verdict over all frames, the list of the ones that fail it, and
 *  the two operations that touch the whole session.
 *
 *  Keyed on the session only, so stepping through frames neither remounts it nor closes the list
 *  the reviewer is working through. Measuring a frame costs a warp plus two Sobel passes — fine
 *  once, 40 s for a 534-frame session — so it is measured on demand and remembered in `log.jsonl`
 *  rather than recomputed on every step.
 */
export function SessionAlign({ sid, idx, maxOff, onMaxOff, onJump, open, onOpen, onWritten }: {
  sid: string; idx: number; maxOff: number; onMaxOff: (v: number) => void;
  onJump: (idx: number) => void; open: boolean; onOpen: () => void; onWritten: () => void;
}) {
  const qc = useQueryClient();
  const { data: st } = useCorners(sid);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  // 0 = hidden. Any other value is the cache-buster stamped WHEN IT WAS OPENED — and calling
  // Date.now() in the render body is impure and lint-rejected.
  const [showFixed, setShowFixed] = useState(0);
  const enc = encodeURIComponent(sid);

  const rows = st?.rows ?? [];
  const measured = rows.filter((r) => r.align_worst_px != null);
  const over = measured
    .filter((r) => (r.align_worst_px as number) > maxOff)
    .sort((a, b) => (b.align_worst_px as number) - (a.align_worst_px as number));
  const missing = rows.filter((r) => !r.has_corners);
  const flagged = missing.length + over.length;
  const next = over.find((r) => r.index > idx) ?? over[0];

  const reload = () => qc.invalidateQueries({ queryKey: cornersKey(sid) });

  /** Measure every frame once and store it, so the badge and the flagged list cost nothing. */
  async function scanAlignment() {
    setBusy(true); setErr(""); setNote("");
    try {
      const r = await post(`/api/sessions/${enc}/corners/scan`, {});
      setNote(`Measured ${r.measured} of ${r.of} frames — median ${r.median} px, worst ${r.max} px. `
        + `Backup: ${r.backup}`);
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  /** Re-fit every frame of the session that is out of tolerance. Writes immediately — with a
   *  backup — because reviewing hundreds of frames one at a time is what this button exists to
   *  avoid. Frames within tolerance are left untouched by the server. */
  async function autofixSession() {
    if (!window.confirm(
      `Re-fit every frame whose worst square is more than ${maxOff} px off the grid?\n\n`
      + "Frames within tolerance are left alone, a correction that does not improve its own frame "
      + "is discarded, and log.jsonl is backed up first. Re-slice afterwards.")) return;
    setBusy(true); setErr(""); setNote("");
    try {
      const r = await post(`/api/sessions/${enc}/corners/autofix`, { max_off: maxOff });
      setNote(r.changed
        ? `Corrected ${r.changed} of ${r.over_threshold} frames over ${maxOff} px `
          + `(${r.refused} refused, ${r.checked} checked). Backup: ${r.backup}. Re-slice the session.`
        : `Nothing changed — ${r.over_threshold} frame(s) over ${maxOff} px, none improvable.`);
      await reload();
      onWritten();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  return (
    <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-400">Alignment</span>
        <AlignSummary nOver={over.length} nMeasured={measured.length} nMissing={missing.length}
                      maxOff={maxOff} onMaxOff={onMaxOff} />
        <Button onClick={onOpen} className="px-1.5 py-0.5 text-[10px]"
                title="List every frame that is out of tolerance or has no corners at all.">
          {chevron(open)} Flagged frames ({flagged})
        </Button>
        {next && (
          <Button onClick={() => onJump(next.index)} className="px-1.5 py-0.5 text-[10px]"
                  title="Step to the next frame over tolerance.">
            <SkipForward className="h-3 w-3" /> Next flagged (#{next.index + 1})
          </Button>
        )}
        <Button onClick={scanAlignment} disabled={busy} className="px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                title="Measure every frame's worst square offset once and store it in log.jsonl.">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gauge className="h-3 w-3" />}
          {measured.length ? "Re-scan" : "Scan alignment"}
        </Button>
      </div>

      {open && (
        <>
          <FlaggedList missing={missing} over={over} idx={idx} onJump={onJump} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-zinc-800 pt-2">
            <span className="text-[10px] uppercase tracking-wide text-zinc-600">whole session</span>
            <Button onClick={autofixSession} disabled={busy} className="px-2 py-0.5 text-[11px] disabled:opacity-40"
                    title="Re-fit every frame of the session that is out of tolerance. Writes with a backup.">
              <Wand2 className="h-3 w-3" /> Auto-fix all outliers
            </Button>
            <Button onClick={() => setShowFixed((v) => (v ? 0 : Date.now()))} className="px-2 py-0.5 text-[11px]"
                    title="Before/after for every frame whose corners were replaced, at 1:1.">
              <Images className="h-3 w-3" /> {showFixed ? "Hide corrected" : "Show corrected"}
            </Button>
          </div>
          {!!showFixed && <FixedMontage enc={enc} stamp={showFixed} />}
        </>
      )}
      <Notes note={note} err={err} />
    </div>
  );
}

/** 1:1, because an 8 px error on an 800 px board is invisible at display size — which is exactly
 *  how a sheared warp survived a whole session unnoticed. Centred on the frame's WORST square by
 *  design: a clean corner of a broken board would be reassuring and wrong. */
function AlignZoom({ enc, idx, quad, dirty }: {
  enc: string; idx: number; quad: Pt[]; dirty: boolean;
}) {
  return (
    <div className="mt-1">
      <img alt="alignment zoom"
           src={`/api/sessions/${enc}/corners/zoom/${idx}` + (dirty ? `?pts=${ptsParam(quad)}` : "")}
           className="rounded border border-zinc-800" />
      <div className="mt-0.5 text-[10px] text-zinc-600">
        Worst square at 1:1. Green is where the crops get cut, the grooves are the board.
      </div>
    </div>
  );
}

/** FRAME-level alignment, directly under the picture it corrects: this frame's offset, a zoom, a
 *  fit of its own corners and the nudge fields.
 *
 *  Placed there rather than in the editor panel below because correcting a detection that is a few
 *  pixels off is the routine action, and routine actions should not need a scroll. It drives the
 *  SAME image the reviewer is already looking at — `buildPreviewUrl` is handed back to the parent
 *  while an edit is pending — so there is never a second, differently-cropped picture to reconcile.
 */
export function QuickTune({ sid, idx, corners, onPreview, onWritten, maxOff, adjust, onAdjust,
                            zoom, onZoom }: {
  sid: string; idx: number; corners: number[][] | null | undefined;
  onPreview: (url: string | null) => void; onWritten: () => void;
  // Held by the PARENT: this component is keyed on session:frame so a pending edit cannot leak
  // into the next frame, which means every step remounts it. Anything the reviewer set once — the
  // tolerance, the zoom toggle, whether the nudge fields are open — has to live outside or it
  // resets on every jump to a flagged frame.
  maxOff: number; adjust: boolean; onAdjust: () => void; zoom: boolean; onZoom: () => void;
}) {
  const qc = useQueryClient();
  const { data: st } = useCorners(sid);
  const [tune, setTune] = useState<(Pt | null)[]>([null, null, null, null]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const enc = encodeURIComponent(sid);

  const boardSize = st?.profile.board_size ?? 0;
  const base = (corners ?? []).map((c) => [c[0], c[1]] as Pt);
  const quad = base.map((p, i) => tune[i] ?? p);
  const dirty = tune.some(Boolean);
  const here = st?.rows.find((r) => r.index === idx)?.align_worst_px ?? null;

  // Hand the parent the URL of the tuned warp, so the aligned frame it already renders shows the
  // pending edit instead of the stored geometry. One picture, never two competing ones.
  const tunedUrl = dirty && boardSize ? buildPreviewUrl(enc, idx, quad, 0, true, []) : null;
  useEffect(() => {
    onPreview(tunedUrl);
    return () => onPreview(null);
  }, [tunedUrl, onPreview]);

  if (!base.length || !boardSize) return null;

  const names = st?.corner_names ?? [];
  const nudge = (slot: number, dx: number, dy: number) =>
    setTune((t) => t.map((v, i) => (i === slot ? nudgeInRectified(base, boardSize, slot, dx, dy)[slot] : v)));
  const offsets = base.map((_, i) => rectifiedOffset(quad, base, boardSize, i));

  /** Ask the server for a corrected quad for THIS frame and load it as a pending edit, so it
   *  lands in the preview above like any hand adjustment instead of being written behind the
   *  reviewer's back. An empty `corners` means the fit would not improve this frame. */
  async function autofixFrame() {
    setBusy(true); setErr(""); setNote("");
    try {
      const r = await api<{ corners: number[][] | null; before: number | null; after: number | null }>(
        `/api/sessions/${enc}/corners/autofix/${idx}`);
      if (r.corners) {
        setTune(r.corners.map((c) => [c[0], c[1]] as Pt));
        setNote(`Auto-fit: worst square ${r.before} → ${r.after} px. Check above, then apply.`);
      } else {
        const how = r.before != null ? ` — worst square is ${r.before} px off` : "";
        setNote(`Nothing to gain here${how}.`);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  async function apply() {
    setBusy(true); setErr("");
    try {
      await post(`/api/sessions/${enc}/corners`, {
        points: quad, index: idx, rotate: 0, normalize: false,
        scope: "frame", overwrite: true,
      });
      setTune([null, null, null, null]); onPreview(null);
      await qc.invalidateQueries({ queryKey: cornersKey(sid) });
      onWritten();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <OffsetBadge px={here} maxOff={maxOff} />
        <Button onClick={onZoom} className="px-1.5 py-0.5 text-[10px]"
                title="Show the worst square at 1:1 with the nominal grid — the only scale at which a few pixels are visible.">
          <ZoomIn className="h-3 w-3" /> {zoom ? "Hide zoom" : "Zoom"}
        </Button>
        <Button onClick={autofixFrame} disabled={busy} className="px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                title="Measure this frame's real grid lines and fit the corners onto them. Shown as a pending edit first.">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Auto-fix this frame
        </Button>
        <Button onClick={onAdjust} className="px-1.5 py-0.5 text-[10px]"
                title="Per-corner nudge in rectified pixels.">
          <SlidersHorizontal className="h-3 w-3" /> {chevron(adjust)} Adjust corners
        </Button>
      </div>
      {zoom && <AlignZoom enc={enc} idx={idx} quad={quad} dirty={dirty} />}
      {/* Forced open while an edit is pending: an auto-fit result the reviewer cannot see the
          numbers of is a change made behind their back. */}
      {(adjust || dirty) && (
        <FineTune names={names} offsets={offsets} boardSize={boardSize} onNudge={nudge} dirty={dirty}
                  onReset={() => setTune([null, null, null, null])} />
      )}
      {dirty && (
        <div className="mt-1.5 flex items-center gap-2">
          <Button variant="primary" onClick={apply} disabled={busy}
                  className="px-2 py-1 text-xs disabled:opacity-40"
                  title="Overwrite this frame's corners with the adjusted quad.">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Apply to this frame
          </Button>
          <span className="text-[11px] text-zinc-500">The image above shows the pending edit.</span>
        </div>
      )}
      <Notes note={note} err={err} />
    </div>
  );
}
