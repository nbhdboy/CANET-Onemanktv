/** 從圖片抽一組可用的強調色（主色 + 偏亮副色）。 */

export type ImageAccent = { from: string; to: string };

const cache = new Map<string, ImageAccent>();

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function mixHex(a: string, b: string, t: number) {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  };
  const A = parse(a);
  const B = parse(b);
  return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

export async function extractAccentFromImage(url: string): Promise<ImageAccent | null> {
  const hit = cache.get(url);
  if (hit) return hit;

  if (typeof window === "undefined") return null;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image load failed"));
      el.src = url;
    });

    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let best = { score: -1, r: 124, g: 58, b: 237 };
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const { s, l } = rgbToHsl(r, g, b);
      if (l < 0.12 || l > 0.92) continue;
      if (s < 0.08 && l > 0.35 && l < 0.75) continue;

      const score = s * 1.35 + (1 - Math.abs(l - 0.48)) * 0.65;
      if (score > best.score) best = { score, r, g, b };

      sumR += r;
      sumG += g;
      sumB += b;
      count += 1;
    }

    if (count === 0) return null;

    const avg = {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
    };
    const pick =
      best.score > 0
        ? {
            r: Math.round(best.r * 0.72 + avg.r * 0.28),
            g: Math.round(best.g * 0.72 + avg.g * 0.28),
            b: Math.round(best.b * 0.72 + avg.b * 0.28),
          }
        : avg;

    const hsl = rgbToHsl(pick.r, pick.g, pick.b);
    const fromRgb = hslToRgb(hsl.h, Math.min(0.85, Math.max(0.35, hsl.s * 1.15)), Math.min(0.58, Math.max(0.38, hsl.l)));
    const toRgb = hslToRgb(
      (hsl.h + 0.06) % 1,
      Math.min(0.9, Math.max(0.3, hsl.s * 1.05)),
      Math.min(0.72, Math.max(0.48, hsl.l + 0.14)),
    );
    const accent: ImageAccent = {
      from: rgbToHex(fromRgb.r, fromRgb.g, fromRgb.b),
      to: mixHex(rgbToHex(toRgb.r, toRgb.g, toRgb.b), "#ffffff", 0.08),
    };
    cache.set(url, accent);
    return accent;
  } catch {
    return null;
  }
}
