/** The one read of a session's board geometry, shared by everything that draws it.
 *
 *  Three components need these rows — the session alignment panel, the per-frame strip and the
 *  hand-set editor — and two of them are keyed on `session:frame`, so they remount on every step.
 *  Fetching per component meant one request per remount for data that only changes when something
 *  is written. A single query key per SESSION collapses that to one request, and a write
 *  invalidates it once for all three.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { Pt } from "./homography";

export type CornerRow = {
  index: number;
  has_corners: boolean;
  corners: number[][] | null;
  /** Worst square's offset from the nominal grid, in rectified pixels. `null` until a scan. */
  align_worst_px: number | null;
  source: string | null;
  from: number | null;
};

export type CornerState = {
  count: number; n_with: number; n_without: number; indices_without: number[];
  corner_names: string[]; frame_size: number[] | null;
  profile: { name: string; board_size: number; margin: number[]; marker_dict: string; white_pov: boolean };
  rows: CornerRow[];
  adopt: { available: boolean; n_target: number; from_index?: number; n_same?: number; source_row_source?: string };
};

/** Query key of one session's geometry — invalidate this after every write. */
export const cornersKey = (sid: string) => ["session-corners", sid];

export function useCorners(sid: string) {
  return useQuery({
    queryKey: cornersKey(sid),
    queryFn: () => api<CornerState>(`/api/sessions/${encodeURIComponent(sid)}/corners`),
    enabled: !!sid,
    staleTime: 60_000,
  });
}

/** A quad as the `pts=` query parameter every geometry endpoint takes. */
export const ptsParam = (quad: Pt[]) =>
  quad.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(",");

/** The preview endpoint for one quad — pure string building, kept out of the components. */
export function buildPreviewUrl(enc: string, idx: number, quad: Pt[], rotate: number,
                                seeded: boolean, fs: number[]): string {
  return `/api/sessions/${enc}/corners/preview/${idx}?pts=${ptsParam(quad)}`
    + `&rotate=${rotate}&normalize=${seeded ? "false" : "true"}&fs=${fs.join(",")}`;
}
