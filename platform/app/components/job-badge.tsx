import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/chain/slot";

const TONE: Record<Job["state"], "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
  skipped: "outline",
  stopped: "outline",
};

export function JobBadge({ state }: { state: Job["state"] }) {
  return <Badge variant={TONE[state]}>{state}</Badge>;
}
