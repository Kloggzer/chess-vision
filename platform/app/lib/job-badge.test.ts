import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { JobBadge } from "@/components/job-badge";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/chain/slot";

/** Die Tonkarte aus `transfers/board.tsx`; die Job-Seite fuehrte eine abweichende Kopie. */
const TRANSFERS: Record<Job["state"], "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
  skipped: "outline",
  stopped: "outline",
};

test.each(Object.keys(TRANSFERS) as Job["state"][])("JobBadge zeichnet %s wie die Transfer-Tafel", (state) => {
  expect(renderToStaticMarkup(h(JobBadge, { state })))
    .toBe(renderToStaticMarkup(h(Badge, { variant: TRANSFERS[state] }, state)));
});
