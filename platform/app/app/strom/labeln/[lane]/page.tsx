import { notFound } from "next/navigation";
import { LANES, laneBySlug } from "@/lib/lanes";

export const dynamic = "force-static";

export function generateStaticParams() {
  return LANES.map((l) => ({ lane: l.slug }));
}

/** The route exists so a lane has a URL; the stream itself renders in the layout above. */
export default async function LanePage({ params }: { params: Promise<{ lane: string }> }) {
  if (!laneBySlug((await params).lane)) notFound();
  return null;
}
