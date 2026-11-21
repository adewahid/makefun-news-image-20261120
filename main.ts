// THE DAILY GLOBE — front page for Friday 20 November 2026.
// make.fun news-image-20261120, entry v8. Built from scratch in this session.
//
// The program draws the whole broadsheet itself with a small software
// rasterizer (Node standard library only: fs, zlib, path), then writes
// /output/entry.png (1024 x 1024). No network, no fonts, no external
// images: every letter is drawn from the vector stroke font below and
// every picture is drawn from geometric primitives. The output is a pure
// function of the constants in this file, so two runs are byte-identical.
//
// Stories were checked against real reporting of 20 November 2026
// (Reuters, ISW, IMD, Morningstar, gov.uk and others) before writing.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// PNG encoding (stdlib only)
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas: 1024 x 1024 page, drawn at 2x supersampling for clean edges.
// All coordinates below are in page points (1024 space).
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const SS = 2; // supersample factor

type RGB = [number, number, number];

const PAPER: RGB = [247, 243, 234];
const INK: RGB = [26, 24, 21];
const INK_SOFT: RGB = [74, 70, 64];
const RED: RGB = [164, 31, 31];
const BLUE: RGB = [31, 58, 95];
const BLUE_SOFT: RGB = [58, 90, 133];
const GOLD: RGB = [176, 138, 58];
const RULE: RGB = [26, 24, 21];
const HAIRLINE: RGB = [190, 182, 168];
const SKY: RGB = [214, 226, 232];
const RIVER: RGB = [94, 128, 158];
const TEAL: RGB = [16, 74, 86];

