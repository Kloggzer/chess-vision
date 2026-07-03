import { useEffect, useRef, useState } from "react";
import {
  Plug, Play, Square, Crop as CropIcon, RotateCcw, Wand2, Camera,
  Loader2, CheckCircle2, AlertTriangle, Trash2, Box, Image as ImageIcon, Maximize2,
  Upload,
} from "lucide-react";
import { api, post, del } from "../api";
import { Card, Button } from "./ui";
import { ModelViewer } from "./ModelViewer";

const input =
  "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

const PHONE = "https://192.168.178.23:4444/video/snapshot";

type Status = {
  open: boolean; source: string; frame_size: [number, number]; recording: boolean;
  out: string; crop: number[] | null; interval: number; count: number; quality: number;
  saved_run: number; total: number; index: number; error: string; default_source: string;
};

type Drag = { x0: number; y0: number; x1: number; y1: number } | null;

type Piece = {
  piece: string; source_dir: string | null; has_preview: boolean; has_clay: boolean; report: any;
};
type Models = {
  scans: { dir: string; mesh: string | null; texture: string | null; photos: number; clean?: boolean }[];
  pieces: Piece[];
  jobs?: { prepare?: string | null };
};
type PrepStatus = {
  state: "idle" | "running" | "done" | "failed";
  piece: string | null; dir?: string | null; report?: any; level?: string; messages?: string[]; log_tail?: string;
};

const PIECES = ["P", "N", "B", "R", "Q", "K", "wP", "wN", "wB", "wR", "wQ", "wK",
                "bP", "bN", "bB", "bR", "bQ", "bK"];
const PIECE_NAMES: Record<string, string> = {
  P: "Bauer", N: "Springer", B: "Läufer", R: "Turm", Q: "Dame", K: "König",
};

function suggestPiece(folder: string): string | null {
  const m = folder.match(/^([wb]?)([PNBRQK])$/i);
  if (!m) return null;
  const type = m[2].toUpperCase();
  return m[1] ? m[1].toLowerCase() + type : type;
}
function pieceLabel(p: string): string {
  const type = p.length === 2 ? p[1] : p[0];
  let col = "";
  if (p.length === 2) {
    col = p[0] === "w" ? "weiß " : "schwarz ";
  }
  return col + (PIECE_NAMES[type] ?? p);
}

type Scan = Models["scans"][number];
type Stage = "mesh" | "done";
function scanStage(s: Scan, pieces: Piece[]): { stage: Stage; piece: string | null } {
  const sug = suggestPiece(s.dir);
  const prepared = pieces.find((p) => p.source_dir === s.dir)
    ?? (sug ? pieces.find((p) => p.piece.toLowerCase() === sug.toLowerCase() && !p.source_dir) : undefined);
  if (prepared) return { stage: "done", piece: prepared.piece };
  if (s.mesh) return { stage: "mesh", piece: sug };
  return { stage: "mesh", piece: sug };
}

