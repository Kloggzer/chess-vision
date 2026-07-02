import { useEffect, useRef, useState } from "react";
import {
  Plug, Play, Square, Crop as CropIcon, RotateCcw, Wand2, Boxes, Camera,
  Loader2, CheckCircle2, AlertTriangle, ChevronDown, Settings2,
} from "lucide-react";
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
const PIECE_NAMES: Record<string, string> = {
  P: "Bauer", N: "Springer", B: "Läufer", R: "Turm", Q: "Dame", K: "König",
};

/** Aus dem Ordnernamen einen kanonischen Figurnamen ableiten (wK, bN, P …) oder null. */
function suggestPiece(folder: string): string | null {
  const m = folder.match(/^([wb]?)([PNBRQK])$/i);
  if (!m) return null;
  const type = m[2].toUpperCase();
  return m[1] ? m[1].toLowerCase() + type : type;
}
function pieceLabel(p: string): string {
  const type = p.length === 2 ? p[1] : p[0];
  const col = p.length === 2 ? (p[0] === "w" ? "weiß " : "schwarz ") : "";
  return col + (PIECE_NAMES[type] ?? p);
}

type Scan = Models["scans"][number];
type Stage = "photos" | "mesh" | "done";
function scanStage(s: Scan, pieces: Models["pieces"]): { stage: Stage; piece: string | null } {
  const sug = suggestPiece(s.dir);
  const prepared = sug && pieces.find((p) => p.piece.toLowerCase() === sug.toLowerCase());
  if (prepared) return { stage: "done", piece: prepared.piece };
  if (s.mesh) return { stage: "mesh", piece: sug };
  return { stage: "photos", piece: sug };
}

