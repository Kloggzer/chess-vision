import { useEffect, useRef, useState } from "react";
import { Play, Camera as Cam, ArrowRight, Undo2, CheckCircle2 } from "lucide-react";
import { api, post } from "../api";
import { Card, Button, Select, noteCls } from "./ui";

const input = "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

type CamMode = { name: string; width: number | null; height: number | null; label: string };
/** What the backend measured about the shared capture — `delivered` comes from real frames. */
type CamInfo = {
  open: boolean; source: string | null; url_source: string | null; modes_apply: boolean;
  mode: string; requested: number[] | null; delivered: number[] | null;
  matches: boolean | null; undistort: boolean;
};

const size = (s: number[] | null) => (s ? `${s[0]}×${s[1]}` : "?");

/** Camera facts under the live image: the DELIVERED resolution (never the requested one),
 *  a loud note when the driver ignored the request, and the lens-correction state. */
function CameraFacts({ cam }: { cam: CamInfo | null }) {
  if (!cam) return null;
  return (
    <div className="mt-2 space-y-1 text-xs">
      <div className="text-zinc-400">
        {cam.delivered
          ? <>Delivered <b className="text-zinc-200">{size(cam.delivered)}</b></>
          : <>waiting for the first frame…</>}
        <span className="text-zinc-500"> · mode {cam.mode || "default"}</span>
        <span className={cam.undistort ? " text-emerald-400" : " text-zinc-500"}>
          {" "}· lens correction {cam.undistort ? "on" : "off (no data/lens/calib.npz)"}
        </span>
      </div>
      {cam.matches === false && (
        <div className="rounded-lg bg-amber-950/60 px-2 py-1 text-amber-300">
          Camera ignored the request: asked for <b>{size(cam.requested)}</b>, delivers{" "}
          <b>{size(cam.delivered)}</b>. Everything downstream uses the delivered size.
        </div>
      )}
      {cam.url_source && (
        <div className="text-zinc-500">
          Source <b className="text-zinc-400">{cam.url_source}</b> (CHESSLAB_CAMERA_SOURCE)
          — a URL takes no resolution request, the selector does not apply.
        </div>
      )}
    </div>
  );
}

/** Strategy-specific controls (coverage / sweep / default). */
function StrategyControls({ coverage, sweep, sets, setSets, count, setCount, passes, setPasses, pieces, setPieces, together, setTogether, offset, setOffset, autoOffset, setAutoOffset, maxPlies, setMaxPlies, input: inputCls }: {
  coverage: boolean; sweep: boolean;
  sets: number; setSets: (v: number) => void;
  count: number; setCount: (v: number) => void;
  passes: number; setPasses: (v: number) => void;
  pieces: string; setPieces: (v: string) => void;
  together: boolean; setTogether: (v: boolean) => void;
  offset: number; setOffset: (v: number) => void;
  autoOffset: boolean; setAutoOffset: (v: boolean) => void;
  maxPlies: number; setMaxPlies: (v: number) => void;
  input: string;
}) {
  if (coverage) {
    return (
      <>
        <label className="flex items-center gap-2 text-sm text-zinc-400" title="Number of physical piece sets: with 2 sets, queens/kings come twice as fast.">Sets
          <input type="number" min={1} value={sets} onChange={(e) => setSets(+e.target.value)} className={`${inputCls} w-16`} /></label>
        <label className="flex items-center gap-2 text-sm text-zinc-400" title="Number of dense setups generated against your weakest classes.">Setups
          <input type="number" min={1} value={count} onChange={(e) => setCount(+e.target.value)} className={`${inputCls} w-20`} /></label>
      </>
    );
  }
  if (sweep) {
    return (
      <>
        <div className="flex items-center gap-2 text-sm text-zinc-400" title="Which pieces walk across the board: special = non-pawns (K,Q,R,B,N), pawn = only pawns, all = everything.">Pieces
          <Select label="" value={pieces} onChange={(e) => setPieces(e.target.value)}>
            <option value="special">special (K,Q,R,B,N)</option>
            <option value="pawn">pawn (only pawns)</option>
            <option value="all">all</option>
          </Select></div>
        <label className="flex items-center gap-2 text-sm text-zinc-400" title="Repeats (each pass 8 photos, ranks 1–8) — e.g. with different lighting. No piece rearrangement.">Passes
          <input type="number" min={1} value={passes} onChange={(e) => setPasses(+e.target.value)} className={`${inputCls} w-16`} /></label>
        <label className="flex items-center gap-2 text-sm text-zinc-400" title="Number of physical piece sets: with 2 sets, twice as many pieces per photo possible.">Sets
          <input type="number" min={1} value={sets} onChange={(e) => setSets(+e.target.value)} className={`${inputCls} w-16`} /></label>
        <label className="flex items-center gap-2 text-sm text-zinc-400" title="Both colors on the board at once (white in front, black 4 ranks offset) → half the photos, every square gets both colors.">
          <input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} /> both colors at once</label>
        <label className="flex items-center gap-2 text-sm text-zinc-400" title="Auto offset: counts previous sweep sessions and picks the next offset → each piece lands on different files across sessions (prevents position overfitting).">
          <input type="checkbox" checked={autoOffset} onChange={(e) => setAutoOffset(e.target.checked)} /> Offset auto</label>
        {!autoOffset && (
          <label className="flex items-center gap-2 text-sm text-zinc-400" title="Shifts the line→piece assignment, fixed for this session. 0: a=King,b=Queen,…  1: a=Queen,b=Rook,…">Offset
            <input type="number" min={0} max={7} value={offset} onChange={(e) => setOffset(+e.target.value)} className={`${inputCls} w-16`} /></label>
        )}
      </>
    );
  }
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-400">Max plies
      <input type="number" value={maxPlies} onChange={(e) => setMaxPlies(+e.target.value)} className={`${inputCls} w-20`} /></label>
  );
}

