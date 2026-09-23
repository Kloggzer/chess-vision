import { redirect } from "next/navigation";
import { DEFAULT_LANE, LANES, laneBySlug, lanePath } from "@/lib/label/lanes";

/** `?lane=<id>` was the link before the lanes became routes — it keeps working, one hop. */
export default async function LabelnIndex({ searchParams }: { searchParams: Promise<{ lane?: string }> }) {
  const { lane } = await searchParams;
  const hit = LANES.find((l) => l.id === lane) ?? laneBySlug(lane ?? "") ?? DEFAULT_LANE;
  redirect(lanePath(hit.id));
}
