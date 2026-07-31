import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, Crosshair, Copy, Undo2, Check, Loader2, Wand2, Gauge, SkipForward, ZoomIn, Images } from "lucide-react";
import { api, post } from "../api";
import { nudgeInRectified, rectifiedOffset } from "./homography";
import { Button } from "./ui";

/** Board geometry of one session: which rows have corners, and what can be adopted. */
type CornerState = {
  count: number; n_with: number; n_without: number; indices_without: number[];
  corner_names: string[]; frame_size: number[] | null;
  profile: { name: string; board_size: number; margin: number[]; marker_dict: string; white_pov: boolean };
  rows: { index: number; has_corners: boolean; corners: number[][] | null;
           align_worst_px: number | null; source: string | null; from: number | null }[];
  adopt: { available: boolean; n_target: number; from_index?: number; n_same?: number; source_row_source?: string };
};
type Slot = { name: string; marker_id: number; point: number[] | null; measured: boolean; from_index: number | null; here: boolean };
type Seed = { index: number; frame_size: number[]; slots: Slot[]; found_here: number[]; missing: number[]; scanned: number[] };

type Pt = [number, number];

const pill = "rounded px-1.5 py-0.5 text-[10px]";

/** Placed corners drawn on the raw frame: measured markers (blue) and clicks (amber), in
 *  percent of the FRAME size — the same basis as the coordinates that get written.
 *
 *  A dot with a `slot` is DRAGGABLE: it reports full-resolution frame pixels, the same unit the
 *  numeric fields and the backend use, so dragging and typing are the same edit. Dots stop their
 *  own pointer events, otherwise a drag would fall through to the place-a-corner click below. */
