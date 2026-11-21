// THE DAILY GLOBE — front page for Friday, 20 November 2026.
// A from-scratch broadsheet renderer: Node 22 standard library only, no
// network. It blits glyphs from a build-time atlas (atlas.json + atlas.bin,
// rasterized from the system DejaVu fonts), draws every rule, band and the
// Kyiv illustration with raw pixels, and writes a deterministic PNG with a
// hand-rolled encoder (zlib deflate, fixed settings, no timestamps).
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette: warm paper, deep navy, one red accent ----------------------
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [26, 26, 26];
const INK_SOFT: RGB = [84, 78, 66];
const NAVY: RGB = [20, 38, 74];
const NAVY_DARK: RGB = [13, 25, 50];
const NAVY_MID: RGB = [28, 50, 88];
const RED: RGB = [176, 30, 36];
const RULE: RGB = [203, 195, 175];
const RULE_DARK: RGB = [120, 112, 96];
const GOLD: RGB = [212, 164, 74];
const WHITE: RGB = [247, 246, 242];
const RIVER: RGB = [74, 112, 152];
const RIVER_LIGHT: RGB = [120, 158, 196];
const BLAST: RGB = [232, 100, 28];
const BLAST_GOLD: RGB = [242, 165, 65];
const SKYLINE: RGB = [10, 18, 36];

type RGB = [number, number, number];

// ---- CRC32 + PNG encoder ---------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- canvas ----------------------------------------------------------------
class Canvas {
  px = new Uint8Array(W * H * 3);
  constructor() { this.fillRect(0, 0, W, H, PAPER); }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
  }
  blend(x: number, y: number, c: RGB, a: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const i = (y * W + x) * 3;
    const inv = 1 - a;
    this.px[i] = Math.round(c[0] * a + this.px[i] * inv);
    this.px[i + 1] = Math.round(c[1] * a + this.px[i + 1] * inv);
    this.px[i + 2] = Math.round(c[2] * a + this.px[i + 2] * inv);
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
        i += 3;
      }
    }
  }
  hline(x: number, y: number, w: number, c: RGB, thick = 1): void {
    this.fillRect(x, y, w, thick, c);
  }
  vline(x: number, y: number, h: number, c: RGB, thick = 1): void {
    this.fillRect(x, y, thick, h, c);
  }
  // Bresenham line, for the bridge arches
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    let ax = Math.round(x0), ay = Math.round(y0);
    const bx = Math.round(x1), by = Math.round(y1);
    const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(ax, ay, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; ax += sx; }
      if (e2 <= dx) { err += dx; ay += sy; }
    }
  }
  // even-odd scanline polygon fill
  fillPoly(pts: Array<[number, number]>, c: RGB): void {
    let minY = H, maxY = 0;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, Math.ceil(xs[k])), x1 = Math.min(W - 1, Math.floor(xs[k + 1]));
        for (let x = x0; x <= x1; x++) this.set(x, y, c);
      }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y - cy;
      const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
      for (let x = Math.floor(cx - dx); x <= Math.ceil(cx + dx); x++) this.set(x, y, c);
    }
  }
  // 8-point starburst used for the overnight explosions
  star(cx: number, cy: number, rOuter: number, rInner: number, c: RGB): void {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    this.fillPoly(pts, c);
  }
}

// ---- glyph atlas -------------------------------------------------------------
const HERE = dirname(fileURLToPath(import.meta.url));
const ATLAS = JSON.parse(readFileSync(join(HERE, "atlas.json"), "utf8")) as {
  width: number; height: number;
  fonts: Record<string, { ascent: number; descent: number;
    glyphs: Record<string, [number, number, number, number, number, number, number]> }>;
};
const ATLAS_PX = readFileSync(join(HERE, "atlas.bin"));

type Glyph = [number, number, number, number, number, number, number]; // x,y,w,h,dx,dy,adv

