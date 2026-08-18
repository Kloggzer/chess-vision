import { PageTitle } from "@/app/page-title";
import { Progress } from "@/components/progress";
import { loadVerifyStream } from "@/lib/verify";
import { MatteReview } from "./review";

export const dynamic = "force-dynamic";

/**
 * Zwei Fragen pro Frame: stimmt das Alpha, stimmt die Stellung. Occlusion wird nicht mehr gemalt.
 */
export default async function MattePage() {
  const stream = await loadVerifyStream();
  return (
    <main className="space-y-3">
      <PageTitle title="Matte prüfen">
        <Progress done={stream.progress.done} total={stream.progress.frames} unit="Frames" />
      </PageTitle>
      <MatteReview stream={stream} />
    </main>
  );
}
