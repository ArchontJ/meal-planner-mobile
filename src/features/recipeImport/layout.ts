// Turns OCR blocks of one photo into plain text in reading order, and fixes the misreads
// ML Kit makes most often on Polish cookbooks.

export type Block = { text: string; left: number; top: number; right: number; bottom: number };

/** Groups blocks separated by an empty strip along one axis ("x": columns, "y": rows). */
function split(blocks: Block[], axis: "x" | "y"): Block[][] {
  const start = (b: Block) => (axis === "x" ? b.left : b.top);
  const end = (b: Block) => (axis === "x" ? b.right : b.bottom);
  const sorted = [...blocks].sort((a, b) => start(a) - start(b));
  const groups: Block[][] = [];
  let maxEnd = -Infinity;
  for (const b of sorted) {
    if (start(b) >= maxEnd) groups.push([b]);
    else groups.at(-1)!.push(b);
    maxEnd = Math.max(maxEnd, end(b));
  }
  return groups;
}

/**
 * Reading order by recursive XY-cut: columns left to right first, then rows top to bottom.
 * A full-width title or intro cannot be cut into columns, so it splits the page into rows instead.
 */
export function readingOrder(blocks: Block[]): Block[] {
  if (blocks.length <= 1) return blocks;
  const columns = split(blocks, "x");
  if (columns.length > 1) return columns.flatMap(readingOrder);
  const rows = split(blocks, "y");
  if (rows.length > 1) return rows.flatMap(readingOrder);
  return [...blocks].sort((a, b) => a.top - b.top || a.left - b.left);
}

/** Common OCR misreads: "tyżeczka"/"yżeczka"/"lyżka" → łyżeczka/łyżka, "%" for "½", "1tyżeczka" → "1 łyżeczka". */
export function fixOcrLine(line: string): string {
  return line
    .replace(/(^|[\s\d(])[tyblhł]?y[żž](?=eczk|k)/gi, "$1łyż")
    .replace(/(\d)(łyż)/g, "$1 $2")
    .replace(/(^|\s)(\d?)%(?=\s+\p{L})/gu, "$1$2½");
}

export function pageText(blocks: Block[]): string {
  return readingOrder(blocks)
    .map((b) => b.text.split("\n").map(fixOcrLine).join("\n"))
    .join("\n\n");
}