function glyph(font: string, ch: string): Glyph | undefined {
  return ATLAS.fonts[font]?.glyphs[ch];
}

function textWidth(font: string, s: string, tracking = 0): number {
  let w = 0;
  for (const ch of s) {
    const g = glyph(font, ch);
    if (g) w += g[6] + tracking;
  }
  return w - (s.length ? tracking : 0);
}

function drawText(cv: Canvas, font: string, x: number, baselineY: number, s: string,
  color: RGB, tracking = 0, align: "left" | "center" | "right" = "left"): void {
  let px = x;
  if (align === "center") px = x - textWidth(font, s, tracking) / 2;
  if (align === "right") px = x - textWidth(font, s, tracking);
  for (const ch of s) {
    const g = glyph(font, ch);
    if (!g) { px += tracking; continue; }
    const [ax, ay, gw, gh, dx, dy] = g;
    const ox = Math.round(px + dx), oy = Math.round(baselineY + dy);
    for (let yy = 0; yy < gh; yy++) {
      for (let xx = 0; xx < gw; xx++) {
        const a = ATLAS_PX[(ay + yy) * ATLAS.width + (ax + xx)] / 255;
        if (a > 0) cv.blend(ox + xx, oy + yy, color, a);
      }
    }
    px += g[6] + tracking;
  }
}

// Greedy word wrap; returns lines and whether text overflowed maxLines.
function wrapText(font: string, s: string, maxW: number, maxLines: number,
  tracking = 0): { lines: string[]; overflow: boolean } {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur ? cur + " " + word : word;
    if (textWidth(font, trial, tracking) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
      if (lines.length === maxLines) return { lines, overflow: true };
    }
  }
  if (cur) lines.push(cur);
  return { lines, overflow: lines.length > maxLines };
}

function drawBlock(cv: Canvas, font: string, x: number, firstBaseline: number, s: string,
  maxW: number, leading: number, maxLines: number, color: RGB,
  tracking = 0): { endY: number; overflow: boolean } {
  const { lines, overflow } = wrapText(font, s, maxW, maxLines, tracking);
  lines.forEach((ln, i) => drawText(cv, font, x, firstBaseline + i * leading, ln, color, tracking));
  return { endY: firstBaseline + (lines.length - 1) * leading, overflow };
}

// ---- the day's news: Friday, 20 November 2026 ------------------------------
const DATE_LINE = "FRIDAY, 20 NOVEMBER 2026";
const MASTHEAD = "THE DAILY GLOBE";
const TAGLINE = "THE DAY'S NEWS — FRIDAY, 20 NOVEMBER 2026";

const NUMBERS: Array<[string, string]> = [
  ["110+", "MISSILES AT UKRAINE"],
  ["9", "KILLED IN KYIV"],
  ["300,000", "EVACUATED IN ODISHA"],
  ["\u22125.28%", "NASDAQ"],
  ["$88.91", "ANTHROPIC CLOSE"],
];

const LEAD_KICKER = "UKRAINE \u00B7 OVERNIGHT BLITZ";
const LEAD_HEAD = "Russia's overnight blitz hits Kyiv's bridges";
const LEAD_DECK = "More than 400 drones and 110 missiles rained on the capital; three bridges over the Dnipro were hit, nine killed \u2014 and two missiles fell in Poland.";
const LEAD_CAPTION = "Three Dnipro bridges were hit overnight.";

