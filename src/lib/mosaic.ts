type RGB = [number, number, number];

export async function analyzeImage(
  file: File,
  cols: number,
  rows: number
): Promise<RGB[]> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);

  const cellW = bitmap.width / cols;
  const cellH = bitmap.height / rows;
  const colors: RGB[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.floor(col * cellW);
      const y = Math.floor(row * cellH);
      const w = Math.floor(cellW);
      const h = Math.floor(cellH);
      const data = ctx.getImageData(x, y, w, h).data;

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      colors.push([
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count),
      ]);
    }
  }

  bitmap.close();
  return colors;
}

export async function extractTokenColor(imageUrl: string): Promise<RGB> {
  const proxied = `/api/image?url=${encodeURIComponent(imageUrl)}`;
  const res = await fetch(proxied);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  bitmap.close();
  return [r, g, b];
}

function colorDistance(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

export function assignTokensToGrid(
  cellColors: RGB[],
  tokenColors: Map<string, RGB>
): string[] {
  const assigned = new Set<string>();
  const result: string[] = [];
  const entries = Array.from(tokenColors.entries());

  for (const cellColor of cellColors) {
    let bestId = '';
    let bestDist = Infinity;

    for (const [id, color] of entries) {
      if (assigned.has(id)) continue;
      const d = colorDistance(cellColor, color);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }

    if (bestId) {
      result.push(bestId);
      assigned.add(bestId);
    }
  }

  return result;
}

export function computeGridDimensions(
  tokenCount: number,
  imageWidth: number,
  imageHeight: number
): { cols: number; rows: number } {
  const aspect = imageWidth / imageHeight;
  const cols = Math.round(Math.sqrt(tokenCount * aspect));
  const rows = Math.round(tokenCount / cols);
  return { cols: Math.max(1, cols), rows: Math.max(1, rows) };
}
