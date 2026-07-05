import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Loader2, Square, Trash2, Eye } from "lucide-react";
import { api, post, del } from "../api";
import { Card, Button, Select } from "./ui";
import LineChart from "./LineChart";

const inp = "w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";

export default function Training() {
  const [runs, setRuns] = useState<any[]>([]);
  const [run, setRun] = useState("");
  const [dataset, setDataset] = useState("");
  const [metrics, setMetrics] = useState<any[]>([]);
  const [evals, setEvals] = useState<any>({});
  const [status, setStatus] = useState<any>({ running: false });
  const [err, setErr] = useState("");
  const [backbone, setBackbone] = useState("smallcnn");
  const [head, setHead] = useState("combined");   // combined | factored | twostage (Occupancy→Piece)
  const [epochs, setEpochs] = useState(30);
  const [batchSize, setBatchSize] = useState(256);
  const [lr, setLr] = useState(0.0003);
  const [patience, setPatience] = useState(7);   // Early stopping patience (epochs without macro_recall progress)
  const [resume, setResume] = useState("");   // "" = von Grund auf; sonst Run-Name als Warm-Start
  const timer = useRef<any>(null);

  const datasetsQ = useQuery({ queryKey: ["datasets"], queryFn: () => api("/api/datasets") });
  const datasets: any[] = datasetsQ.data ?? [];
  const picked = datasets.find((d) => d.name === dataset);
  useEffect(() => { if (datasets.length && !dataset) setDataset(datasets[0].name); }, [datasets]);

  const refreshRuns = useCallback(async () => {
    const rs = await api("/api/runs");   // neueste zuerst
    setRuns(rs);
    if (rs.length && !run) showRun(rs[0].run);
  }, [run]);

  useEffect(() => { refreshRuns(); return () => clearInterval(timer.current); }, [refreshRuns]);
  async function showRun(r: string) {
    setRun(r); setErr("");
    try {
      setMetrics((await api(`/api/runs/${r}/metrics`)).metrics);
      setEvals((await api(`/api/runs/${r}/eval`)).evals);
    } catch (e: any) { setErr(e.message); }
  }
  async function delRun(r: string) {
    if (!window.confirm(`Delete model "${r}"? (directory + weights will be removed)`)) return;
    try { await del(`/api/runs/${r}`); } catch (e: any) { setErr(e.message); return; }
    setErr(""); if (run === r) { setRun(""); setMetrics([]); setEvals({}); }
    refreshRuns();
  }
  const pct = (v: number | null | undefined) => (v == null ? "—" : (v * 100).toFixed(1) + " %");
  async function start() {
    setErr("");
    if (!dataset) { setErr("No dataset — build one in the Datasets tab first."); return; }
    try {
      await post("/api/train", { backbone, head, epochs, batch_size: batchSize, lr, patience, no_amp: true, dataset, resume: resume || undefined });
      clearInterval(timer.current);
      timer.current = setInterval(poll, 2500); poll();
    } catch (e: any) { setErr(e.message); }
  }
  async function poll() {
    const s = await api("/api/train/status");
    setStatus(s);
    if (s.metrics?.length) setMetrics(s.metrics);
    if (!s.running) { clearInterval(timer.current); refreshRuns(); }
  }
  async function stop() {
    try { await post("/api/train/stop"); } catch { /* ignore */ }
    clearInterval(timer.current);
    // Endstand des abgebrochenen Runs holen, damit der Teil-Fortschritt sichtbar bleibt
    // (das Run-Verzeichnis mit den geschriebenen Metriken existiert weiter).
    try {
      const s = await api("/api/train/status");
      setStatus({ ...s, running: false });
      if (s.run) setRun(s.run);
      if (s.metrics?.length) setMetrics(s.metrics);
    } catch { setStatus({ running: false, state: "stopped" }); }
    refreshRuns();
  }

  const lossSeries = [
    { name: "train_loss", color: "#ef4444", data: metrics.map((m) => ({ x: m.epoch, y: m.train_loss })) },
    { name: "val_loss", color: "#eab308", data: metrics.map((m) => ({ x: m.epoch, y: m.val_loss ?? 0 })) },
  ];
  const lossMax = Math.max(0.5, ...metrics.map((m) => Math.max(m.train_loss || 0, m.val_loss || 0)));
  const metricSeries = [
    { name: "square_acc", color: "#38bdf8", data: metrics.map((m) => ({ x: m.epoch, y: m.val_acc ?? 0 })) },
    { name: "macro_recall", color: "#22c55e", data: metrics.map((m) => ({ x: m.epoch, y: m.val_macro_recall ?? 0 })) },
    { name: "board_acc", color: "#e4e4e7", data: metrics.map((m) => ({ x: m.epoch, y: m.val_board_acc ?? 0 })) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Dataset" value={dataset} onChange={(e) => setDataset(e.target.value)}>
            {datasets.length === 0 && <option value="">— none built —</option>}
            {datasets.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.counts?.final ?? "?"})</option>)}
          </Select>
          <Select label="Backbone" value={backbone} onChange={(e) => setBackbone(e.target.value)}>
            <option value="smallcnn">smallcnn</option>
            <option value="mobilenet_v3_small">mobilenet_v3_small</option>
          </Select>
          <Select label="Head" value={head} onChange={(e) => setHead(e.target.value)}>
            <option value="combined">combined</option>
            <option value="factored">factored</option>
            <option value="twostage">twostage (Occ→Piece)</option>
          </Select>
          <label className="flex flex-col text-xs text-zinc-400">Epochs<input type="number" min={1} value={epochs} onChange={(e) => setEpochs(+e.target.value)} className={inp} /></label>
          <label className="flex flex-col text-xs text-zinc-400">Batch<input type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(+e.target.value)} className={inp} /></label>
          <label className="flex flex-col text-xs text-zinc-400">LR<input type="number" step={0.0001} min={0} value={lr} onChange={(e) => setLr(+e.target.value)} className={inp} /></label>
          <label className="flex flex-col text-xs text-zinc-400" title="Early stopping: epochs without macro_recall progress before aborting.">Patience<input type="number" min={1} value={patience} onChange={(e) => setPatience(+e.target.value)} className={inp} /></label>
          <Select label="Resume" value={resume} onChange={(e) => setResume(e.target.value)}>
            <option value="">from scratch</option>
            {runs.some((r) => String(r.dataset || "").startsWith("pretrain-")) && (
              <optgroup label="Base models (pretrained)">
                {runs.filter((r) => String(r.dataset || "").startsWith("pretrain-"))
                  .map((r) => <option key={r.run} value={r.run}>🔹 Base · {r.run}</option>)}
              </optgroup>
            )}
            <optgroup label="Own runs">
              {runs.filter((r) => !String(r.dataset || "").startsWith("pretrain-"))
                .map((r) => <option key={r.run} value={r.run}>{r.run}</option>)}
            </optgroup>
          </Select>
          <Button variant="primary" onClick={start} disabled={status.running || !dataset}>
            {status.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start training
          </Button>
          {status.running && <Button onClick={stop}><Square className="h-4 w-4" /> Cancel</Button>}
        </div>
        {picked && <p className="mt-2 text-xs text-zinc-500">Split: train {picked.split_counts?.train ?? "?"} · val {picked.split_counts?.val ?? "?"} · test {picked.split_counts?.test ?? "?"}</p>}
        {(status.running || metrics.length > 0) && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>{(() => {
                if (status.running) return `running… (${status.run})`;
                if (status.state === "stopped" || status.state === "crashed") return "aborted";
                return "Progress";
              })()} · epoch {metrics.length}/{epochs}</span>
              <span>board_acc {metrics.length ? ((metrics[metrics.length - 1].val_board_acc ?? 0) * 100).toFixed(1) + " %" : "—"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full transition-all ${status.state === "stopped" || status.state === "crashed" ? "bg-amber-500" : "bg-sky-500"}`} style={{ width: `${Math.min(100, (metrics.length / Math.max(1, epochs)) * 100)}%` }} /></div>
          </div>
        )}
        {!status.running && status.state === "done" && <p className="mt-2 text-xs text-green-500">done ✓</p>}
        {!status.running && (status.state === "stopped" || status.state === "crashed") && (
          <p className="mt-2 text-xs text-amber-400">
            {status.state === "crashed" ? "aborted (crash)" : "aborted"} at epoch {metrics.length} — partial progress is preserved; "best.pt" saved, "Resume" picks up here.
          </p>
        )}
        {err && <p className="mt-2 text-sm text-amber-400">{err}</p>}
      </Card>

      <Card title="Models" right={<span className="text-xs text-zinc-500">{runs.length} Run(s)</span>}>
        {runs.length === 0 ? <span className="text-sm text-zinc-500">No model trained yet.</span> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-zinc-500">
                <th className="text-left font-normal">Run</th><th className="text-left font-normal">Backbone</th>
                <th className="text-left font-normal">Dataset</th><th className="text-right font-normal">Cls</th>
                <th className="text-right font-normal">Ep.</th>                <th className="text-right font-normal" title="best val board_acc (all 64 squares correct)">board_acc</th>
                <th className="text-right font-normal" title="best val square_acc (fraction of correct squares — drives board_acc ≈ square_acc^64)">square_acc</th>
                <th className="text-right font-normal" title="best val macro_recall">macro_rec</th>
                <th className="text-right font-normal" title="test-set board_acc (after eval)">test</th>
                <th className="text-right font-normal">Action</th>
              </tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.run} className={`border-t border-zinc-800 ${run === r.run ? "bg-zinc-800/50" : ""}`}>
                    <td className="py-1.5 text-zinc-200">{r.run}
                      {r.resumed_from && <span className="ml-1 text-[10px] text-zinc-500" title={`resumed from ${r.resumed_from}`}>↻</span>}
                      {r.has_occluded && <span className="ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300">+occ</span>}
                    </td>
                    <td className="text-zinc-400">{r.backbone}</td>
                    <td className="text-zinc-400">{r.dataset ?? "—"}</td>
                    <td className="text-right tabular-nums text-zinc-400">{r.n_classes}</td>
                    <td className="text-right tabular-nums text-zinc-400">{r.epochs_done}</td>
                    <td className="text-right tabular-nums text-zinc-300">{pct(r.best_board_acc)}</td>
                    <td className="text-right tabular-nums text-zinc-300">{pct(r.best_square_acc)}</td>
                    <td className="text-right tabular-nums text-zinc-300">{pct(r.best_macro_recall)}</td>
                    <td className="text-right tabular-nums text-zinc-300">{pct(r.test_board_acc)}</td>
                    <td className="py-1"><div className="flex justify-end gap-1.5">
                      <Button onClick={() => showRun(r.run)}
                              className="px-2 py-1 text-xs"><Eye className="h-3.5 w-3.5" /> View</Button>
                      <Button onClick={() => delRun(r.run)}
                              className="px-2 py-1 text-xs text-red-300 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">"View" loads curves &amp; eval below · "test" appears after <code>chesslab eval --run …</code> · ↻ = continued training · +occ = model knows "occluded" class.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Loss"><LineChart series={lossSeries} yMin={0} yMax={lossMax} /></Card>
        <Card title="Metrics (0-1) — macro_recall is the honest number">
          <LineChart series={metricSeries} yMin={0} yMax={1} />
        </Card>
      </div>

      <Card title="Evaluation">
        {Object.keys(evals).length ? (
          <div className="space-y-4">
            {Object.entries<any>(evals).map(([split, e]) => {
              const worst = Object.entries<number>(e.recall || {}).sort((a, b) => a[1] - b[1]).slice(0, 3);
              return (
                <div key={split}>
                  <div className="text-sm">
                    <span className="font-medium uppercase text-zinc-400">{split}</span> ·
                    board_acc <b>{(e.board_acc * 100).toFixed(1)}%</b> · square_acc {(e.square_acc * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-zinc-500">weakest classes: {worst.map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(", ")}</div>
                  {e.confusion_png && <img src={e.confusion_png} alt="Confusion Matrix" className="mt-2 max-w-md rounded-lg border border-zinc-800" />}
                </div>
              );
            })}
          </div>
        ) : <span className="text-sm text-zinc-500">No eval yet — <code>chesslab eval --run …</code></span>}
      </Card>

      {status.log_tail && (
        <Card title="Log">
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">{status.log_tail}</pre>
        </Card>
      )}
    </div>
  );
}