class Canvas {
  buf: Uint8ClampedArray;
  constructor() {
    this.buf = new Uint8ClampedArray(W * SS * H * SS * 3);
    this.fillRect(0, 0, W, H, PAPER);
  }
  // Fill a page-space rectangle.
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x * SS));
    const y0 = Math.max(0, Math.round(y * SS));
    const x1 = Math.min(W * SS, Math.round((x + w) * SS));
    const y1 = Math.min(H * SS, Math.round((y + h) * SS));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W * SS + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
        i += 3;
      }
    }
  }
  // Filled circle in page space.
  circle(cx: number, cy: number, r: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor((cx - r) * SS));
    const x1 = Math.min(W * SS - 1, Math.ceil((cx + r) * SS));
    const y0 = Math.max(0, Math.floor((cy - r) * SS));
    const y1 = Math.min(H * SS - 1, Math.ceil((cy + r) * SS));
    const rr = r * SS;
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx + 0.5 - cx * SS;
        const dy = yy + 0.5 - cy * SS;
        if (dx * dx + dy * dy <= rr * rr) {
          const i = (yy * W * SS + xx) * 3;
          this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
        }
      }
    }
  }
  // Filled ellipse in page space.
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor((cx - rx) * SS));
    const x1 = Math.min(W * SS - 1, Math.ceil((cx + rx) * SS));
    const y0 = Math.max(0, Math.floor((cy - ry) * SS));
    const y1 = Math.min(H * SS - 1, Math.ceil((cy + ry) * SS));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = (xx + 0.5 - cx * SS) / (rx * SS);
        const dy = (yy + 0.5 - cy * SS) / (ry * SS);
        if (dx * dx + dy * dy <= 1) {
          const i = (yy * W * SS + xx) * 3;
          this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
        }
      }
    }
  }
  // Thick line in page space: stamps discs along the segment.
  line(x1: number, y1: number, x2: number, y2: number, width: number, c: RGB): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(len * SS / Math.max(0.6, width * SS * 0.35)));
    const r = Math.max(0.5, width / 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.circle(x1 + dx * t, y1 + dy * t, r, c);
    }
  }
  // Polyline stroke through points.
  polyline(pts: [number, number][], width: number, c: RGB): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], width, c);
    }
  }
  // Filled polygon (scanline fill) in page space.
  polygon(pts: [number, number][], c: RGB): void {
    if (pts.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const y0 = Math.max(0, Math.floor(minY * SS));
    const y1 = Math.min(H * SS - 1, Math.ceil(maxY * SS));
    for (let yy = y0; yy <= y1; yy++) {
      const y = (yy + 0.5) / SS;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.floor(xs[k] * SS));
        const xb = Math.min(W * SS - 1, Math.ceil(xs[k + 1] * SS));
        for (let xx = xa; xx <= xb; xx++) {
          const i = (yy * W * SS + xx) * 3;
          this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
        }
      }
    }
  }
  // Five-pointed star, filled.
  star(cx: number, cy: number, r: number, c: RGB): void {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? r : r * 0.42;
      pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
    }
    this.polygon(pts, c);
  }
  // Downsample 2x2 to the final 1024 x 1024 RGB buffer.
  toRgb(): Uint8Array {
    const out = new Uint8Array(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0;
        for (let dy = 0; dy < SS; dy++) {
          for (let dx = 0; dx < SS; dx++) {
            const i = ((y * SS + dy) * W * SS + x * SS + dx) * 3;
            r += this.buf[i]; g += this.buf[i + 1]; b += this.buf[i + 2];
          }
        }
        const o = (y * W + x) * 3;
        const n = SS * SS;
        out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n);
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Vector stroke font, hand-authored for this entry.
//
// Each glyph is a path on a 12-wide grid: cap height 14 units (y 0 = top,
// y 14 = baseline), descenders to y 18. "M x,y" lifts the pen, "L x,y"
// draws. The second value is the advance width in grid units. A glyph is
// one continuous stroke style: clean geometric capitals, humanist
// lowercase, tabular digits. Rendered with round caps by the canvas
// (thick lines are stamped as discs), so strokes read as printed type.
//
// Font fix (2026-11-21): every advance is now the glyph's ink width + 1
// unit, so inter-letter gaps are uniform (~3 units). Before, narrow
// letters over-ran their cells (i stem at x=6 in a 5-wide cell, f/t/r
// crossbars past the advance) while wide letters left 4-6 unit holes
// (m 14, w 13), which read as word breaks ("Russ ia", "w ar"). The
// i/j dots are now solid 2x2 squares, l is a single stem, and f/t were
// redrawn with their stems at the left of the cell.
// ---------------------------------------------------------------------------

const GLYPHS: Record<string, [string, number]> = {
  // Capitals
  A: ['M1,14 L6,0 L11,14 M3.5,9 L8.5,9', 12],
  B: ['M1,0 L1,14 M1,0 L7,0 L10,2 L10,5 L8,7 L1,7 M7,7 L10,9 L10,12 L7,14 L1,14', 11],
  C: ['M10,3 L8,1 L4,1 L1,4 L1,10 L4,13 L8,13 L10,11', 11],
  D: ['M1,0 L1,14 M1,0 L8,0 L11,3 L11,11 L8,14 L1,14', 12],
  E: ['M10,0 L1,0 L1,14 L10,14 M1,7 L8,7', 11],
  F: ['M1,14 L1,0 L10,0 M1,7 L8,7', 11],
  G: ['M10,3 L8,1 L4,1 L1,4 L1,10 L4,13 L8,13 L11,10 L11,7 L7,7', 12],
  H: ['M1,0 L1,14 M11,0 L11,14 M1,7 L11,7', 12],
  I: ['M6,0 L6,14 M3,0 L9,0 M3,14 L9,14', 10],
  J: ['M9,0 L9,11 L7,14 L4,14 L2,12', 10],
  K: ['M1,0 L1,14 M10,0 L1,7 L11,14', 12],
  L: ['M1,0 L1,14 L10,14', 11],
  M: ['M1,14 L1,0 L6,7 L11,0 L11,14', 12],
  N: ['M1,14 L1,0 L11,14 L11,0', 12],
  O: ['M4,0 L8,0 L11,3 L11,11 L8,14 L4,14 L1,11 L1,3 L4,0', 12],
  P: ['M1,14 L1,0 L8,0 L11,2 L11,6 L8,8 L1,8', 12],
  Q: ['M4,0 L8,0 L11,3 L11,11 L8,14 L4,14 L1,11 L1,3 L4,0 M8,11 L12,15', 13],
  R: ['M1,14 L1,0 L8,0 L11,2 L11,6 L8,8 L1,8 M8,8 L11,14', 12],
  S: ['M10,3 L8,1 L4,1 L2,3 L2,5 L4,7 L8,8 L10,10 L10,12 L8,14 L4,14 L2,12', 11],
  T: ['M1,0 L11,0 M6,0 L6,14', 12],
  U: ['M1,0 L1,11 L3,14 L8,14 L11,11 L11,0', 12],
  V: ['M1,0 L6,14 L11,0', 12],
  W: ['M1,0 L3,14 L6,7 L9,14 L11,0', 12],
  X: ['M1,0 L11,14 M11,0 L1,14', 12],
  Y: ['M1,0 L6,7 L11,0 M6,7 L6,14', 12],
  Z: ['M1,0 L11,0 L1,14 L11,14', 12],
  // Digits
  '0': ['M4,0 L8,0 L11,3 L11,11 L8,14 L4,14 L1,11 L1,3 L4,0', 12],
  '1': ['M6,0 L6,14 M3,3 L6,0 M3,14 L9,14', 12],
  '2': ['M2,3 L4,0 L8,0 L10,2 L10,5 L4,11 L1,14 L10,14', 12],
  '3': ['M2,1 L5,0 L9,0 L11,2 L10,5 L8,6 L10,8 L11,11 L9,14 L5,14 L2,13', 12],
  '4': ['M8,0 L8,14 M1,9 L9,9 M8,0 L1,9', 12],
  '5': ['M10,0 L2,0 L2,6 L7,6 L10,8 L10,12 L8,14 L4,14 L2,12', 12],
  '6': ['M9,1 L6,0 L3,1 L1,4 L1,10 L3,13 L7,13 L10,11 L10,8 L7,6 L3,6', 12],
  '7': ['M1,0 L11,0 L6,14', 12],
  '8': ['M4,0 L8,0 L10,2 L10,5 L8,7 L4,7 L2,5 L2,2 L4,0 M4,7 L2,9 L2,12 L4,14 L8,14 L10,12 L10,9 L8,7', 12],
  '9': ['M2,6 L2,3 L4,1 L8,1 L10,3 L10,9 L8,13 L5,14 L3,13', 12],
  // Punctuation
  '.': ['M5,12.5 L7,12.5', 5],
  ',': ['M1,12.5 L3,12.5 M2,14 L1,17', 5],
  '\u2026': ['M1,12 L3,12 M5,12 L7,12 M9,12 L11,12', 13],
  ':': ['M5,4 L7,4 M5,11 L7,11', 5],
  ';': ['M5,4 L7,4 M5,11 L7,11 M6,12 L5,15', 5],
  "'": ['M6,0 L5,4', 5],
  '"': ['M3,0 L2,4 M8,0 L7,4', 7],
  '-': ['M2,8 L10,8', 11],
  '\u2013': ['M1,8 L11,8', 12],
  '\u2014': ['M0,8 L12,8', 13],
  '(': ['M8,0 L5,3 L5,11 L8,14', 7],
  ')': ['M4,0 L7,3 L7,11 L4,14', 7],
  '%': ['M1,1 L11,13 M2,1 L4,1 L4,3 L2,3 M8,11 L10,11 L10,13 L8,13', 13],
  '\u00a3': ['M10,1 L4,1 L3,4 L3,11 L4,14 L10,14 M2,6 L9,6 M2,9 L9,9', 12],
  '$': ['M6,-1 L6,15 M10,3 L8,1 L4,1 L2,3 L2,5 L4,7 L8,7 L10,9 L10,11 L8,13 L4,13 L2,11 M1,5 L11,5 M1,9 L11,9', 12],
  '/': ['M9,0 L3,14', 10],
  '+': ['M6,2 L6,12 M1,7 L11,7', 12],
  '=': ['M2,5 L10,5 M2,10 L10,10', 12],
  '?': ['M3,3 L5,1 L8,1 L10,3 L10,5 L8,7 L6,8 L6,11 M5,13 L7,13', 11],
  '!': ['M6,0 L6,10 M5,13 L7,13', 5],
  '\u2022': ['M4,6 L8,6 L8,10 L4,10 L4,6', 8],
  '*': ['M6,1 L6,13 M1,4 L11,10 M11,4 L1,10', 12],
  '\u2192': ['M1,7 L10,7 M7,4 L10,7 L7,10', 12],
  ' ': ['', 5],
};

// Lowercase (x-height 10: y 4 = top of x-height, y 14 = baseline,
// ascenders to y 0, descenders to y 18).
Object.assign(GLYPHS, {
  a: ['M11,4 L11,14 M2,9 L2,12 L4,14 L8,14 L10,12 L10,8 L8,6 L4,6 L2,8', 12],
  b: ['M1,0 L1,14 M1,8 L4,6 L8,6 L10,8 L10,12 L8,14 L4,14 L1,12', 11],
  c: ['M10,8 L8,6 L4,6 L2,8 L2,12 L4,14 L8,14 L10,12', 11],
  d: ['M11,0 L11,14 M11,9 L8,6 L4,6 L2,8 L2,12 L4,14 L8,14 L11,12', 12],
  e: ['M2,9 L10,9 M10,12 L8,14 L4,14 L2,12 L2,8 L4,6 L8,6 L10,8', 11],
  f: ['M7,0 L4,1 L2,4 L2,14 M1,5 L8,5', 9],
  g: ['M11,6 L11,13 L9,18 L5,18 L3,16 M2,9 L2,12 L4,14 L8,14 L10,12 L10,8 L8,6 L4,6 L2,8', 12],
  h: ['M1,0 L1,14 M1,8 L4,6 L8,6 L10,8 L10,14', 11],
  i: ['M2.5,6 L2.5,14 M1.5,0 L3.5,0 L3.5,2 L1.5,2 L1.5,0', 4],
  j: ['M2.5,6 L2.5,15 L1.5,18 L0.5,18 M1.5,0 L3.5,0 L3.5,2 L1.5,2 L1.5,0', 4],
  k: ['M1,0 L1,14 M9,6 L1,10 L10,14', 11],
  l: ['M2.5,0 L2.5,14', 4],
  m: ['M1,14 L1,6 L3.5,6 L5,8 L5,14 M5,6 L8,6 L10,8 L10,14', 11],
  n: ['M1,14 L1,6 L4,6 L8,6 L10,8 L10,14', 11],
  o: ['M4,6 L8,6 L10,8 L10,12 L8,14 L4,14 L2,12 L2,8 L4,6', 11],
  p: ['M1,6 L1,18 M1,9 L4,6 L8,6 L10,8 L10,12 L8,14 L4,14 L1,12', 11],
  q: ['M11,6 L11,18 M11,9 L8,6 L4,6 L2,8 L2,12 L4,14 L8,14 L11,12', 12],
  r: ['M1,14 L1,6 L5,6 L8,6 L10,9', 11],
  s: ['M10,7 L8,6 L4,6 L2,8 L2,10 L4,11 L8,11 L10,13 L10,14 L8,14 L4,14 L2,13', 11],
  t: ['M3,0 L3,14 M1,5 L8,5 M2,14 L5,14', 9],
  u: ['M1,6 L1,12 L3,14 L7,14 L9,12 L9,6', 10],
  v: ['M1,6 L5,14 L9,6', 10],
  w: ['M1,6 L2.5,14 L5,8 L7.5,14 L9,6', 10],
  x: ['M1,6 L9,14 M9,6 L1,14', 10],
  y: ['M1,6 L5,13 L9,6 M5,13 L5,16 L4,18', 10],
  z: ['M1,6 L9,6 L1,14 L9,14', 10],
});

// ---------------------------------------------------------------------------
// Text rendering over the stroke font.
// size = cap height in page points. y is the TOP of the cap line.
// ---------------------------------------------------------------------------

function glyphPath(ch: string): [string, number] {
  return GLYPHS[ch] ?? GLYPHS['?'];
}

function measureText(text: string, size: number, spacing = 0): number {
  const scale = size / 14;
  let w = 0;
  for (const ch of text) w += glyphPath(ch)[1] * scale + spacing;
  return w - spacing;
}

function drawText(
  cv: Canvas, text: string, x: number, yTop: number, size: number,
  color: RGB, bold = false, align: 'left' | 'center' | 'right' = 'left',
  spacing = 0,
): void {
  const scale = size / 14;
  const width = bold ? Math.max(1.1, size * 0.16) : Math.max(0.9, size * 0.11);
  let x0 = x;
  if (align === 'center') x0 = x - measureText(text, size, spacing) / 2;
  if (align === 'right') x0 = x - measureText(text, size, spacing);
  let cx = x0;
  for (const ch of text) {
    const [path, adv] = glyphPath(ch);
    if (path) {
      const tokens = path.split(/\s+/);
      let px = 0, py = 0, penDown = false;
      let sx = 0, sy = 0;
      for (const tok of tokens) {
        if (!tok) continue;
        const cmd = tok[0];
        const [gx, gy] = tok.slice(1).split(',').map(Number);
        const X = cx + gx * scale;
        const Y = yTop + gy * scale;
        if (cmd === 'M') { px = X; py = Y; penDown = false; sx = X; sy = Y; }
        else {
          if (!penDown) { sx = px; sy = py; penDown = true; }
          cv.line(sx, sy, X, Y, width, color);
          sx = X; sy = Y;
        }
      }
    }
    cx += adv * scale + spacing;
  }
}

// Wrap text to lines that fit maxWidth. Returns lines (no hyphenation).
function wrapText(text: string, size: number, maxWidth: number, spacing = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (measureText(trial, size, spacing) <= maxWidth || !cur) cur = trial;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function drawWrapped(
  cv: Canvas, text: string, x: number, yTop: number, size: number,
  maxWidth: number, color: RGB, bold = false, leading?: number, spacing = 0,
): number {
  const lines = wrapText(text, size, maxWidth, spacing);
  const lh = leading ?? size * 1.32;
  lines.forEach((ln, i) => drawText(cv, ln, x, yTop + i * lh, size, color, bold, 'left', spacing));
  return yTop + lines.length * lh;
}

// Truncate a single line with an ellipsis so it fits maxWidth.
function fitLine(text: string, size: number, maxWidth: number, bold = false, spacing = 0): string {
  if (measureText(text, size, spacing) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && measureText(t + '\u2026', size, spacing) > maxWidth) t = t.slice(0, -1);
  return t + '\u2026';
}

// ---------------------------------------------------------------------------
// Illustrations — all drawn from primitives, no external images.
// ---------------------------------------------------------------------------

// Lead picture: a Dnipro bridge under attack at dawn. Sky bands, city
// silhouette, river, the bridge deck with its arch and cables, smoke
// columns rising from the deck, and two missile trails overhead.
function drawBridgePanel(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, SKY);
  // Dawn sky bands.
  cv.fillRect(x, y, w, h * 0.42, [232, 214, 196]);
  cv.fillRect(x, y + h * 0.42, w, h * 0.2, [224, 200, 186]);
  // Sun glow behind smoke.
  cv.circle(x + w * 0.78, y + h * 0.30, 26, [238, 226, 196]);
  cv.circle(x + w * 0.78, y + h * 0.30, 18, [244, 236, 214]);
  // Missile trails arcing down onto the bridge.
  cv.polyline(
    [[x + w * 0.16, y + h * 0.02], [x + w * 0.30, y + h * 0.22], [x + w * 0.38, y + h * 0.52]],
    3, [255, 250, 235],
  );
  cv.polyline(
    [[x + w * 0.55, y + h * 0.0], [x + w * 0.60, y + h * 0.26], [x + w * 0.62, y + h * 0.55]],
    3, [255, 250, 235],
  );
  cv.circle(x + w * 0.38, y + h * 0.52, 4, [255, 240, 180]);
  cv.circle(x + w * 0.62, y + h * 0.55, 4, [255, 240, 180]);
  // City silhouette on both banks.
  const city: RGB = [58, 62, 70];
  const blocks: [number, number, number, number][] = [
    [0.00, 0.52, 0.07, 0.10], [0.07, 0.46, 0.05, 0.16], [0.13, 0.54, 0.06, 0.08],
    [0.20, 0.48, 0.04, 0.14], [0.25, 0.55, 0.06, 0.07], [0.70, 0.50, 0.05, 0.12],
    [0.76, 0.44, 0.04, 0.18], [0.81, 0.52, 0.06, 0.10], [0.88, 0.47, 0.05, 0.15],
    [0.94, 0.54, 0.06, 0.08],
  ];
  for (const [bx, by, bw, bh] of blocks) cv.fillRect(x + w * bx, y + h * by, w * bw, h * bh, city);
  // River.
  cv.fillRect(x, y + h * 0.62, w, h * 0.38, RIVER);
  cv.fillRect(x, y + h * 0.62, w, 3, [120, 150, 176]);
  // Bridge deck.
  cv.fillRect(x, y + h * 0.58, w, 7, [38, 38, 42]);
  // Arch over the deck.
  const archPts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    archPts.push([x + w * (0.08 + 0.84 * t), y + h * (0.58 - 0.30 * Math.sin(Math.PI * t))]);
  }
  cv.polyline(archPts, 4, [38, 38, 42]);
  // Cables from arch to deck.
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const ax = x + w * (0.08 + 0.84 * t);
    const ay = y + h * (0.58 - 0.30 * Math.sin(Math.PI * t));
    cv.line(ax, ay, ax, y + h * 0.58, 1.2, [70, 70, 76]);
  }
  // Pylons.
  cv.fillRect(x + w * 0.08 - 2, y + h * 0.28, 4, h * 0.34, [38, 38, 42]);
  cv.fillRect(x + w * 0.92 - 2, y + h * 0.28, 4, h * 0.34, [38, 38, 42]);
  // Smoke columns rising from two hits on the deck.
  const smoke = (cx: number, base: number, s: number) => {
    cv.ellipse(cx, base - 14 * s, 9 * s, 16 * s, [120, 116, 108]);
    cv.ellipse(cx + 6 * s, base - 30 * s, 12 * s, 20 * s, [140, 136, 128]);
    cv.ellipse(cx - 4 * s, base - 48 * s, 13 * s, 18 * s, [160, 156, 148]);
    cv.ellipse(cx + 4 * s, base - 64 * s, 10 * s, 14 * s, [178, 174, 166]);
  };
  smoke(x + w * 0.38, y + h * 0.58, 1.15);
  smoke(x + w * 0.62, y + h * 0.58, 0.9);
  // Fire glow at the hits.
  cv.circle(x + w * 0.38, y + h * 0.58, 7, [214, 90, 40]);
  cv.circle(x + w * 0.62, y + h * 0.58, 5, [214, 90, 40]);
  // Frame.
  cv.fillRect(x, y, w, 2, INK);
  cv.fillRect(x, y + h - 2, w, 2, INK);
  cv.fillRect(x, y, 2, h, INK);
  cv.fillRect(x + w - 2, y, 2, h, INK);
}

