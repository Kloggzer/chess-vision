import { useEffect, useRef, useState } from "react";
import { Plug, Play, Square, Crop as CropIcon, RotateCcw, Wand2 } from "lucide-react";
import { api, post } from "../api";
import { Card, Button } from "./ui";

const input =
  "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

const PHONE = "https://192.168.178.23:4444/video/snapshot";

type Status = {
  open: boolean; source: string; frame_size: [number, number]; recording: boolean;
  out: string; crop: number[] | null; interval: number; count: number; quality: number;
  saved_run: number; total: number; index: number; error: string; default_source: string;
};

type Drag = { x0: number; y0: number; x1: number; y1: number } | null;

type Models = {
  scans: { dir: string; mesh: string | null; texture: string | null; photos: number }[];
  pieces: { piece: string; has_preview: boolean; has_clay: boolean; report: any }[];
};
type PrepStatus = {
  state: "idle" | "running" | "done" | "failed";
  piece: string | null; report?: any; level?: string; messages?: string[]; log_tail?: string;
};
type ReconStatus = {
  state: "idle" | "running" | "done" | "failed";
  dir: string | null; mesh?: string | null; log_tail?: string;
};

const PIECES = ["P", "N", "B", "R", "Q", "K", "wP", "wN", "wB", "wR", "wQ", "wK",
                "bP", "bN", "bB", "bR", "bQ", "bK"];