type Story = { kicker: string; head: string; deck: string };
const MAIN: Story[] = [
  { kicker: "CYCLONE", head: "Cyclone Akvan batters Odisha", deck: "300,000 people evacuated as the storm drives ashore." },
  { kicker: "MARKETS", head: "Wall Street slides for a seventh day", deck: "Nasdaq drops 5.28% as the sell-off deepens." },
  { kicker: "MARKETS", head: "Anthropic falls a day after record debut", deck: "Shares close at $88.91, down 8.5% on the day." },
  { kicker: "MIDDLE EAST", head: "Trump delays Iran decision to new year", deck: "A decision on Iran is pushed into the new year." },
  { kicker: "CLIMATE", head: "COP31 drifts into overtime", deck: "Talks in Antalya run past their deadline." },
  { kicker: "JUSTICE", head: "Myanmar rejects ICJ ruling", deck: "The court found Myanmar responsible for genocide." },
  { kicker: "SUMMIT", head: "Trump: Shenzhen '12 out of 10'", deck: "Merz warns of a 'new Yalta' over Europe's future." },
  { kicker: "YEMEN", head: "Coalition strikes Hodeida", deck: "Air strikes hit the port city of Hodeida." },
];

const MORE: string[] = [
  "EU and UK hold second summit in Brussels",
  "Magnitude 6.7 quake shakes central Peru",
  "Harden drops 51 as Cavs top Pacers 128\u2013119",
  "California subpoenas Nvidia over China chip risks",
  "TSMC and Samsung halt advanced chip sales to China",
  "US and China agree human oversight of military AI",
  "Cancer trial pill leaves tumours undetectable in 1 in 12",
  "Ukraine retakes 14 villages in Kharkiv",
  "Denmark approves Greenland\u2013US security pact",
  "Microsoft outage disrupts Outlook and Teams",
];

const ALSO: string[] = [
  "Missiles and a drone down in Poland",
  "WHO: Ebola in DR Congo 'not under control'",
  "Estonia to close Russia border on 1 December",
  "Haiti police kill 34 in gang raid",
  "IMF: world debt near 100% of GDP",
  "Gold falls 4%; Bitcoin below $59,000",
  "Nikkei falls 5.06% as Asia joins rout",
  "Kerch Bridge hit by Ukrainian strikes",
  "Houthi missiles aimed at Riyadh downed",
  "Visa, Mastercard, JPMorgan hit by breaches",
  "Trump floats penalties for AI plants abroad",
  "Wales stun All Blacks 35\u201328",
];

// ---- layout ------------------------------------------------------------------
const MX = 34;            // side margin
const RX = 990;           // right edge of content
const CW = RX - MX;       // 956

