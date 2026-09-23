import { SQUARES } from "@/components/board-paint";

type SquareRingProps = { square: string; ring: string; passive?: boolean };

/** Ein Ring um EIN Feld, ueber ein fertiges Brettbild gelegt; ein unbekanntes Feld zeichnet nichts. */
export function SquareRing({ square, ring, passive = false }: SquareRingProps) {
  if (!SQUARES.includes(square)) return null;
  return (
    <div className={`${passive ? "pointer-events-none " : ""}absolute inset-0 grid grid-cols-8`}>
      {SQUARES.map((sq) => (
        <div className={sq === square ? ring : ""} key={sq} />
      ))}
    </div>
  );
}
