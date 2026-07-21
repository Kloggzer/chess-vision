import { useEffect, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, AlertTriangle, Images, Archive, ArchiveRestore, Trash2, Scissors, Loader2,
  Boxes, Hammer, RotateCw, Eye, EyeOff, ChevronLeft, ChevronRight, CheckCircle2, Circle,
} from "lucide-react";
import { api, post, del } from "../api";
import { Card, Button, Glyph, noteCls } from "./ui";

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

const spinner = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
const isBusy = (m: any, sid: string) => m.isPending && (m.variables === sid || m.variables?.sid === sid);
const reviewedIcon = (busy: boolean, reviewed: boolean) => {
  if (busy) return spinner;
  return reviewed ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />;
};

// Per-session action buttons. Extracted so the session-row map stays simple (and under the
// cognitive-complexity gate) now that there's a review toggle alongside slice/archive/delete.
function SessionActions({ m, openReview, reviewedM, sliceM, archiveM, restoreM, deleteM }: any) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button onClick={() => openReview(m.session_id)} disabled={!m.n_frames}
              className="px-2 py-1 text-xs disabled:opacity-50">
        <Eye className="h-3.5 w-3.5" /> Review
      </Button>
      <Button onClick={() => reviewedM.mutate({ sid: m.session_id, reviewed: !m.reviewed })}
              disabled={reviewedM.isPending} className="px-2 py-1 text-xs disabled:opacity-50">
        {reviewedIcon(isBusy(reviewedM, m.session_id), m.reviewed)} {m.reviewed ? "Mark new" : "Mark reviewed"}
      </Button>
      {!m.archived && (
        <Button onClick={() => sliceM.mutate(m.session_id)} disabled={sliceM.isPending}
                className="px-2 py-1 text-xs disabled:opacity-50">
          {isBusy(sliceM, m.session_id) ? spinner : <Scissors className="h-3.5 w-3.5" />} {m.n_crops ? "Re-slice" : "Slice"}
        </Button>
      )}
      {m.archived
        ? <Button onClick={() => restoreM.mutateAsync(m.session_id)} disabled={restoreM.isPending}
                  className="px-2 py-1 text-xs disabled:opacity-50">
            {isBusy(restoreM, m.session_id) ? spinner : <ArchiveRestore className="h-3.5 w-3.5" />} Restore
          </Button>
        : <Button onClick={() => archiveM.mutateAsync(m.session_id)} disabled={archiveM.isPending}
                  className="px-2 py-1 text-xs disabled:opacity-50">
            {isBusy(archiveM, m.session_id) ? spinner : <Archive className="h-3.5 w-3.5" />} Archive
          </Button>}
      <Button onClick={() => window.confirm(`Delete session "${m.session_id}" permanently?`) && deleteM.mutateAsync(m.session_id)}
              disabled={deleteM.isPending}
              className="px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50">
        {isBusy(deleteM, m.session_id) ? spinner : <Trash2 className="h-3.5 w-3.5" />} Delete
      </Button>
    </div>
  );
}