/** Figuren-Werkstatt: Upload → vorbereiten → renderfertige Figur. */
export default function Scan() {
  // --- Photo-Capture State ---
  const [source, setSource] = useState(PHONE);
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [out, setOut] = useState("pawn");
  const [interval, setIntervalS] = useState(0.8);
  const [count, setCount] = useState(80);
  const [quality, setQuality] = useState(92);
  const [st, setSt] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState<Drag>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pollTimer = useRef<any>(null);

  // --- Werkstatt State ---
  const [models, setModels] = useState<Models | null>(null);
  const [dir, setDir] = useState("");
  const [piece, setPiece] = useState("P");
  const [prep, setPrep] = useState<PrepStatus | null>(null);
  const [variant, setVariant] = useState<"textured" | "clay">("textured");
  const [view3d, setView3d] = useState<string | null>(null);
  const [meshFile, setMeshFile] = useState<File | null>(null);
  const [texFile, setTexFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const prepTimer = useRef<any>(null);

  // --- Photo-Capture Effects ---
  useEffect(() => {
    api<Status>("/api/scan/status").then((s) => {
      setSt(s);
      if (s.default_source) setSource(s.default_source);
      if (s.out) setOut(s.out);
    }).catch(() => {});
    return () => clearInterval(pollTimer.current);
  }, []);

  const poll = () => api<Status>("/api/scan/status").then(setSt).catch(() => {});
  function startPolling() {
    clearInterval(pollTimer.current);
    pollTimer.current = setInterval(poll, 1000);
  }

  async function connect() {
    setMsg("");
    try {
      const s = await post<Status>("/api/scan/open", { source, width, height });
      setSt(s);
      startPolling();
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }
  async function disconnect() {
    const s = await post<Status>("/api/scan/close");
    setSt(s); clearInterval(pollTimer.current);
  }

  function toDisplay(e: React.PointerEvent) {
    const r = imgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, r };
  }
  function onDown(e: React.PointerEvent) {
    if (!st?.open) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = toDisplay(e);
    setDrag({ x0: x, y0: y, x1: x, y1: y });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const { x, y } = toDisplay(e);
    setDrag({ ...drag, x1: x, y1: y });
  }
  async function onUp() {
    if (!drag || !st) return setDrag(null);
    const r = imgRef.current!.getBoundingClientRect();
    const [fw, fh] = st.frame_size;
    const sx = fw / r.width, sy = fh / r.height;
    const x0 = Math.round(Math.min(drag.x0, drag.x1) * sx);
    const y0 = Math.round(Math.min(drag.y0, drag.y1) * sy);
    const x1 = Math.round(Math.max(drag.x0, drag.x1) * sx);
    const y1 = Math.round(Math.max(drag.y0, drag.y1) * sy);
    setDrag(null);
    if (x1 - x0 < 10 || y1 - y0 < 10) return;
    setSt(await post<Status>("/api/scan/config", { crop: [x0, y0, x1, y1] }));
  }
  async function clearCrop() {
    setSt(await post<Status>("/api/scan/config", { crop: [] }));
  }

  async function pushConfig() {
    setSt(await post<Status>("/api/scan/config", { interval, count, quality, out }));
  }
  async function start() {
    setMsg("");
    try {
      await pushConfig();
      const s = await post<Status>("/api/scan/start", { out });
      setSt(s); startPolling();
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }
  const stop = async () => setSt(await post<Status>("/api/scan/stop"));

  // --- Werkstatt Logic ---
  const refresh = () => api<Models>("/api/scan/models").then((m) => {
    setModels(m);
    if (!dir && m.scans.length) selectScan(m.scans[0], m.pieces);
  }).catch(() => {});

  function selectScan(s: Scan, pieces = models?.pieces ?? []) {
    setDir(s.dir);
    const { piece: sug } = scanStage(s, pieces);
    setPiece(sug ?? "P");
  }

  async function deleteScan(d: string) {
    if (!confirm(`Scan „${d}" mit Mesh wirklich löschen?`)) return;
    await del(`/api/scan/scan/${d}`).catch(() => {});
    if (dir === d) setDir("");
    refresh();
  }
  async function deletePiece(p: string) {
    if (!confirm(`Vorbereitete Figur „${p}" löschen? (Der Scan bleibt erhalten.)`)) return;
    await del(`/api/scan/piece/${p}`).catch(() => {});
    setPrep(null);
    refresh();
  }

  async function doUpload() {
    if (!meshFile || !uploadName) return;
    setUploading(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("name", uploadName);
      form.append("mesh", meshFile);
      if (texFile) form.append("texture", texFile);
      const r = await fetch("/api/scan/upload", { method: "POST", body: form });
      if (!r.ok) throw new Error(((await r.json()) as any)?.detail || `HTTP ${r.status}`);
      await refresh();
      setDir(uploadName);
      setUploadName("");
      setMeshFile(null);
      setTexFile(null);
    } catch (e: any) { setMsg("Upload: " + e.message); }
    setUploading(false);
  }

  const pollPrep = () => api<PrepStatus>("/api/scan/prepare/status").then((s) => {
    setPrep(s);
    if (s.state !== "running") { clearInterval(prepTimer.current); refresh(); }
  }).catch(() => {});

  useEffect(() => {
    refresh();
    api<PrepStatus>("/api/scan/prepare/status").then((s) => {
      if (s.state === "running") { setPrep(s); prepTimer.current = setInterval(pollPrep, 2000); }
    }).catch(() => {});
    return () => { clearInterval(prepTimer.current); };
  }, []);

  async function run() {
    setMsg("");
    try {
      await post("/api/scan/prepare", { dir, piece });
      setPrep({ state: "running", piece });
      clearInterval(prepTimer.current);
      prepTimer.current = setInterval(pollPrep, 2000);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }

  // --- Derived ---
  const recording = st?.recording;
  const rect = drag && {
    left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1),
    width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0),
  };

  const scans = models?.scans ?? [];
  const cur = scans.find((s) => s.dir === dir);
  const curInfo = cur ? scanStage(cur, models?.pieces ?? []) : null;
  const stage = curInfo?.stage;
  const busyPrep = prep?.state === "running";
  const step = stage === "done" ? 2 : 1;
  let prepButtonLabel: string;
  if (busyPrep) { prepButtonLabel = "läuft…"; }
  else if (stage === "done") { prepButtonLabel = "Neu vorbereiten"; }
  else { prepButtonLabel = "Vorbereiten"; }
  let resultPiece: string | null;
  if (curInfo?.stage === "done") { resultPiece = curInfo.piece; }
  else if (prep?.state === "done") { resultPiece = prep.piece; }
  else { resultPiece = null; }

  return (
    <div className="space-y-4">
      {/* ── Photo-Capture Panel ── */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">Quelle
            <input value={source} onChange={(e) => setSource(e.target.value)} className={`${input} w-96`}
              placeholder="IP-Cam-URL oder USB-Index (0/1)" /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400" title="Nur für USB-Cam: angeforderte Auflösung (MJPG).">USB-Res
            <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)} className={`${input} w-20`} />×
            <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} className={`${input} w-20`} /></label>
          {!st?.open
            ? <Button variant="primary" onClick={connect}><Plug className="h-4 w-4" /> Verbinden</Button>
            : <Button onClick={disconnect}><Plug className="h-4 w-4" /> Trennen</Button>}
          <span className="text-xs text-zinc-500">{msg}{st?.error ? ` · ${st.error}` : ""}</span>
        </div>
      </Card>

      {st?.open && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card title="Live · Crop mit der Maus aufziehen">
            <div className="relative inline-block select-none leading-none">
              <img ref={imgRef} src="/api/scan/preview.mjpg" alt="Scan Vorschau" draggable={false}
                className="w-full rounded-lg border border-zinc-800" />
              <div className="absolute inset-0 cursor-crosshair"
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
                {rect && (
                  <div className="absolute border-2 border-sky-400 bg-sky-400/10"
                    style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span>Quelle {st.frame_size[0]}×{st.frame_size[1]}</span>
              <span>Crop: {st.crop ? st.crop.join(", ") : "—"}</span>
              <Button onClick={clearCrop} className="px-2 py-1 text-xs"><RotateCcw className="h-3 w-3" /> Crop zurücksetzen</Button>
            </div>
          </Card>

          <Card title="Aufnahme">
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2 text-sm text-zinc-400">Ziel-Ordner
                <input value={out} onChange={(e) => setOut(e.target.value)} className={`${input} w-40`} /></label>
              <label className="flex items-center justify-between gap-2 text-sm text-zinc-400" title="Sekunden zwischen zwei Fotos. Beim Handy ist ~0.8s das Limit (HTTPS-Fetch).">Intervall (s)
                <input type="number" step={0.1} min={0} value={interval} onChange={(e) => setIntervalS(+e.target.value)} className={`${input} w-24`} /></label>
              <label className="flex items-center justify-between gap-2 text-sm text-zinc-400" title="Fotos pro Aufnahme-Lauf. 0 = bis Stop.">Anzahl (0=∞)
                <input type="number" min={0} value={count} onChange={(e) => setCount(+e.target.value)} className={`${input} w-24`} /></label>
              <label className="flex items-center justify-between gap-2 text-sm text-zinc-400">JPEG-Qualität
                <input type="number" min={50} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} className={`${input} w-24`} /></label>

              <div className="flex flex-wrap gap-2 pt-1">
                {!recording
                  ? <Button variant="primary" onClick={start}><Play className="h-4 w-4" /> Aufnahme starten</Button>
                  : <Button onClick={stop}><Square className="h-4 w-4" /> Stop</Button>}
                <Button onClick={pushConfig} title="Intervall/Anzahl/Qualität übernehmen ohne Aufnahme"><CropIcon className="h-4 w-4" /> Übernehmen</Button>
              </div>

              <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                {recording
                  ? <span className="font-medium text-green-500">● Aufnahme läuft — {st.saved_run}{st.count ? ` / ${st.count}` : ""} Fotos</span>
                  : <span className="text-zinc-400">bereit</span>}
                <div className="mt-1 text-xs text-zinc-500">Im Ordner <b className="text-zinc-300">{st.out || out}</b>: {st.total} Fotos gesamt (nächste Nr. {st.index})</div>
              </div>
              <p className="text-xs text-zinc-500">
                Motor an, Handy/Cam <b>fest</b>, Hände weg. „Aufnahme starten" hängt an bestehende Fotos an
                (Ring 2/3 einfach neu positionieren + wieder starten).
              </p>
            </div>
          </Card>
        </div>
      )}

      {!st?.open && (
        <p className="text-xs text-zinc-500">
          Verbinde eine Quelle (Handy-IP-Cam-URL oder USB-Index), zieh im Live-Bild den <b>Crop</b> um Figur +
          Drehteller (statischer Hintergrund raus), stell <b>Intervall</b> und <b>Anzahl</b> ein und nimm auf.
          Die Fotos landen in <b>scans/&lt;Ordner&gt;</b> — bereit für RealityScan.
        </p>
      )}

      {/* ── Figuren-Werkstatt ── */}
      <Card title="Figuren-Werkstatt — 3D-Scan → Figur">
        {/* Stepper */}
        <div className="mb-4 flex items-center gap-1 text-xs">
          {[[1, "Upload", Upload], [2, "Vorbereiten", Wand2]].map(
            ([n, label, Icon]: any, i) => (
              <div key={n} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  step >= n ? "bg-sky-500/15 text-sky-300" : "bg-zinc-800 text-zinc-500"}`}>
                  <Icon className="h-3.5 w-3.5" /> <span>{label}</span>
                </div>
                {i < 1 && <div className={`h-px w-4 ${step > n ? "bg-sky-500/40" : "bg-zinc-700"}`} />}
              </div>
            ))}
        </div>

        {scans.length === 0 && (
          <p className="text-sm text-zinc-500">Noch keine Scans. Lade ein 3D-Modell (.obj/.glb) hoch —
            es erscheint dann hier als Karte.</p>
        )}

        <MeshUploadSection uploadName={uploadName} setUploadName={setUploadName}
          meshFile={meshFile} setMeshFile={setMeshFile} texFile={texFile} setTexFile={setTexFile}
          uploading={uploading} doUpload={doUpload} input={input} />

        <ScanCardGrid scans={scans} models={models} dir={dir} selectScan={selectScan} deleteScan={deleteScan}
          prep={prep} />

        {cur && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{cur.dir}</div>
                  <div className="text-xs text-zinc-500">
                    {cur.mesh ? "Mesh vorhanden" : "noch kein Mesh"}
                    {!cur.texture && cur.mesh ? " · ⚠ ohne Textur" : ""}</div>
                </div>
                <button onClick={() => deleteScan(cur.dir)} title="Scan löschen"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-4 w-4" /></button>
              </div>
              <Button variant="primary" onClick={run} disabled={busyPrep}>
                {busyPrep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {prepButtonLabel}</Button>
            </div>

            <ReconPrepStatus cur={cur} busyPrep={busyPrep} prep={prep} />
            {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}
          </div>
        )}

        {/* Fertige Figuren-Galerie */}
        <FinishedPiecesGrid pieces={models?.pieces} setView3d={setView3d} deletePiece={deletePiece}
          prep={prep} variant={variant} setVariant={setVariant} />
      </Card>

      {/* 3D-Vollbild */}
      {view3d && <ModelModal piece={view3d} textured={variant === "textured"} onClose={() => setView3d(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MeshUploadSection({ uploadName, setUploadName, meshFile, setMeshFile, texFile, setTexFile,
  uploading, doUpload, input }: any) {
  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">3D-Modell hochladen (.obj/.glb)</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Name
          <input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
            placeholder="z.B. wK" className={`${input} w-32`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Mesh (.obj/.glb)
          <input type="file" accept=".obj,.glb,.gltf" onChange={(e) => setMeshFile(e.target.files?.[0] ?? null)}
            className="text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Textur (optional)
          <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => setTexFile(e.target.files?.[0] ?? null)}
            className="text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200" />
        </label>
        <Button variant="primary" onClick={doUpload} disabled={uploading || !meshFile || !uploadName}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Hochladen
        </Button>
      </div>
    </div>
  );
}

function ScanCardGrid({ scans, models, dir, selectScan, deleteScan, prep }: {
  scans: Models["scans"]; models: Models | null; dir: string;
  selectScan: (s: Scan, pieces?: Piece[]) => void; deleteScan: (d: string) => void;
  prep: PrepStatus | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {scans.map((s) => {
        const info = scanStage(s, models?.pieces ?? []);
        const active = s.dir === dir;
        const jobPrep = (prep?.state === "running" && prep.dir === s.dir) || models?.jobs?.prepare === s.dir;
        const busy = jobPrep;
        const badge = busy
          ? ["wird vorbereitet…", "bg-sky-500/20 text-sky-300"]
          : ({
              mesh: ["Mesh bereit", "bg-sky-500/15 text-sky-300"],
              done: ["Fertig", "bg-green-500/15 text-green-300"],
            } as Record<string, [string, string]>)[info.stage];
        const prep_ = info.piece && info.stage === "done";

        return (
          <div key={s.dir} onClick={() => selectScan(s)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScan(s); } }}
            className={`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${
              active ? "border-sky-500 bg-sky-500/5" : "border-zinc-800 hover:border-zinc-600"}`}>
            <div className="relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950">
              {prep_
                ? <img src={`/api/scan/prepare/preview/${info.piece}`} alt={`${pieceLabel(info.piece!)} Vorschau`} className="h-full w-full object-contain" />
                : <div className="grid h-full place-items-center text-zinc-700"><Camera className="h-8 w-8" /></div>}
              <span className={`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge[1]}`}>
                {busy && <Loader2 className="h-3 w-3 animate-spin" />}{badge[0]}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteScan(s.dir); }}
                title="Scan-Ordner löschen"
                className="absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block">
                <Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="text-sm font-medium text-zinc-200">{s.dir}</div>
            <div className="text-[11px] text-zinc-500">
              {info.piece ? `${pieceLabel(info.piece)}` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function ModelModal({ piece, textured, onClose }: { piece: string; textured: boolean; onClose: () => void }) {
  const [tex, setTex] = useState(textured);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6">
      <div onClick={(e) => e.stopPropagation()} role="presentation"
        onKeyDown={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-3">
        <ModelViewer piece={piece} textured={tex} size={Math.min(720, window.innerHeight - 160)} />
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="font-medium">{piece}</span>
          <VariantToggle value={tex ? "textured" : "clay"} onChange={(v) => setTex(v === "textured")} />
          <span className="text-xs text-zinc-500">ziehen = drehen · Rad = zoomen · Esc = schließen</span>
        </div>
      </div>
    </div>
  );
}

function ReconPrepStatus({ cur, busyPrep, prep }: {
  cur: Scan; busyPrep: boolean; prep: PrepStatus | null;
}) {
  return (
    <>
      {busyPrep && (
        <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Figur wird vorbereitet — ca. 1–3 min…</div>
      )}
      {prep?.state === "failed" && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Vorbereitung fehlgeschlagen.</div>
          {prep.log_tail && <pre className="mt-1 whitespace-pre-wrap text-xs text-red-400/70">{prep.log_tail}</pre>}</div>
      )}
    </>
  );
}

function FinishedPiecesGrid({ pieces, setView3d, deletePiece, prep, variant, setVariant }: {
  pieces: Piece[] | undefined; setView3d: (p: string) => void; deletePiece: (p: string) => void;
  prep: PrepStatus | null; variant: "textured" | "clay"; setVariant: (v: "textured" | "clay") => void;
}) {
  if (!pieces?.length) return null;
  return (
    <div className="mt-4 border-t border-zinc-800 pt-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">Fertige Figuren (synth_pieces/)</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pieces.map((p) => {
          const busyThis = prep?.state === "running" && prep.piece === p.piece;
          return (
            <div key={p.piece}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
              <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950">
                {p.has_preview
                  ? <img src={`/api/scan/prepare/preview/${p.piece}${variant === "clay" ? "?variant=clay" : ""}`}
                    alt={`${pieceLabel(p.piece)}`} className="h-full w-full object-contain" />
                  : <div className="grid h-full place-items-center text-zinc-700"><ImageIcon className="h-8 w-8" /></div>}
                <button onClick={() => setView3d(p.piece)}
                  title="3D-Ansicht öffnen"
                  className="absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white">
                  <Maximize2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{pieceLabel(p.piece)}</span>
                {busyThis && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />}
              </div>
              <VariantToggle value={variant} onChange={setVariant} clayDisabled={!p.has_clay} />
              {p.report && (
                <ReportSection piece={p.piece} report={p.report} level={p.report?.level}
                  messages={p.report?.messages} onDelete={deletePiece} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportSection({ piece, report, level, messages, onDelete }: {
  piece: string; report: any; level: string | undefined; messages: string[] | undefined; onDelete: (p: string) => void;
}) {
  if (!report || !report.tris) return null;
  return (
    <div className="mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400">
      {level && (
        <div className={`mb-1 flex items-center gap-1 font-medium ${
          level === "ok" ? "text-green-400" : "text-amber-400"}`}>
          {level === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {level === "ok" ? "Qualität OK" : "Bitte prüfen"}</div>
      )}
      {(messages ?? []).map((m, i) => <div key={i} className="text-amber-300/90">• {m}</div>)}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1">
        <span className="text-zinc-500">Dreiecke</span><span>{report.tris}</span>
        <span className="text-zinc-500">offene Kanten</span><span>{report.boundary_edges}</span>
        <span className="text-zinc-500">Höhe/Basis</span><span>{report.height_ratio}</span>
      </div>
      <div className="pt-1 text-zinc-500">→ synth_pieces/{piece}.obj</div>
      <button onClick={() => onDelete(piece)}
        className="mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" /> Figur löschen</button>
    </div>
  );
}

function VariantToggle({ value, onChange, clayDisabled }: {
  value: "textured" | "clay"; onChange: (v: "textured" | "clay") => void; clayDisabled?: boolean;
}) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs">
      <button onClick={() => onChange("textured")}
        className={`px-3 py-1 ${value === "textured" ? "bg-sky-600 text-white" : "text-zinc-400 hover:bg-zinc-700"}`}>
        Textur</button>
      <button onClick={() => onChange("clay")} disabled={clayDisabled}
        title={clayDisabled ? "kein Clay-Bild (Figur vor diesem Update vorbereitet)" : "reine Geometrie"}
        className={`px-3 py-1 ${value === "clay" ? "bg-sky-600 text-white" : "text-zinc-400 hover:bg-zinc-700"} ${
          clayDisabled ? "cursor-not-allowed opacity-40" : ""}`}>
        Clay</button>
    </div>
  );
}