export default function Collect() {
  const [strategy, setStrategy] = useState("random");
  const [maxPlies, setMaxPlies] = useState(40);
  const [sets, setSets] = useState(1);
  const [count, setCount] = useState(20);
  const [passes, setPasses] = useState(1);
  const [pieces, setPieces] = useState("special");
  const [together, setTogether] = useState(true);
  const [offset, setOffset] = useState(0);
  const [autoOffset, setAutoOffset] = useState(true);
  const [profile, setProfile] = useState("default");
  const [cam, setCam] = useState(0);
  const [res, setRes] = useState("");              // "" = whatever config.CAMERA says
  const [modes, setModes] = useState<CamMode[]>([]);
  const [camInfo, setCamInfo] = useState<CamInfo | null>(null);
  const coverage = strategy === "coverage";
  const sweep = strategy === "sweep";
  const [st, setSt] = useState<any>({ active: false });
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState<"ok" | "err" | "busy" | "">("");
  const timer = useRef<any>(null);

  useEffect(() => {
    api("/api/collect/state").then(setSt).catch(() => {});
    api<{ modes: CamMode[]; camera: CamInfo }>("/api/camera/modes")
      .then((m) => { setModes(m.modes); setCamInfo(m.camera); })
      .catch(() => {});
    return () => clearInterval(timer.current);
  }, []);

  const poll = () => api("/api/collect/state").then(setSt).catch(() => {});
  // The polled state carries the live camera facts; before Start we only have the ones
  // from /api/camera/modes.
  const camFacts: CamInfo | null = st.camera ?? camInfo;
  const modesApply = camFacts ? camFacts.modes_apply : true;
  let resHint = "Capture mode requested from the USB camera. What it really delivers is shown under the live image.";
  if (!modesApply) resHint = "An IP-camera URL (CHESSLAB_CAMERA_SOURCE) is in charge — it takes no resolution request.";
  else if (st.active) resHint = "Fixed while a session records (the session log states one frame size) — press Done first.";

  async function start() {
    setMsg(""); setMsgKind("");
    try {
      const s = await post("/api/collect/start", {
        strategy, max_plies: maxPlies, profile, camera: cam, sets, count, passes, pieces, together,
        offset, auto_offset: autoOffset, res: modesApply ? res : "",
      });
      setSt(s);
      clearInterval(timer.current);
      timer.current = setInterval(poll, 1500);
    } catch (e: any) { setMsg("Error: " + e.message); setMsgKind("err"); }
  }
  async function shoot() {
    setMsg("Capturing..."); setMsgKind("busy");
    try { setSt(await post("/api/collect/shoot")); setMsg("Captured ✓"); setMsgKind("ok"); }
    catch (e: any) { setMsg("Error: " + e.message); setMsgKind("err"); }
  }
  async function skip() {
    setMsg("Skipping..."); setMsgKind("busy");
    try { setSt(await post("/api/collect/skip")); setMsg(""); setMsgKind(""); }
    catch (e: any) { setMsg("Error: " + e.message); setMsgKind("err"); }
  }
  async function undo() {
    setMsg("Undoing..."); setMsgKind("busy");
    try { setSt(await post("/api/collect/undo")); setMsg("Undone ✓"); setMsgKind("ok"); }
    catch (e: any) { setMsg("Error: " + e.message); setMsgKind("err"); }
  }
  async function finish() {
    setMsg("Finishing..."); setMsgKind("busy");
    try {
      const r = await post("/api/collect/finish");
      clearInterval(timer.current);
      setSt({ active: false });
      setMsg(`Session finished: ${r.captures} captures, ${r.sliced ?? 0} crops sliced → Datasets tab.`);
      setMsgKind("ok");
    } catch (e: any) { setMsg("Error: " + e.message); setMsgKind("err"); }
  }

  const noteClasses = noteCls(msgKind);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Engine" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="random">random (built-in)</option>
            <option value="stockfish">stockfish (auto-detected)</option>
            <option value="coverage">coverage (target rare classes)</option>
            <option value="sweep">sweep (pieces walk the board)</option>
          </Select>
          <StrategyControls coverage={coverage} sweep={sweep} input={input}
            sets={sets} setSets={setSets} count={count} setCount={setCount}
            passes={passes} setPasses={setPasses} pieces={pieces} setPieces={setPieces}
            together={together} setTogether={setTogether} offset={offset} setOffset={setOffset}
            autoOffset={autoOffset} setAutoOffset={setAutoOffset}
            maxPlies={maxPlies} setMaxPlies={setMaxPlies} />
          <label className="flex items-center gap-2 text-sm text-zinc-400">Profile
            <input value={profile} onChange={(e) => setProfile(e.target.value)} className={`${input} w-28`} /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Camera
            <input type="number" value={cam} onChange={(e) => setCam(+e.target.value)} className={`${input} w-16`} /></label>
          <Select label="Resolution" value={res} onChange={(e) => setRes(e.target.value)}
            disabled={!modesApply || st.active} title={resHint}>
            <option value="">default (config)</option>
            {modes.filter((m) => m.width != null)
              .map((m) => <option key={m.name} value={m.name}>{m.label}</option>)}
          </Select>
          {!st.active
            ? <Button variant="primary" onClick={start}><Play className="h-4 w-4" /> Start game</Button>
            : <Button onClick={finish}><CheckCircle2 className="h-4 w-4" /> Done</Button>}
        </div>
        {msg && <div className={`mt-2 rounded-lg px-3 py-1.5 text-sm ${noteClasses}`}>{msg}</div>}
      </Card>

      {st.active && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card title="Live camera">
            <img src="/api/camera/collect.mjpg" alt="Live capture" className="w-full rounded-lg border border-zinc-800" />
            <CameraFacts cam={camFacts} />
          </Card>
          <Card title="Capture">
            <div className="space-y-3">
              {st.done ? (
                <div className="font-medium text-green-500">✓ All {st.n_positions} positions captured.</div>
              ) : (
                <>
                  <CaptureStatus st={st} />
                  <div className="flex flex-wrap gap-2">
                    {!st.done && <Button variant="primary" onClick={shoot} className="px-5 py-2.5 text-base"><Cam className="h-5 w-5" /> Photo</Button>}
                    {!st.done && <Button onClick={skip}><ArrowRight className="h-4 w-4" /> Skip</Button>}
                    <Button onClick={undo}><Undo2 className="h-4 w-4" /> Undo</Button>
                  </div>
                </>
              )}
              <div className="text-sm">Captures: <b className="text-sky-400">{st.captures}</b>
                <span className="ml-1 text-xs text-green-500">· instantly saved ✓</span></div>
              <p className="text-xs text-zinc-500">Each capture is <b>saved instantly</b> — you can press "Done" (above) any time or just stop; nothing is lost.</p>
            </div>
          </Card>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        After "Done" the session is sliced automatically. Curated datasets (dedup,
        rotation, split) are built in the <b className="text-zinc-300">Datasets</b> tab.
      </p>
    </div>
  );
}