function Dots({ dots, onDrag }: {
  dots: { p: Pt; label: string; measured: boolean; fs: number[]; slot?: number }[];
  onDrag?: (slot: number, p: Pt) => void;
}) {
  return (
    <>
      {dots.map((d, i) => {
        const draggable = onDrag && d.slot != null;
        return (
          <span key={`${d.label}-${i}`}
                onPointerDown={!draggable ? undefined : (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const img = (e.currentTarget.parentElement as HTMLElement)
                    ?.querySelector("img") as HTMLImageElement | null;
                  if (!img?.naturalWidth) return;
                  const move = (ev: PointerEvent) => {
                    const r = img.getBoundingClientRect();
                    const x = ((ev.clientX - r.left) / r.width) * img.naturalWidth;
                    const y = ((ev.clientY - r.top) / r.height) * img.naturalHeight;
                    onDrag!(d.slot!, [Math.max(0, Math.min(img.naturalWidth, x)),
                                      Math.max(0, Math.min(img.naturalHeight, y))]);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-1 text-[10px] font-medium ${
                  draggable ? "cursor-grab touch-none active:cursor-grabbing" : "pointer-events-none"} ${
                  d.measured ? "border-sky-400 bg-sky-500/30 text-sky-200" : "border-amber-400 bg-amber-500/30 text-amber-100"}`}
                style={{ left: `${(d.p[0] / d.fs[0]) * 100}%`, top: `${(d.p[1] / d.fs[1]) * 100}%` }}>
            {d.label}
          </span>
        );
      })}
    </>
  );
}

/** Per-corner fine adjustment, expressed where the user is looking: the RECTIFIED board.
 *
 *  The stored quad is in original-frame pixels, but the picture being judged is the warp. Editing
 *  the stored numbers means nudging a crop around on an image you are not looking at, and watching
 *  the effect arrive transformed — and mirrored — in the one you are. So the fields here are
 *  offsets in rectified pixels with a single convention: **positive shows more of the board on
 *  that side**, negative crops it away. `nudgeInRectified` turns that back into frame pixels.
 */
function FineTune({ names, offsets, boardSize, onNudge, onReset, dirty }: {
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

/** Right-hand column of the hand-set panel: the rectified preview, the fine adjustment and the
 *  two apply buttons. Split out of `CornerEditor` so that component stays under the repo's
 *  cognitive-complexity gate — it is presentation only, every decision stays with the parent. */
function PreviewPanel({ complete, url, remaining, names, offsets, boardSize, onNudge, tuned, onReset,
                        hasCorners, nWithout, busy, spin, onWrite, requireEdit }: {
  complete: boolean; url: string; remaining: number; names: string[]; offsets: Pt[];
  boardSize: number; onNudge: (slot: number, dx: number, dy: number) => void; tuned: boolean;
  onReset: () => void; hasCorners: boolean; nWithout: number; busy: string; requireEdit?: boolean;
  spin: (k: string) => React.ReactNode;
  onWrite: (scope: "frame" | "missing" | "all", overwrite?: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-zinc-500">
        Preview — confirm here. White must be at the bottom (a1 is marked green).
      </div>
      {complete ? (
        <img src={url} alt="corner preview"
             className="max-h-[70vh] w-full rounded border border-zinc-800 object-contain" />
      ) : (
        <div className="flex h-40 items-center justify-center rounded border border-dashed border-zinc-800 text-[11px] text-zinc-600">
          Place {remaining} more point{remaining === 1 ? "" : "s"} to see the preview.
        </div>
      )}
      {complete && (
        <FineTune names={names} offsets={offsets} boardSize={boardSize} onNudge={onNudge}
                  dirty={tuned} onReset={onReset} />
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button variant="primary" onClick={() => onWrite("frame", hasCorners)}
                disabled={!complete || !!busy || (requireEdit && !tuned)}
                className="px-2 py-1 text-xs disabled:opacity-40"
                title={hasCorners
                  ? "This frame already has corners — applying replaces measured geometry."
                  : "Write these corners into this frame only."}>
          {spin("frame") ?? <Check className="h-3.5 w-3.5" />}
          Apply to this frame{hasCorners ? " (overwrite)" : ""}
        </Button>
        <Button onClick={() => onWrite("missing")} disabled={!complete || !nWithout || !!busy}
                className="px-2 py-1 text-xs disabled:opacity-40"
                title="Only legitimate when the board did not move during the session — a sweep shares one quad.">
          {spin("missing") ?? <Check className="h-3.5 w-3.5" />}
          Apply to {nWithout} row{nWithout === 1 ? "" : "s"} without corners
        </Button>
      </div>
    </div>
  );
}

/** The preview endpoint for one quad — pure string building, kept out of the component. */
function buildPreviewUrl(enc: string, idx: number, quad: Pt[], rotate: number,
                         seeded: boolean, fs: number[]): string {
  const pts = quad.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(",");
  return `/api/sessions/${enc}/corners/preview/${idx}?pts=${pts}`
    + `&rotate=${rotate}&normalize=${seeded ? "false" : "true"}&fs=${fs.join(",")}`;
}

type Dot = { p: Pt; label: string; measured: boolean; fs: number[]; slot?: number };

/** One overlay dot per corner SLOT, drawn at the tuned position.
 *
 *  Marker-measured corners get a slot too, because they are exactly what the fine adjustment is
 *  for — the markers are what sits a few pixels off. A corner the user has moved stops being
 *  drawn as "measured", so the colour says whether a number is still the detector's or now theirs.
 */
function overlayDots(seed: Seed | undefined, stFs: number[] | null, quad: Pt[],
                     nClicked: number, tune: (Pt | null)[]): Dot[] {
  const fs = seed?.frame_size ?? stFs;
  if (!fs) return [];
  if (seed) {
    return seed.slots.map((s, i) => ({
      p: quad[i], label: s.name, measured: s.measured && !tune[i], fs, slot: i,
    }));
  }
  return Array.from({ length: nClicked }, (_, i) => ({
    p: quad[i], label: String(i + 1), measured: false, fs, slot: i,
  }));
}

/** The alignment verdict strip: this frame's offset, how many frames are over tolerance, and a
 *  jump to the next one.
 *
 *  Reads `align_worst_px` off the rows, which the scan stores in `log.jsonl`. Measuring a frame
 *  costs a warp plus two Sobel passes — fine once, 40 s for a 534-frame session, so it is measured
 *  on demand and remembered rather than recomputed on every step. Without a scan the strip says so
 *  instead of showing a confident blank. */
function AlignBar({ rows, idx, maxOff, busy, onJump, onScan, zoom, onZoom }: {
  rows: CornerState["rows"]; idx: number; maxOff: number; busy: boolean;
  onJump?: (idx: number) => void; onScan: () => void; zoom: boolean; onZoom: () => void;
}) {
  const measured = rows.filter((r) => r.align_worst_px != null);
  const here = rows.find((r) => r.index === idx)?.align_worst_px ?? null;
  const over = measured.filter((r) => (r.align_worst_px as number) > maxOff);
  const next = over.find((r) => r.index > idx) ?? over[0];
  let tone = "bg-zinc-800 text-zinc-400";
  if (here != null) tone = here > maxOff ? "bg-red-900/70 text-red-200" : "bg-emerald-900/60 text-emerald-300";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className={`rounded px-1.5 py-0.5 text-[11px] ${tone}`}>
        {here == null ? "this frame: not measured" : `this frame: ${here.toFixed(1)} px worst square`}
      </span>
      {measured.length > 0 ? (
        <span className="text-[11px] text-zinc-500">
          {over.length} of {measured.length} frames over {maxOff} px
        </span>
      ) : (
        <span className="text-[11px] text-zinc-600">no alignment scan yet</span>
      )}
      <Button onClick={onZoom} className="px-1.5 py-0.5 text-[10px]"
              title="Show the worst square at 1:1 with the nominal grid — the only scale at which a few pixels are visible.">
        <ZoomIn className="h-3 w-3" /> {zoom ? "Hide zoom" : "Zoom"}
      </Button>
      <Button onClick={onScan} disabled={busy} className="px-1.5 py-0.5 text-[10px] disabled:opacity-40"
              title="Measure every frame's worst square offset once and store it in log.jsonl.">
        <Gauge className="h-3 w-3" /> {measured.length ? "Re-scan" : "Scan alignment"}
      </Button>
      {next && onJump && (
        <Button onClick={() => onJump(next.index)} className="px-1.5 py-0.5 text-[10px]"
                title="Step to the next frame over tolerance.">
          <SkipForward className="h-3 w-3" /> Next flagged (frame {next.index + 1})
        </Button>
      )}
    </div>
  );
}

/** The fine adjustment on its own, to sit directly under the ArUco-aligned frame.
 *
 *  Placed there rather than in the editor panel below because correcting a detection that is a few
 *  pixels off is the routine action, and routine actions should not need a scroll. It drives the
 *  SAME image the reviewer is already looking at — `previewUrl` is handed back to the parent while
 *  an edit is pending — so there is never a second, differently-cropped picture to reconcile.
 */
export function QuickTune({ sid, idx, corners, onPreview, onWritten, onJump,
                            maxOff, onMaxOff, zoom, onZoom }: {
  sid: string; idx: number; corners: number[][] | null | undefined;
  onPreview: (url: string | null) => void; onWritten: () => void;
  onJump?: (idx: number) => void;
  // Held by the PARENT: this component is keyed on session:frame so a pending edit cannot leak
  // into the next frame, which means every step remounts it. Anything the reviewer set once —
  // the tolerance, the zoom toggle — has to live outside or it resets on every "next flagged".
  maxOff: number; onMaxOff: (v: number) => void; zoom: boolean; onZoom: () => void;
}) {
  const [boardSize, setBoardSize] = useState(0);
  const [names, setNames] = useState<string[]>([]);
  const [rows, setRows] = useState<CornerState["rows"]>([]);
  const [tune, setTune] = useState<(Pt | null)[]>([null, null, null, null]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  // 0 = hidden. Any other value is the cache-buster stamped WHEN IT WAS OPENED: `corners_prev`
  // moves whenever a quad is replaced, so a cached picture would show a stale comparison —
  // and calling Date.now() in the render body is impure and lint-rejected.
  const [showFixed, setShowFixed] = useState(0);
  const enc = encodeURIComponent(sid);

  useEffect(() => {
    api<CornerState>(`/api/sessions/${enc}/corners`)
      .then((c) => { setBoardSize(c.profile.board_size); setNames(c.corner_names); setRows(c.rows); })
      .catch(() => {});
  }, [enc, idx]);

  const base = useMemo<Pt[]>(
    () => (corners ?? []).map((c) => [c[0], c[1]] as Pt), [corners]);
  const quad = base.map((p, i) => tune[i] ?? p);
  const dirty = tune.some(Boolean);

  // Hand the parent the URL of the tuned warp, so the aligned frame it already renders shows the
  // pending edit instead of the stored geometry. Cleared on unmount and on reset.
  useEffect(() => {
    onPreview(dirty && boardSize
      ? buildPreviewUrl(enc, idx, quad, 0, true, [])
      : null);
    return () => onPreview(null);
  }, [dirty, boardSize, JSON.stringify(quad)]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!base.length || !boardSize) return null;

  const nudge = (slot: number, dx: number, dy: number) =>
    setTune((t) => t.map((v, i) => (i === slot ? nudgeInRectified(base, boardSize, slot, dx, dy)[slot] : v)));
  const offsets = base.map((_, i) => rectifiedOffset(quad, base, boardSize, i));

  /** Ask the server for a corrected quad for THIS frame and load it as a pending edit, so it
   *  lands in the preview above like any hand adjustment instead of being written behind the
   *  reviewer's back. An empty `corners` means the fit would not improve this frame. */
  /** Measure every frame once and store it, so the badge and the flagged list cost nothing. */
  async function scanAlignment() {
    setBusy(true); setErr(""); setNote("");
    try {
      const r = await post(`/api/sessions/${enc}/corners/scan`, {});
      setNote(`Measured ${r.measured} of ${r.of} frames — median ${r.median} px, worst ${r.max} px. `
        + `Backup: ${r.backup}`);
      const c = await api<CornerState>(`/api/sessions/${enc}/corners`);
      setRows(c.rows);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  async function autofixFrame() {
    setBusy(true); setErr(""); setNote("");
    try {
      const r = await api<{ corners: number[][] | null; before: number | null; after: number | null }>(
        `/api/sessions/${enc}/corners/autofix/${idx}`);
      if (!r.corners) {
        const how = r.before != null ? ` — worst square is ${r.before} px off` : "";
        setNote(`Nothing to gain here${how}.`);
      } else {
        setTune(r.corners.map((c) => [c[0], c[1]] as Pt));
        setNote(`Auto-fit: worst square ${r.before} → ${r.after} px. Check above, then apply.`);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  /** Re-fit every frame of the session that is out of tolerance. Writes immediately — with a
   *  backup — because reviewing hundreds of frames one at a time is what this button exists to
   *  avoid. Frames within tolerance are left untouched by the server. */
  async function autofixSession() {
    if (!window.confirm(
      `Re-fit every frame whose worst square is more than ${maxOff} px off the grid?

` +
      "Frames within tolerance are left alone, a correction that does not improve its own frame " +
      "is discarded, and log.jsonl is backed up first. Re-slice afterwards.")) return;
    setBusy(true); setErr(""); setNote("");
    try {
      const r = await post(`/api/sessions/${enc}/corners/autofix`, { max_off: maxOff });
      setNote(r.changed
        ? `Corrected ${r.changed} of ${r.over_threshold} frames over ${maxOff} px `
          + `(${r.refused} refused, ${r.checked} checked). Backup: ${r.backup}. Re-slice the session.`
        : `Nothing changed — ${r.over_threshold} frame(s) over ${maxOff} px, none improvable.`);
      onWritten();
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
      setTune([null, null, null, null]); onPreview(null); onWritten();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  return (
    <div className="mt-1">
      <FineTune names={names} offsets={offsets} boardSize={boardSize} onNudge={nudge} dirty={dirty}
                onReset={() => setTune([null, null, null, null])} />
      <AlignBar rows={rows} idx={idx} maxOff={maxOff} busy={busy} onJump={onJump}
                onScan={scanAlignment} zoom={zoom} onZoom={onZoom} />
      {zoom && (
        <div className="mt-1">
          {/* 1:1, because an 8 px error on an 800 px board is invisible at display size — which is
              exactly how a sheared warp survived a whole session unnoticed. */}
          <img alt="alignment zoom"
               src={`/api/sessions/${enc}/corners/zoom/${idx}`
                 + (dirty ? `?pts=${quad.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(",")}` : "")}
               className="rounded border border-zinc-800" />
          <div className="mt-0.5 text-[10px] text-zinc-600">
            Worst square at 1:1. Green is where the crops get cut, the grooves are the board.
          </div>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <Button onClick={autofixFrame} disabled={busy} className="px-2 py-1 text-xs disabled:opacity-40"
                title="Measure this frame's real grid lines and fit the corners onto them. Shown as a pending edit first.">
          <Wand2 className="h-3.5 w-3.5" /> Auto-fix this frame
        </Button>
        <Button onClick={autofixSession} disabled={busy} className="px-2 py-1 text-xs disabled:opacity-40"
                title="Re-fit every frame of the session that is out of tolerance. Writes with a backup.">
          <Wand2 className="h-3.5 w-3.5" /> Auto-fix all outliers
        </Button>
        <Button onClick={() => setShowFixed((v) => (v ? 0 : Date.now()))} className="px-2 py-1 text-xs"
                title="Before/after for every frame whose corners were replaced, at 1:1.">
          <Images className="h-3.5 w-3.5" /> {showFixed ? "Hide corrected" : "Show corrected"}
        </Button>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          over
          <input type="number" step={1} min={1} value={maxOff}
                 onChange={(e) => onMaxOff(Math.max(1, Number(e.target.value) || 1))}
                 className="w-14 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-center text-[11px] text-zinc-200" />
          px
        </span>
      </div>
      {showFixed && (
        <div className="mt-1">
          {/* Rendered fresh every time it is opened: `corners_prev` moves whenever a quad is
              replaced, so a cached picture would show a comparison that no longer holds. */}
          <img alt="corrected frames, before and after"
               src={`/api/sessions/${enc}/corners/fixed?limit=6&v=${showFixed}`}
               className="max-h-[60vh] rounded border border-zinc-800" />
          <div className="mt-0.5 text-[10px] text-zinc-600">
            The frames whose corners were replaced, biggest gain first. Left the old quad, right
            the current one, both at 1:1 on that frame's worst square.
          </div>
        </div>
      )}
      {note && <div className="mt-1 rounded bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-300">{note}</div>}
      {dirty && (
        <div className="mt-1 flex items-center gap-2">
          <Button variant="primary" onClick={apply} disabled={busy}
                  className="px-2 py-1 text-xs disabled:opacity-40"
                  title="Overwrite this frame's corners with the adjusted quad.">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Apply to this frame
          </Button>
          <span className="text-[11px] text-zinc-500">The image above shows the pending edit.</span>
        </div>
      )}
      {err && <div className="mt-1 rounded bg-red-950/60 px-2 py-1 text-[11px] text-red-300">{err}</div>}
    </div>
  );
}

/** Rows a session cannot slice at all: no corners, no crops. */
function CornerBadge({ st }: { st: CornerState | undefined }) {
  if (!st) return null;
  if (!st.n_without) {
    const hand = st.rows.filter((r) => r.source === "hand" || r.source === "adopted").length;
    return (
      <span className={`${pill} bg-emerald-900/60 text-emerald-300`}>
        geometry complete{hand ? ` · ${hand} set by hand/adopted` : ""}
      </span>
    );
  }
  return (
    <span className={`${pill} bg-amber-900/60 text-amber-300`}>
      {st.n_without} of {st.count} frames without corners — not sliceable
    </span>
  );
}

/** The geometry repair panel under the review images.
 *
 *  Two actions, both labelled with the number of rows they change:
 *  "Adopt detected" (a quad this session already measured) and "Set by hand"
 *  (four clicks + rotate until the overlay reads right). Nothing is written before the
 *  preview has been seen. */
export default function CornerEditor({ sid, idx, onWritten }: {
  sid: string; idx: number; onWritten: () => void;
}) {
  const [st, setSt] = useState<CornerState | undefined>();
  const [seed, setSeed] = useState<Seed | undefined>();
  const [pts, setPts] = useState<Pt[]>([]);
  // Absolute per-corner override from the fine-adjustment UI; null = use the measured/clicked point.
  const [tune, setTune] = useState<(Pt | null)[]>([null, null, null, null]);
  const [rotate, setRotate] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const enc = encodeURIComponent(sid);

  const load = () => api<CornerState>(`/api/sessions/${enc}/corners`).then(setSt).catch(() => {});
  // The parent keys this component on session+frame, so a step to another frame REMOUNTS it:
  // placed points and a seed belong to one frame and must never leak into the next one.
  useEffect(() => { load(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const row = st?.rows.find((r) => r.index === idx);
  const missingNames = useMemo(
    () => (seed ? seed.slots.filter((s) => !s.measured).map((s) => s.name) : []), [seed]);
  // "a8, h8 (frame 2), h1" — measured corners, naming the frame a borrowed marker came from.
  const measuredList = (seed?.slots ?? [])
    .filter((s) => s.measured)
    .map((s) => (s.here ? s.name : `${s.name} (frame ${(s.from_index ?? 0) + 1})`))
    .join(", ");
  const need = seed ? missingNames.length : 4;
  const complete = (!placing && !!row?.corners) || pts.length >= need;

  /** Full-resolution points in the order the backend expects, BEFORE fine adjustment.
   *  Outside hand-set mode this is the quad already stored for the frame, so the fine adjustment
   *  is reachable on the ordinary preview — a detection that is a few pixels off is the common
   *  case, a frame with no geometry at all is the rare one. */
  const basePoints = (): Pt[] => {
    if (!placing && row?.corners) return row.corners.map((c) => [c[0], c[1]] as Pt);
    if (!seed) return pts;
    let k = 0;
    return seed.slots.map((s) => (s.measured ? (s.point as Pt) : (pts[k++] ?? [0, 0])));
  };
  /** …and after it. `tune` holds an absolute override per corner, so a corner the user has not
   *  touched keeps tracking its measured position instead of freezing at the moment of the first
   *  edit elsewhere. Everything downstream — preview and write — goes through here. */
  const quadPoints = (): Pt[] => basePoints().map((p, i) => tune[i] ?? p);
  const setCorner = (slot: number, p: Pt) =>
    setTune((t) => t.map((v, i) => (i === slot ? p : v)));
  /** An edit expressed in rectified pixels, applied to the UNTUNED quad so the field shows an
   *  absolute offset rather than accumulating with every keystroke. */
  const nudgeCorner = (slot: number, dx: number, dy: number) => {
    const bs = st?.profile.board_size ?? 800;
    setCorner(slot, nudgeInRectified(basePoints(), bs, slot, dx, dy)[slot]);
  };
  const rectOffsets = (): Pt[] => {
    const bs = st?.profile.board_size ?? 800;
    const q = quadPoints(); const b = basePoints();
    return b.map((_, i) => rectifiedOffset(q, b, bs, i));
  };
  const tuned = tune.some(Boolean);
  const blindNames = st?.profile ? ["1", "2", "3", "4"] : [];
  const cornerNames = seed ? seed.slots.map((s) => s.name) : blindNames;

  /** Click -> FULL-RESOLUTION frame pixels. The frame is 3072x4096 and the <img> is a few
   *  hundred px wide, so the scale factor is the whole game — the backend refuses coordinates
   *  that were measured against a different size. The image is rendered `w-full h-auto`
   *  (never `object-contain` with a height cap) so its box IS the drawn image: with
   *  letterboxing, `rect.width` would cover empty space and every click would be off. */
  function onClick(e: React.MouseEvent<HTMLElement>) {
    const im = imgRef.current;
    if (!im || !placing || !im.naturalWidth) return;
    const r = im.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * im.naturalWidth;
    const y = ((e.clientY - r.top) / r.height) * im.naturalHeight;
    setPts((p) => (p.length >= need ? p : [...p, [x, y] as Pt]));
  }

  const dots = useMemo(
    () => overlayDots(seed, st?.frame_size ?? null, quadPoints(), pts.length, tune),
    [seed, st, pts, tune],   // eslint-disable-line react-hooks/exhaustive-deps
  );

  async function seedFromMarkers() {
    setBusy("seed"); setErr(""); setMsg("");
    try {
      const s = await api<Seed>(`/api/sessions/${enc}/corners/seed/${idx}`);
      setSeed(s); setPts([]); setTune([null, null, null, null]); setRotate(0); setPlacing(true);
      setMsg(s.missing.length
        ? `${4 - s.missing.length} of 4 corners measured from markers — click the missing ${s.missing.map((m) => s.slots[m].name).join(", ")}.`
        : "All four corners measured from markers — check the preview and apply.");
    } catch (e: any) { setErr(e.message); }
    setBusy("");
  }

  async function write(scope: "frame" | "missing" | "all", overwrite = false) {
    setBusy(scope); setErr(""); setMsg("");
    try {
      const r = await post(`/api/sessions/${enc}/corners`, {
        // seeded points are already a8,h8,h1,a1 (marker ids); blind clicks get normalised
        points: quadPoints(), index: idx, rotate, normalize: !seed,
        scope, overwrite, frame_size: seed?.frame_size ?? st?.frame_size,
      });
      setMsg(`Wrote corners into ${r.changed} frame(s) [${r.indices.map((i: number) => i + 1).join(", ")}]`
        + ` as "${r.corners_source}". Backup: ${r.backup}`);
      setPts([]); setTune([null, null, null, null]); setSeed(undefined); setPlacing(false);
      await load(); onWritten();
    } catch (e: any) { setErr(e.message); }
    setBusy("");
  }

  async function adopt() {
    setBusy("adopt"); setErr(""); setMsg("");
    try {
      const r = await post(`/api/sessions/${enc}/corners/adopt`, { scope: "missing" });
      setMsg(`Adopted the quad measured in frame ${(r.from_index ?? 0) + 1} into ${r.changed} row(s)`
        + ` [${r.indices.map((i: number) => i + 1).join(", ")}]. Backup: ${r.backup}`);
      await load(); onWritten();
    } catch (e: any) { setErr(e.message); }
    setBusy("");
  }

  if (!st) return null;
  const spin = (k: string) => (busy === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null);

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="text-xs font-medium text-zinc-400">Board geometry</div>
        <CornerBadge st={st} />
        <span className="text-[11px] text-zinc-500">
          this frame: {row?.has_corners ? `corners present (${row.source})` : "no corners"}
          {row?.from != null ? ` from frame ${row.from + 1}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button onClick={adopt} disabled={!st.adopt.available || !st.n_without || !!busy}
                className="px-2 py-1 text-xs disabled:opacity-40"
                title={st.adopt.available
                  ? `Copy the quad that ${st.adopt.n_same} row(s) of this session already agree on (frame ${(st.adopt.from_index ?? 0) + 1}) into the rows that have none. Stays measured geometry.`
                  : "No row of this session has corners — nothing to adopt."}>
          {spin("adopt") ?? <Copy className="h-3.5 w-3.5" />}
          Adopt detected → {st.n_without} row{st.n_without === 1 ? "" : "s"}
        </Button>
        <Button onClick={() => { setPlacing(!placing); setPts([]); setTune([null, null, null, null]); setSeed(undefined); }}
                disabled={!!busy} className="px-2 py-1 text-xs disabled:opacity-40"
                title="Click the four board corners on the raw frame, then rotate until the overlay reads right.">
          <Crosshair className="h-3.5 w-3.5" /> {placing ? "Cancel hand-set" : "Set by hand"}
        </Button>
        {placing && (
          <>
            <Button onClick={seedFromMarkers} disabled={!!busy} className="px-2 py-1 text-xs disabled:opacity-40"
                    title="Take every corner whose ArUco marker IS detected (exact) and only ask for the missing ones.">
              {spin("seed") ?? <Crosshair className="h-3.5 w-3.5" />} Seed from markers
            </Button>
            <Button onClick={() => setPts((p) => p.slice(0, -1))} disabled={!pts.length || !!busy}
                    className="px-2 py-1 text-xs disabled:opacity-40">
              <Undo2 className="h-3.5 w-3.5" /> Undo point
            </Button>
            <Button onClick={() => setRotate((r) => (r + 1) % 4)} disabled={!complete || !!busy}
                    className="px-2 py-1 text-xs disabled:opacity-40"
                    title="Rotate the corner assignment by 90°. Press until White is at the bottom in the preview.">
              <RotateCw className="h-3.5 w-3.5" /> Rotate 90° ({rotate * 90}°)
            </Button>
          </>
        )}
      </div>

      {msg && <div className="mt-2 rounded bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-300">{msg}</div>}
      {err && <div className="mt-2 rounded bg-red-950/60 px-2 py-1 text-[11px] text-red-300">{err}</div>}

      {placing && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">
              {seed ? `Markers measured: ${measuredList || "none"}.`
                : "Click the four corners of the board in any order — the rotate button decides which one is a8."}
              {" "}Clicked {pts.length} / {need}.
            </div>
            {/* max-height on the SCROLL CONTAINER, never on the image: a height-capped
                object-contain image would letterbox and silently shift every click. */}
            <div className="max-h-[70vh] overflow-auto rounded border border-zinc-800">
              <button type="button" onClick={onClick} aria-label="Place a board corner"
                      className="relative block w-full cursor-crosshair">
                <img ref={imgRef} src={`/api/sessions/${enc}/frame/${idx}`}
                     alt="raw frame" className="block h-auto w-full" />
                <Dots dots={dots} onDrag={complete ? setCorner : undefined} />
              </button>
            </div>
            <div className="mt-1 text-[11px] text-zinc-600">
              Corners are stored as [a8, h8, h1, a1] in full-resolution pixels
              {st.frame_size ? ` (${st.frame_size[0]}×${st.frame_size[1]})` : ""}. The markers sit
              {" "}{(st.profile.margin[0] * 100).toFixed(0)}% outside the playing field
              (profile “{st.profile.name}”), so click where the ArUco marker centres are.
            </div>
          </div>
          <PreviewPanel
            complete={complete} url={buildPreviewUrl(enc, idx, quadPoints(), rotate, !!seed,
                                                     seed?.frame_size ?? st.frame_size ?? [])}
            remaining={need - pts.length} names={cornerNames}
            offsets={rectOffsets()} boardSize={st.profile.board_size} onNudge={nudgeCorner}
            tuned={tuned}
            onReset={() => setTune([null, null, null, null])}
            hasCorners={!!row?.has_corners} nWithout={st.n_without} busy={busy}
            spin={spin} onWrite={write} />
        </div>
      )}
    </div>
  );
}