function lerp(a: number, b: number, t: number): number { return Math.round(a + (b - a) * t); }
function mix(c1: RGB, c2: RGB, t: number): RGB {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function drawIllustration(cv: Canvas, x: number, y: number, w: number, h: number): void {
  // Night schematic of Kyiv: the Dnipro running down the page, three bridges
  // crossed by strikes. Drawn, not photographed: sky bands, river, decks,
  // starbursts, city marks.
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    cv.fillRect(x, y + Math.floor((h * i) / bands), w,
      Math.ceil(h / bands) + 1, mix(NAVY_DARK, NAVY_MID, i / (bands - 1)));
  }
  // stars / drones drifting over the city
  const dots: Array<[number, number, number]> = [
    [0.08, 0.12, 2], [0.22, 0.07, 1], [0.38, 0.16, 2], [0.55, 0.09, 1],
    [0.71, 0.14, 2], [0.86, 0.06, 1], [0.93, 0.22, 2], [0.15, 0.30, 1],
    [0.47, 0.26, 1], [0.66, 0.32, 1], [0.30, 0.05, 1], [0.80, 0.38, 1],
  ];
  for (const [fx, fy, r] of dots) cv.circle(x + fx * w, y + fy * h, r, WHITE);
  // moon
  cv.circle(x + w - 34, y + 26, 11, [232, 228, 200]);
  cv.circle(x + w - 38, y + 22, 10, NAVY_DARK);
  // the Dnipro: a broad band running top-left to bottom-right
  const river: Array<[number, number]> = [
    [x + w * 0.42, y], [x + w * 0.58, y],
    [x + w * 0.34, y + h], [x + w * 0.18, y + h],
  ];
  cv.fillPoly(river, RIVER);
  cv.fillPoly([[x + w * 0.42, y], [x + w * 0.46, y], [x + w * 0.22, y + h], [x + w * 0.18, y + h]], RIVER_LIGHT);
  // city blocks on the west bank
  const blocks: Array<[number, number, number, number]> = [
    [0.04, 0.62, 0.07, 0.30], [0.13, 0.70, 0.06, 0.22], [0.21, 0.58, 0.08, 0.34],
    [0.31, 0.68, 0.06, 0.24], [0.06, 0.42, 0.05, 0.18], [0.16, 0.34, 0.06, 0.22],
  ];
  for (const [fx, fy, fw, fh] of blocks) {
    cv.fillRect(x + fx * w, y + fy * h, fw * w, fh * h, SKYLINE);
  }
  // three bridges: white decks crossing the river, each with a drawn arch
  const bridges: Array<[number, number]> = [[0.50, 0.22], [0.42, 0.50], [0.34, 0.78]];
  for (const [fx, fy] of bridges) {
    const cx = x + fx * w, cy = y + fy * h;
    cv.fillRect(cx - 34, cy - 1, 68, 3, WHITE);
    cv.fillRect(cx - 34, cy - 12, 2, 12, WHITE);
    cv.fillRect(cx + 32, cy - 12, 2, 12, WHITE);
    let px = cx - 34, py = cy - 1;
    for (let a = 180; a >= 0; a -= 12) {
      const r = (a * Math.PI) / 180;
      const qx = cx + Math.cos(r) * 34, qy = cy - 1 - Math.sin(r) * 13;
      cv.line(px, py, qx, qy, WHITE);
      px = qx; py = qy;
    }
  }
  // explosions over the three crossings, just above each arch
  const bursts: Array<[number, number, number]> = [[0.50, 0.22, 16], [0.42, 0.50, 19], [0.34, 0.78, 14]];
  for (const [fx, fy, r] of bursts) {
    const cx = x + fx * w, cy = y + fy * h - 22;
    cv.star(cx, cy, r, r * 0.45, BLAST);
    cv.star(cx, cy, r * 0.55, r * 0.25, BLAST_GOLD);
    cv.circle(cx, cy, 3, WHITE);
  }
  // labels
  drawText(cv, "numLab", x + 12, y + h - 12, "KYIV", WHITE, 1);
  drawText(cv, "numLab", x + w - 12, y + h - 12, "DNIPRO", RIVER_LIGHT, 1, "right");
  // gold frame
  cv.fillRect(x, y, w, 2, GOLD);
  cv.fillRect(x, y + h - 2, w, 2, GOLD);
  cv.fillRect(x, y, 2, h, GOLD);
  cv.fillRect(x + w - 2, y, 2, h, GOLD);
}

function sectionHead(cv: Canvas, y: number, label: string): void {
  drawText(cv, "secHead", MX + 16, y + 13, label, NAVY, 2);
  cv.fillRect(MX, y + 3, 8, 8, RED);
  cv.hline(MX, y + 20, CW, RULE_DARK, 1);
}

