import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { SQUARES } from "@/components/board-paint";
import { SquareRing } from "@/components/square-ring";

/** Die beiden Kopien, die `SquareRing` abgeloest hat, als Markup — die Referenz der Paritaet. */
const legacyMobile = (square: string) =>
  h("div", { className: "pointer-events-none absolute inset-0 grid grid-cols-8" },
    SQUARES.map((sq: string) => h("div", { className: sq === square ? "ring-2 ring-fuchsia-400 ring-inset" : "", key: sq })));
const legacyPeek = (square: string) => {
  const at = SQUARES.indexOf(square);
  return at >= 0
    ? h("div", { className: "absolute inset-0 grid grid-cols-8" },
      SQUARES.map((sq, i) => h("div", { className: i === at ? "ring-primary ring-2 ring-inset" : "", key: sq })))
    : null;
};
const html = (node: ReturnType<typeof h> | null) => (node === null ? "" : renderToStaticMarkup(node));

test.each(["a8", "e4", "h1"])("SquareRing zeichnet %s wie die Kopie der Handy-Sortierung", (sq) => {
  expect(html(h(SquareRing, { square: sq, ring: "ring-2 ring-fuchsia-400 ring-inset", passive: true })))
    .toBe(html(legacyMobile(sq)));
});

test.each(["a8", "e4", "h1", "z9"])("SquareRing zeichnet %s wie die Kopie der Brett-Lupe", (sq) => {
  expect(html(h(SquareRing, { square: sq, ring: "ring-primary ring-2 ring-inset" })))
    .toBe(html(legacyPeek(sq)));
});

test("genau ein Feld traegt den Ring, an seinem Platz", () => {
  const out = html(h(SquareRing, { square: "b7", ring: "R" }));
  expect(out.match(/class="R"/g)).toHaveLength(1);
  expect(out.split("<div").slice(2)[SQUARES.indexOf("b7")]).toMatch(/^ class="R"/);
});
