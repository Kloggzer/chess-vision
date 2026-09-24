import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FailureLine } from "@/components/failure-line";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { failureParts, logName } from "@/lib/failure";

/** Die Kopie aus `transfers/board.tsx`, die `FailureLine` abgeloest hat — die Referenz der Paritaet. */
const legacyTransfers = (reason: string, tone: string) => {
  const { text, log } = failureParts(reason);
  return h(Tooltip, null,
    h(TooltipTrigger, { asChild: true },
      h("span", { className: `${tone} min-w-0 truncate` },
        text, log ? h("span", { className: "text-muted-foreground" }, " · ", logName(log)) : null)),
    h(TooltipContent, null, reason));
};
const html = (node: ReturnType<typeof h>) => renderToStaticMarkup(node);

const WITH_LOG = String.raw`label failed — see C:\data\logs\label-0412.log`;
const WITH_EXIT = String.raw`replay refused "C:\x\y.mp4" (exit 3, C:\data\logs\replay.log)`;
const PLAIN = "kein Kandidat";

test.each([WITH_LOG, WITH_EXIT, PLAIN])("FailureLine zeichnet %s wie die Transfer-Kopie", (reason) => {
  for (const tone of ["text-destructive", "text-muted-foreground"]) {
    expect(html(h(FailureLine, { reason, className: `${tone} min-w-0` }))).toBe(html(legacyTransfers(reason, tone)));
  }
});

test("die Kette zeigt den Log-Namen neben dem Satz, nie den Pfad", () => {
  const out = html(h(FailureLine, { reason: WITH_LOG, className: "text-destructive max-w-sm" }));
  expect(out).toContain('class="text-destructive max-w-sm truncate"');
  expect(out).toContain("label failed");
  expect(out).toContain("label-0412.log");
  expect(out).not.toContain(String.raw`C:\data`);
});
