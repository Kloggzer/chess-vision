/** FEN -> per-square labels. Pure, so the client components can read it too. */
export const FILES = "abcdefgh";

const PIECES: Record<string, string> = {
  P: "wP", N: "wN", B: "wB", R: "wR", Q: "wQ", K: "wK",
  p: "bP", n: "bN", b: "bB", r: "bR", q: "bQ", k: "bK",
};

/** `{a1: "wR", a2: "wP", …}` over all 64 squares, `empty` where nothing stands. */
export function fenLabels(fen: string): Record<string, string> {
  const out: Record<string, string> = {};
  const ranks = fen.split(" ")[0].split("/");
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of ranks[r] ?? "") {
      if (ch >= "1" && ch <= "8") file += Number(ch);
      else out[`${FILES[file++]}${8 - r}`] = PIECES[ch] ?? "empty";
    }
  }
  for (let r = 1; r <= 8; r++) for (const f of FILES) out[`${f}${r}`] ??= "empty";
  return out;
}
