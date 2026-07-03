import { useEffect, useRef, useState } from "react";
import {
  Wand2, Loader2, CheckCircle2, AlertTriangle, Trash2, Box, Image as ImageIcon, Maximize2,
  Upload,
} from "lucide-react";
import { api, post, del } from "../api";
import { Card, Button } from "./ui";
import { ModelViewer } from "./ModelViewer";

const input =
  "rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";

type Piece = {
  piece: string; source_dir: string | null; has_preview: boolean; has_clay: boolean; report: any;
};
type Models = {
  scans: { dir: string; mesh: string | null; texture: string | null; photos: number; clean?: boolean }[];
  pieces: Piece[];
  jobs?: { prepare?: string | null };
};
type PrepStatus = {
  state: "idle" | "running" | "done" | "failed";
  piece: string | null; dir?: string | null; report?: any; level?: string; messages?: string[]; log_tail?: string;
};

const PIECES = ["P", "N", "B", "R", "Q", "K", "wP", "wN", "wB", "wR", "wQ", "wK",
                "bP", "bN", "bB", "bR", "bQ", "bK"];
const PIECE_NAMES: Record<string, string> = {
  P: "Bauer", N: "Springer", B: "Läufer", R: "Turm", Q: "Dame", K: "König",
};

function suggestPiece(folder: string): string | null {
  const m = folder.match(/^([wb]?)([PNBRQK])$/i);
  if (!m) return null;
  const type = m[2].toUpperCase();
  return m[1] ? m[1].toLowerCase() + type : type;
}
function pieceLabel(p: string): string {
  const type = p.length === 2 ? p[1] : p[0];
  let col = "";
  if (p.length === 2) {
    col = p[0] === "w" ? "weiß " : "schwarz ";
  }
  return col + (PIECE_NAMES[type] ?? p);
}

type Scan = Models["scans"][number];
type Stage = "mesh" | "done";
function scanStage(s: Scan, pieces: Piece[]): { stage: Stage; piece: string | null } {
  const sug = suggestPiece(s.dir);
  const prepared = pieces.find((p) => p.source_dir === s.dir)
    ?? (sug ? pieces.find((p) => p.piece.toLowerCase() === sug.toLowerCase() && !p.source_dir) : undefined);
  if (prepared) return { stage: "done", piece: prepared.piece };
  if (s.mesh) return { stage: "mesh", piece: sug };
  return { stage: "mesh", piece: sug };
}

