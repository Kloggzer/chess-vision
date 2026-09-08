import { notFound, redirect } from "next/navigation";
import { LANES, laneBySlug, lanePath } from "@/lib/lanes";

export const dynamic = "force-static";

/** Die neun Lanes von vor 2026-09-07, auf die drei gefaltet — ein Lesezeichen darf nicht 404en. */
const MOVED: Record<string, string> = {
  "modell-bretter": "alle",
  "fen-unklar": "alle",
  regelbruch: "alle",
  "modell-zellen": "audit",
  hand: "audit",
  stellung: "audit",
};

export function generateStaticParams() {
  return [...LANES.map((l) => ({ lane: l.slug })), ...Object.keys(MOVED).map((lane) => ({ lane }))];
}

/** The route exists so a lane has a URL; the stream itself renders in the layout above. */
export default async function LanePage({ params }: { params: Promise<{ lane: string }> }) {
  const { lane } = await params;
  if (laneBySlug(lane)) return null;
  const moved = MOVED[lane];
  if (!moved) notFound();
  redirect(lanePath(laneBySlug(moved)!.id));
}