// Cyclone panel: spiral storm over a teal sea, coast at bottom right,
// rain streaks, landfall dot at Gopalpur.
function drawCyclonePanel(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [18, 88, 104]);
  cv.fillRect(x, y, w, h, [14, 72, 88]);
  const cx = x + w * 0.42, cy = y + h * 0.52;
  // Spiral arms: three rotating arcs.
  for (let arm = 0; arm < 3; arm++) {
    const pts: [number, number][] = [];
    const a0 = arm * (Math.PI * 2 / 3);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = a0 + t * Math.PI * 2.4;
      const r = 6 + t * 52;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.82]);
    }
    cv.polyline(pts, 5 - arm, [235, 240, 242]);
  }
  cv.circle(cx, cy, 8, [14, 72, 88]);
  cv.circle(cx, cy, 5, [235, 240, 242]);
  // Coast and land at the lower right.
  cv.polygon(
    [[x + w * 0.62, y + h], [x + w, y + h * 0.42], [x + w, y + h], [x + w * 0.62, y + h]],
    [222, 200, 158],
  );
  cv.polygon(
    [[x + w * 0.62, y + h], [x + w, y + h * 0.42], [x + w, y + h * 0.52], [x + w * 0.72, y + h]],
    [196, 172, 128],
  );
  // Rain streaks.
  for (let i = 0; i < 9; i++) {
    const rx = x + 12 + i * 32;
    cv.line(rx, y + 8, rx - 8, y + 34, 1.6, [190, 214, 222]);
  }
  // Landfall dot.
  cv.circle(x + w * 0.72, y + h * 0.66, 5, RED);
  cv.circle(x + w * 0.72, y + h * 0.66, 9, [164, 31, 31]);
  cv.circle(x + w * 0.72, y + h * 0.66, 3, [255, 255, 255]);
  cv.fillRect(x, y, w, 2, INK);
  cv.fillRect(x, y + h - 2, w, 2, INK);
  cv.fillRect(x, y, 2, h, INK);
  cv.fillRect(x + w - 2, y, 2, h, INK);
}

