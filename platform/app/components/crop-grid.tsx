"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Crop grid extracted so LABELN stream renders same widget (CONCEPT.md 3.2).
 * Cell grid and board reach different work; folding leaves unsure cells unreachable.
 */

/** One page. Sixty crops is what a desktop screen holds without scrolling past the decision. */
export const PAGE = 60;

/**
 * The smallest a crop may be drawn, in CSS pixels — the grid fits as many columns as that allows.
 *
 * A fixed ten columns is ten crops of ~34 px on a 390 px phone, which is what "die Bilder sind viel
 * zu klein, nahezu unmöglich zu bedienen" (2026-08-13) describes. Three big ones beat ten
 * unreadable ones; the desktop still gets its ten because the same rule fills a wide screen.
 */
export const MIN_CELL = 104;

/** Fetched at 2x so the crop stays sharp on a phone's 3x display — detail IS the decision here. */
export const CROP = 192;

export type GridCell = {
  key: string;
  src: string;
  alt: string;
  /** Bottom-left, always: which square, and the number that raised it. */
  caption: string;
  /** Second line — the audit lane's `predicted` beside the FEN's word (CONCEPT.md 4.2). */
  note?: string;
};

export type CropGridProps = {
  cells: GridCell[];
  cursor: number;
  marked: Set<number>;
  onPick: (index: number) => void;
  /** How many columns `auto-fill` chose — up/down must move by the row the user actually sees. */
  onColumns?: (cols: number) => void;
};

export function CropGrid({ cells, cursor, marked, onPick, onColumns }: CropGridProps) {
  const grid = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  // The column count is the BROWSER's answer, not ours: `auto-fill` decides it from the width.
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () =>
      setCols(Math.max(1, window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cells.length]);
  useEffect(() => onColumns?.(cols), [cols, onColumns]);
  return (
    <div
      className="grid gap-1.5"
      ref={grid}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_CELL}px, 1fr))` }}
    >
      {cells.map((cell, i) => (
        <div
          className={`relative cursor-pointer overflow-hidden rounded border-2 ${
            marked.has(i) ? "border-amber-500" : "border-transparent"
          } ${i === cursor ? "ring-primary ring-2" : ""}`}
          key={cell.key}
          onClick={() => onPick(i)}
          role="button"
          tabIndex={-1}
        >
          <Image
            alt={cell.alt}
            className="h-auto w-full"
            height={CROP}
            src={cell.src}
            unoptimized
            width={CROP}
          />
          <span className="bg-background/70 absolute bottom-0 left-0 px-1 font-mono text-[11px]">
            {cell.caption}
            {cell.note ? <span className="block text-fuchsia-300">{cell.note}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