/** Figuren-Werkstatt: Upload → vorbereiten → renderfertige Figur. */
export default function Scan() {
  const [models, setModels] = useState<Models | null>(null);
  const [dir, setDir] = useState("");
  const [piece, setPiece] = useState("P");
  const [prep, setPrep] = useState<PrepStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState<"textured" | "clay">("textured");
  const [view3d, setView3d] = useState<string | null>(null);
  const [meshFile, setMeshFile] = useState<File | null>(null);
  const [texFile, setTexFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const timer = useRef<any>(null);

  const refresh = () => api<Models>("/api/scan/models").then((m) => {
    setModels(m);
    if (!dir && m.scans.length) selectScan(m.scans[0], m.pieces);
  }).catch(() => {});

  function selectScan(s: Scan, pieces = models?.pieces ?? []) {
    setDir(s.dir);
    const { piece: sug } = scanStage(s, pieces);
    setPiece(sug ?? "P");
  }

  async function deleteScan(d: string) {
    if (!confirm(`Scan „${d}" mit Mesh wirklich löschen?`)) return;
    await del(`/api/scan/scan/${d}`).catch(() => {});
    if (dir === d) setDir("");
    refresh();
  }
  async function deletePiece(p: string) {
    if (!confirm(`Vorbereitete Figur „${p}" löschen? (Der Scan bleibt erhalten.)`)) return;
    await del(`/api/scan/piece/${p}`).catch(() => {});
    setPrep(null);
    refresh();
  }

  async function doUpload() {
    if (!meshFile || !uploadName) return;
    setUploading(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("name", uploadName);
      form.append("mesh", meshFile);
      if (texFile) form.append("texture", texFile);
      const r = await fetch("/api/scan/upload", { method: "POST", body: form });
      if (!r.ok) throw new Error(((await r.json()) as any)?.detail || `HTTP ${r.status}`);
      await refresh();
      setDir(uploadName);
      setUploadName("");
      setMeshFile(null);
      setTexFile(null);
    } catch (e: any) { setMsg("Upload: " + e.message); }
    setUploading(false);
  }

  const pollPrep = () => api<PrepStatus>("/api/scan/prepare/status").then((s) => {
    setPrep(s);
    if (s.state !== "running") { clearInterval(timer.current); refresh(); }
  }).catch(() => {});

  useEffect(() => {
    refresh();
    api<PrepStatus>("/api/scan/prepare/status").then((s) => {
      if (s.state === "running") { setPrep(s); timer.current = setInterval(pollPrep, 2000); }
    }).catch(() => {});
    return () => { clearInterval(timer.current); };
  }, []);

  async function run() {
    setMsg("");
    try {
      await post("/api/scan/prepare", { dir, piece });
      setPrep({ state: "running", piece });
      clearInterval(timer.current);
      timer.current = setInterval(pollPrep, 2000);
    } catch (e: any) { setMsg("Fehler: " + e.message); }
  }

  const scans = models?.scans ?? [];
  const cur = scans.find((s) => s.dir === dir);
  const curInfo = cur ? scanStage(cur, models?.pieces ?? []) : null;
  const stage = curInfo?.stage;
  const busyPrep = prep?.state === "running";
  const step = stage === "done" ? 2 : 1;
  let prepButtonLabel: string;
  if (busyPrep) { prepButtonLabel = "läuft…"; }
  else if (stage === "done") { prepButtonLabel = "Neu vorbereiten"; }
  else { prepButtonLabel = "Vorbereiten"; }
  let resultPiece: string | null;
  if (curInfo?.stage === "done") { resultPiece = curInfo.piece; }
  else if (prep?.state === "done") { resultPiece = prep.piece; }
  else { resultPiece = null; }

  return (
    <div className="space-y-4">
      <Card title="Figuren-Werkstatt — 3D-Scan → Figur">
        {/* Stepper */}
        <div className="mb-4 flex items-center gap-1 text-xs">
          {[[1, "Upload", Upload], [2, "Vorbereiten", Wand2]].map(
            ([n, label, Icon]: any, i) => (
              <div key={n} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  step >= n ? "bg-sky-500/15 text-sky-300" : "bg-zinc-800 text-zinc-500"}`}>
                  <Icon className="h-3.5 w-3.5" /> <span>{label}</span>
                </div>
                {i < 1 && <div className={`h-px w-4 ${step > n ? "bg-sky-500/40" : "bg-zinc-700"}`} />}
              </div>
            ))}
        </div>

        {scans.length === 0 && (
          <p className="text-sm text-zinc-500">Noch keine Scans. Lade ein 3D-Modell (.obj/.glb) hoch —
            es erscheint dann hier als Karte.</p>
        )}

        <MeshUploadSection uploadName={uploadName} setUploadName={setUploadName}
          meshFile={meshFile} setMeshFile={setMeshFile} texFile={texFile} setTexFile={setTexFile}
          uploading={uploading} doUpload={doUpload} input={input} />

        <ScanCardGrid scans={scans} models={models} dir={dir} selectScan={selectScan} deleteScan={deleteScan}
          prep={prep} />

        {cur && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{cur.dir}</div>
                  <div className="text-xs text-zinc-500">
                    {cur.mesh ? "Mesh vorhanden" : "noch kein Mesh"}
                    {!cur.texture && cur.mesh ? " · ⚠ ohne Textur" : ""}</div>
                </div>
                <button onClick={() => deleteScan(cur.dir)} title="Scan löschen"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-4 w-4" /></button>
              </div>
              <Button variant="primary" onClick={run} disabled={busyPrep}>
                {busyPrep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {prepButtonLabel}</Button>
            </div>

            <ReconPrepStatus cur={cur} busyPrep={busyPrep} prep={prep} />
            {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}
          </div>
        )}

        {/* Fertige Figuren-Galerie */}
        <FinishedPiecesGrid pieces={models?.pieces} setView3d={setView3d} deletePiece={deletePiece}
          prep={prep} variant={variant} setVariant={setVariant} />
      </Card>

      {/* 3D-Vollbild */}
      {view3d && <ModelModal piece={view3d} textured={variant === "textured"} onClose={() => setView3d(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MeshUploadSection({ uploadName, setUploadName, meshFile, setMeshFile, texFile, setTexFile,
  uploading, doUpload, input }: any) {
  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">3D-Modell hochladen (.obj/.glb)</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Name
          <input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
            placeholder="z.B. wK" className={`${input} w-32`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Mesh (.obj/.glb)
          <input type="file" accept=".obj,.glb,.gltf" onChange={(e) => setMeshFile(e.target.files?.[0] ?? null)}
            className="text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Textur (optional)
          <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => setTexFile(e.target.files?.[0] ?? null)}
            className="text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200" />
        </label>
        <Button variant="primary" onClick={doUpload} disabled={uploading || !meshFile || !uploadName}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Hochladen
        </Button>
      </div>
    </div>
  );
}

function ScanCardGrid({ scans, models, dir, selectScan, deleteScan, prep }: {
  scans: Models["scans"]; models: Models | null; dir: string;
  selectScan: (s: Scan, pieces?: Piece[]) => void; deleteScan: (d: string) => void;
  prep: PrepStatus | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {scans.map((s) => {
        const info = scanStage(s, models?.pieces ?? []);
        const active = s.dir === dir;
        const jobPrep = (prep?.state === "running" && prep.dir === s.dir) || models?.jobs?.prepare === s.dir;
        const busy = jobPrep;
        const badge = busy
          ? ["wird vorbereitet…", "bg-sky-500/20 text-sky-300"]
          : ({
              mesh: ["Mesh bereit", "bg-sky-500/15 text-sky-300"],
              done: ["Fertig", "bg-green-500/15 text-green-300"],
            } as Record<string, [string, string]>)[info.stage];
        const prep_ = info.piece && info.stage === "done";
        return (
          <div key={s.dir} onClick={() => selectScan(s)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScan(s); } }}
            className={`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${
              active ? "border-sky-500 bg-sky-500/5" : "border-zinc-800 hover:border-zinc-600"}`}>
            <div className="relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950">
              {prep_
                ? <img src={`/api/scan/prepare/preview/${info.piece}`} alt={`${pieceLabel(info.piece)} Vorschau`} className="h-full w-full object-contain" />
                : <div className="grid h-full place-items-center text-zinc-700"><Box className="h-8 w-8" /></div>}
              <span className={`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge[1]}`}>
                {busy && <Loader2 className="h-3 w-3 animate-spin" />}{badge[0]}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteScan(s.dir); }}
                title="Scan-Ordner löschen"
                className="absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block">
                <Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="text-sm font-medium text-zinc-200">{s.dir}</div>
            <div className="text-[11px] text-zinc-500">
              {info.piece ? ` · ${pieceLabel(info.piece)}` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function ModelModal({ piece, textured, onClose }: { piece: string; textured: boolean; onClose: () => void }) {
  const [tex, setTex] = useState(textured);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6">
      <div onClick={(e) => e.stopPropagation()} role="presentation"
        onKeyDown={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-3">
        <ModelViewer piece={piece} textured={tex} size={Math.min(720, window.innerHeight - 160)} />
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="font-medium">{piece}</span>
          <VariantToggle value={tex ? "textured" : "clay"} onChange={(v) => setTex(v === "textured")} />
          <span className="text-xs text-zinc-500">ziehen = drehen · Rad = zoomen · Esc = schließen</span>
        </div>
      </div>
    </div>
  );
}

function ReconPrepStatus({ cur, busyPrep, prep }: {
  cur: Scan; busyPrep: boolean; prep: PrepStatus | null;
}) {
  return (
    <>
      {busyPrep && (
        <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Bereite Figur vor (upright + OBJ + Preview) — ca. 10–60 s…</div>
      )}
      {prep?.state === "failed" && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Vorbereitung fehlgeschlagen.</div>
          {prep.log_tail && <pre className="mt-1 whitespace-pre-wrap text-xs text-red-400/70">{prep.log_tail}</pre>}</div>
      )}
    </>
  );
}

function FinishedPiecesGrid({ pieces, setView3d, deletePiece, prep, variant, setVariant }: {
  pieces: Piece[] | undefined; setView3d: (p: string) => void; deletePiece: (p: string) => void;
  prep: PrepStatus | null; variant: "textured" | "clay"; setVariant: (v: "textured" | "clay") => void;
}) {
  if (!pieces?.length) return null;
  return (
    <div className="mt-4 border-t border-zinc-800 pt-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">Fertige Figuren (synth_pieces/)</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pieces.map((p) => {
          const busyThis = prep?.state === "running" && prep.piece === p.piece;
          return (
            <div key={p.piece}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
              <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950">
                {p.has_preview
                  ? <img src={`/api/scan/prepare/preview/${p.piece}${variant === "clay" ? "?variant=clay" : ""}`}
                    alt={`${pieceLabel(p.piece)}`} className="h-full w-full object-contain" />
                  : <div className="grid h-full place-items-center text-zinc-700"><ImageIcon className="h-8 w-8" /></div>}
                <button onClick={() => setView3d(p.piece)}
                  title="3D-Ansicht öffnen"
                  className="absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white">
                  <Maximize2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{pieceLabel(p.piece)}</span>
                {busyThis && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />}
              </div>
              <VariantToggle value={variant} onChange={setVariant} clayDisabled={!p.has_clay} />
              {p.report && (
                <ReportSection piece={p.piece} report={p.report} level={p.report?.level}
                  messages={p.report?.messages} onDelete={deletePiece} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportSection({ piece, report, level, messages, onDelete }: {
  piece: string; report: any; level: string | undefined; messages: string[] | undefined; onDelete: (p: string) => void;
}) {
  if (!report || !report.tris) return null;
  return (
    <div className="mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400">
      {level && (
        <div className={`mb-1 flex items-center gap-1 font-medium ${
          level === "ok" ? "text-green-400" : "text-amber-400"}`}>
          {level === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {level === "ok" ? "Qualität OK" : "Bitte prüfen"}</div>
      )}
      {(messages ?? []).map((m, i) => <div key={i} className="text-amber-300/90">• {m}</div>)}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1">
        <span className="text-zinc-500">Dreiecke</span><span>{report.tris}</span>
        <span className="text-zinc-500">offene Kanten</span><span>{report.boundary_edges}</span>
        <span className="text-zinc-500">Höhe/Basis</span><span>{report.height_ratio}</span>
      </div>
      <div className="pt-1 text-zinc-500">→ synth_pieces/{piece}.obj</div>
      <button onClick={() => onDelete(piece)}
        className="mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" /> Figur löschen</button>
    </div>
  );
}

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
