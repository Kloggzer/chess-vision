import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, Crosshair, Copy, Undo2, Check, Loader2 } from "lucide-react";
import { api, post } from "../api";
import { Button } from "./ui";

/** Board geometry of one session: which rows have corners, and what can be adopted. */
type CornerState = {
  count: number; n_with: number; n_without: number; indices_without: number[];
  corner_names: string[]; frame_size: number[] | null;
  profile: { name: string; board_size: number; margin: number[]; marker_dict: string; white_pov: boolean };
  rows: { index: number; has_corners: boolean; source: string | null; from: number | null }[];
  adopt: { available: boolean; n_target: number; from_index?: number; n_same?: number; source_row_source?: string };
};
type Slot = { name: string; marker_id: number; point: number[] | null; measured: boolean; from_index: number | null; here: boolean };
type Seed = { index: number; frame_size: number[]; slots: Slot[]; found_here: number[]; missing: number[]; scanned: number[] };

type Pt = [number, number];

const pill = "rounded px-1.5 py-0.5 text-[10px]";

/** Placed corners drawn on the raw frame: measured markers (blue) and clicks (amber), in
 *  percent of the FRAME size — the same basis as the coordinates that get written. */
function Dots({ dots }: { dots: { p: Pt; label: string; measured: boolean; fs: number[] }[] }) {
  return (
    <>
      {dots.map((d, i) => (
        <span key={`${d.label}-${i}`}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-1 text-[10px] font-medium ${
                d.measured ? "border-sky-400 bg-sky-500/30 text-sky-200" : "border-amber-400 bg-amber-500/30 text-amber-100"}`}
              style={{ left: `${(d.p[0] / d.fs[0]) * 100}%`, top: `${(d.p[1] / d.fs[1]) * 100}%` }}>
          {d.label}
        </span>
      ))}
    </>
  );
}

/** Rows a session cannot slice at all: no corners, no crops. */
export function CornerBadge({ st }: { st: CornerState | undefined }) {
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
  const complete = pts.length >= need;

  /** Full-resolution points in the order the backend expects. */
  const quadPoints = (): Pt[] => {
    if (!seed) return pts;
    let k = 0;
    return seed.slots.map((s) => (s.measured ? (s.point as Pt) : (pts[k++] ?? [0, 0])));
  };
  const previewUrl = () => {
    const q = quadPoints();
    const fs = seed?.frame_size ?? st?.frame_size ?? [];
    return `/api/sessions/${enc}/corners/preview/${idx}?pts=${q.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(",")}`
      + `&rotate=${rotate}&normalize=${seed ? "false" : "true"}&fs=${fs.join(",")}`;
  };

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

  const dots = useMemo(() => {
    const fs = seed?.frame_size ?? st?.frame_size;
    if (!fs) return [];
    const out: { p: Pt; label: string; measured: boolean; fs: number[] }[] = [];
    seed?.slots.forEach((s) => {
      if (s.measured && s.point) out.push({ p: s.point as Pt, label: s.name, measured: true, fs });
    });
    pts.forEach((p, i) => out.push({
      p, label: seed ? missingNames[i] ?? "?" : String(i + 1), measured: false, fs,
    }));
    return out;
  }, [seed, st, pts, missingNames]);

  async function seedFromMarkers() {
    setBusy("seed"); setErr(""); setMsg("");
    try {
      const s = await api<Seed>(`/api/sessions/${enc}/corners/seed/${idx}`);
      setSeed(s); setPts([]); setRotate(0); setPlacing(true);
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
      setPts([]); setSeed(undefined); setPlacing(false);
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
        <Button onClick={() => { setPlacing(!placing); setPts([]); setSeed(undefined); }}
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
                <Dots dots={dots} />
              </button>
            </div>
            <div className="mt-1 text-[11px] text-zinc-600">
              Corners are stored as [a8, h8, h1, a1] in full-resolution pixels
              {st.frame_size ? ` (${st.frame_size[0]}×${st.frame_size[1]})` : ""}. The markers sit
              {" "}{(st.profile.margin[0] * 100).toFixed(0)}% outside the playing field
              (profile “{st.profile.name}”), so click where the ArUco marker centres are.
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">
              Preview — confirm here. White must be at the bottom (a1 is marked green).
            </div>
            {complete ? (
              <img src={previewUrl()} alt="corner preview"
                   className="max-h-[70vh] w-full rounded border border-zinc-800 object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded border border-dashed border-zinc-800 text-[11px] text-zinc-600">
                Place {need - pts.length} more point{need - pts.length === 1 ? "" : "s"} to see the preview.
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button variant="primary" onClick={() => write("frame", !!row?.has_corners)}
                      disabled={!complete || !!busy} className="px-2 py-1 text-xs disabled:opacity-40"
                      title={row?.has_corners
                        ? "This frame already has corners — applying replaces measured geometry."
                        : "Write these corners into this frame only."}>
                {spin("frame") ?? <Check className="h-3.5 w-3.5" />}
                Apply to this frame{row?.has_corners ? " (overwrite)" : ""}
              </Button>
              <Button onClick={() => write("missing")} disabled={!complete || !st.n_without || !!busy}
                      className="px-2 py-1 text-xs disabled:opacity-40"
                      title="Only legitimate when the board did not move during the session — a sweep shares one quad.">
                {spin("missing") ?? <Check className="h-3.5 w-3.5" />}
                Apply to {st.n_without} row{st.n_without === 1 ? "" : "s"} without corners
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