/** Status text during capture. */
function CaptureStatus({ st }: { st: any }) {
  const pos = Math.min(st.index + 1, st.n_positions);
  const label = st.build_target ? "Setup" : "Position";
  const gainsHint = st.build_target && st.gains ? <span className="ml-1 text-xs text-zinc-500">· {st.gains} target squares</span> : null;

  let instruction: JSX.Element;
  if (st.build_target) {
    instruction = <>Position <b>set up fresh</b> — <b className="text-sky-300">piece names</b> are overlaid on the live image (white = light text, black = dark),</>;
  } else if (st.index === 0) {
    instruction = <>Set up the <b>starting position</b>,</>;
  } else {
    instruction = <>Play this move: <b className="text-base text-sky-300">{st.move_san}</b> <span className="text-zinc-400">(red arrow)</span>,</>;
  }
  const extra = st.build_target ? <>(feel free to take several with varying light)</> : null;

  return (
    <>
      <div className="text-sm text-zinc-400">{label} <b className="text-zinc-100">{pos}</b> / {st.n_positions}{gainsHint}</div>
      <div className="rounded-lg bg-zinc-800 p-3 text-sm">
        {instruction}
        <div className="mt-1 text-xs text-zinc-400">…then <b>Photo</b>{extra}.</div>
      </div>
    </>
  );
}
