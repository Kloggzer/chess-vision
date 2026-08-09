import type { Correction, Ledger } from "@/lib/corrections";

/** One POST, one flush. The route validates; a rejected batch must be visible, not swallowed. */
export async function writeRows(rows: Correction[], ledger: Ledger = "corrections"): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await fetch("/api/corrections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows, ledger }),
  });
  const body = (await res.json()) as { written?: number; error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.written ?? 0;
}
