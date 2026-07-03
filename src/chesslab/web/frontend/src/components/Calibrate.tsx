import { useEffect, useRef, useState } from "react";
import { Camera, CircleSlash, Save, Printer, CheckCircle2 } from "lucide-react";
import { api, post } from "../api";
import { Card, Button } from "./ui";

export default function Calibrate() {
  const [profile, setProfile] = useState("default");
  const [boardSize, setBoardSize] = useState(800);
  const [cam, setCam] = useState(0);
  const [margin, setMargin] = useState(0.06);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<any>({ markers_found: false });
  const [markerUrl, setMarkerUrl] = useState("");
  const [msg, setMsg] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => () => { stop(); }, []);

  function start() {
    setStreaming(true);
    clearInterval(timer.current);
    timer.current = setInterval(() => api("/api/camera/status").then(setStatus).catch(() => { /* ignore */ }), 1000);
  }
  async function stop() {
    setStreaming(false);
    clearInterval(timer.current);
    try { await post("/api/camera/release"); } catch { /* ignore */ }
  }
  function changeMargin(v: number) {
    setMargin(v);
    post("/api/calibrate/margin", { margin: v }).catch(() => {});
  }
  async function save() {
    try {
      const r = await post("/api/calibrate/save", { profile, board_size: boardSize, margin, camera: cam });
      setMsg(`Gespeichert: Profil „${r.profile}" (margin ${r.margin.toFixed(3)}) ✓`);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }
  async function makeMarkers() {
    const r = await post("/api/calibrate/markers");
    setMarkerUrl(r.url + "?t=" + Date.now());
  }

  const inputCls = "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">Profil
            <input value={profile} onChange={(e) => setProfile(e.target.value)} className={`${inputCls} w-28`} /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Kamera
            <input type="number" value={cam} onChange={(e) => setCam(+e.target.value)} className={`${inputCls} w-16`} /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Board px
            <input type="number" value={boardSize} onChange={(e) => setBoardSize(+e.target.value)} className={`${inputCls} w-24`} /></label>
          {!streaming
            ? <Button variant="primary" onClick={start}><Camera className="h-4 w-4" /> Kamera starten</Button>
            : <Button onClick={stop}><CircleSlash className="h-4 w-4" /> Stop</Button>}
          <Button onClick={makeMarkers}><Printer className="h-4 w-4" /> Marker erzeugen</Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card title="Live-Kamera">
          {streaming
            ? <img src={`/api/camera/calibrate.mjpg?camera=${cam}&board_size=${boardSize}`}
                className="w-full rounded-lg border border-zinc-800" />
            : <div className="flex h-72 items-center justify-center text-zinc-500">Kamera nicht gestartet</div>}
        </Card>

        <Card title="Spielfeld-Box justieren">
          <div className="space-y-3">
            {status.markers_found
              ? <span className="flex items-center gap-1.5 text-green-500"><CheckCircle2 className="h-4 w-4" /> {status.markers_count}/4 Marker erkannt{status.markers_held ? ` (${status.markers_held} gehalten)` : ""}</span>
              : <span className="flex items-center gap-1.5 text-amber-400"><CircleSlash className="h-4 w-4" /> {status.markers_count || 0}/4 Marker — alle 4 nötig (kurz die Hand wegnehmen)</span>}
            <input type="range" min={0} max={0.2} step={0.005} value={margin} disabled={!streaming}
              onChange={(e) => changeMargin(+e.target.value)} className="w-full accent-sky-500" />
            <div className="text-sm text-zinc-400">margin = <b className="text-zinc-100 tabular-nums">{margin.toFixed(3)}</b></div>
            <p className="text-xs text-zinc-500">🟧 Marker-Box außen · 🟩 grüne Box = Spielfeld. Schieber so einstellen, dass die grüne Box auf dem echten Karofeld liegt.</p>
            <Button variant="primary" onClick={save} disabled={!streaming || !status.markers_found}>
              <Save className="h-4 w-4" /> Kalibrierung speichern
            </Button>
            <div className="text-xs text-zinc-500">{msg}</div>
          </div>
        </Card>
      </div>

      {markerUrl && (
        <Card title="Marker-Blatt — drucken, an den Boxen schneiden, an die 4 Außenecken kleben">
          <img src={markerUrl} className="max-w-md rounded-lg border border-zinc-800 bg-white p-2" />
        </Card>
      )}
    </div>
  );
}
