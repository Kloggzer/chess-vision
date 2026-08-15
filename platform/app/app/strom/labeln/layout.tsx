import { loadLabelStream } from "@/lib/label-stream";
import { LabelnStream } from "./stream";

export const dynamic = "force-dynamic";

/**
 * The stream lives in the LAYOUT, the lane in the URL below it — so a lane switch is a navigation
 * (Back and bookmarks work) while the layout survives it, and with it the sitting's tally and its
 * undo history. The child page only validates its slug.
 */
export default async function LabelnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LabelnStream stream={await loadLabelStream()} />
    </>
  );
}