/** 3D-Modell-Vorbereitung: rekonstruierter Scan → renderfertige Figur (Blender headless). */
function PreparePanel() {
  const [models, setModels] = useState<Models | null>(null);
  const [dir, setDir] = useState("");
  const [piece, setPiece] = useState("P");
  const [tris, setTris] = useState(20000);
  const [smooth, setSmooth] = useState(10);
  const [prep, setPrep] = useState<PrepStatus | null>(null);
  const [recon, setRecon] = useState<ReconStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState<"textured" | "clay">("textured");   // Ansicht der Vorschau
  const [sel, setSel] = useState<string | null>(null);                        // ausgewählte Galerie-Figur
  const timer = useRef<any>(null);
  const reconTimer = useRef<any>(null);

  const refresh = () => api<Models>("/api/scan/models").then((m) => {
    setModels(m);
    if (!dir && m.scans.length) setDir(m.scans[0].dir);
  }).catch(() => {});
  useEffect(() => { refresh(); return () => { clearInterval(timer.current); clearInterval(reconTimer.current); }; }, []);

  const pollRecon = () => api<ReconStatus>("/api/scan/reconstruct/status").then((s) => {
    setRecon(s);
    if (s.state !== "running") { clearInterval(reconTimer.current); refresh(); }
  }).catch(() => {});
  async function reconstruct() {
    setMsg("");
    try {
      await post("/api/scan/reconstruct", { dir });
      setRecon({ state: "running", dir });
      clearInterval(reconTimer.current);
      reconTimer.current = setInterval(pollRecon, 3000);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }

  const pollPrep = () => api<PrepStatus>("/api/scan/prepare/status").then((s) => {
    setPrep(s);
    if (s.state !== "running") { clearInterval(timer.current); refresh(); }
  }).catch(() => {});

  async function run() {
    setMsg("");
    try {
      await post("/api/scan/prepare", { dir, piece, target_tris: tris, smooth_iters: smooth });
      setPrep({ state: "running", piece });
      clearInterval(timer.current);
      timer.current = setInterval(pollPrep, 2000);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }

  const rep = prep?.report;
  const cur = models?.scans.find((s) => s.dir === dir);
  const hasMesh = !!cur?.mesh;
  return (
    <Card title="Scan → 3D-Modell (rekonstruieren · isolieren · dezimieren · Qualität)">
      <div className="mb-3 flex flex-wrap items-end gap-3 border-b border-zinc-800 pb-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-400">Scan-Ordner
          <select value={dir} onChange={(e) => setDir(e.target.value)} className={input}>
            {(models?.scans ?? []).map((s) => (
              <option key={s.dir} value={s.dir}>
                {s.dir} · {s.photos} Fotos · {s.mesh ? "Mesh ✓" : "noch kein Mesh"}
              </option>
            ))}
          </select></label>
        <Button onClick={reconstruct} disabled={!dir || recon?.state === "running"}
          title="RealityScan headless: Fotos → 3D-Mesh + Textur">
          <Wand2 className="h-4 w-4" /> {recon?.state === "running" ? "RealityScan läuft…" : "1. Rekonstruieren"}</Button>
        <span className="text-xs text-zinc-500">
          {recon?.state === "running" && "● RealityScan rekonstruiert — dauert einige Minuten…"}
          {recon?.state === "done" && `✓ Mesh erstellt: ${recon.mesh ?? ""}`}
          {recon?.state === "failed" && "Rekonstruktion fehlgeschlagen (Log prüfen)"}
          {!recon && (hasMesh ? "Mesh vorhanden — direkt vorbereiten, oder neu rekonstruieren." : "erst rekonstruieren")}
        </span>
      </div>

      <div className="mb-1 text-xs text-zinc-500">2. Vorbereiten{!hasMesh && " (braucht ein Mesh)"}:</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-400">Figur
          <select value={piece} onChange={(e) => setPiece(e.target.value)} className={input}>
            {PIECES.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-sm text-zinc-400" title="Dreiecks-Ziel (Decimate). 0 = aus.">Ziel-Dreiecke
          <input type="number" value={tris} onChange={(e) => setTris(+e.target.value)} className={`${input} w-28`} /></label>
        <label className="flex flex-col gap-1 text-sm text-zinc-400" title="Laplacian-Glättung gegen Scan-Bumps. 10 mild, 25–40 stark, 0 = aus.">Glättung
          <input type="number" value={smooth} onChange={(e) => setSmooth(+e.target.value)} className={`${input} w-20`} /></label>
        <Button variant="primary" onClick={run} disabled={!dir || !hasMesh || prep?.state === "running"}>
          <Wand2 className="h-4 w-4" /> {prep?.state === "running" ? "läuft…" : "Vorbereiten"}</Button>
        <span className="text-xs text-zinc-500">{msg}</span>
      </div>

      {prep && prep.state !== "idle" && (
        <div className="mt-3 rounded-lg bg-zinc-800 p-3 text-sm">
          {prep.state === "running" && <span className="text-sky-400">● Blender arbeitet — dauert je nach Scan 1–5 min…</span>}
          {prep.state === "failed" && (
            <div className="text-red-400">Fehlgeschlagen.{prep.log_tail && <pre className="mt-1 whitespace-pre-wrap text-xs text-zinc-500">{prep.log_tail}</pre>}</div>
          )}
          {prep.state === "done" && rep && (
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <img src={`/api/scan/prepare/preview/${prep.piece}?variant=${variant}&t=${Date.now()}`}
                  className="w-48 rounded-lg border border-zinc-700 bg-zinc-900" />
                <VariantToggle value={variant} onChange={setVariant} />
              </div>
              <div className="space-y-1 text-xs text-zinc-400">
                <div className={prep.level === "ok" ? "text-green-500" : "text-amber-400"}>
                  {prep.level === "ok" ? "✓ Qualität OK" : "⚠ Prüfen:"}</div>
                {(prep.messages ?? []).map((m, i) => <div key={i}>• {m}</div>)}
                <div>{rep.tris_before} → {rep.tris_after} Dreiecke · offene Kanten: {rep.boundary_edges} · height_ratio: {rep.height_ratio}</div>
                <div className="text-zinc-500">gespeichert als synth_pieces/{prep.piece}.obj — bereit für „synth render".</div>
              </div>
            </div>
          )}
        </div>
      )}

      {!!models?.pieces?.length && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <div className="mb-2 text-xs text-zinc-500">Vorbereitete Figuren — anklicken für große Ansicht:</div>
          <div className="flex flex-wrap gap-2">
            {models.pieces.map((p) => (
              <button key={p.piece} onClick={() => setSel(sel === p.piece ? null : p.piece)}
                className={`rounded-lg border p-2 text-center transition ${
                  sel === p.piece ? "border-sky-500 bg-sky-500/10" : "border-zinc-800 hover:border-zinc-600"}`}>
                {p.has_preview
                  ? <img src={`/api/scan/prepare/preview/${p.piece}`} className="h-20 w-20 rounded object-contain bg-zinc-900" />
                  : <div className="grid h-20 w-20 place-items-center text-2xl text-zinc-600">{p.piece}</div>}
                <div className="mt-1 text-xs font-medium text-zinc-300">{p.piece}
                  {p.report && <span className="text-zinc-500"> · {p.report.tris_after}△</span>}</div>
              </button>
            ))}
          </div>

          {sel && (() => {
            const p = models.pieces.find((x) => x.piece === sel)!;
            return (
              <div className="mt-3 flex flex-wrap items-start gap-4 rounded-lg bg-zinc-800 p-3">
                <div>
                  <img src={`/api/scan/prepare/preview/${sel}?variant=${variant}`}
                    className="w-56 rounded-lg border border-zinc-700 bg-zinc-900" />
                  <VariantToggle value={variant} onChange={setVariant} clayDisabled={!p.has_clay} />
                </div>
                {p.report && (
                  <div className="space-y-1 text-xs text-zinc-400">
                    <div className="text-sm font-medium text-zinc-200">{sel}</div>
                    <div>{p.report.tris_after} Dreiecke · offene Kanten: {p.report.boundary_edges}</div>
                    <div>height_ratio: {p.report.height_ratio} · pattern_margin: {p.report.pattern_margin}</div>
                    <div className="text-zinc-500">synth_pieces/{sel}.obj</div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

/** Umschalter Textur ↔ Clay (Clay zeigt die reine Geometrie). */
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

export default function Scan() {
  const [source, setSource] = useState(PHONE);
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [out, setOut] = useState("pawn");
  const [interval, setIntervalS] = useState(0.8);
  const [count, setCount] = useState(80);
  const [quality, setQuality] = useState(92);
  const [st, setSt] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState<Drag>(null);          // aktives Ziehen (Anzeige-Pixel)
  const imgRef = useRef<HTMLImageElement>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    api<Status>("/api/scan/status").then((s) => {
      setSt(s);
      if (s.default_source) setSource(s.default_source);
      if (s.out) setOut(s.out);
    }).catch(() => {});
    return () => clearInterval(timer.current);
  }, []);

  const poll = () => api<Status>("/api/scan/status").then(setSt).catch(() => {});
  function startPolling() {
    clearInterval(timer.current);
    timer.current = setInterval(poll, 1000);
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
    setSt(s); clearInterval(timer.current);
  }

  // --- Crop mit der Maus im Live-Bild aufziehen (Anzeige-Pixel -> Full-Res) -------------------
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
    if (x1 - x0 < 10 || y1 - y0 < 10) return;              // versehentlicher Klick -> ignorieren
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

  const recording = st?.recording;
  const rect = drag && {
    left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1),
    width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0),
  };

  return (
    <div className="space-y-4">
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
              <img ref={imgRef} src="/api/scan/preview.mjpg" draggable={false}
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

      <PreparePanel />
    </div>
  );
}
