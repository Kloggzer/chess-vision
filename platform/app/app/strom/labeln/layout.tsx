import { queryCorpus } from "@/lib/corpus/corpus-query";
import { loadLabelStream } from "@/lib/label/label-stream";
import { DEFAULT_WALL } from "@/lib/query";
import { LabelnStream } from "./stream";

export const dynamic = "force-dynamic";

/**
 * The stream lives in the LAYOUT, the lane in the URL below it — so a lane switch is a navigation
 * (Back and bookmarks work) while the layout survives it, and with it the sitting's tally and its
 * undo history. The child page only validates its slug.
 */
export default async function LabelnLayout({ children }: { children: React.ReactNode }) {
  // The default query is answered HERE, so the Klassenwand chip carries a real number on the first
  // paint instead of a `—` that would read as "nobody was asked" (`lib/label/lanes.ts` NO_QUERY).
  const [stream, wall] = await Promise.all([loadLabelStream(), queryCorpus(DEFAULT_WALL)]);
  return (
    <>
      {children}
      <LabelnStream stream={stream} wall={wall} />
    </>
  );
}