// Two flags side by side: the Union Jack and the EU circle of stars,
// joined by a small bridge arc — the reset deal.
function drawFlagsPanel(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [238, 234, 224]);
  const fw = w * 0.38, fh = h * 0.62;
  const fy = y + h * 0.12;
  // Union Jack (simplified).
  const ux = x + w * 0.06;
  cv.fillRect(ux, fy, fw, fh, [0, 36, 125]);
  cv.polygon([[ux, fy], [ux + 14, fy], [ux + fw, fy + fh - 14], [ux + fw, fy + fh], [ux + fw - 14, fy + fh], [ux, fy + 14]], [255, 255, 255]);
  cv.polygon([[ux + fw, fy], [ux + fw - 14, fy], [ux, fy + fh - 14], [ux, fy + fh], [ux + 14, fy + fh], [ux + fw, fy + 14]], [255, 255, 255]);
  cv.line(ux + 4, fy + 4, ux + fw - 4, fy + fh - 4, 5, [200, 16, 46]);
  cv.line(ux + fw - 4, fy + 4, ux + 4, fy + fh - 4, 5, [200, 16, 46]);
  cv.fillRect(ux + fw / 2 - 7, fy, 14, fh, [255, 255, 255]);
  cv.fillRect(ux, fy + fh / 2 - 7, fw, 14, [255, 255, 255]);
  cv.fillRect(ux + fw / 2 - 4, fy, 8, fh, [200, 16, 46]);
  cv.fillRect(ux, fy + fh / 2 - 4, fw, 8, [200, 16, 46]);
  // EU flag.
  const ex = x + w * 0.56;
  cv.fillRect(ex, fy, fw, fh, [0, 51, 153]);
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 6;
    cv.star(ex + fw / 2 + Math.cos(a) * fw * 0.30, fy + fh / 2 + Math.sin(a) * fh * 0.30, 3.4, [255, 209, 0]);
  }
  // Bridge arc joining the flags.
  const midX = x + w / 2;
  cv.polyline(
    [[ux + fw, fy + fh * 0.5], [midX, fy - 6], [ex, fy + fh * 0.5]],
    2, GOLD,
  );
  cv.circle(midX, fy - 6, 3, GOLD);
  cv.fillRect(x, y, w, 2, INK);
  cv.fillRect(x, y + h - 2, w, 2, INK);
  cv.fillRect(x, y, 2, h, INK);
  cv.fillRect(x + w - 2, y, 2, h, INK);
}

