import { useEffect, useRef, useState } from "react";
import { Play, Camera as Cam, ArrowRight, Undo2, CheckCircle2 } from "lucide-react";
import { api, post } from "../api";
import { Card, Button, Select } from "./ui";

const input = "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

export default function Collect() {
  const [strategy, setStrategy] = useState("random");
  const [maxPlies, setMaxPlies] = useState(40);
  const [sets, setSets] = useState(1);       // coverage: Anzahl physischer Figurensätze
  const [count, setCount] = useState(20);     // coverage: Anzahl dichter Aufbauten
  const [profile, setProfile] = useState("default");
  const [cam, setCam] = useState(0);
  const coverage = strategy === "coverage";
  const [st, setSt] = useState<any>({ active: false });
  const [msg, setMsg] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    api("/api/collect/state").then(setSt).catch(() => {});
    return () => clearInterval(timer.current);
  }, []);

  const poll = () => api("/api/collect/state").then(setSt).catch(() => {});

  async function start() {
    setMsg("");
    try {
      const s = await post("/api/collect/start", {
        strategy, max_plies: maxPlies, profile, camera: cam, sets, count,
      });
      setSt(s);
      clearInterval(timer.current);
      timer.current = setInterval(poll, 1500);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }
  const shoot = async () => setSt(await post("/api/collect/shoot"));
  const skip = async () => setSt(await post("/api/collect/skip"));
  const undo = async () => setSt(await post("/api/collect/undo"));
  async function finish() {
    const r = await post("/api/collect/finish");
    clearInterval(timer.current);
    setSt({ active: false });
    setMsg(`Session beendet: ${r.captures} Aufnahmen, ${r.sliced ?? 0} Crops gesliced → Tab „Datensätze".`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Engine" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="random">random (eingebaut)</option>
            <option value="stockfish">stockfish (automatisch erkannt)</option>
            <option value="coverage">coverage (gegen seltene Klassen)</option>
          </Select>
          {coverage ? (
            <>
              <label className="flex items-center gap-2 text-sm text-zinc-400" title="Anzahl physischer Figurensätze: mit 2 Sätzen kommen Damen/Könige doppelt so schnell zusammen.">Sätze
                <input type="number" min={1} value={sets} onChange={(e) => setSets(+e.target.value)} className={`${input} w-16`} /></label>
              <label className="flex items-center gap-2 text-sm text-zinc-400" title="Anzahl dichter Aufbauten, die gegen deine schwächsten Klassen erzeugt werden.">Aufbauten
                <input type="number" min={1} value={count} onChange={(e) => setCount(+e.target.value)} className={`${input} w-20`} /></label>
            </>
          ) : (
            <label className="flex items-center gap-2 text-sm text-zinc-400">Halbzüge
              <input type="number" value={maxPlies} onChange={(e) => setMaxPlies(+e.target.value)} className={`${input} w-20`} /></label>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-400">Profil
            <input value={profile} onChange={(e) => setProfile(e.target.value)} className={`${input} w-28`} /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Kamera
            <input type="number" value={cam} onChange={(e) => setCam(+e.target.value)} className={`${input} w-16`} /></label>
          {!st.active
            ? <Button variant="primary" onClick={start}><Play className="h-4 w-4" /> Partie starten</Button>
            : <Button onClick={finish}><CheckCircle2 className="h-4 w-4" /> Fertig</Button>}
          <span className="text-xs text-zinc-500">{msg}</span>
        </div>
      </Card>

      {st.active && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card title="Live-Kamera">
            <img src="/api/camera/collect.mjpg" className="w-full rounded-lg border border-zinc-800" />
          </Card>
          <Card title="Aufnahme">
            <div className="space-y-3">
              {st.done ? (
                <div className="font-medium text-green-500">✓ Alle {st.n_positions} Stellungen aufgenommen.</div>
              ) : (
                <>
                  <div className="text-sm text-zinc-400">{st.build_target ? "Aufbau" : "Stellung"} <b className="text-zinc-100">{Math.min(st.index + 1, st.n_positions)}</b> / {st.n_positions}{st.build_target && st.gains ? <span className="ml-1 text-xs text-zinc-500">· {st.gains} Ziel-Felder</span> : null}</div>
                  <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                    {st.build_target
                      ? <>Stellung <b>frisch aufbauen</b> — die <b className="text-sky-300">Figurennamen</b> sind ins Live-Bild eingeblendet (weiß = helle Schrift, schwarz = dunkle),</>
                      : st.index === 0
                        ? <>Brett in die <b>Startstellung</b> bringen,</>
                        : <>Diesen Zug ziehen: <b className="text-base text-sky-300">{st.move_san}</b> <span className="text-zinc-400">(roter Pfeil)</span>,</>}
                    <div className="mt-1 text-xs text-zinc-400">…dann <b>Foto</b>{st.build_target ? <> (gern mehrere mit wechselndem Licht)</> : null}.</div>
                  </div>
                </>
              )}
              <div className="text-sm">Aufnahmen: <b className="text-sky-400">{st.captures}</b>
                <span className="ml-1 text-xs text-green-500">· sofort gespeichert ✓</span></div>
              <div className="flex flex-wrap gap-2">
                {!st.done && <Button variant="primary" onClick={shoot} className="px-5 py-2.5 text-base"><Cam className="h-5 w-5" /> Foto</Button>}
                {!st.done && <Button onClick={skip}><ArrowRight className="h-4 w-4" /> Überspringen</Button>}
                <Button onClick={undo}><Undo2 className="h-4 w-4" /> Undo</Button>
              </div>
              <p className="text-xs text-zinc-500">Jede Aufnahme ist <b>sofort gespeichert</b> — du kannst jederzeit „Fertig" (oben) drücken oder einfach aufhören; nichts geht verloren.</p>
            </div>
          </Card>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Nach „Fertig" wird die Session automatisch gesliced. Kuratierte Datensätze (Dedup,
        Rotation, Split) baust du im Tab <b className="text-zinc-300">Datensätze</b>.
      </p>
    </div>
  );
}
