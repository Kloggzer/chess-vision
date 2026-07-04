import { useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, AlertTriangle, Images, Archive, ArchiveRestore, Trash2, Scissors,
  Boxes, Hammer, RotateCw,
} from "lucide-react";
import { api, post, del } from "../api";
import { Card, Button, Glyph } from "./ui";

const input = "rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500";

const subLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm transition ${isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"}`;

// --- Layout mit Unter-Navigation (eigene Pfade -> F5-fest) ---------------------------
export function DatasetLayout() {
  return (
    <div className="space-y-4">
      <nav className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5">
        <NavLink to="sessions" className={subLink}>Sessions</NavLink>
        <NavLink to="curated" className={subLink}>Curated datasets</NavLink>
        <NavLink to="stats" className={subLink}>Statistics</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

const useInvalidate = () => {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

// --- Panel 1: Sessions (Rohmaterial) -------------------------------------------------
export function SessionsPanel() {
  const invalidate = useInvalidate();
  const [note, setNote] = useState("");
  const sessionsQ = useQuery({ queryKey: ["sessions-manage"], queryFn: () => api("/api/sessions/manage") });
  const sessions: any[] = sessionsQ.data ?? [];

  const onOk = (msg: string) => { setNote(msg); invalidate("sessions-manage", "stats", "datasets"); };
  const onErr = (e: any) => setNote("Error: " + e.message);
  const sliceM = useMutation({ mutationFn: (sid: string) => post(`/api/sessions/${sid}/slice`), onSuccess: (r: any) => onOk(`„${r.session}" gesliced: ${r.crops} Crops.`), onError: onErr });
  const archiveM = useMutation({ mutationFn: (sid: string) => post(`/api/sessions/${sid}/archive`), onSuccess: () => onOk("archived."), onError: onErr });
  const restoreM = useMutation({ mutationFn: (sid: string) => post(`/api/sessions/${sid}/restore`), onSuccess: () => onOk("restored — re-slice."), onError: onErr });
  const deleteM = useMutation({ mutationFn: (sid: string) => del(`/api/sessions/${sid}`), onSuccess: () => onOk("deleted."), onError: onErr });

  return (
    <Card title="Sessions (Rohmaterial)" right={<span className="text-xs text-zinc-500">{sessions.length} session(s) · {note}</span>}>
      {sessions.length === 0 ? <span className="text-sm text-zinc-500">Noch none Sessions — im Tab „Sammeln" aufnehmen.</span> : (
        <table className="w-full text-sm">
          <thead><tr className="text-zinc-500">
            <th className="text-left font-normal">Session</th><th className="text-left font-normal">Mode</th>
            <th className="text-right font-normal">Frames</th><th className="text-right font-normal">Crops</th>
            <th className="text-right font-normal">Action</th>
          </tr></thead>
          <tbody>
            {sessions.map((m) => (
              <tr key={m.session_id} className="border-t border-zinc-800">
                <td className="py-1.5 text-zinc-200">{m.session_id}
                  {m.archived && <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">archiviert</span>}
                  {!m.archived && m.n_crops === 0 && <span className="ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300">nicht gesliced</span>}
                </td>
                <td className="text-zinc-400">{m.mode ?? "—"}</td>
                <td className="text-right tabular-nums text-zinc-400">{m.n_frames}</td>
                <td className="text-right tabular-nums text-zinc-400">{m.archived ? "—" : m.n_crops}</td>
                <td className="py-1"><div className="flex justify-end gap-1.5">
                  {!m.archived && <Button onClick={() => sliceM.mutate(m.session_id)} className="px-2 py-1 text-xs"><Scissors className="h-3.5 w-3.5" /> {m.n_crops ? "Neu slicen" : "Slice"}</Button>}
                  {m.archived
                    ? <Button onClick={() => restoreM.mutate(m.session_id)} className="px-2 py-1 text-xs"><ArchiveRestore className="h-3.5 w-3.5" /> Wiederherstellen</Button>
                    : <Button onClick={() => archiveM.mutate(m.session_id)} className="px-2 py-1 text-xs"><Archive className="h-3.5 w-3.5" /> Archive</Button>}
                  <Button onClick={() => window.confirm(`Session „${m.session_id}" endgültig löschen?`) && deleteM.mutate(m.session_id)} className="px-2 py-1 text-xs text-red-300 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// --- Panel 2: Curated datasets --------------------------------------------------
export function DatasetsPanel() {
  const invalidate = useInvalidate();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [cap, setCap] = useState(4);
  const [phash, setPhash] = useState(true);
  const [hamming, setHamming] = useState(6);
  const [rotate, setRotate] = useState(true);
  const [valFrac, setValFrac] = useState(0.15);
  const [testFrac, setTestFrac] = useState(0.15);

  const sessionsQ = useQuery({ queryKey: ["sessions-manage"], queryFn: () => api("/api/sessions/manage") });
  const datasetsQ = useQuery({ queryKey: ["datasets"], queryFn: () => api("/api/datasets") });
  const active = (sessionsQ.data ?? []).filter((s: any) => !s.archived);
  const datasets: any[] = datasetsQ.data ?? [];

  const buildM = useMutation({
    mutationFn: (body: any) => post("/api/datasets", body),
    onSuccess: (r: any) => { setNote(`„${r.name}" gebaut: roh ${r.counts.raw} → dedup ${r.counts.after_dedup} → final ${r.counts.final}.`); setOpen(false); setName(""); setSel({}); invalidate("datasets", "stats"); },
    onError: (e: any) => setNote("Error: " + e.message),
  });
  const dsDeleteM = useMutation({ mutationFn: (n: string) => del(`/api/datasets/${n}`), onSuccess: () => { setNote("deleted."); invalidate("datasets"); } });
  const dsRebuildM = useMutation({ mutationFn: (n: string) => post(`/api/datasets/${n}/rebuild`), onSuccess: (r: any) => { setNote(`„${r.name}" neu gebaut: ${r.counts?.final} Crops.`); invalidate("datasets", "stats"); }, onError: (e: any) => setNote("Error: " + e.message) });

  function build() {
    const session_ids = active.filter((s: any) => sel[s.session_id]).map((s: any) => s.session_id);
    if (!name.trim() || session_ids.length === 0) { setNote("Name and at least one session required."); return; }
    buildM.mutate({ name: name.trim(), session_ids, per_cell_cap: cap, phash_enabled: phash, phash_hamming: hamming, rotate, val_frac: valFrac, test_frac: testFrac });
  }

  return (
    <Card title="Curated datasets" right={<div className="flex items-center gap-2"><span className="text-xs text-zinc-500">{note}</span><Button onClick={() => setOpen((o) => !o)} className="px-2 py-1 text-xs"><Boxes className="h-3.5 w-3.5" /> Neuer Dataset</Button></div>}>
      {open && (
        <div className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-zinc-400">Name<input value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-40`} placeholder="z.B. set-a" /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400" title="max. Crops je (Session, Feld, Figur)">Cap/Feld<input type="number" min={1} value={cap} onChange={(e) => setCap(+e.target.value)} className={`${input} w-16`} /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" checked={phash} onChange={(e) => setPhash(e.target.checked)} /> pHash</label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">Hamming<input type="number" min={0} max={32} value={hamming} disabled={!phash} onChange={(e) => setHamming(+e.target.value)} className={`${input} w-14`} /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400" title="90/180/270° → 4× Crops. ACHTUNG: widerspricht der Fixkamera-Annahme — A/B testen."><input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} /> <RotateCw className="h-3.5 w-3.5" /> Rotation</label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">val<input type="number" step={0.05} min={0} max={0.5} value={valFrac} onChange={(e) => setValFrac(+e.target.value)} className={`${input} w-14`} /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">test<input type="number" step={0.05} min={0} max={0.5} value={testFrac} onChange={(e) => setTestFrac(+e.target.value)} className={`${input} w-14`} /></label>
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">Sessions (freely selectable subset — datasets may overlap):</div>
            <div className="flex flex-wrap gap-2">
              {active.length === 0 ? <span className="text-xs text-zinc-500">none aktiven Sessions</span> : active.map((s: any) => (
                <label key={s.session_id} className="flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  <input type="checkbox" checked={!!sel[s.session_id]} onChange={(e) => setSel((p) => ({ ...p, [s.session_id]: e.target.checked }))} />
                  {s.session_id} <span className="text-zinc-500">({s.n_crops})</span>
                </label>
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={build} disabled={buildM.isPending}><Hammer className="h-4 w-4" /> {buildM.isPending ? "Baue…" : "Build"}</Button>
        </div>
      )}

      {datasets.length === 0 ? <span className="text-sm text-zinc-500">Noch kein Dataset gebaut.</span> : (
        <table className="w-full text-sm">
          <thead><tr className="text-zinc-500">
            <th className="text-left font-normal">Dataset</th><th className="text-right font-normal">Sessions</th>
            <th className="text-right font-normal">roh→dedup→final</th><th className="text-right font-normal">train/val/test</th>
            <th className="text-right font-normal">Action</th>
          </tr></thead>
          <tbody>
            {datasets.map((d: any) => (
              <tr key={d.name} className="border-t border-zinc-800">
                <td className="py-1.5 text-zinc-200">{d.name}{d.rotations?.some((r: number) => r) && <span className="ml-2 text-[10px] text-zinc-500">+rot</span>}</td>
                <td className="text-right tabular-nums text-zinc-400">{d.n_sessions}</td>
                <td className="text-right tabular-nums text-zinc-400">{d.counts?.raw}→{d.counts?.after_dedup}→{d.counts?.final}</td>
                <td className="text-right tabular-nums text-zinc-400">{d.split_counts?.train ?? "?"}/{d.split_counts?.val ?? "?"}/{d.split_counts?.test ?? "?"}</td>
                <td className="py-1"><div className="flex justify-end gap-1.5">
                  <NavLink to={`../stats?ds=${encodeURIComponent(d.name)}`} className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700">Stats</NavLink>
                  <Button onClick={() => dsRebuildM.mutate(d.name)} className="px-2 py-1 text-xs"><Hammer className="h-3.5 w-3.5" /> Rebuild</Button>
                  <Button onClick={() => window.confirm(`Dataset „${d.name}" löschen?`) && dsDeleteM.mutate(d.name)} className="px-2 py-1 text-xs text-red-300 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// --- Panel 3: Statistik --------------------------------------------------------------
export function StatsPanel() {
  const [params, setParams] = useSearchParams();
  const statsOf = params.get("ds") ?? "";
  const [browse, setBrowse] = useState<{ label: string; crops: any[] } | null>(null);
  const datasetsQ = useQuery({ queryKey: ["datasets"], queryFn: () => api("/api/datasets") });
  const statsQ = useQuery({ queryKey: ["stats", statsOf], queryFn: () => {
    const qs = statsOf ? `?dataset=${encodeURIComponent(statsOf)}` : "";
    return api(`/api/stats${qs}`);
  } });
  const datasets: any[] = datasetsQ.data ?? [];
  const s = statsQ.data;
  if (statsQ.isLoading || !s) return <Card>Stats laden…</Card>;

  const statsOfDs = statsOf ? `Dataset „${statsOf}"` : "global pool";
  const max = Math.max(1, ...Object.values<number>(s.counts ?? { x: 1 }));
  const barColor = (c: string, n: number) =>
    (() => {
      if (c === "empty" || c === "occluded") return "#38bdf8";
      if (n < s.min_samples * 0.5) return "#ef4444";
      if (n < s.min_samples) return "#eab308";
      return "#22c55e";
    })();
  const openClass = (c: string) => {
    const qs = statsOf ? `&dataset=${encodeURIComponent(statsOf)}` : "";
    return api(`/api/class/${c}?limit=120${qs}`).then((d) => setBrowse({ label: c, crops: d.crops }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Class distribution" className="lg:col-span-2" right={
          <select value={statsOf} onChange={(e) => setParams(e.target.value ? { ds: e.target.value } : {})} className={input}>
            <option value="">global pool</option>
            {datasets.map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>}>
          <div className="mb-2 text-xs text-zinc-500">{s.total} Crops · {s.num_sessions} Sessions{statsOf ? ` · Dataset „${statsOf}"` : " · roh"}</div>
          <div className="space-y-1.5">
            {s.classes.map((c: string) => {
              const n = s.counts[c] || 0;
              return (
                <button key={c} onClick={() => openClass(c)} className="grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800">
                  <span className="text-zinc-300"><Glyph label={c} /><span className="ml-1 text-xs text-zinc-500">{c}</span></span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: barColor(c, n) }} /></div>
                  <span className="text-right text-sm tabular-nums text-zinc-400">{n}</span>
                </button>
              );
            })}
          </div>
        </Card>
        <Card title="Light / Dark">
          <table className="w-full text-sm">
            <thead><tr className="text-zinc-500"><th className="text-left font-normal">Klasse</th><th>hell</th><th>dunkel</th></tr></thead>
            <tbody>
              {s.classes.map((c: string) => {
                const cell = (v: number) => v > 0 ? <Check className="mx-auto h-4 w-4 text-green-500" /> : <X className="mx-auto h-4 w-4 text-red-500" />;
                return <tr key={c} className="border-t border-zinc-800"><td className="py-1 text-zinc-300"><Glyph label={c} /> <span className="text-xs text-zinc-500">{c}</span></td><td>{cell(s.light[c] || 0)}</td><td>{cell(s.dark[c] || 0)}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Warnings">
        {s.warnings.length ? <ul className="space-y-1 text-sm">{s.warnings.map((w: string, i: number) => <li key={i} className="flex items-center gap-2 text-amber-400"><AlertTriangle className="h-4 w-4 shrink-0" /> {w}</li>)}</ul> : <span className="text-sm text-green-500">none</span>}
      </Card>

      <Card title={`Browse crops (${statsOfDs})`} right={<span className="flex items-center gap-1 text-xs text-zinc-500"><Images className="h-3.5 w-3.5" />{browse ? `${browse.label} (${browse.crops.length})` : "Click a class"}</span>}>
        {browse ? (
          <div className="grid grid-cols-[repeat(auto-fill,56px)] gap-1.5">
            {browse.crops.map((c: any, i: number) => <img key={i} src={c.url} title={`${c.session_id} ${c.frame} ${c.square}`} alt={`Feld ${c.square}`} className="h-[74px] w-[56px] rounded border border-zinc-800 object-cover" />)}
          </div>
        ) : <span className="text-sm text-zinc-500">Select a class on the left to view crops.</span>}
      </Card>
    </div>
  );
}
