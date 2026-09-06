import type { ChainStep } from "@/lib/chain";

/**
 * Every step in the words of what it does (`what`, beside the control) and what it leaves on disk
 * (`hint`, the tooltip). Its own module because `chain-actions.tsx` is `"use client"`: a server
 * component importing the table from there gets a client reference, and every page 500'd.
 */
export const STEP: Record<ChainStep, { label: string; what: string; hint: string }> = {
  "phone-record": {
    label: "Züge vom Handy übernehmen",
    what: "Die am Handy erkannte Zugfolge wird übernommen; nur die Brettgeometrie wird noch aus dem Video gemessen (etwa ein Drittel der Replay-Zeit).",
    hint: "schreibt candidate.json aus files/games + timeline.jsonl",
  },
  label: {
    label: "Züge erkennen",
    what: "Der Tracker spielt das Video ab und schlägt die Zugfolge vor (dauert Minuten).",
    hint: "schreibt candidate.json",
  },
  confirm: {
    label: "Züge prüfen",
    what: "Du siehst jeden vorgeschlagenen Zug mit Bild und bestätigst oder korrigierst ihn.",
    hint: "setzt reviewed_plies in candidate.json — der eine Schritt, den nur ein Mensch kann",
  },
  export: {
    label: "Bretter ausschneiden",
    what: "Aus den bestätigten Zügen wird je Stellung das Brettbild geschnitten — die Grundlage für alles Weitere.",
    hint: "schreibt data/recordings/<name>/boards/ + log.jsonl",
  },
  matte: {
    label: "Hände matten",
    what: "SAM schneidet die Hand aus den verdeckten Bildern, damit die Zellen darunter nicht als Figur gelernt werden.",
    hint: "schreibt mattes/ + matte.jsonl (~12 s pro Frame, der erste kostet Minuten)",
  },
  "model-read": {
    label: "Modell prüfen lassen",
    what: "Ein Modell, das diese Aufnahme nie gesehen hat, liest jede Zelle — so zeigt sich, wo es sich irrt.",
    hint: "schreibt model-reads.jsonl",
  },
  labeln: {
    label: "Zellen labeln",
    what: "Du korrigierst von Hand, was das Modell falsch gelesen hat — Brett für Brett im Strom.",
    hint: "schreibt corrections.jsonl",
  },
};
