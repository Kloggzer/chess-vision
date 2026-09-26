import { useEffect, useRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TOUCH } from "@/components/ui/button";
import { useWindowKeys } from "@/components/use-window-keys";

/** Ohne DOM: ein Hand-Renderer fuer useRef/useEffect (Slots nach Aufrufreihenfolge, Effekte nach
 *  dem Rendern, Deps per Object.is) und ein `window`, das nur Listener zaehlt. */
type Slot = { ref?: { current: unknown }; deps?: unknown[]; cleanup?: unknown };
const slots: Slot[] = [];
let at = 0;
let pending: (() => void)[] = [];
vi.mock("react", () => ({
  useRef: (init: unknown) => (slots[at++] ??= { ref: { current: init } }).ref,
  useEffect: (fn: () => unknown, deps?: unknown[]) => {
    const s = (slots[at++] ??= {});
    if (deps && s.deps && deps.every((d, i) => Object.is(d, s.deps![i]))) return;
    s.deps = deps;
    pending.push(() => {
      if (typeof s.cleanup === "function") s.cleanup();
      s.cleanup = fn();
    });
  },
}));

const listeners = new Set<(e: KeyboardEvent) => void>();
let added = 0;
beforeEach(() => {
  slots.length = 0;
  listeners.clear();
  added = 0;
  vi.stubGlobal("window", {
    addEventListener: (_: string, f: (e: KeyboardEvent) => void) => (added++, listeners.add(f)),
    removeEventListener: (_: string, f: (e: KeyboardEvent) => void) => listeners.delete(f),
  });
});
afterEach(() => vi.unstubAllGlobals());

const render = (hook: () => void) => {
  at = 0;
  hook();
  const run = pending;
  pending = [];
  run.forEach((f) => f());
};
const press = (key: string) => listeners.forEach((f) => f({ key } as KeyboardEvent));

/** Die Registrierung, wie sie woertlich in `labeln/stream.tsx` und `zuege/stream.tsx` stand. */
function useLegacyKeys(onKey: (event: KeyboardEvent) => void) {
  const handler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    handler.current = onKey;
  });
}

test.each([["alte Kopie", useLegacyKeys], ["useWindowKeys", useWindowKeys]])(
  "%s: EIN Listener, er ruft den Handler des LETZTEN Renders, Abbau entfernt ihn",
  (_, hook) => {
    const seen: string[] = [];
    for (const name of ["erster", "zweiter", "dritter"]) render(() => hook((e) => seen.push(`${name}:${e.key}`)));
    press("k");
    expect(seen).toEqual(["dritter:k"]);
    expect(added).toBe(1);
    slots.forEach((s) => typeof s.cleanup === "function" && s.cleanup());
    expect(listeners.size).toBe(0);
  },
);

test("TOUCH ist die Klasse, die sieben Dateien einzeln trugen", () => {
  expect(TOUCH).toBe("max-sm:h-11 max-sm:px-3");
});
