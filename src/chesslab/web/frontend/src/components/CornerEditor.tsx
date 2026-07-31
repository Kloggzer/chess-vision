import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RotateCw, Crosshair, Copy, Undo2, Check, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { api, post } from "../api";
import { FineTune } from "./Alignment";
import { buildPreviewUrl, cornersKey, useCorners, type CornerState } from "./corners";
import { nudgeInRectified, rectifiedOffset, type Pt } from "./homography";
import { Button } from "./ui";

type Slot = { name: string; marker_id: number; point: number[] | null; measured: boolean; from_index: number | null; here: boolean };
type Seed = { index: number; frame_size: number[]; slots: Slot[]; found_here: number[]; missing: number[]; scanned: number[] };

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
                    onDrag(d.slot as number, [Math.max(0, Math.min(img.naturalWidth, x)),
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

/** Right-hand column of the hand-set panel: the rectified preview, the fine adjustment and the
 *  two apply buttons. Split out of `CornerEditor` so that component stays under the repo's
 *  cognitive-complexity gate — it is presentation only, every decision stays with the parent. */
function PreviewPanel({ complete, url, remaining, names, offsets, boardSize, onNudge, tuned, onReset,
                        hasCorners, nWithout, busy, spin, onWrite }: {
  complete: boolean; url: string; remaining: number; names: string[]; offsets: Pt[];
  boardSize: number; onNudge: (slot: number, dx: number, dy: number) => void; tuned: boolean;
  onReset: () => void; hasCorners: boolean; nWithout: number; busy: string;
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
                disabled={!complete || !!busy}
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

/** Rows a session cannot slice at all: no corners, no crops. The one piece of this panel that
 *  stays visible when it is collapsed — it is a status, not an action. */
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

/** The hand-set flow: the RARE path, collapsed by default.
 *
 *  Two actions, both labelled with the number of rows they change: "Adopt detected" (a quad this
 *  session already measured) and "Set by hand" (four clicks + rotate until the overlay reads
 *  right). Nothing is written before the preview has been seen. Nudging a detection that is a few
 *  pixels off is NOT here — that is the routine action and lives under the aligned frame. */
export default function CornerEditor({ sid, idx, open, onOpen, onWritten }: {
  sid: string; idx: number; open: boolean; onOpen: () => void; onWritten: () => void;
}) {
  const qc = useQueryClient();
  const { data: st } = useCorners(sid);
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

  // The parent keys this component on session+frame, so a step to another frame REMOUNTS it:
  // placed points and a seed belong to one frame and must never leak into the next one.
  const row = st?.rows.find((r) => r.index === idx);
  const missingNames = useMemo(
    () => (seed ? seed.slots.filter((s) => !s.measured).map((s) => s.name) : []), [seed]);
  // "a8, h8 (frame 2), h1" — measured corners, naming the frame a borrowed marker came from.
  const measuredList = (seed?.slots ?? [])
    .filter((s) => s.measured)
    .map((s) => (s.here ? s.name : `${s.name} (frame ${(s.from_index ?? 0) + 1})`))
    .join(", ");
  const need = seed ? missingNames.length : 4;
  const complete = pts.length >= need;

  /** Full-resolution points in the order the backend expects, BEFORE fine adjustment. */
  const basePoints = (): Pt[] => {
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
  const cornerNames = seed ? seed.slots.map((s) => s.name) : ["1", "2", "3", "4"];
  const clear = () => { setPts([]); setTune([null, null, null, null]); setSeed(undefined); };

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

  const dots = overlayDots(seed, st?.frame_size ?? null, quadPoints(), pts.length, tune);

  async function seedFromMarkers() {
    setBusy("seed"); setErr(""); setMsg("");
    try {
      const s = await api<Seed>(`/api/sessions/${enc}/corners/seed/${idx}`);
      setSeed(s); setPts([]); setTune([null, null, null, null]); setRotate(0); setPlacing(true);
      setMsg(s.missing.length
        ? `${4 - s.missing.length} of 4 corners measured from markers — click the missing ${s.missing.map((m) => s.slots[m].name).join(", ")}.`
        : "All four corners measured from markers — check the preview and apply.");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
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
      clear(); setPlacing(false);
      await qc.invalidateQueries({ queryKey: cornersKey(sid) });
      onWritten();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy("");
  }

  async function adopt() {
    setBusy("adopt"); setErr(""); setMsg("");
    try {
      const r = await post(`/api/sessions/${enc}/corners/adopt`, { scope: "missing" });
      setMsg(`Adopted the quad measured in frame ${(r.from_index ?? 0) + 1} into ${r.changed} row(s)`
        + ` [${r.indices.map((i: number) => i + 1).join(", ")}]. Backup: ${r.backup}`);
      await qc.invalidateQueries({ queryKey: cornersKey(sid) });
      onWritten();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy("");
  }

  if (!st) return null;
  const spin = (k: string) => (busy === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null);

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onOpen} className="px-1.5 py-0.5 text-[10px]"
                title="Adopt a measured quad, or set the four corners by hand. Rarely needed.">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Board geometry
        </Button>
        <CornerBadge st={st} />
        <span className="text-[11px] text-zinc-500">
          this frame: {row?.has_corners ? `corners present (${row.source})` : "no corners"}
          {row?.from != null ? ` from frame ${row.from + 1}` : ""}
        </span>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button onClick={adopt} disabled={!st.adopt.available || !st.n_without || !!busy}
                  className="px-2 py-1 text-xs disabled:opacity-40"
                  title={st.adopt.available
                    ? `Copy the quad that ${st.adopt.n_same} row(s) of this session already agree on (frame ${(st.adopt.from_index ?? 0) + 1}) into the rows that have none. Stays measured geometry.`
                    : "No row of this session has corners — nothing to adopt."}>
            {spin("adopt") ?? <Copy className="h-3.5 w-3.5" />}
            Adopt detected → {st.n_without} row{st.n_without === 1 ? "" : "s"}
          </Button>
          <Button onClick={() => { setPlacing(!placing); clear(); }}
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
      )}

      {open && msg && <div className="mt-2 rounded bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-300">{msg}</div>}
      {open && err && <div className="mt-2 rounded bg-red-950/60 px-2 py-1 text-[11px] text-red-300">{err}</div>}

      {open && placing && (
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
