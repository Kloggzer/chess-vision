import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MissingBox } from "@/components/missing-box";

/** Die beiden Kaesten aus `strom/labeln/mobile-sort.tsx` vor der Zusammenlegung. */
const legacy = (text: string) =>
  h("div", {
    className:
      "border-destructive/60 bg-destructive/10 text-destructive flex h-full w-full items-center justify-center border p-3 text-center font-mono text-sm",
  }, text);

test.each(["Brett fehlt — 000123", "Crop fehlt — e4 @ 000123"])("MissingBox zeichnet %s wie die Kopie", (text) => {
  expect(renderToStaticMarkup(h(MissingBox, null, text))).toBe(renderToStaticMarkup(legacy(text)));
});