// --- Panel 1: Sessions (Rohmaterial) -------------------------------------------------
export function SessionsPanel() {
  const invalidate = useInvalidate();
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"ok" | "err" | "busy" | "">("");
  const [reviewSid, setReviewSid] = useState("");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showReviewed, setShowReviewed] = useState(false);
  const sessionsQ = useQuery({ queryKey: ["sessions-manage"], queryFn: () => api("/api/sessions/manage") });
  const reviewQ = useQuery({
    queryKey: ["session-review", reviewSid, reviewIdx],
    queryFn: () => api(`/api/sessions/${encodeURIComponent(reviewSid)}/review?idx=${reviewIdx}`),
    enabled: !!reviewSid,
    staleTime: 60_000,          // prefetched neighbours must not refetch on step
  });
  // Preload the neighbouring review steps (metadata + both images) so stepping
  // through a session needs no load pause: the overlay/board URLs are
  // deterministic per index, so warming an Image() populates the browser cache
  // the <img> tags then hit instantly (server sends Cache-Control for these).
  const qc = useQueryClient();
  useEffect(() => {
    const count = (reviewQ.data as any)?.count ?? 0;
    if (!reviewSid || !count) return;
    const sid = encodeURIComponent(reviewSid);
    for (const off of [1, 2, 3, -1]) {
      const i = reviewIdx + off;
      if (i < 0 || i >= count) continue;
      qc.prefetchQuery({
        queryKey: ["session-review", reviewSid, i],
        queryFn: () => api(`/api/sessions/${sid}/review?idx=${i}`),
        staleTime: 60_000,
      });
      new Image().src = `/api/sessions/${sid}/overlay/${i}`;
      new Image().src = `/api/sessions/${sid}/board/${i}`;
    }
  }, [reviewSid, reviewIdx, reviewQ.data, qc]);
  const all: any[] = sessionsQ.data ?? [];
  const cameraSessions = all.filter((m) => !m.variant);
  // Hide reviewed sessions by default so only NEW ones need attention (toggle to reveal them).
  const sessions = cameraSessions.filter((m) => showReviewed || !m.reviewed);
  const newCount = cameraSessions.filter((m) => !m.reviewed).length;
  const reviewedCount = cameraSessions.length - newCount;
  const ingested = all.filter((m) => m.variant);
  const emptyMsg = cameraSessions.length === 0
    ? "No sessions yet — capture some in the Collect tab."
    : "No new sessions — all reviewed. Tick “Show reviewed” to see them.";

  const onOk = (msg: string) => { setNote(msg); setNoteKind("ok"); invalidate("sessions-manage", "stats", "datasets"); };
  const onErr = (e: any) => { setNote("Error: " + e.message); setNoteKind("err"); };
  const onBusy = (msg: string) => { setNote(msg); setNoteKind("busy"); };
  const sliceM = useMutation({ mutationFn: (sid: string) => post(`/api/sessions/${sid}/slice`), onMutate: (sid: string) => onBusy(`slicing "${sid}" ...`), onSuccess: (r: any) => onOk(`"${r.session}" sliced: ${r.crops} crops.`), onError: onErr });
  const openReview = (sid: string) => {
    setReviewSid(sid);
    setReviewIdx(0);
  };
  const closeReview = () => {
    setReviewSid("");
    setReviewIdx(0);
  };
  const review: any = reviewQ.data;
  const reviewSummary = (() => {
    if (review) {
      const move = review.entry?.move_san ? ` | ${review.entry.move_san}` : "";
      const ply = review.entry?.ply !== undefined ? ` | ply ${review.entry.ply}` : "";
      return `Frame ${review.index + 1} / ${review.count}${move}${ply}`;
    }
    if (reviewQ.isError) return "Could not load session details.";
    return "Loading session details...";
  })();
  const archiveM = useMutation({ mutationFn: (sid: string) => post(`/api/sessions/${sid}/archive`), onSuccess: () => onOk("archived."), onError: onErr });
  const restoreM = useMutation({ mutationFn: (sid: string) => post(`/api/sessions/${sid}/restore`), onSuccess: () => onOk("restored — re-slice."), onError: onErr });
  const deleteM = useMutation({ mutationFn: (sid: string) => del(`/api/sessions/${sid}`), onSuccess: () => onOk("deleted."), onError: onErr });
  const trimM = useMutation({
    mutationFn: ({ sid, keep_frames }: { sid: string; keep_frames: number }) => post(`/api/sessions/${sid}/trim`, { keep_frames }),
    onSuccess: (r: any) => {
      onOk(`trimmed "${r.session_id}": kept ${r.kept_frames}, moved ${r.removed_frames} to rejects.`);
      setReviewIdx((i) => Math.min(i, Math.max(0, r.kept_frames - 1)));
      invalidate("session-review");
    },
    onError: onErr,
  });
  const flagM = useMutation({
    mutationFn: ({ sid, idx, unusable }: { sid: string; idx: number; unusable: boolean }) =>
      post(`/api/sessions/${sid}/flag/${idx}`, { unusable }),
    onSuccess: () => { invalidate("session-review", "sessions-manage"); },
    onError: onErr,
  });
  const reviewedM = useMutation({
    mutationFn: ({ sid, reviewed }: { sid: string; reviewed: boolean }) =>
      post(`/api/sessions/${sid}/reviewed`, { reviewed }),
    onSuccess: (r: any) => onOk(r.reviewed ? "marked reviewed." : "marked new."),
    onError: onErr,
  });

  return (
    <Card title="Sessions (raw material)" right={
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <label className="flex cursor-pointer items-center gap-1.5 text-zinc-400">
          <input type="checkbox" checked={showReviewed}
                 onChange={(e) => setShowReviewed(e.target.checked)}
                 className="accent-sky-500" />
          Show reviewed ({reviewedCount})
        </label>
        <span>{newCount} new / {ingested.length} ingested</span>
      </div>
    }>
      {note && (
        <div className={`mb-2 rounded-lg px-3 py-1.5 text-sm ${noteCls(noteKind)}`}>{note}</div>
      )}
      {sessions.length === 0 ? <span className="text-sm text-zinc-500">{emptyMsg}</span> : (
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
                  {m.reviewed && <span className="ml-2 rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-300">reviewed</span>}
                  {!m.reviewed && <span className="ml-2 rounded bg-sky-900/60 px-1.5 py-0.5 text-[10px] text-sky-300">new</span>}
                  {m.archived && <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">archived</span>}
                  {!m.archived && m.n_crops === 0 && <span className="ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300">not sliced</span>}
                </td>
                <td className="text-zinc-400">{m.mode ?? "—"}</td>
                <td className="text-right tabular-nums text-zinc-400">{m.n_frames}</td>
                <td className="text-right tabular-nums text-zinc-400">{m.archived ? "—" : m.n_crops}</td>
                <td className="py-1">
                  <SessionActions m={m} openReview={openReview} reviewedM={reviewedM}
                                  sliceM={sliceM} archiveM={archiveM} restoreM={restoreM} deleteM={deleteM} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {reviewSid && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-zinc-200">{reviewSid}</div>
              <div className="text-xs text-zinc-500">
                {reviewSummary}
              </div>
              {review && (
                <div className="text-[11px] text-zinc-600">
                  Trim keeps this frame included; only frames after it move to the reject bucket and leave training data.
                  {review.index >= review.count - 1 ? " This is already the last frame." : ""}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button onClick={() => setReviewIdx((i) => Math.max(0, i - 1))}
                      disabled={!review || review.index <= 0}
                      className="px-2 py-1 text-xs disabled:opacity-50"
                      title="Previous frame">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button onClick={() => setReviewIdx((i) => Math.min((review?.count ?? 1) - 1, i + 1))}
                      disabled={!review || review.index >= review.count - 1}
                      className="px-2 py-1 text-xs disabled:opacity-50"
                      title="Next frame">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={closeReview} className="px-2 py-1 text-xs">
                <X className="h-3.5 w-3.5" /> Close
              </Button>
              <Button onClick={() => flagM.mutate({ sid: reviewSid, idx: review.index, unusable: !review?.entry?.unusable })}
                      disabled={!review || flagM.isPending}
                      className={`px-2 py-1 text-xs disabled:opacity-50 ${review?.entry?.unusable ? "bg-red-900/60 text-red-300 hover:text-red-200" : ""}`}
                      title="Mark this frame as unsuitable for training (hand visible, extra piece, etc.). Excluded from slice/dataset build.">
                {flagM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                {review?.entry?.unusable ? "Unusable (flagged)" : "Unusable?"}
              </Button>
              <Button onClick={() => {
                        const keep = (review?.index ?? 0) + 1;
                        if (window.confirm(`Keep frames 1-${keep}, including the current frame. Move all later frames to the reject bucket and remove them from training data?`)) {
                          trimM.mutate({ sid: reviewSid, keep_frames: keep });
                        }
                      }}
                      disabled={!review || review.index >= review.count - 1 || trimM.isPending}
                      className="px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
                      title="Keeps the current frame; moves only later frames to the reject bucket and removes their crops from training data">
                {trimM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                Keep through this frame
              </Button>
            </div>
          </div>
          {reviewQ.isError && (
            <div className="rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300">{(reviewQ.error as Error).message}</div>
          )}
          {review && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium text-zinc-500">
                  ArUco-aligned frame{review.overlay_available ? "" : " (raw fallback)"}
                </div>
                <img src={review.overlay_url} alt={`${reviewSid} overlay ${review.index + 1}`} className="max-h-[70vh] w-full rounded border border-zinc-800 object-contain" />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-zinc-500">Logged board</div>
                <img src={review.board_url} alt={`${reviewSid} board ${review.index + 1}`} className="max-h-[70vh] w-full rounded border border-zinc-800 bg-zinc-100 object-contain" />
                <div className="mt-2 break-all rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500">{review.entry?.fen}</div>
              </div>
            </div>
          )}
        </div>
      )}
      {ingested.length > 0 && (
        <>
          <div className="mt-5 mb-1 text-sm font-medium text-zinc-300">Ingested datasets (pretrain variants)</div>
          <p className="mb-2 text-xs text-zinc-500">
            Imported via <code>chesslab ingest</code>. Their crops live in a separate variant
            manifest (<code>squares__&lt;tag&gt;.jsonl</code>) and never mix with your camera
            dataset — train on them with <code>train --dataset &lt;tag&gt;</code>. No slicing here.
          </p>
          <table className="w-full text-sm">
            <thead><tr className="text-zinc-500">
              <th className="text-left font-normal">Session</th><th className="text-left font-normal">Variant</th>
              <th className="text-right font-normal">Frames</th><th className="text-right font-normal">Variant crops</th>
              <th className="text-right font-normal">Action</th>
            </tr></thead>
            <tbody>
              {ingested.map((m) => (
                <tr key={m.session_id} className="border-t border-zinc-800">
                  <td className="py-1.5 text-zinc-200">{m.session_id}
                    {m.archived && <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">archived</span>}
                  </td>
                  <td><span className="rounded bg-indigo-950/60 px-1.5 py-0.5 text-[10px] text-indigo-300">{m.variant}</span></td>
                  <td className="text-right tabular-nums text-zinc-400">{m.n_frames}</td>
                  <td className="text-right tabular-nums text-zinc-400">{m.n_crops}</td>
                  <td className="py-1"><div className="flex justify-end gap-1.5">
                    <Button onClick={() => { if (window.confirm(`Delete ingested session "${m.session_id}"? (variant crops stay; re-ingest to recreate)`)) deleteM.mutateAsync(m.session_id); }}
                            disabled={deleteM.isPending}
                            className="px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50">
                      {deleteM.isPending && deleteM.variables === m.session_id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />} Delete
                    </Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}

// --- Panel 2: Curated datasets --------------------------------------------------
export function DatasetsPanel() {
  const invalidate = useInvalidate();
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"ok" | "err" | "busy" | "">("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [cap, setCap] = useState(4);
  const [phash, setPhash] = useState(true);
  const [hamming, setHamming] = useState(6);
  // Default ON since 2026-07-21: the no-rotate build starved the finetune (4x less train
  // data) and rotation rescued rare classes (bK recall 0 -> 0.28). val/test stay rot-0.
  const [rotate, setRotate] = useState(true);
  const [valFrac, setValFrac] = useState(0.15);
  const [testFrac, setTestFrac] = useState(0.15);
  // Sessions pinned to the TRAIN split (fixed-position captures like the all-empty
  // lighting sessions — in val/test they would distort board metrics).
  const [pinTrain, setPinTrain] = useState<Record<string, boolean>>({});

  const sessionsQ = useQuery({ queryKey: ["sessions-manage"], queryFn: () => api("/api/sessions/manage") });
  const datasetsQ = useQuery({ queryKey: ["datasets"], queryFn: () => api("/api/datasets") });
  const active = (sessionsQ.data ?? []).filter((s: any) => !s.archived && !s.variant);
  const datasets: any[] = datasetsQ.data ?? [];

  const buildM = useMutation({
    mutationFn: (body: any) => post("/api/datasets", body),
    onSuccess: (r: any) => {
      const extras = [
        r.hard_empty_protected ? `${r.hard_empty_protected} hard empties protected` : "",
        r.force_train?.length ? `${r.force_train.length} session(s) pinned to train` : "",
      ].filter(Boolean).map((s) => ` · ${s}`).join("");
      setNote(`"${r.name}" built: raw ${r.counts.raw} → dedup ${r.counts.after_dedup} → final ${r.counts.final}${extras}.`);
      setNoteKind("ok"); setOpen(false); setName(""); setSel({}); setPinTrain({}); invalidate("datasets", "stats");
    },
    onError: (e: any) => { setNote("Error: " + e.message); setNoteKind("err"); },
  });
  const dsDeleteM = useMutation({ mutationFn: (n: string) => del(`/api/datasets/${n}`), onSuccess: () => { setNote("deleted."); setNoteKind("ok"); invalidate("datasets"); }, onError: (e: any) => { setNote("Error: " + e.message); setNoteKind("err"); } });
  const dsRebuildM = useMutation({ mutationFn: (n: string) => post(`/api/datasets/${n}/rebuild`), onSuccess: (r: any) => { setNote(`"${r.name}" rebuilt: ${r.counts?.final} crops.`); setNoteKind("ok"); invalidate("datasets", "stats"); }, onError: (e: any) => { setNote("Error: " + e.message); setNoteKind("err"); } });

  function build() {
    const session_ids = active.filter((s: any) => sel[s.session_id]).map((s: any) => s.session_id);
    if (!name.trim() || session_ids.length === 0) { setNote("Name and at least one session required."); return; }
    const force_train = session_ids.filter((sid: string) => pinTrain[sid]);
    buildM.mutate({ name: name.trim(), session_ids, per_cell_cap: cap, phash_enabled: phash, phash_hamming: hamming, rotate, val_frac: valFrac, test_frac: testFrac, force_train });
  }

  return (
    <Card title="Curated datasets" right={<div className="flex items-center gap-2">
      {note && <span className={`rounded-lg px-2 py-0.5 text-xs ${noteCls(noteKind)}`}>{note}</span>}
      <Button onClick={() => setOpen((o) => !o)} className="px-2 py-1 text-xs"><Boxes className="h-3.5 w-3.5" /> New Dataset</Button>
    </div>}>
      {open && (
        <div className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-zinc-400">Name<input value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-40`} placeholder="e.g. set-a" /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400" title="max. crops per (session, square, piece)">Cap/cell<input type="number" min={1} value={cap} onChange={(e) => setCap(+e.target.value)} className={`${input} w-16`} /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" checked={phash} onChange={(e) => setPhash(e.target.checked)} /> pHash</label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">Hamming<input type="number" min={0} max={32} value={hamming} disabled={!phash} onChange={(e) => setHamming(+e.target.value)} className={`${input} w-14`} /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400" title="On by default: 90/180/270° augmentation (4× train crops on disk, val/test stay unrotated). Proven to rescue rare classes (bK) and feed small-model finetunes — turn off only for a minimal A/B build."><input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} /> <RotateCw className="h-3.5 w-3.5" /> Rotation</label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">val<input type="number" step={0.05} min={0} max={0.5} value={valFrac} onChange={(e) => setValFrac(+e.target.value)} className={`${input} w-14`} /></label>
            <label className="flex items-center gap-1 text-xs text-zinc-400">test<input type="number" step={0.05} min={0} max={0.5} value={testFrac} onChange={(e) => setTestFrac(+e.target.value)} className={`${input} w-14`} /></label>
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">
              Sessions (collected only — datasets may overlap):
              <button className="ml-2 text-[10px] text-zinc-400 underline" onClick={() => { const all: Record<string,boolean> = {}; active.forEach((s: any) => all[s.session_id] = true); setSel(all); }}>Select all</button>
              <button className="ml-2 text-[10px] text-zinc-400 underline" onClick={() => setSel({})}>Clear</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {active.length === 0 ? <span className="text-xs text-zinc-500">no active sessions</span> : active.map((s: any) => (
                <label key={s.session_id} className="flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  <input type="checkbox" checked={!!sel[s.session_id]} onChange={(e) => setSel((p) => ({ ...p, [s.session_id]: e.target.checked }))} />
                  {s.session_id} <span className="text-zinc-500">({s.n_crops})</span>
                  {sel[s.session_id] && (
                    <button type="button" title="Pin to TRAIN split — for fixed-position captures (e.g. all-empty lighting sessions): in val/test they would distort board metrics."
                            onClick={(e) => { e.preventDefault(); setPinTrain((p) => ({ ...p, [s.session_id]: !p[s.session_id] })); }}
                            className={`rounded px-1 text-[10px] ${pinTrain[s.session_id] ? "bg-amber-900/70 text-amber-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                      {pinTrain[s.session_id] ? "train ✓" : "pin→train"}
                    </button>
                  )}
                </label>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              The mined hard-empty keep list (data/manifests/hard_empty.jsonl) is applied automatically — protected crops survive the empty cap.
            </div>
          </div>
          <Button variant="primary" onClick={build} disabled={buildM.isPending}>
            {buildM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />} {buildM.isPending ? "Building…" : "Build"}</Button>
        </div>
      )}

      {datasets.length === 0 ? <span className="text-sm text-zinc-500">No dataset built yet.</span> : (
        <table className="w-full text-sm">
          <thead><tr className="text-zinc-500">
            <th className="text-left font-normal">Dataset</th><th className="text-right font-normal">Sessions</th>
            <th className="text-right font-normal">raw→dedup→final</th><th className="text-right font-normal">train/val/test</th>
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
                  <Button onClick={() => dsRebuildM.mutateAsync(d.name)}
                          disabled={dsRebuildM.isPending}
                          className="px-2 py-1 text-xs disabled:opacity-50">
                    {dsRebuildM.isPending && dsRebuildM.variables === d.name
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Hammer className="h-3.5 w-3.5" />} Rebuild
                  </Button>
                  <Button onClick={() => { if (window.confirm(`Delete dataset "${d.name}"?`)) dsDeleteM.mutateAsync(d.name); }}
                          disabled={dsDeleteM.isPending}
                          className="px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50">
                    {dsDeleteM.isPending && dsDeleteM.variables === d.name
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />} Delete
                  </Button>
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
  const [browseErr, setBrowseErr] = useState("");
  if (statsQ.isLoading || !s) return <Card title="Stats">Loading…</Card>;

  const statsOfDs = statsOf ? `Dataset "${statsOf}"` : "global pool";
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
    setBrowseErr("");
    api(`/api/class/${c}?limit=120${qs}`).then((d) => setBrowse({ label: c, crops: d.crops })).catch((e: any) => setBrowseErr(e.message));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Class distribution" className="lg:col-span-2" right={
          <select value={statsOf} onChange={(e) => setParams(e.target.value ? { ds: e.target.value } : {})} className={input}>
            <option value="">global pool</option>
            {datasets.map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>}>
          <div className="mb-2 text-xs text-zinc-500">{s.total} crops · {s.num_sessions} sessions{statsOf ? ` · Dataset "${statsOf}"` : " · raw"}</div>
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
            <thead><tr className="text-zinc-500"><th className="text-left font-normal">Class</th><th>light</th><th>dark</th></tr></thead>
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
        {browseErr && <div className="mb-2 rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300">{browseErr}</div>}
        {browse && statsOf && (
          <img src={`/api/datasets/${statsOf}/montage/${browse.label}?n=64`} key={`${statsOf}-${browse.label}`}
               alt={`${browse.label} montage`} title={`64 sample ${browse.label} crops (from the packed memmap)`}
               className="mb-3 max-w-xl rounded-lg border border-zinc-800" />
        )}
        {browse ? (
          <div className="grid grid-cols-[repeat(auto-fill,56px)] gap-1.5">
            {browse.crops.map((c: any, i: number) => c.url ? (
              <img key={i} src={c.url} title={`${c.session_id} ${c.frame} ${c.square}`} alt={`square ${c.square}`} className="h-[74px] w-[56px] rounded border border-zinc-800 object-cover" />
            ) : (
              // Fused datasets (mm:// crops) have no image files — the memmap holds the pixels.
              <div key={i} title={`${c.session_id} ${c.frame} ${c.square} — packed (no file)`} className="flex h-[74px] w-[56px] items-center justify-center rounded border border-dashed border-zinc-700 text-[9px] text-zinc-600">packed</div>
            ))}
          </div>
        ) : <span className="text-sm text-zinc-500">Select a class on the left to view crops.</span>}
      </Card>
    </div>
  );
}
