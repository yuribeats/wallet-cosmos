export type RGB = [number, number, number];
type LAB = [number, number, number];

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToLab(rgb: RGB): LAB {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);

  let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  let y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.0;
  let z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;

  const e = 0.008856;
  const k = 903.3;
  x = x > e ? Math.cbrt(x) : (k * x + 16) / 116;
  y = y > e ? Math.cbrt(y) : (k * y + 16) / 116;
  z = z > e ? Math.cbrt(z) : (k * z + 16) / 116;

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function labDistance(a: LAB, b: LAB): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dL * dL + da * da + db * db;
}

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
      const w = Math.max(1, Math.floor(cellW));
      const h = Math.max(1, Math.floor(cellH));
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

async function loadImageToCanvas(url: string): Promise<RGB> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img load failed'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 10;
  canvas.height = 10;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(loaded, 0, 0, 10, 10);
  const data = ctx.getImageData(0, 0, 10, 10).data;

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

export async function extractTokenColor(imageUrl: string): Promise<RGB> {
  // Try direct load first (works for same-origin and CORS-enabled CDNs)
  try {
    return await loadImageToCanvas(imageUrl);
  } catch {
    // Fall back to proxy
  }

  const proxied = `/api/image?url=${encodeURIComponent(imageUrl)}`;
  try {
    return await loadImageToCanvas(proxied);
  } catch {
    // Fall back to fetch + blob
  }

  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(10, 10);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, 10, 10);
  const data = ctx.getImageData(0, 0, 10, 10).data;
  bitmap.close();

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

export async function extractTokenColorsBatched(
  tokens: Array<{ id: string; url: string }>,
  concurrency: number = 15,
  onProgress?: (done: number, succeeded: number, total: number) => void
): Promise<Map<string, RGB>> {
  const result = new Map<string, RGB>();
  let done = 0;

  for (let i = 0; i < tokens.length; i += concurrency) {
    const batch = tokens.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async ({ id, url }) => {
        const color = await extractTokenColor(url);
        return { id, color };
      })
    );
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        result.set(r.value.id, r.value.color);
      }
    }
    done += batch.length;
    onProgress?.(done, result.size, tokens.length);
  }

  return result;
}

export function assignTokensToGrid(
  cellColors: RGB[],
  tokenColors: Map<string, RGB>
): string[] {
  const entries = Array.from(tokenColors.entries());
  if (entries.length === 0) return [];
  const tokenLabs = entries.map(([id, rgb]) => [id, rgbToLab(rgb)] as const);
  const result: string[] = [];

  for (const cellColor of cellColors) {
    const cellLab = rgbToLab(cellColor);
    let bestId = tokenLabs[0][0];
    let bestDist = Infinity;

    for (const [id, lab] of tokenLabs) {
      const d = labDistance(cellLab, lab);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }

    result.push(bestId);
  }

  return result;
}

export function computeGridDimensions(
  imageWidth: number,
  imageHeight: number,
  targetCols: number
): { cols: number; rows: number } {
  const aspect = imageWidth / imageHeight;
  const cols = targetCols;
  const rows = Math.round(cols / aspect);
  return { cols: Math.max(1, cols), rows: Math.max(1, rows) };
}