// Market chart: falling red line over pale bars, with a down arrow.
function drawChartPanel(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [238, 234, 224]);
  const gx = x + 10, gy = y + 8, gw = w - 20, gh = h - 26;
  // Bars (daily closes falling away).
  const bars = [0.86, 0.82, 0.85, 0.76, 0.70, 0.66, 0.58, 0.50, 0.44];
  const bw = gw / bars.length;
  bars.forEach((v, i) => {
    cv.fillRect(gx + i * bw + 2, gy + gh * (1 - v), bw - 4, gh * v, [178, 182, 188]);
  });
  // Falling line.
  const pts: [number, number][] = bars.map((v, i) => [gx + i * bw + bw / 2, gy + gh * (1 - v)]);
  cv.polyline(pts, 3, RED);
  pts.forEach((p) => cv.circle(p[0], p[1], 2.4, RED));
  // Down arrow at the end.
  const lx = pts[pts.length - 1][0], ly = pts[pts.length - 1][1];
  cv.line(lx, ly - 12, lx, ly + 4, 2.4, RED);
  cv.polygon([[lx - 5, ly - 1], [lx + 5, ly - 1], [lx, ly + 7]], RED);
  // Baseline.
  cv.fillRect(gx, gy + gh, gw, 1.4, INK_SOFT);
  cv.fillRect(x, y, w, 2, INK);
  cv.fillRect(x, y + h - 2, w, 2, INK);
  cv.fillRect(x, y, 2, h, INK);
  cv.fillRect(x + w - 2, y, 2, h, INK);
}

