import { useEffect, useRef, useState } from "react";
import { Play, Camera as Cam, Undo2, CheckCircle2, Eraser, Brush, Search } from "lucide-react";
import { api, post, CLASSES } from "../api";
import { Card, Button, Glyph } from "./ui";

const FILES = "abcdefgh".split("");
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const inputCls = "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

// Such-Stichwörter je Klasse (Code + DE + EN) -> Tippen filtert das Dropdown (wie Review).
const LABEL_NAMES: Record<string, string> = {
  empty: "empty leer frei", occluded: "occluded verdeckt hand objekt verdeckung",
  wP: "white pawn weiss weißer bauer", wN: "white knight weiss weißer springer pferd",
  wB: "white bishop weiss weißer läufer", wR: "white rook weiss weißer turm",
  wQ: "white queen weiss weiße dame", wK: "white king weiss weißer könig",
  bP: "black pawn schwarz schwarzer bauer", bN: "black knight schwarz schwarzer springer pferd",
  bB: "black bishop schwarz schwarzer läufer", bR: "black rook schwarz schwarzer turm",
  bQ: "black queen schwarz schwarze dame", bK: "black king schwarz schwarzer könig",
};
const matches = (c: string, q: string) =>
  !q || c.toLowerCase().includes(q) || (LABEL_NAMES[c] || "").includes(q);

