import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Scissors, ChevronLeft, ChevronRight, Wand2, Search, Brush } from "lucide-react";
import { api, post, CLASSES } from "../api";
import { Card, Button, Select, Glyph } from "./ui";

const FILES = "abcdefgh".split("");

// Such-Stichwörter je Klasse (Code + DE + EN) -> Tippen filtert das Dropdown.
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

export default function Review() {
  const qc = useQueryClient();
  const [session, setSession] = useState("");
  const [frame, setFrame] = useState("");
  const [run, setRun] = useState("");
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [paint, setPaint] = useState<string | null>(null);   // aktive Pinsel-Klasse (null = Suchfeld beim Klick)
  const [edit, setEdit] = useState<{ square: string; x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState("");
  const [padUp, setPadUp] = useState(0);
  const [padSide, setPadSide] = useState(0);

  const sessionsQ = useQuery({ queryKey: ["sessions"], queryFn: () => api("/api/sessions") });
  const runsQ = useQuery({ queryKey: ["runs"], queryFn: () => api("/api/runs") });
  const sessions: any[] = sessionsQ.data ?? [];
  const runs: any[] = runsQ.data ?? [];
  const frames: string[] = sessions.find((s) => s.session_id === session)?.frames ?? [];
  const frameIdx = frames.indexOf(frame);

  useEffect(() => {
    if (!sessions.length) return;
    if (!session || !sessions.some((s) => s.session_id === session)) { setSession(sessions[0].session_id); setFrame(sessions[0].frames[0] ?? ""); }
  }, [sessions]);
  useEffect(() => { if (frames.length && !frames.includes(frame)) setFrame(frames[0]); }, [session, frames.join(",")]);
  // Modell automatisch vorwählen -> der Classifier läuft direkt beim Laden mit (Felder vorbelegt).
  useEffect(() => { if (runs.length && !run) setRun(runs[runs.length - 1].run); }, [runs]);

  const reviewQ = useQuery({
    queryKey: ["review", session, frame, run],
    queryFn: () => api(`/api/review?session=${session}&frame=${frame}&run=${run}`),
    enabled: !!session && !!frame, retry: false,
  });
  useEffect(() => { setChanges({}); setEdit(null); }, [session, frame]);

  const data = reviewQ.data;
  const map: Record<string, any> = {};
  (data?.cells ?? []).forEach((c: any) => (map[c.square] = c));
  const nChanges = Object.keys(changes).length;
  const cur = (cell: any) => changes[cell.square] ?? cell.label;

  function setLabel(square: string, label: string) {
    const base = map[square]?.label;
    setChanges((ch) => { const n = { ...ch }; if (label === base) { delete n[square]; } else { n[square] = label; } return n; });
    setEdit(null); setQuery("");
  }
  function onCell(square: string, e: React.MouseEvent) {
    if (paint) { setLabel(square, paint); return; }   // Pinsel aktiv -> direkt setzen (im Modus bleiben)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setQuery(""); setEdit({ square, x: r.left, y: r.bottom + 4 });   // sonst Suchfeld öffnen
  }
  function acceptPredictions() {
    if (!data?.cells) return;
    setChanges((ch) => { const n = { ...ch }; for (const c of data.cells) { if (c.pred_label && c.pred_label !== c.label) { n[c.square] = c.pred_label; } } return n; });
    setInfo("Modell-Vorschläge übernommen — prüfen & speichern.");
  }
  function step(delta: number) {
    if (!frames.length) return;
    setFrame(frames[Math.min(frames.length - 1, Math.max(0, (frameIdx < 0 ? 0 : frameIdx) + delta))]);
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "Escape") setPaint(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [frames.join(","), frameIdx]);

  const saveM = useMutation({
    mutationFn: () => post("/api/corrections", Object.entries(changes).map(([square, label]) => ({ session_id: session, frame, square, label }))),
    onSuccess: (r: any) => { setInfo(`${r.applied} Korrekturen gespeichert. „Slicen" übernimmt sie.`); setChanges({}); },
    onError: (e: any) => setInfo("Fehler: " + e.message),
  });
  const resliceM = useMutation({
    mutationFn: () => post(`/api/reslice?session=${session}&pad_up=${padUp}&pad_side=${padSide}`),
    onSuccess: (r: any) => { setInfo(`Neu gesliced ✓ (${r.crops ?? "?"} Crops).`); qc.invalidateQueries({ queryKey: ["review"] }); qc.invalidateQueries({ queryKey: ["sessions"] }); },
    onError: (e: any) => setInfo("Slicing fehlgeschlagen: " + e.message),
  });

  const inputCls = "rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100";
  const editCell = edit ? map[edit.square] : null;
  const filtered = CLASSES.filter((c) => matches(c, query.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Session" value={session} onChange={(e) => setSession(e.target.value)}>
            {sessions.map((s) => <option key={s.session_id} value={s.session_id}>{s.session_id} ({s.n_frames})</option>)}
          </Select>
          <div className="flex items-center gap-1">
            <Button onClick={() => step(-1)} disabled={frameIdx <= 0} className="px-2 py-1.5"><ChevronLeft className="h-4 w-4" /></Button>
            <Select label="Frame" value={frame} onChange={(e) => setFrame(e.target.value)}>{frames.map((f) => <option key={f}>{f}</option>)}</Select>
            <Button onClick={() => step(1)} disabled={frameIdx < 0 || frameIdx >= frames.length - 1} className="px-2 py-1.5"><ChevronRight className="h-4 w-4" /></Button>
            <span className="ml-1 text-xs tabular-nums text-zinc-500">{frames.length ? `${frameIdx + 1} / ${frames.length}` : "0 / 0"}</span>
          </div>
          <Select label="Modell" value={run} onChange={(e) => setRun(e.target.value)}>
            <option value="">(kein Modell)</option>
            {runs.map((r) => <option key={r.run} value={r.run}>{r.run}</option>)}
          </Select>
          {run && <Button onClick={acceptPredictions}><Wand2 className="h-4 w-4" /> Vorschläge übernehmen</Button>}
          <Button variant="primary" onClick={() => saveM.mutate()} disabled={nChanges === 0 || saveM.isPending}><Save className="h-4 w-4" /> Speichern ({nChanges})</Button>
          <label className="flex items-center gap-1 text-xs text-zinc-400">pad_up<input type="number" step={0.05} min={0} value={padUp} onChange={(e) => setPadUp(+e.target.value)} className={`${inputCls} w-16`} /></label>
          <label className="flex items-center gap-1 text-xs text-zinc-400">pad_side<input type="number" step={0.02} min={0} value={padSide} onChange={(e) => setPadSide(+e.target.value)} className={`${inputCls} w-16`} /></label>
          <Button onClick={() => resliceM.mutate()} disabled={!session || resliceM.isPending}><Scissors className="h-4 w-4" /> Slicen</Button>
        </div>
        {/* Palette: Klasse wählen -> Pinsel; Felder klicken setzt direkt. Ohne Pinsel = Suchfeld beim Klick. */}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="mr-1 inline-flex items-center gap-1 text-xs text-zinc-500"><Brush className="h-3.5 w-3.5" /> Pinsel:</span>
          <button onClick={() => setPaint(null)} className={`rounded px-2 py-1 text-xs ${paint === null ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>aus (Suchfeld)</button>
          {CLASSES.map((c) => (
            <button key={c} onClick={() => setPaint((p) => (p === c ? null : c))} title={c}
              className={`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${paint === c ? "bg-sky-600 ring-2 ring-sky-300" : "bg-zinc-800 hover:bg-zinc-700"}`}>
              <Glyph label={c} />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {info || (() => {
            if (reviewQ.isError) return "keine Crops für diese Session/Frame (erst slicen?)";
            if (paint) return `Pinsel „${paint}" aktiv — Felder anklicken setzt direkt (Esc = aus).`;
            return "Pinsel wählen zum schnellen Malen, oder Feld anklicken → Suchfeld · ◀▶/Pfeiltasten steppen.";
          })()}
          {!info && !reviewQ.isError && <> <span className="text-red-400">Rot</span>=Modell widerspricht · <span className="text-amber-400">Gelb</span>=unsicher · <span className="text-sky-400">Blau</span>=geändert.</>}
        </p>
      </Card>

      {data && (
        <Card title={`Brett — ${session} / ${frame}`}>
          <div className="grid w-full max-w-[920px] grid-cols-8 gap-1">
            {[8, 7, 6, 5, 4, 3, 2, 1].map((r) => FILES.map((f) => {
              const cell = map[f + r];
              if (!cell) return <div key={f + r} />;
              const changed = cell.square in changes;
              const ring = changed ? "ring-sky-400"
                : (() => {
                    if (cell.disagree) return "ring-red-500";
                    if (cell.confidence != null && cell.confidence < 0.6) return "ring-amber-400";
                    return "ring-zinc-700";
                  })();
              return (
                <button key={f + r} onClick={(e) => onCell(cell.square, e)}
                  className={`relative aspect-square overflow-hidden rounded-md bg-black ring-2 ${ring} ${edit?.square === cell.square ? "ring-sky-300" : ""} hover:ring-sky-300`}>
                  <img src={cell.url} alt={`Feld ${cell.square}`} className="h-full w-full object-cover" />
                  <span className="absolute left-0.5 top-0.5 rounded bg-black/55 px-1 text-[9px] text-zinc-400">{f + r}</span>
                  {cell.pred_label && <span className="absolute right-0 top-0 inline-flex items-center gap-0.5 rounded-bl bg-black/60 px-1 text-[10px] text-zinc-300"><Glyph label={cell.pred_label} /> {Math.round((cell.confidence || 0) * 100)}%</span>}
                  <span className="absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-lg font-bold"><Glyph label={cur(cell)} /></span>
                </button>
              );
            }))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">{nChanges} geändert · Klasse je Feld per Suchfeld setzen.</p>
        </Card>
      )}

      {/* Suchbares Dropdown (Combobox) am angeklickten Feld */}
      {edit && editCell && (
        <>
          <div className="fixed inset-0 z-40" role="presentation"
            onClick={() => { setEdit(null); setQuery(""); }} />
          <div className="fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl"
            style={{ left: Math.min(edit.x, window.innerWidth - 240), top: Math.min(edit.y, window.innerHeight - 320) }}>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
              <span>Feld <b className="text-zinc-200">{edit.square}</b></span>
              {editCell.pred_label && <button onClick={() => setLabel(edit.square, editCell.pred_label)} className="inline-flex items-center gap-1 text-sky-400 hover:underline">Vorschlag <Glyph label={editCell.pred_label} /> {Math.round((editCell.confidence || 0) * 100)}%</button>}
            </div>
            <div className="mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && filtered[0]) { setLabel(edit.square, filtered[0]); } if (e.key === "Escape") { setEdit(null); setQuery(""); } }}
                placeholder="suchen: könig, bN, leer…" className="w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none" />
            </div>
            <div className="max-h-56 overflow-auto">
              {filtered.length === 0 ? <div className="px-2 py-1.5 text-xs text-zinc-500">nichts gefunden</div> : filtered.map((c) => (
                <button key={c} onClick={() => setLabel(edit.square, c)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${cur(editCell) === c ? "bg-zinc-800 text-sky-300" : "text-zinc-200"}`}>
                  <span className="w-5 text-center text-lg"><Glyph label={c} /></span>
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