// Schematic world map band: rough continent shapes with red dots at the
// day's datelines. Labels are listed in the caption below the map.
function drawMapBand(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [226, 232, 236]);
  const mx = (u: number) => x + (u / 100) * w;
  const my = (v: number) => y + (v / 40) * h;
  const P = (pts: [number, number][]): [number, number][] =>
    pts.map(([u, v]) => [mx(u), my(v)] as [number, number]);
  const LAND: RGB = [108, 120, 114];
  // North America
  cv.polygon(P([[3, 9], [8, 4], [16, 3], [23, 6], [26, 10], [23, 14], [19, 18], [13, 17], [8, 14], [3, 12]]), LAND);
  // South America
  cv.polygon(P([[26, 22], [31, 20], [34, 24], [33, 30], [30, 37], [27, 33], [25, 27]]), LAND);
  // Europe
  cv.polygon(P([[46, 5], [52, 3], [57, 6], [55, 11], [50, 12], [46, 10]]), LAND);
  // Africa
  cv.polygon(P([[46, 15], [53, 13], [58, 17], [57, 24], [53, 31], [48, 30], [45, 22]]), LAND);
  // Asia (with the Arabian peninsula bump on its south-west edge)
  cv.polygon(P([[58, 3], [72, 2], [85, 3], [93, 6], [95, 10], [90, 14], [84, 16], [80, 20], [74, 18], [70, 16], [66, 17], [63, 14], [60, 12], [58, 8]]), LAND);
  // Australia
  cv.polygon(P([[83, 27], [90, 25], [93, 29], [90, 33], [84, 32]]), LAND);
  // Dateline dots (city, u, v) — each placed on its landmass.
  const dots: [string, number, number][] = [
    ['Port-au-Prince', 21, 14],
    ['Brussels', 50, 8],
    ['Kyiv', 54, 8],
    ['Riyadh', 63, 15],
    ['Hormuz', 65, 15],
    ['Mogadishu', 56, 24],
    ['Gopalpur', 79, 17],
    ['Shenzhen', 85, 13],
  ];
  for (const [, u, v] of dots) {
    cv.circle(mx(u), my(v), 3.4, RED);
    cv.circle(mx(u), my(v), 1.6, [255, 255, 255]);
  }
  cv.fillRect(x, y, w, 1.6, INK);
  cv.fillRect(x, y + h - 1.6, w, 1.6, INK);
}

// Euro sign (needed by one headline) — added here so the font table above
// stays readable.
GLYPHS['\u20ac'] = ['M10,3 L8,1 L4,1 L2,3 L2,11 L4,13 L8,13 L10,11 M1,6 L9,6 M1,9 L9,9', 11];

// ---------------------------------------------------------------------------
// Stories — every one checked against reporting dated 20 November 2026.
// 34 items: 1 lead + 3 features (+3 related) + 21 region items + 6 one-liners.
// ---------------------------------------------------------------------------

interface RegionItem { head: string; body: string }
interface Region { name: string; color: RGB; items: RegionItem[] }