export default function ManualLabel() {
  const [profile, setProfile] = useState("default");
  const [cam, setCam] = useState(0);
  const [st, setSt] = useState<any>({ active: false });
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [paint, setPaint] = useState<string | null>("wP");   // aktive Pinsel-Klasse (null = Suchfeld beim Klick)
  const [edit, setEdit] = useState<{ square: string; x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api("/api/manual/state").then(setSt).catch(() => {}); }, []);

  const nSet = Object.keys(labels).length;
  const filtered = CLASSES.filter((c) => matches(c, query.trim().toLowerCase()));

  function setSquare(square: string, label: string) {
    setLabels((m) => {
      const n = { ...m };
      if (label === "empty") delete n[square];
      else n[square] = label;
      return n;
    });
    setEdit(null); setQuery("");
  }
  function onCell(square: string, e: React.MouseEvent) {
    if (paint) { setSquare(square, paint === labels[square] ? "empty" : paint); return; }  // Pinsel: setzen/toggeln
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setQuery(""); setEdit({ square, x: r.left, y: r.bottom + 4 });   // ohne Pinsel: Suchfeld
  }

  async function start() {
    setMsg("");
    try { setSt(await post("/api/manual/start", { profile, camera: cam })); }
    catch (e: any) { setMsg("Fehler: " + e.message); }
  }
  async function shoot() {
    if (nSet === 0 && !window.confirm("Keine Figur markiert — als komplett leeres Brett aufnehmen?")) return;
    setSt(await post("/api/manual/capture", { labels }));
  }
  const undo = async () => setSt(await post("/api/manual/undo"));
  async function finish() {
    const r = await post("/api/manual/finish");
    setSt({ active: false }); setLabels({});
    setMsg(`Session beendet: ${r.captures} Aufnahmen, ${r.sliced ?? 0} Crops → Tab „Datensätze" / „Review".`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">Profil
            <input value={profile} onChange={(e) => setProfile(e.target.value)} className={`${inputCls} w-28`} /></label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">Kamera
            <input type="number" value={cam} onChange={(e) => setCam(+e.target.value)} className={`${inputCls} w-16`} /></label>
          {!st.active
            ? <Button variant="primary" onClick={start}><Play className="h-4 w-4" /> Sitzung starten</Button>
            : <Button onClick={finish}><CheckCircle2 className="h-4 w-4" /> Fertig</Button>}
          <span className="text-xs text-zinc-500">{msg}</span>
        </div>

        {/* Palette: Klasse wählen -> Pinsel; Felder klicken setzt direkt. Ohne Pinsel = Suchfeld. */}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="mr-1 inline-flex items-center gap-1 text-xs text-zinc-500"><Brush className="h-3.5 w-3.5" /> Pinsel:</span>
          <button onClick={() => setPaint(null)} className={`rounded px-2 py-1 text-xs ${paint === null ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>aus (Suchfeld)</button>
          {CLASSES.map((c) => (
            <button key={c} onClick={() => setPaint((p) => (p === c ? null : c))} title={c}
              className={`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${paint === c ? "bg-sky-600 ring-2 ring-sky-300" : "bg-zinc-800 hover:bg-zinc-700"}`}>
              {c === "empty" ? <Eraser className="h-4 w-4 text-zinc-400" /> : <Glyph label={c} />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {st.active
            ? (paint ? `Pinsel „${paint}" aktiv — Feld anklicken setzt (nochmal = leeren).`
              : "Feld anklicken → Suchfeld. ")
            : "Starten, dann Figuren aufs reale Brett stellen und die belegten Felder markieren."}
          {" "}Nicht markierte Felder zählen als <b>leer</b>. Labels bleiben nach „Aufnehmen" erhalten → mehrere Frames mit wechselndem Licht.
        </p>
      </Card>

      {st.active && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card title="Live-Brett — Felder anklicken zum Labeln">
            <div ref={imgRef} className="relative mx-auto w-full max-w-[680px]">
              <img src="/api/camera/manual.mjpg" className="block w-full rounded-lg border border-zinc-800" />
              {/* edge-to-edge 8x8-Overlay: deckt sich mit draw_board_grid (board_size-Bild) */}
              <div className="absolute inset-0 grid grid-cols-8">
                {RANKS.map((r) => FILES.map((f) => {
                  const sq = f + r;
                  const lab = labels[sq];
                  return (
                    <button key={sq} onClick={(e) => onCell(sq, e)}
                      className={`group relative flex items-center justify-center border border-transparent hover:border-sky-400/70 ${edit?.square === sq ? "border-sky-300" : ""}`}>
                      {lab && <span className="text-2xl drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]"><Glyph label={lab} /></span>}
                      <span className="pointer-events-none absolute left-0.5 top-0.5 hidden rounded bg-black/55 px-1 text-[9px] text-zinc-300 group-hover:block">{sq}</span>
                    </button>
                  );
                }))}
              </div>
            </div>
          </Card>

          <Card title="Aufnahme">
            <div className="space-y-3">
              <div className="text-sm text-zinc-400">Markiert: <b className="text-sky-400">{nSet}</b> Figur(en)</div>
              <div className="text-sm">Aufnahmen: <b className="text-sky-400">{st.captures ?? 0}</b>
                <span className="ml-1 text-xs text-green-500">· sofort gespeichert ✓</span></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={shoot} className="px-5 py-2.5 text-base"><Cam className="h-5 w-5" /> Aufnehmen</Button>
                <Button onClick={() => setLabels({})}><Eraser className="h-4 w-4" /> Alles leeren</Button>
                <Button onClick={undo}><Undo2 className="h-4 w-4" /> Undo</Button>
              </div>
              <p className="text-xs text-zinc-500">Jede Aufnahme ist <b>sofort gespeichert</b> und wird nach „Fertig" automatisch gesliced. Feinkorrektur (z. B. <b>occluded</b>) im Tab <b>Review</b>.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Suchbares Dropdown (Combobox) am angeklickten Feld */}
      {edit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setEdit(null); setQuery(""); }} />
          <div className="fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl"
            style={{ left: Math.min(edit.x, window.innerWidth - 240), top: Math.min(edit.y, window.innerHeight - 320) }}>
            <div className="mb-1 text-xs text-zinc-400">Feld <b className="text-zinc-200">{edit.square}</b></div>
            <div className="mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && filtered[0]) setSquare(edit.square, filtered[0]); if (e.key === "Escape") { setEdit(null); setQuery(""); } }}
                placeholder="suchen: könig, bN, leer…" className="w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none" />
            </div>
            <div className="max-h-56 overflow-auto">
              {filtered.length === 0 ? <div className="px-2 py-1.5 text-xs text-zinc-500">nichts gefunden</div> : filtered.map((c) => (
                <button key={c} onClick={() => setSquare(edit.square, c)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${labels[edit.square] === c || (c === "empty" && !labels[edit.square]) ? "bg-zinc-800 text-sky-300" : "text-zinc-200"}`}>
                  <span className="w-5 text-center text-lg">{c === "empty" ? "·" : <Glyph label={c} />}</span>
                  <span className="font-mono text-xs text-zinc-400">{c}</span>
                  <span className="ml-auto text-[11px] text-zinc-500">{(LABEL_NAMES[c] || "").split(" ").slice(2, 4).join(" ")}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
