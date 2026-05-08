import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const publicDir = join(process.cwd(), 'public');
mkdirSync(publicDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const i = (y * width + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function blendPixel(pixels, width, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const i = (y * width + x) * 4;
  const alpha = a / 255;
  pixels[i] = Math.round(r * alpha + pixels[i] * (1 - alpha));
  pixels[i + 1] = Math.round(g * alpha + pixels[i + 1] * (1 - alpha));
  pixels[i + 2] = Math.round(b * alpha + pixels[i + 2] * (1 - alpha));
  pixels[i + 3] = 255;
}

function fillRect(pixels, size, x, y, w, h, color) {
  const [r, g, b, a = 255] = color;
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(size, Math.ceil(y + h)); yy++) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(size, Math.ceil(x + w)); xx++) {
      blendPixel(pixels, size, xx, yy, r, g, b, a);
    }
  }
}

function fillCircle(pixels, size, cx, cy, radius, color) {
  const [r, g, b, a = 255] = color;
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) blendPixel(pixels, size, x, y, r, g, b, a);
    }
  }
}

function fillRoundedRect(pixels, size, x, y, w, h, radius, color) {
  const [r, g, b, a = 255] = color;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w);
  const y1 = Math.ceil(y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const dx = xx < x + radius ? x + radius - xx : xx > x + w - radius ? xx - (x + w - radius) : 0;
      const dy = yy < y + radius ? y + radius - yy : yy > y + h - radius ? yy - (y + h - radius) : 0;
      if (dx * dx + dy * dy <= radius * radius) blendPixel(pixels, size, xx, yy, r, g, b, a);
    }
  }
}

function makePng(size) {
  const pixels = Buffer.alloc(size * size * 4);

  // Rich purple background. iOS applies the outer icon rounding itself.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      const r = Math.round(99 + 40 * (1 - t));
      const g = Math.round(102 + 28 * (1 - t));
      const b = Math.round(241 - 22 * t);
      setPixel(pixels, size, x, y, r, g, b, 255);
    }
  }

  // Soft highlight so the icon reads well on iOS dark and light wallpapers.
  fillCircle(pixels, size, size * 0.28, size * 0.18, size * 0.52, [255, 255, 255, 30]);
  fillCircle(pixels, size, size * 0.80, size * 0.86, size * 0.38, [49, 46, 129, 45]);

  // Oversized F mark. This deliberately occupies most of the canvas;
  // the previous icons were tiny because the art had too much internal padding.
  const white = [255, 255, 255, 255];
  const shadow = [49, 46, 129, 90];
  const peach = [255, 190, 118, 255];
  const darkPeach = [244, 145, 73, 255];

  const sx = size * 0.205;
  const sy = size * 0.165;
  const stemW = size * 0.185;
  const topW = size * 0.61;
  const midW = size * 0.46;
  const barH = size * 0.155;
  const midY = size * 0.445;
  const stemH = size * 0.69;
  const radius = size * 0.055;

  fillRoundedRect(pixels, size, sx + size * 0.022, sy + size * 0.025, stemW, stemH, radius, shadow);
  fillRoundedRect(pixels, size, sx + size * 0.022, sy + size * 0.025, topW, barH, radius, shadow);
  fillRoundedRect(pixels, size, sx + size * 0.022, midY + size * 0.025, midW, barH, radius, shadow);

  fillRoundedRect(pixels, size, sx, sy, stemW, stemH, radius, white);
  fillRoundedRect(pixels, size, sx, sy, topW, barH, radius, white);
  fillRoundedRect(pixels, size, sx, midY, midW, barH, radius, white);

  // Peach coin/dot accent, large enough not to disappear at 180px.
  fillCircle(pixels, size, size * 0.70, size * 0.69, size * 0.125, [49, 46, 129, 80]);
  fillCircle(pixels, size, size * 0.68, size * 0.665, size * 0.125, peach);
  fillCircle(pixels, size, size * 0.68, size * 0.665, size * 0.082, [255, 215, 150, 255]);
  fillRect(pixels, size, size * 0.655, size * 0.59, size * 0.05, size * 0.15, darkPeach);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeIcon(name, size) {
  const filePath = join(publicDir, name);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, makePng(size));
  console.log(`generated ${name} (${size}x${size})`);
}

writeIcon('apple-touch-icon-v3.png', 180);
writeIcon('fina-icon-v3-192.png', 192);
writeIcon('fina-icon-v3-512.png', 512);

// Also overwrite the legacy names so older HTML/manifest caches still resolve to a large icon.
writeIcon('apple-touch-icon.png', 180);
writeIcon('fina-icon-192.png', 192);
writeIcon('fina-icon-512.png', 512);