function build(): Buffer {
  const cv = new Canvas();
  const problems: string[] = [];

  // top red bar + date bar
  cv.fillRect(0, 0, W, 6, RED);
  drawText(cv, "dateBar", MX, 30, DATE_LINE, INK, 1);
  drawText(cv, "dateBar", RX, 30, "THE WORLD IN ONE PAGE", INK_SOFT, 1, "right");
  cv.hline(MX, 40, CW, INK, 2);
  cv.hline(MX, 44, CW, INK, 1);

  // masthead
  drawText(cv, "masthead", W / 2, 112, MASTHEAD, NAVY, 2, "center");
  drawText(cv, "tagline", W / 2, 138, TAGLINE, RED, 2, "center");
  cv.hline(MX, 148, CW, INK, 2);
  cv.hline(MX, 152, CW, INK, 1);

  // numbers band
  const bandY = 160, bandH = 48;
  cv.fillRect(MX, bandY, CW, bandH, NAVY);
  const cellW = CW / NUMBERS.length;
  NUMBERS.forEach(([num, lab], i) => {
    const cx = MX + cellW * (i + 0.5);
    if (i > 0) cv.vline(Math.round(MX + cellW * i), bandY + 8, bandH - 16, [58, 76, 118], 1);
    drawText(cv, "numBig", cx, bandY + 28, num, WHITE, 0, "center");
    drawText(cv, "numLab", cx, bandY + 43, lab, [178, 190, 212], 1, "center");
  });

  // lead story (left) + illustration (right)
  const leadY = 218;
  const leadW = 602;
  cv.fillRect(MX, leadY + 6, 64, 3, RED);
  drawText(cv, "kicker", MX, leadY + 22, LEAD_KICKER, RED, 1);
  const head = drawBlock(cv, "leadHead", MX, leadY + 64, LEAD_HEAD, leadW, 42, 3, INK);
  if (head.overflow) problems.push("lead headline overflow");
  const deck = drawBlock(cv, "leadDeck", MX, head.endY + 34, LEAD_DECK, leadW, 22, 3, INK_SOFT);
  if (deck.overflow) problems.push("lead deck overflow");
  drawIllustration(cv, 656, leadY, 334, 182);
  drawText(cv, "caption", 656 + 167, leadY + 200, LEAD_CAPTION, INK_SOFT, 0, "center");

  // main grid: 8 stories, 2 columns x 4 rows
  sectionHead(cv, 442, "THE DAY IN FULL");
  const gridY = 474, rowH = 54, colW = 467;
  MAIN.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MX + col * (colW + 22);
    const y = gridY + row * rowH;
    drawText(cv, "kicker", x, y + 11, s.kicker, RED, 1);
    const hb = drawBlock(cv, "mainHead", x, y + 32, s.head, colW, 21, 1, INK);
    if (hb.overflow) problems.push("main headline overflow: " + s.head);
    drawText(cv, "mainDeck", x, y + 50, s.deck, INK_SOFT);
    if (row < 3) cv.hline(MX, y + rowH - 2, CW, RULE, 1);
  });
  cv.vline(512, gridY, rowH * 4 - 2, RULE, 1);

  // more headlines: 10 items, 2 columns x 5 rows
  sectionHead(cv, 702, "MORE HEADLINES");
  const moreY = 734, moreRowH = 26;
  MORE.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MX + col * (colW + 22);
    const y = moreY + row * moreRowH;
    cv.fillRect(x, y + 11, 6, 6, RED);
    const mb = drawBlock(cv, "moreHead", x + 14, y + 18, t, colW - 14, 18, 1, INK);
    if (mb.overflow) problems.push("more headline overflow: " + t);
  });

  // also today: 12 items, 3 columns x 4 rows
  sectionHead(cv, 876, "ALSO TODAY");
  const alsoY = 908, alsoRowH = 21, alsoColW = 306;
  ALSO.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = MX + col * (alsoColW + 19);
    const y = alsoY + row * alsoRowH;
    cv.fillRect(x, y + 10, 5, 5, RED);
    const ab = drawBlock(cv, "alsoText", x + 12, y + 15, t, alsoColW - 12, 15, 1, INK);
    if (ab.overflow) problems.push("also-today overflow: " + t);
  });

  // footer
  cv.hline(MX, 1000, CW, RULE_DARK, 1);
  drawText(cv, "footer", W / 2, 1014, "Compiled from wire reports \u00B7 Friday, 20 November 2026 \u00B7 The Daily Globe", INK_SOFT, 0, "center");

  if (problems.length) console.error("LAYOUT PROBLEMS:\n" + problems.join("\n"));
  return encodePNG(cv.px);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), build());
console.log("wrote entry.png");