/** Figuren-Werkstatt: Fotos → Mesh (RealityScan) → renderfertige Figur (Blender). */
function PreparePanel() {
  const [models, setModels] = useState<Models | null>(null);
  const [dir, setDir] = useState("");
  const [piece, setPiece] = useState("P");
  const [tris, setTris] = useState(20000);
  const [smooth, setSmooth] = useState(10);
  const [advanced, setAdvanced] = useState(false);
  const [prep, setPrep] = useState<PrepStatus | null>(null);
  const [recon, setRecon] = useState<ReconStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState<"textured" | "clay">("textured");   // Ansicht der Vorschau
  const timer = useRef<any>(null);
  const reconTimer = useRef<any>(null);

  const refresh = () => api<Models>("/api/scan/models").then((m) => {
    setModels(m);
    if (!dir && m.scans.length) selectScan(m.scans[0], m.pieces);
  }).catch(() => {});

  function selectScan(s: Scan, pieces = models?.pieces ?? []) {
    setDir(s.dir);
    const { piece: sug } = scanStage(s, pieces);
    setPiece(sug ?? "P");
  }

  const pollRecon = () => api<ReconStatus>("/api/scan/reconstruct/status").then((s) => {
    setRecon(s);
    if (s.state !== "running") { clearInterval(reconTimer.current); refresh(); }
  }).catch(() => {});
  const pollPrep2 = () => api<PrepStatus>("/api/scan/prepare/status").then((s) => {
    setPrep(s);
    if (s.state !== "running") { clearInterval(timer.current); refresh(); }
  }).catch(() => {});

  // Beim Öffnen des Tabs prüfen, ob im Hintergrund schon ein Job läuft (aus einer früheren
  // Sitzung / anderem Browser-Tab), und die Fortschrittsanzeige direkt fortsetzen.
  useEffect(() => {
    refresh();
    api<ReconStatus>("/api/scan/reconstruct/status").then((s) => {
      if (s.state === "running") {
        setRecon(s); if (s.dir) setDir(s.dir);
        reconTimer.current = setInterval(pollRecon, 3000);
      } else if (s.state !== "idle") { setRecon(s); }
    }).catch(() => {});
    api<PrepStatus>("/api/scan/prepare/status").then((s) => {
      if (s.state === "running") { setPrep(s); timer.current = setInterval(pollPrep2, 2000); }
    }).catch(() => {});
    return () => { clearInterval(timer.current); clearInterval(reconTimer.current); };
  }, []);
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

  const scans = models?.scans ?? [];
  const cur = scans.find((s) => s.dir === dir);
  const curInfo = cur ? scanStage(cur, models?.pieces ?? []) : null;
  const stage = curInfo?.stage;
  const busyRecon = recon?.state === "running" && recon.dir === dir;
  const busyPrep = prep?.state === "running";
  // aktive Stufe für den Stepper (1 Foto · 2 Mesh · 3 Figur)
  const step = stage === "done" ? 3 : stage === "mesh" ? 2 : 1;

  return (
    <Card title="Figuren-Werkstatt — Fotos → 3D-Figur">
      {/* Stepper: das mentale Modell der Pipeline */}
      <div className="mb-4 flex items-center gap-1 text-xs">
        {[[1, "Fotografieren", Camera], [2, "Rekonstruieren", Boxes], [3, "Vorbereiten", Wand2]].map(
          ([n, label, Icon]: any, i) => (
            <div key={n} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                step >= n ? "bg-sky-500/15 text-sky-300" : "bg-zinc-800 text-zinc-500"}`}>
                <Icon className="h-3.5 w-3.5" /> <span>{label}</span>
              </div>
              {i < 2 && <div className={`h-px w-4 ${step > n ? "bg-sky-500/40" : "bg-zinc-700"}`} />}
            </div>
          ))}
      </div>

      {scans.length === 0 && (
        <p className="text-sm text-zinc-500">Noch keine Scans. Nimm oben Fotos einer Figur auf —
          sie erscheinen dann hier als Karte.</p>
      )}

      {/* Figuren-Karten: eine pro Scan-Ordner, mit Stufe */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {scans.map((s) => {
          const info = scanStage(s, models?.pieces ?? []);
          const active = s.dir === dir;
          const badge = {
            photos: ["Nur Fotos", "bg-amber-500/15 text-amber-300"],
            mesh: ["Mesh bereit", "bg-sky-500/15 text-sky-300"],
            done: ["Fertig", "bg-green-500/15 text-green-300"],
          }[info.stage];
          const prep_ = info.piece && info.stage === "done";
          return (
            <button key={s.dir} onClick={() => selectScan(s)}
              className={`flex flex-col rounded-xl border p-2 text-left transition ${
                active ? "border-sky-500 bg-sky-500/5" : "border-zinc-800 hover:border-zinc-600"}`}>
              <div className="relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950">
                {prep_
                  ? <img src={`/api/scan/prepare/preview/${info.piece}`} className="h-full w-full object-contain" />
                  : <div className="grid h-full place-items-center text-zinc-700">
                      <Camera className="h-8 w-8" /></div>}
                <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge[1]}`}>
                  {badge[0]}</span>
              </div>
              <div className="text-sm font-medium text-zinc-200">{s.dir}</div>
              <div className="text-[11px] text-zinc-500">
                {s.photos} Fotos{info.piece ? ` · ${pieceLabel(info.piece)}` : ""}</div>
            </button>
          );
        })}
      </div>

      {/* Aktions-/Detail-Bereich für die ausgewählte Figur */}
      {cur && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-100">{cur.dir}</div>
              <div className="text-xs text-zinc-500">{cur.photos} Fotos
                {cur.mesh ? " · Mesh vorhanden" : " · noch kein Mesh"}
                {!cur.texture && cur.mesh ? " · ⚠ ohne Textur" : ""}</div>
            </div>
            {/* Die EINE passende Aktion für die aktuelle Stufe */}
            {stage === "photos" && (
              <Button variant="primary" onClick={reconstruct} disabled={busyRecon}>
                {busyRecon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
                {busyRecon ? "RealityScan läuft…" : "Rekonstruieren"}</Button>
            )}
            {stage !== "photos" && (
              <div className="flex items-center gap-2">
                <Button onClick={reconstruct} disabled={busyRecon} title="Mesh neu aus den Fotos berechnen">
                  {busyRecon ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Neu rekonstruieren</Button>
                <Button variant="primary" onClick={run} disabled={busyPrep}>
                  {busyPrep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {busyPrep ? "läuft…" : stage === "done" ? "Neu vorbereiten" : "Vorbereiten"}</Button>
              </div>
            )}
          </div>

          {/* Figurname + Einstellungen (nur relevant fürs Vorbereiten) */}
          {stage !== "photos" && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-400">Figur
                <select value={piece} onChange={(e) => setPiece(e.target.value)} className={input}>
                  {PIECES.map((p) => <option key={p} value={p}>{p} — {pieceLabel(p)}</option>)}
                </select></label>
              <button onClick={() => setAdvanced(!advanced)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                <Settings2 className="h-3.5 w-3.5" /> Einstellungen
                <ChevronDown className={`h-3 w-3 transition ${advanced ? "rotate-180" : ""}`} /></button>
              {advanced && (
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <label className="flex items-center gap-1" title="Dreiecks-Ziel (Decimate). 0 = aus.">
                    Ziel-△ <input type="number" value={tris} onChange={(e) => setTris(+e.target.value)}
                      className={`${input} w-24`} /></label>
                  <label className="flex items-center gap-1" title="Laplacian-Glättung gegen Bumps. 10 mild, 25–40 stark.">
                    Glättung <input type="number" value={smooth} onChange={(e) => setSmooth(+e.target.value)}
                      className={`${input} w-16`} /></label>
                </div>
              )}
              {msg && <span className="text-xs text-red-400">{msg}</span>}
            </div>
          )}

          {/* Live-Status der Rekonstruktion */}
          {busyRecon && (
            <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" /> RealityScan rekonstruiert aus {cur.photos} Fotos —
              das dauert einige Minuten…</div>
          )}
          {recon?.state === "failed" && recon.dir === dir && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Rekonstruktion fehlgeschlagen.</div>
              {recon.log_tail && <pre className="mt-1 whitespace-pre-wrap text-xs text-red-400/70">{recon.log_tail}</pre>}</div>
          )}

          {/* Live-Status / Ergebnis der Vorbereitung */}
          {busyPrep && (
            <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Blender isoliert & bereinigt die Figur — ca. 1–3 min…</div>
          )}
          {prep?.state === "failed" && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Vorbereitung fehlgeschlagen.</div>
              {prep.log_tail && <pre className="mt-1 whitespace-pre-wrap text-xs text-red-400/70">{prep.log_tail}</pre>}</div>
          )}
          <PieceResult piece={curInfo?.stage === "done" ? curInfo.piece : (prep?.state === "done" ? prep.piece : null)}
            report={prep?.state === "done" ? prep.report : models?.pieces.find((p) => p.piece === curInfo?.piece)?.report}
            level={prep?.state === "done" ? prep.level : undefined}
            messages={prep?.state === "done" ? prep.messages : undefined}
            hasClay={!!models?.pieces.find((p) => p.piece === (prep?.piece ?? curInfo?.piece))?.has_clay}
            variant={variant} setVariant={setVariant} />
        </div>
      )}
    </Card>
  );
}

