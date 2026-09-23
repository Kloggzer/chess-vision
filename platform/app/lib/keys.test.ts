import { expect, test } from "vitest";
import { inField, pageKey } from "@/lib/keys";

/** Die Waechter, wie sie in fuenf Tastatur-Handlern standen — die Referenz der Paritaet. */
function legacyField(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}
const legacyPage = (event: KeyboardEvent) =>
  !(event.metaKey || event.ctrlKey || event.altKey) && !legacyField(event);

const TARGETS = [null, {}, { tagName: "INPUT" }, { tagName: "TEXTAREA" }, { tagName: "SELECT" },
  { tagName: "BUTTON" }, { tagName: "DIV" }, { tagName: "BODY" }];
const MODS = [{}, { metaKey: true }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }];
const EVENTS = TARGETS.flatMap((target) =>
  MODS.map((mods) => ({ key: "z", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods, target }) as unknown as KeyboardEvent));

test("inField und pageKey entscheiden jede Kombination wie die alten Kopien", () => {
  expect(EVENTS.map(inField)).toEqual(EVENTS.map(legacyField));
  expect(EVENTS.map(pageKey)).toEqual(EVENTS.map(legacyPage));
});

test("ein Feld behaelt seine Taste, ein Modifier gehoert dem Browser, Umschalt nicht", () => {
  const ev = (target: unknown, mods = {}) => ({ key: "z", ...mods, target }) as unknown as KeyboardEvent;
  expect(inField(ev({ tagName: "TEXTAREA" }))).toBe(true);
  expect(inField(ev({ tagName: "DIV" }))).toBe(false);
  expect(pageKey(ev({ tagName: "DIV" }, { ctrlKey: true }))).toBe(false);
  expect(pageKey(ev({ tagName: "DIV" }, { shiftKey: true }))).toBe(true);
  expect(pageKey(ev(null))).toBe(true);
});
