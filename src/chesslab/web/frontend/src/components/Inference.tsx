import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanEye, Camera as Cam, CircleSlash, CameraIcon } from "lucide-react";
import { api, post } from "../api";
import { Card, Button, Select } from "./ui";

const input = "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

export default function Inference() {
  const runsQ = useQuery({ queryKey: ["runs"], queryFn: () => api("/api/runs") });
  const runs: any[] = runsQ.data ?? [];
  const [run, setRun] = useState("");
  const [profile, setProfile] = useState("default");
  const [cam, setCam] = useState(0);
  const [active, setActive] = useState(false);
  const [state, setState] = useState<any>({});
  const [msg, setMsg] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => { if (runs.length && !run) setRun(runs[runs.length - 1].run); }, [runs]);
  useEffect(() => () => { clearInterval(timer.current); if (active) post("/api/camera/release").catch(() => {}); }, []);

  async function start() {
    setMsg("");
    try {
      await post("/api/inference/start", { run, profile, camera: cam });
      setActive(true);
      clearInterval(timer.current);
      timer.current = setInterval(() => api("/api/inference/state").then(setState).catch(() => {}), 1000);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }
  async function stop() {
    setActive(false); clearInterval(timer.current);
    try { await post("/api/camera/release"); } catch {}
  }
  async function capture() {
    try {
      const r = await post("/api/inference/capture");
      setMsg(`Snapshot gespeichert: ${r.crops} Crops (Session ${r.session}). ${r.hint}`);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Modell" value={run} onChange={(e) => setRun(e.target.value)}>
            {runs.length === 0 && <option value="">— kein Modell trainiert —</option>}
            {runs.map((r) => <option key={r.run} value={r.run}>{r.run}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Profil
            <input value={profile} onChange={(e) => setProfile(e.target.value)} className={`${input} w-28`} /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Kamera
            <input type="number" value={cam} onChange={(e) => setCam(+e.target.value)} className={`${input} w-16`} /></label>
          {!active
            ? <Button variant="primary" onClick={start} disabled={!run}><ScanEye className="h-4 w-4" /> Auswertung starten</Button>
            : <Button onClick={stop}><CircleSlash className="h-4 w-4" /> Stop</Button>}
          {active && <Button variant="primary" onClick={capture}><CameraIcon className="h-4 w-4" /> Snapshot als Trainingsdaten</Button>}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Figuren aufs Brett stellen — das Modell wertet jedes Feld live aus (Glyph + Farbe = Confidence:
          <span className="text-green-500"> grün</span> hoch · <span className="text-amber-400">gelb</span> mittel ·
          <span className="text-red-400"> rot</span> niedrig). „Snapshot" speichert die Stellung als neue Session
          (Active Learning) — danach im <b className="text-zinc-300">Review</b> Fehler & verdeckte Felder korrigieren,
          bevor du darauf neu trainierst.
        </p>
        {msg && <p className="mt-1 text-xs text-sky-400">{msg}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card title="Live-Auswertung">
          {active
            ? <img src="/api/camera/inference.mjpg" className="w-full rounded-lg border border-zinc-800" />
            : <div className="flex h-72 items-center justify-center text-zinc-500"><Cam className="mr-2 h-5 w-5" /> Auswertung nicht gestartet</div>}
        </Card>
        <Card title="Erkannte Stellung">
          {active ? (
            <div className="space-y-2 text-sm">
              <div className="text-zinc-400">Ø Confidence: <b className="text-zinc-100 tabular-nums">{state.mean_conf != null ? (state.mean_conf * 100).toFixed(0) + " %" : "—"}</b></div>
              <div className="text-zinc-400">FEN (geschätzt):</div>
              <code className="block break-all rounded bg-zinc-950 p-2 text-xs text-zinc-300">{state.fen ?? "…"}</code>
              <p className="text-xs text-zinc-500">verdeckte Felder zählen in der FEN als leer.</p>
            </div>
          ) : <span className="text-sm text-zinc-500">Start drücken.</span>}
        </Card>
      </div>
    </div>
  );
}
