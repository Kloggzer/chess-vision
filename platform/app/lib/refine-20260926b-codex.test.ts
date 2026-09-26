import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useWindowKeys } from "@/components/use-window-keys";
import { pageKey } from "@/lib/keys";

type Slot = { ref?: { current: unknown }; deps?: unknown[]; cleanup?: unknown };
const slots: Slot[] = [];
let slotAt = 0;
let pending: (() => void)[] = [];

vi.mock("react", () => ({
  useRef: (initial: unknown) => (slots[slotAt++] ??= { ref: { current: initial } }).ref,
  useEffect: (effect: () => unknown, deps?: unknown[]) => {
    const slot = (slots[slotAt++] ??= {});
    if (deps && slot.deps && deps.every((dep, i) => Object.is(dep, slot.deps![i]))) return;
    slot.deps = deps;
    pending.push(() => {
      if (typeof slot.cleanup === "function") slot.cleanup();
      slot.cleanup = effect();
    });
  },
}));

const listeners = new Set<(event: KeyboardEvent) => void>();
let adds = 0;

beforeEach(() => {
  slots.length = 0;
  slotAt = 0;
  pending = [];
  listeners.clear();
  adds = 0;
  vi.stubGlobal("window", {
    addEventListener: (_name: string, listener: (event: KeyboardEvent) => void) => {
      adds += 1;
      listeners.add(listener);
    },
    removeEventListener: (_name: string, listener: (event: KeyboardEvent) => void) => {
      listeners.delete(listener);
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

function render(handler: (event: KeyboardEvent) => void) {
  slotAt = 0;
  const hook = useWindowKeys; // a hand renderer, not a component: the hook runs outside React
  hook(handler);
  const effects = pending;
  pending = [];
  effects.forEach((effect) => effect());
}

function press(key: string, tagName: string) {
  const event = {
    key,
    target: { tagName },
    preventDefault: vi.fn(),
    metaKey: false,
    ctrlKey: false,
    altKey: false,
  } as unknown as KeyboardEvent;
  listeners.forEach((listener) => listener(event));
  return event;
}

test("useWindowKeys plus pageKey ignores fields, uses the newest render, and cleans up", () => {
  const seen: string[] = [];
  render((event) => {
    if (pageKey(event)) seen.push(`old:${event.key}`);
  });
  render((event) => {
    if (pageKey(event)) seen.push(`new:${event.key}`);
  });

  press("ArrowRight", "INPUT");
  press("Enter", "TEXTAREA");
  press("x", "SELECT");
  press("ArrowRight", "DIV");

  expect(seen).toEqual(["new:ArrowRight"]);
  expect(adds).toBe(1);
  slots.forEach((slot) => {
    if (typeof slot.cleanup === "function") slot.cleanup();
  });
  expect(listeners.size).toBe(0);
});

test("pageKey keeps the old modifier semantics", () => {
  const plain = press("x", "DIV");
  expect(pageKey(plain)).toBe(true);
  expect(pageKey({ ...plain, ctrlKey: true } as KeyboardEvent)).toBe(false);
  expect(pageKey({ ...plain, altKey: true } as KeyboardEvent)).toBe(false);
  expect(pageKey({ ...plain, metaKey: true } as KeyboardEvent)).toBe(false);
  expect(pageKey({ ...plain, shiftKey: true } as KeyboardEvent)).toBe(true);
});