const REGIONS_ROW1: Region[] = [
  {
    name: 'EUROPE', color: BLUE,
    items: [
      { head: 'EU approves \u20ac1bn arms aid', body: 'Joint arms buys for Ukraine agreed, delivery by end of 2027.' },
      { head: 'Denmark backs Greenland deal', body: 'Parliament unanimously approves an expanded US military presence.' },
      { head: 'COP31 enters its final day', body: 'Antalya talks demand a stronger deal as fossil-fuel wording drops.' },
    ],
  },
  {
    name: 'UKRAINE - RUSSIA', color: RED,
    items: [
      { head: 'Missile crashes into Poland', body: 'A Russian Kh-101 comes down in Nowy Lipowiec amid Polish exercises.' },
      { head: 'Ukraine retakes 14 villages', body: 'Bear Trap frees nearly 200 sq km in Kharkiv region, Kyiv says.' },
      { head: 'Kyiv hits three launchers', body: 'Ukraine strikes Russian launchers and a Druzhba oil pumping station.' },
    ],
  },
  {
    name: 'ASIA-PACIFIC', color: TEAL,
    items: [
      { head: "Summit fallout: 'Putin tired'", body: "Trump: Putin is 'tired' and ready for a deal; Europe wants proof." },
      { head: "Taiwan's worst week since 1990", body: 'Taiex falls 17% in a week as the AI rout spreads; TSMC down 5.2%.' },
      { head: 'Winter grips north India', body: 'Cold tightens in the north as the cyclone soaks the east coast.' },
    ],
  },
  {
    name: 'MIDDLE EAST', color: [122, 84, 20],
    items: [
      { head: 'Tanker hit in Strait of Hormuz', body: 'UKMTO reports a strike and fire eight miles north of Khasab.' },
      { head: 'Houthi missile hits Riyadh tower', body: "Riyadh's tallest tower struck as Saudi Arabia hits back at Houthis." },
      { head: 'US sanctions four Iranians', body: 'Treasury lists four men over handling Iranian oil revenues.' },
    ],
  },
];

const REGIONS_ROW2: Region[] = [
  {
    name: 'AFRICA', color: [46, 96, 52],
    items: [
      { head: 'Somalia expels UAE envoy', body: "Envoy told to leave in 72 hours over 'violations of sovereignty'." },
      { head: 'Tunisia jails rights defender', body: 'Sihem Ben Sedrine gets five years; Amnesty condemns the sentence.' },
      { head: 'AU chief welcomes IGAD treaty', body: 'African Union Commission chair backs the new Horn of Africa treaty.' },
    ],
  },
  {
    name: 'THE AMERICAS', color: [74, 44, 90],
    items: [
      { head: "Trump: Putin 'ready for a deal'", body: "Calls his Shenzhen talks 'very good'; offers Kyiv no guarantees yet." },
      { head: 'Haiti cheers Salvadoran troops', body: "Bukele's soldiers hit a gang leader's home; crowds celebrate." },
      { head: 'Colombia denies NYT report', body: "President calls 'false' a report of a rejected joint US operation." },
    ],
  },
  {
    name: 'MARKETS - TECH', color: INK,
    items: [
      { head: 'SoftBank plunges 14.6%', body: 'OpenAI exposure punished as investors question AI spending.' },
      { head: 'Tech fund enters bear market', body: 'US tech ETF closes 20% below its October peak.' },
      { head: "MSCI Asia's worst week since 2020", body: 'Regional index down 8% for the week; global stocks fall again.' },
    ],
  },
];

const ALSO_TODAY: string[] = [
  'Food checks between Britain and the EU to end from March 2028.',
  'E3 leaders and Ukraine call for a winter ceasefire on energy sites.',
  "Comte aged in a Napoleonic fortress named the world's best cheese.",
  'Anthropic retail buyers face losses after a 13% slide on Friday.',
  'Moscow rejects NATO-style guarantees for Ukraine, Ryabkov says.',
  "Restricted traffic resumes across Kyiv's damaged bridges.",
];

