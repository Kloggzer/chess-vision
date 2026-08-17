"use client";

import { GLYPH, STREAM_PALETTE } from "@/components/board-paint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type PaletteRowProps = {
  /** The loaded brush, where the renderer keeps one — a cell lane writes on the spot and has none. */
  active?: string;
  disabled?: boolean;
  onPick: (label: string) => void;
};

/** Nur die Kürzel: vierzehn ausgeschriebene Klassennamen sind eine Zeile Lärm über dem Bild. */
export function PaletteRow({ active, disabled, onPick }: PaletteRowProps) {
  return (
    <>
      {STREAM_PALETTE.map(([key, label]) => {
        const on = active === label;
        return (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <button
                className={`w-11 cursor-pointer rounded border py-0.5 text-center font-mono text-xs disabled:cursor-default disabled:opacity-40 max-sm:h-11 ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
                disabled={disabled}
                onClick={(event) => {
                  event.currentTarget.blur();
                  onPick(label);
                }}
                type="button"
              >
                {key} <span className="text-sm">{GLYPH[label] ?? ""}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
