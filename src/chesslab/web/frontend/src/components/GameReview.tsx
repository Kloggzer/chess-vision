import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, Lock, LockOpen, SkipForward, Trash2, X,
} from "lucide-react";
import { api, post } from "../api";
import { Button, Card, Select, noteCls } from "./ui";

/*  Reviewing a game the tracker already played, not entering one.
 *
 *  The tracker was guessing for most of it — 55 of 91 commits in the game this was built for came
 *  through `cnn_recovery`, i.e. "position was LOST, rebuilt by the CNN, not detected" — so the
 *  reviewer's job is to find the wrong moves and this panel's job is to say where to look. Hence a
 *  game score with a board beside it, which is the shape every chess player already has, and a
 *  worklist that jumps to the doubtful plies in order instead of making anyone scroll for them.
 *
 *  Everything chess-shaped is the server's: the board is a `chess.svg` `<img>` (there is no chess
 *  library in the frontend and this is not the reason to add one), the legality verdicts come from
 *  a `python-chess` replay, and a correction is PICKED from the legal moves rather than typed, so
 *  an illegal correction is unrepresentable.
 */

const TIER_STYLE: Record<string, string> = {
  impossible: "bg-red-900/70 text-red-200",
  rebuilt: "bg-amber-900/60 text-amber-200",
  alarmed: "bg-fuchsia-900/60 text-fuchsia-200",
  rest: "bg-zinc-800 text-zinc-400",
};
const TIER_LABEL: Record<string, string> = {
  impossible: "impossible",
  rebuilt: "rebuilt",
  alarmed: "alarm",
  rest: "quiet",
};
const cellCls = "rounded px-1.5 py-0.5 text-left font-mono text-sm transition";
const selCls = "rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100";
// Illegal is red because the machine can PROVE it; unevaluated is grey because it is downstream
// of a break and says nothing about the move itself.
const VERDICT_CLS: Record<string, string> = { illegal: "text-red-300", unevaluated: "text-zinc-500" };
const VERDICT_HINT: Record<string, string> = {
  unevaluated: " — not evaluated: an earlier ply does not replay",
};
/** " (+2)" / " (−1)" / "" — the reviewer has to know which neighbour they are looking at. */
function offsetLabel(offset: number): string {
  if (!offset) return "";
  return ` (${offset > 0 ? "+" : ""}${offset})`;
}

type Ply = {
  ply: number; san: string; verdict: string; tier: string; reviewed: boolean;
  decider: string | null; reason: string; alarm: unknown; frame: number | null; t: number | null;
};
type Game = {
  name: string; confirmed: boolean; alarm_is_polled: boolean; first_illegal: number | null;
  plies: Ply[]; order: number[]; counts: Record<string, number>;
  start_fen: string | null; note: string; geometry: any; clock: any;
};

