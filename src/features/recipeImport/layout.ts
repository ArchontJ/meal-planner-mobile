// Turns OCR blocks of one photo into plain text in reading order, and fixes the misreads
// ML Kit makes most often on Polish cookbooks.

export type Block = { text: string; left: number; top: number; right: number; bottom: number };

type Cut = { gap: number; before: Block[]; after: Block[] };

/** The widest empty strip along one axis ("x": between columns, "y": between rows), if any. */
function widestCut(blocks: Block[], axis: "x" | "y"): Cut | null {
  const start = (b: Block) => (axis === "x" ? b.left : b.top);
  const end = (b: Block) => (axis === "x" ? b.right : b.bottom);
  const sorted = [...blocks].sort((a, b) => start(a) - start(b));
  let best: Cut | null = null;
  let maxEnd = end(sorted[0]!);
  for (let i = 1; i < sorted.length; i++) {
    const gap = start(sorted[i]!) - maxEnd;
    if (gap >= 0 && (!best || gap > best.gap)) best = { gap, before: sorted.slice(0, i), after: sorted.slice(i) };
    maxEnd = Math.max(maxEnd, end(sorted[i]!));
  }
  return best;
}

/**
 * Reading order by recursive XY-cut: always cut along the widest empty strip, so a page splits
 * into title and body first (big gap below the title), then the body into columns (the gap between
 * columns is wider than the gaps between lines that happen to line up across them).
 */
export function readingOrder(blocks: Block[]): Block[] {
  if (blocks.length <= 1) return blocks;
  const x = widestCut(blocks, "x");
  const y = widestCut(blocks, "y");
  const cut = x && (!y || x.gap >= y.gap) ? x : y;
  if (!cut) return [...blocks].sort((a, b) => a.top - b.top || a.left - b.left);
  return [...readingOrder(cut.before), ...readingOrder(cut.after)];
}

/** Common OCR misreads: "tyżeczka"/"yżeczka"/"lyżka" → łyżeczka/łyżka, "%" for "½", "1tyżeczka" → "1 łyżeczka". */
export function fixOcrLine(line: string): string {
  return line
    .replace(/ž/g, "ż")
    .replace(/(^|[\s\d(])[tyblhił]?y[żź](?=eczk|k)/gi, "$1łyż")
    .replace(/(\d)(łyż)/g, "$1 $2")
    .replace(/(^|\s)(\d?)%(?=\s+\p{L})/gu, "$1$2½");
}

export function pageText(blocks: Block[]): string {
  return readingOrder(blocks)
    .map((b) => b.text.split("\n").map(fixOcrLine).join("\n"))
    .join("\n\n");
}