const NUMBERS: [string, string][] = [
  ['400+', 'DRONES FIRED'],
  ['110+', 'MISSILES'],
  ['27', 'BALLISTIC'],
  ['3', 'BRIDGES HIT'],
  ['8', 'KILLED'],
  ['300,000', 'EVACUATED'],
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const MX = 24; // page margin
const CW = W - 2 * MX; // 976

function rule(cv: Canvas, x: number, y: number, w: number, h: number, c: RGB = RULE): void {
  cv.fillRect(x, y, w, h, c);
}

function drawRegionCell(cv: Canvas, x: number, y: number, w: number, h: number, r: Region): void {
  const HH = 17;
  cv.fillRect(x, y, w, HH, r.color);
  drawText(cv, r.name, x + 6, y + 3.5, 11, [255, 255, 255], true, 'left', 0.5);
  const slot = (h - HH) / 3;
  r.items.forEach((it, i) => {
    const iy = y + HH + i * slot;
    drawText(cv, fitLine(it.head, 10, w - 4, true), x + 2, iy + 2, 10, INK, true);
    const lines = wrapText(it.body, 9, w - 4).slice(0, 2);
    lines.forEach((ln, j) => {
      const txt = j === 1 && wrapText(it.body, 9, w - 4).length > 2
        ? fitLine(ln, 9, w - 4) : ln;
      drawText(cv, txt, x + 2, iy + 16 + j * 11, 9, INK_SOFT);
    });
  });
  // Hairline under the cell.
  rule(cv, x, y + h - 1, w, 1, HAIRLINE);
}

function drawFeature(
  cv: Canvas, x: number, y: number, w: number,
  art: (cv: Canvas, x: number, y: number, w: number, h: number) => void,
  kicker: string, head: string, body: string, related: string,
): void {
  art(cv, x, y, w, 68);
  drawText(cv, kicker, x, y + 74, 10, RED, true, 'left', 0.8);
  const hEnd = drawWrapped(cv, head, x, y + 88, 16, w, INK, true, 21);
  const bEnd = drawWrapped(cv, body, x, hEnd + 6, 10.5, w, INK_SOFT, false, 14.5);
  drawText(cv, '\u2022 ' + fitLine(related, 9.5, w - 12), x, bEnd + 6, 9.5, INK, false);
}

function drawPage(cv: Canvas): void {
  // ---- Masthead ----
  rule(cv, MX, 12, CW, 2.5);
  drawText(cv, 'THE DAILY GLOBE', W / 2, 22, 54, INK, true, 'center', 2);
  drawText(cv, 'EST. MMXIX', MX, 88, 10, INK_SOFT, false, 'left', 1);
  drawText(cv, 'FRIDAY, 20 NOVEMBER 2026', W / 2, 84, 13, INK, true, 'center', 0.8);
  drawText(cv, 'THE WORLD IN ONE PAGE', W - MX, 88, 10, INK_SOFT, false, 'right', 1);
  rule(cv, MX, 106, CW, 2);
  rule(cv, MX, 110, CW, 1);
  // ---- Kicker strip ----
  drawText(cv, '34 STORIES FROM 7 REGIONS \u2014 EVERY STORY DATED FRIDAY 20 NOVEMBER 2026',
    W / 2, 118, 12, RED, true, 'center', 1);
  rule(cv, MX, 136, CW, 1, HAIRLINE);

  // ---- Lead story ----
  rule(cv, MX, 142, 496, 2, RED);
  drawText(cv, 'UKRAINE \u2014 THE WAR', MX, 150, 12, RED, true, 'left', 1);
  drawWrapped(cv, "KYIV'S BRIDGES UNDER FIRE", MX, 168, 40, 496, INK, true, 46);
  const deckEnd = drawWrapped(cv,
    'Russia fires more than 400 drones and 110 missiles overnight \u2014 27 of them ballistic \u2014 in the biggest attack of the war on the river crossings of the capital. Three bridges hit, at least eight killed.',
    MX, 264, 13, 496, INK_SOFT, false, 19);
  drawText(cv, 'KYIV - BRUSSELS \u2014 OUR CORRESPONDENTS', MX, deckEnd + 8, 10, INK, true, 'left', 0.8);
  drawBridgePanel(cv, 532, 144, 468, 174);
  drawText(cv, 'Smoke over the Dnipro after ballistic missiles hit three bridges linking',
    532, 322, 10, INK_SOFT);
  drawText(cv, "Kyiv's two banks. Power is cut across the city.",
    532, 334, 10, INK_SOFT);

  // ---- Numbers strip ----
  rule(cv, MX, 360, CW, 2);
  const cellW = CW / NUMBERS.length;
  NUMBERS.forEach(([num, label], i) => {
    const cx = MX + i * cellW;
    if (i > 0) rule(cv, cx, 366, 1, 28, HAIRLINE);
    drawText(cv, num, cx + cellW / 2, 366, 20, INK, true, 'center');
    drawText(cv, label, cx + cellW / 2, 388, 9, INK_SOFT, true, 'center', 0.8);
  });
  rule(cv, MX, 400, CW, 1, HAIRLINE);

  // ---- Feature row: cyclone / UK-EU deal / AI rout ----
  const fx = [MX, 350, 676];
  drawFeature(cv, fx[0], 404, 318, drawCyclonePanel, 'ASIA \u2014 WEATHER',
    "Cyclone Akvan hits India's east coast",
    'Landfall near Gopalpur at 70-80 km/h; 300,000 evacuated, rain into Saturday.',
    'Weakens to a deep depression inland.');
  drawFeature(cv, fx[1], 404, 318, drawFlagsPanel, 'EUROPE \u2014 BRUSSELS',
    'UK and EU strike reset deal',
    'Food checks to go, youth mobility for 100,000 a year, carbon markets linked.',
    "Treasury: 'worth \u00a317bn' \u2014 0.5% of GDP.");
  drawFeature(cv, fx[2], 404, 318, drawChartPanel, 'MARKETS \u2014 THE AI ROUT',
    "Asia's AI sell-off deepens as Anthropic slides",
    'Nikkei -4.8%, Kospi -5.7%, SoftBank -14.6%. An $81bn IPO cannot stop it.',
    'Anthropic -13% on Friday; gold sinks.');
  // ---- Where it happened ----
  drawText(cv, 'WHERE IT HAPPENED \u2014 FRIDAY 20 NOVEMBER 2026', MX, 594, 11, INK, true, 'left', 0.8);
  drawMapBand(cv, MX, 608, CW, 48);
  drawText(cv, 'KYIV \u2022 BRUSSELS \u2022 SHENZHEN \u2022 GOPALPUR \u2022 RIYADH \u2022 HORMUZ \u2022 MOGADISHU \u2022 PORT-AU-PRINCE',
    W / 2, 660, 9, INK_SOFT, false, 'center', 0.8);

  // ---- Region grid ----
  const row1X = [MX, 270, 516, 762];
  REGIONS_ROW1.forEach((r, i) => drawRegionCell(cv, row1X[i], 674, 238, 137, r));
  const row2X = [MX, 352, 680];
  REGIONS_ROW2.forEach((r, i) => drawRegionCell(cv, row2X[i], 815, 320, 137, r));

  // ---- Also today ----
  drawText(cv, 'ALSO TODAY', MX, 960, 11, RED, true, 'left', 1);
  rule(cv, MX + 92, 965, CW - 92, 1, HAIRLINE);
  ALSO_TODAY.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawText(cv, '\u2022 ' + fitLine(t, 10, 476, false), MX + col * 492, 974 + row * 12, 10, INK);
  });

  // ---- Footer ----
  rule(cv, MX, 1011, CW, 1, HAIRLINE);
  drawText(cv, 'THE DAILY GLOBE \u2014 Compiled from wire reports and official bulletins. All 34 stories happened, or were first reported, on Friday 20 November 2026.',
    W / 2, 1015, 8.5, INK_SOFT, false, 'center');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const cv = new Canvas();
  drawPage(cv);
  const png = encodePng(W, H, cv.toRgb());
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