/** Two columns of SAN with a badge on every doubtful ply — an ordinary game score. */
function Score({ plies, sel, onSel }: { plies: Ply[]; sel: number; onSel: (p: number) => void }) {
  const rows = useMemo(() => {
    const out: { no: number; w?: Ply; b?: Ply }[] = [];
    for (const p of plies) {
      const no = Math.ceil(p.ply / 2);
      const row = out[out.length - 1]?.no === no ? out[out.length - 1] : (out.push({ no }), out[out.length - 1]);
      if (p.ply % 2) row.w = p; else row.b = p;
    }
    return out;
  }, [plies]);

  const cell = (p?: Ply) => {
    if (!p) return <span className="text-zinc-700">—</span>;
    const active = p.ply === sel;
    return (
      <button onClick={() => onSel(p.ply)}
              title={`${p.reason}${VERDICT_HINT[p.verdict] ?? ""}`}
              className={`${cellCls} ${active ? "bg-sky-900/70 text-sky-100" : "text-zinc-200 hover:bg-zinc-800"}`}>
        <span className={VERDICT_CLS[p.verdict] ?? ""}>{p.san}</span>
        {p.tier !== "rest" && (
          <span className={`ml-1.5 rounded px-1 py-0.5 text-[9px] ${TIER_STYLE[p.tier]}`}>{TIER_LABEL[p.tier]}</span>
        )}
        {p.reviewed && <Check className="ml-1 inline h-3 w-3 text-emerald-400" />}
      </button>
    );
  };

  return (
    <div className="max-h-[60vh] overflow-y-auto rounded border border-zinc-800 bg-zinc-950/50 p-2">
      <table className="w-full">
        <tbody>
          {rows.map((r) => (
            <tr key={r.no}>
              <td className="w-8 py-0.5 pr-1 text-right font-mono text-xs text-zinc-600">{r.no}.</td>
              <td className="py-0.5">{cell(r.w)}</td>
              <td className="py-0.5">{cell(r.b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Replace / delete / insert-before, and nothing else. Variations, comments and clock times are
 *  a PGN editor and this is not one. */
function EditPly({ name, ply, onDone }: { name: string; ply: number; onDone: (n: string) => void }) {
  const [op, setOp] = useState<"replace" | "insert">("replace");
  const [uci, setUci] = useState("");
  const legalQ = useQuery({
    queryKey: ["realgame-legal", name, ply, op],
    // `insert` puts the new move BEFORE `ply`, so both operations ask for the same position.
    queryFn: () => api(`/api/realgames/${encodeURIComponent(name)}/legal/${ply}`),
  });
  const moves: { uci: string; san: string }[] = legalQ.data?.moves ?? [];
  // Derived, not reset in an effect: when the ply or the operation changes, the position changes,
  // so a previously picked move is simply not in the new legal set and falls back to "unpicked".
  // Resetting it from a `useEffect` renders the stale value once before correcting it.
  const pick = moves.some((m) => m.uci === uci) ? uci : "";

  const send = async (body: any) => {
    const r = await post(`/api/realgames/${encodeURIComponent(name)}/move`, body);
    onDone(r.detail ?? "changed");
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-zinc-800 bg-zinc-950/50 p-2">
      <span className="text-[11px] text-zinc-500">Ply {ply}</span>
      <Select value={op} onChange={(e) => setOp(e.target.value as any)}>
        <option value="replace">replace with</option>
        <option value="insert">insert before</option>
      </Select>
      <select className={selCls} value={pick} onChange={(e) => setUci(e.target.value)}
              disabled={legalQ.isLoading || !!legalQ.error}>
        <option value="">{legalQ.error ? "position unknown" : `pick one of ${moves.length} legal moves…`}</option>
        {moves.map((m) => <option key={m.uci} value={m.uci}>{m.san}</option>)}
      </select>
      <Button variant="primary" disabled={!pick} className="px-2 py-1 text-xs"
              onClick={() => send({ op, ply, uci: pick })}>
        Apply
      </Button>
      <Button className="px-2 py-1 text-xs text-red-300 hover:text-red-200"
              onClick={() => send({ op: "delete", ply })}
              title="The tracker saw a move that never happened.">
        <Trash2 className="h-3.5 w-3.5" /> Delete this ply
      </Button>
      {legalQ.error && (
        <span className="text-[11px] text-red-300">{(legalQ.error as Error).message}</span>
      )}
    </div>
  );
}

export default function GameReview({ name, onClose }: { name: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [sel, setSel] = useState(1);
  // The neighbour offset belongs to the ply it was chosen on, so it is stored WITH that ply and
  // read back only for it. Resetting it from an effect on `sel` renders the previous ply's offset
  // once and refetches the wrong picture. There is no effect that resets on `name` either: the
  // parent mounts this with `key={name}`, so a different game is a different component instance.
  const [off, setOff] = useState({ ply: 1, v: 0 });
  const offset = off.ply === sel ? off.v : 0;
  const nudge = (d: number) => setOff({ ply: sel, v: offset + d });
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"ok" | "err" | "">("");
  const gameQ = useQuery<Game>({
    queryKey: ["realgame", name],
    queryFn: () => api(`/api/realgames/${encodeURIComponent(name)}`),
  });
  const g = gameQ.data;

  const act = async (fn: () => Promise<any>, ok: string) => {
    try {
      await fn();
      setNote(ok); setNoteKind("ok");
      qc.invalidateQueries({ queryKey: ["realgame", name] });
      qc.invalidateQueries({ queryKey: ["realgames"] });
      qc.invalidateQueries({ queryKey: ["realgame-legal", name] });
    } catch (e) {
      setNote((e as Error).message); setNoteKind("err");
    }
  };

  if (gameQ.isError) {
    return <Card title="Real game"><div className={`px-2 py-1 text-sm ${noteCls("err")}`}>
      {(gameQ.error as Error).message}</div></Card>;
  }
  if (!g) return <Card title="Real game"><div className="text-sm text-zinc-500">Loading…</div></Card>;

  const url = `/api/realgames/${encodeURIComponent(name)}`;
  const open = g.order;
  const nextDoubtful = open.find((p) => p !== sel) ?? open[0];
  const cur = g.plies.find((p) => p.ply === sel);

  return (
    <Card title={`Real game — ${g.name}`} right={
      <div className="flex items-center gap-1.5">
        <Button onClick={() => setSel((p) => Math.max(1, p - 1))} disabled={sel <= 1}
                className="px-2 py-1 text-xs disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /> Prev</Button>
        <Button onClick={() => setSel((p) => Math.min(g.plies.length, p + 1))}
                disabled={sel >= g.plies.length} className="px-2 py-1 text-xs disabled:opacity-50">
          Next <ChevronRight className="h-3.5 w-3.5" /></Button>
        <span className="mx-1 h-5 w-px bg-zinc-800" />
        <Button onClick={() => nextDoubtful && setSel(nextDoubtful)} disabled={!open.length}
                className="px-2 py-1 text-xs disabled:opacity-50"
                title="Jump to the next move the machine was least sure of: impossible first, then rebuilt by the CNN, then alarmed.">
          <SkipForward className="h-3.5 w-3.5" /> Next doubtful ({open.length})
        </Button>
        <Button onClick={() => act(() => post(`${url}/accept-rest`), "The quiet moves are marked reviewed.")}
                className="px-2 py-1 text-xs"
                title="Accept every move the tracker found the ordinary way. Changes no move.">
          <Check className="h-3.5 w-3.5" /> Accept the rest
        </Button>
        <span className="mx-1 h-5 w-px bg-zinc-800" />
        <Button variant={g.confirmed ? "ghost" : "primary"} className="px-2 py-1 text-xs"
                onClick={() => act(() => post(`${url}/confirm`, { confirmed: !g.confirmed }),
                                   g.confirmed ? "Confirmation withdrawn." : "Confirmed — this list may now be exported.")}
                title={g.confirmed
                  ? "Take the confirmation back. Nothing may export an unconfirmed candidate."
                  : "Say this move list is right. Refused while any ply does not replay."}>
          {g.confirmed ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {g.confirmed ? "Un-confirm" : "Confirm as ground truth"}
        </Button>
        <Button onClick={onClose} className="px-2 py-1 text-xs"><X className="h-3.5 w-3.5" /> Close</Button>
      </div>
    }>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded px-1.5 py-0.5 ${g.confirmed ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"}`}>
          {g.confirmed ? "confirmed" : "unconfirmed — not exportable"}
        </span>
        {(["impossible", "rebuilt", "alarmed", "rest"] as const).map((t) => (
          <span key={t} className={`rounded px-1.5 py-0.5 text-[10px] ${TIER_STYLE[t]}`}>
            {TIER_LABEL[t]} {g.counts[t] ?? 0}
          </span>
        ))}
        <span className="text-zinc-500">{g.plies.length} plies</span>
      </div>
      {g.first_illegal !== null && (
        <div className="mb-2 flex items-start gap-2 rounded bg-red-950/60 px-2 py-1.5 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Ply {g.first_illegal} does not replay from the start position, so every move after it
            is shown unevaluated rather than wrong. Fix that ply first — it is the only kind of
            error the machine can prove.
          </span>
        </div>
      )}
      {note && <div className={`mb-2 rounded px-2 py-1 text-xs ${noteCls(noteKind)}`}>{note}</div>}
      {/* The 2026-08-02 game produced exactly this: 9576 frames, zero commits. An empty list is a
          measurement about the tracker, not a broken file, so it says so instead of rendering a
          score with nothing in it and a board route that 404s. */}
      {!g.plies.length && (
        <div className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          The tracker committed no moves on this video, so there is nothing to review. That is a
          result, not an error: it means the deterministic diff path never got started at the
          shipped thresholds. The last thing it said was “{g.note || "—"}”.
        </div>
      )}
      <div className={`grid gap-3 lg:grid-cols-2 ${g.plies.length ? "" : "hidden"}`}>
        <div>
          <Score plies={g.plies} sel={sel} onSel={setSel} />
          {cur && <EditPly name={name} ply={sel} onDone={(d) => act(async () => d, d)} />}
          {cur && (
            <div className="mt-2 space-y-0.5 text-[11px] text-zinc-500">
              <div>Ply {cur.ply} · <span className="text-zinc-300">{cur.san}</span> · {cur.reason}</div>
              {cur.alarm !== null && (
                <div className="text-fuchsia-300">
                  An alarm was latched when this committed. Note: no decision row records that —
                  it was polled from the tracker's status while the replay was driven, so it is an
                  observation this pass made, not something the tracker wrote down.
                </div>
              )}
              <div>frame {cur.frame ?? "—"} · t {cur.t ?? "—"} s</div>
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-500">Position after ply {sel}</div>
          <img src={`${url}/board/${sel}`} alt={`board after ply ${sel}`}
               className="max-h-[45vh] w-full rounded border border-zinc-800 bg-zinc-100 object-contain" />
          <div className="mt-2 mb-1 flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>The frame it committed on{offsetLabel(offset)}</span>
            <span className="flex items-center gap-1">
              <Button onClick={() => nudge(-1)} className="px-1.5 py-0.5 text-[10px]">−</Button>
              <Button onClick={() => setOff({ ply: sel, v: 0 })} disabled={!offset}
                      className="px-1.5 py-0.5 text-[10px] disabled:opacity-40">0</Button>
              <Button onClick={() => nudge(1)} className="px-1.5 py-0.5 text-[10px]">+</Button>
            </span>
          </div>
          {/* The commit frame usually still shows the hand that caused it, which is why the
              neighbours are there. Nothing seeks: these were written during the ingest pass. */}
          <img src={`${url}/frame/${sel}?offset=${offset}`} alt={`frame at ply ${sel}`}
               className="max-h-[45vh] w-full rounded border border-zinc-800 object-contain" />
        </div>
      </div>
    </Card>
  );
}

/** The candidate picker. Separate so `Dataset.tsx` mounts one thing and holds one bit of state. */
export function GameReviewPicker({ selected, onSelect }: {
  selected: string; onSelect: (n: string) => void;
}) {
  const listQ = useQuery({ queryKey: ["realgames"], queryFn: () => api("/api/realgames") });
  const games: any[] = listQ.data?.games ?? [];
  if (!games.length) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-zinc-300">Real games</span>
      <span className="text-xs text-zinc-500">
        Filmed games the tracker proposed a move list for (<code>scripts/label_real_game.py</code>).
        Nothing may export one until a human confirms it.
      </span>
      {games.map((g) => (
        <Button key={g.name} onClick={() => onSelect(selected === g.name ? "" : g.name)}
                className={`px-2 py-1 text-xs ${selected === g.name ? "bg-sky-900/70 text-sky-100" : ""}`}>
          {g.name}
          <span className="ml-1 text-[10px] text-zinc-400">{g.moves} plies</span>
          <span className={`ml-1 rounded px-1 py-0.5 text-[10px] ${g.confirmed ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"}`}>
            {g.confirmed ? "confirmed" : `${g.open} to review`}
          </span>
        </Button>
      ))}
    </div>
  );
}
