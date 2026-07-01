import { useEffect, useRef, useState } from "react";
import { Plug, Play, Square, Crop as CropIcon, RotateCcw } from "lucide-react";
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
    </div>
  );
}