/** Ergebnis-Ansicht einer fertigen Figur: großes Preview (Textur/Clay) + Qualität. */
function PieceResult({ piece, report, level, messages, hasClay, variant, setVariant }: {
  piece: string | null; report: any; level?: string; messages?: string[];
  hasClay: boolean; variant: "textured" | "clay"; setVariant: (v: "textured" | "clay") => void;
}) {
  if (!piece) return null;
  return (
    <div className="mt-3 flex flex-wrap items-start gap-4 rounded-lg bg-zinc-800/60 p-3">
      <div>
        <img src={`/api/scan/prepare/preview/${piece}?variant=${variant}&t=${report?.tris_after ?? ""}`}
          className="w-56 rounded-lg border border-zinc-700 bg-zinc-950" />
        <VariantToggle value={variant} onChange={setVariant} clayDisabled={!hasClay} />
      </div>
      {report && (
        <div className="space-y-1.5 text-xs text-zinc-400">
          {level && (
            <div className={`flex items-center gap-1.5 text-sm ${level === "ok" ? "text-green-400" : "text-amber-400"}`}>
              {level === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {level === "ok" ? "Qualität OK" : "Bitte prüfen"}</div>
          )}
          {(messages ?? []).map((m, i) => <div key={i} className="text-amber-300/90">• {m}</div>)}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1">
            <span className="text-zinc-500">Dreiecke</span><span>{report.tris_after}</span>
            <span className="text-zinc-500">offene Kanten</span><span>{report.boundary_edges}</span>
            <span className="text-zinc-500">Höhe/Basis</span><span>{report.height_ratio}</span>
            <span className="text-zinc-500">Muster-Rand</span><span>{report.pattern_margin}</span>
          </div>
          <div className="pt-1 text-zinc-500">→ synth_pieces/{piece}.obj · bereit für „synth render"</div>
        </div>
      )}
    </div>
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
