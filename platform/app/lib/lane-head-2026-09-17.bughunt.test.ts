import { describe, expect, it } from "vitest";
import { modelPickable, pageClaim, pageCounts, type PageCell } from "@/app/strom/labeln/page-head";
import { laneCells, type LaneCell } from "@/lib/label/lanes";
import type { LabelStream } from "@/lib/label/label-stream";

const cell = (over: Partial<LaneCell>): LaneCell => ({
  session: 0,
  pos: 0,
  stem: "000100",
  square: "a1",
  fen_label: "wP",
  label: "wP",
  ledger: "reviewed",
  exception: null,
  caption: "a1 · FEN wP",
  ...over,
});

const page = (over: Partial<PageCell>): PageCell => ({
  pick: undefined,
  judged: false,
  useless: false,
  hasModel: false,
  ...over,
});

describe("der Kopf spricht fuer die Seite, nicht fuer ihre erste Karte", () => {
  // Die Bloecke der Strittig-Lane sind aneinandergehaengt, eine Seite von 60 laeuft also mitten
  // durch: Karte 1 ohne Modellwort verschwieg das Modellwort aller anderen.
  it("nennt das Modellwort auch, wenn die erste Karte keines traegt", () => {
    const slice = [cell({}), cell({ square: "b2", exception: "bQ" })];
    expect(pageClaim(slice).models).toEqual(["bQ"]);
  });

  it("nennt beide Vorbelegungen, wenn die Seite ueber eine Ledger-Grenze laeuft", () => {
    const slice = [cell({}), cell({ square: "b2", ledger: "corrections", label: "empty" })];
    expect(pageClaim(slice).preselect).toBe("FEN stimmt · empty");
  });
});

describe("Modell hat recht auf einer Karte ohne Modellwort", () => {
  // `accept` schreibt fuer sie nichts — dann darf der Klick sie auch nicht als beantwortet fuehren.
  it("ist keine Antwort", () => {
    expect(modelPickable(cell({}))).toBe(false);
    expect(modelPickable(cell({ exception: "bQ" }))).toBe(true);
  });

  it("zaehlt im Kopf nicht als Antwort", () => {
    expect(pageCounts([page({ pick: "model", hasModel: false })]).model).toBe(0);
  });
});

describe("der ⏎-Zaehler zaehlt, was er schreibt", () => {
  // `accept` nimmt unbrauchbare Zellen aus BEIDEN Schreibwegen; der Kopf versprach sie trotzdem.
  it("laesst unbrauchbare Zellen aus taken und painted", () => {
    const counts = pageCounts([
      page({}),
      page({ useless: true }),
      page({ pick: "class", useless: true }),
      page({ pick: "class" }),
    ]);
    expect(counts.taken).toBe(1);
    expect(counts.painted).toBe(1);
    expect(counts.useless).toBe(2);
  });
});

describe("die Stellungs-Karten sind die, die kein Modellwort haben", () => {
  it("traegt exception null und ledger corrections", () => {
    const stream = {
      audit: [],
      hands: [],
      positions: [
        { session: 0, pos: 0, stem: "000100", square: "e4", fen_label: "wP", dev: 61, reason: "timing" },
      ],
      cells: [],
      coverage: [{}],
    } as unknown as LabelStream;
    const [c] = laneCells(stream, "audit");
    expect(c.exception).toBeNull();
    expect(c.ledger).toBe("corrections");
    expect(modelPickable(c)).toBe(false);
  });
});
