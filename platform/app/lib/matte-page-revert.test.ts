// Die Matte-Lane hatte keinen Rueckweg fuer eine versehentlich abgeschickte Seite (Nutzer, 2026-09-17).
import { describe, expect, it } from "vitest";
import { commitPage, revertPage } from "@/lib/label/matte-page";

describe("eine geschriebene Seite zuruecknehmen", () => {
  const page = ["s|000100", "s|000103", "s|000106"];

  it("nimmt genau die Urteile zurueck, die der Commit geschrieben hat", () => {
    const plan = commitPage(page, new Set(["s|000103"]), new Set(["s|000106"]));
    const back = revertPage(plan);

    expect(back.verdicts).toEqual([
      { key: "s|000100", verdict: "matte-ok" },
      { key: "s|000103", verdict: "matte-bad" },
      { key: "s|000106", verdict: "matte-clean" },
    ]);
  });

  it("nennt die Frames, deren Alpha zurueckzuholen ist — nur `matte-clean` hat eines geleert", () => {
    const plan = commitPage(page, new Set(["s|000103"]), new Set(["s|000106"]));

    expect(revertPage(plan).restore).toEqual(["s|000106"]);
  });

  it("stellt die Marken wieder her, die der Commit von der Seite genommen hat", () => {
    const plan = commitPage(page, new Set(["s|000103", "andere|1"]), new Set(["s|000106"]));
    const back = revertPage(plan);

    // `andere|1` lag nie auf dieser Seite und darf nicht doppelt zurueckkommen.
    expect([...back.marked]).toEqual(["s|000103"]);
    expect([...back.clean]).toEqual(["s|000106"]);
  });
});
