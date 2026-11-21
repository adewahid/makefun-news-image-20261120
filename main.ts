// THE WORLD TODAY — front page for Friday 20 November 2026.
// A small self-contained newspaper renderer: it draws the page pixel by
// pixel into an RGB buffer and encodes a PNG with only the Node standard
// library (node:fs, node:zlib, node:crypto for nothing — no hashes here).
// No network, no fonts, no dependencies. Run:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// which writes out/entry.png (1024x1024, deterministic bytes).

import * as fs from "node:fs";
import * as path from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const INK = [24, 24, 28];
const PAPER = [252, 250, 244];
const NAVY = [18, 38, 76];
const NAVY_LIGHT = [38, 66, 118];
const RED = [178, 34, 34];
const TEAL = [14, 110, 110];
const GREY = [90, 90, 96];
const RULE = [200, 196, 186];
const GOLD = [196, 148, 44];

// ------------------------------------------------------------------- font
// A 5x7 bitmap font, one row of strings per glyph, '#' = ink.
// Every glyph is 5 columns wide; the renderer adds 1 column of spacing.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
};

const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

// The page is set in capitals; fold everything to upper case and swap
// in the few punctuation marks the font does not carry.
function clean(s: string): string {
  return s
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, "-");
}

// ------------------------------------------------------------------ canvas
const px = new Uint8Array(W * H * 3);

function fill(c: number[]): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function hline(x: number, y: number, w: number, c: number[]): void {
  rect(x, y, w, 1, c);
}

function vline(x: number, y: number, h: number, c: number[]): void {
  rect(x, y, 1, h, c);
}

// Bresenham line, 1px.
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      const i = (y * W + x) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));
    if (x >= 0 && x < W && y >= 0 && y < H) {
      const i = (y * W + x) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function disc(cx: number, cy: number, r: number, c: number[]): void {
  for (let yy = -r; yy <= r; yy++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) {
        const x = cx + xx;
        const y = cy + yy;
        if (x >= 0 && x < W && y >= 0 && y < H) {
          const i = (y * W + x) * 3;
          px[i] = c[0];
          px[i + 1] = c[1];
          px[i + 2] = c[2];
        }
      }
    }
  }
}

function textWidth(s: string, scale: number): number {
  return clean(s).length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: number[]): void {
  const t = clean(s);
  let cx = x;
  for (const ch of t) {
    const g = FONT[ch] ?? BLANK;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "1") {
          rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentred(s: string, cx: number, y: number, scale: number, c: number[]): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap to a pixel width; returns lines of at most maxLines.
function wrap(s: string, maxPx: number, scale: number, maxLines: number): string[] {
  const words = clean(s).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxPx || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) return lines;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

// --------------------------------------------------------------------- png
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
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
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

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- the day
// Stories as reported on Friday 20 November 2026. The lead is the
// overnight Russian blitz on Kyiv; the rest span India, markets, tech,
// Iran, climate, justice, diplomacy and the Gulf.

type Story = { kicker: string; color: number[]; head: string; body: string };

const LEAD: Story = {
  kicker: "UKRAINE  —  LEAD STORY",
  color: RED,
  head: "RUSSIA HITS KYIV BRIDGES IN OVERNIGHT BLITZ",
  body: "More than 400 drones and 110 missiles struck Ukraine overnight. Three bridges over the Dnipro in Kyiv were hit, at least nine people were killed, and two Russian missiles came down in Poland. No one was hurt there.",
};

const GRID: Story[] = [
  {
    kicker: "INDIA",
    color: TEAL,
    head: "CYCLONE AKVAN MAKES LANDFALL IN ODISHA",
    body: "Landfall near Gopalpur at 70-80 km/h; 300,000 people had been evacuated.",
  },
  {
    kicker: "MARKETS",
    color: RED,
    head: "WALL STREET SLIDES FOR A SEVENTH DAY",
    body: "Nasdaq fell 5.28% on Friday as the S&P 500 fell for a seventh day.",
  },
  {
    kicker: "TECH",
    color: NAVY_LIGHT,
    head: "ANTHROPIC SLIDES A DAY AFTER RECORD DEBUT",
    body: "Shares closed at $88.91, down 8.5%, a day after the record $81.3bn debut.",
  },
  {
    kicker: "IRAN",
    color: RED,
    head: "TRUMP PUTS IRAN DECISION OFF UNTIL NEW YEAR",
    body: "No decision on new strikes on Iran before 1 January, the US president said.",
  },
  {
    kicker: "CLIMATE",
    color: TEAL,
    head: "COP31 TALKS DRIFT INTO OVERTIME",
    body: "Final day in Antalya ends with no deal as the draft drops fossil fuels.",
  },
  {
    kicker: "JUSTICE",
    color: NAVY_LIGHT,
    head: "MYANMAR REJECTS HISTORIC GENOCIDE RULING",
    body: "Myanmar calls the ruling 'unfair' a day after the guilty verdict.",
  },
  {
    kicker: "DIPLOMACY",
    color: NAVY_LIGHT,
    head: "TRUMP RATES SHENZHEN SUMMIT '12 OUT OF 10'",
    body: "Trump hails his Xi and Putin talks; Merz warns against a 'new Yalta'.",
  },
  {
    kicker: "GULF",
    color: RED,
    head: "COALITION STRIKES HODEIDA AS HOUTHI THREATS GROW",
    body: "Saudi-led forces hit Hodeida after Houthi threats to Saudi ports.",
  },
];

const NUMBERS: { n: string; label: string }[] = [
  { n: "110+", label: "MISSILES FIRED AT UKRAINE" },
  { n: "9", label: "KILLED IN THE OVERNIGHT STRIKES" },
  { n: "300,000", label: "EVACUATED AHEAD OF CYCLONE AKVAN" },
  { n: "5.28%", label: "NASDAQ FALL ON FRIDAY" },
  { n: "$88.91", label: "ANTHROPIC CLOSE, DOWN 8.5%" },
];

const ALSO: string[] = [
  "Two Russian missiles and a drone come down in south-east Poland; no one is hurt.",
  "WHO: Ebola in DR Congo 'not under control', with 400-500 new cases a week.",
  "Estonia says it will close its border with Russia from 1 December.",
  "Haiti police kill 34 in a gang raid and retake the Martissant corridor.",
  "IMF warns world debt is near 100% of GDP, the highest since WWII.",
  "Gold falls nearly 4% and Bitcoin drops below $59,000.",
];

// -------------------------------------------------------------- the page
const M = 28; // outer margin
const CW = W - 2 * M; // content width

function drawLeadArt(x: number, y: number, w: number, h: number): void {
  // Night over Kyiv: dark sky, a pale moon, three bridge spans over a
  // river, and a burst of light where a missile struck.
  rect(x, y, w, h, NAVY);
  disc(x + w - 52, y + 34, 16, [232, 228, 210]);
  for (let i = 0; i < 40; i++) {
    const sx = x + ((i * 67) % (w - 8)) + 4;
    const sy = y + ((i * 41) % 70) + 8;
    rect(sx, sy, 2, 2, [200, 205, 225]);
  }
  // River.
  rect(x, y + h - 34, w, 34, NAVY_LIGHT);
  for (let i = 0; i < 5; i++) {
    hline(x + 14 + i * 52, y + h - 22 + (i % 2) * 8, 34, [150, 170, 205]);
  }
  // Bridge deck and three spans.
  hline(x + 10, y + h - 44, w - 20, [240, 238, 230]);
  for (let i = 0; i < 3; i++) {
    const bx = x + 24 + i * 92;
    line(bx, y + h - 44, bx + 46, y + h - 84, [240, 238, 230]);
    line(bx + 46, y + h - 84, bx + 92, y + h - 44, [240, 238, 230]);
    vline(bx + 46, y + h - 84, 40, [240, 238, 230]);
  }
  // Burst.
  const bx = x + 118;
  const by = y + 52;
  for (let a = 0; a < 12; a++) {
    const rad = (a * Math.PI) / 6;
    line(bx, by, Math.round(bx + 26 * Math.cos(rad)), Math.round(by + 26 * Math.sin(rad)), GOLD);
  }
  disc(bx, by, 7, GOLD);
  disc(bx, by, 3, [255, 240, 180]);
  drawText("KYIV AT NIGHT", x + 12, y + h - 16, 1, [220, 224, 235]);
}

function drawStoryCell(s: Story, x: number, y: number, w: number, h: number): void {
  hline(x, y, w, RULE);
  drawText(s.kicker, x, y + 8, 1, s.color);
  const headLines = wrap(s.head, w, 2, 2);
  let yy = y + 20;
  for (const ln of headLines) {
    drawText(ln, x, yy, 2, INK);
    yy += 15;
  }
  const bodyLines = wrap(s.body, w, 2, 3);
  yy += 2;
  for (const ln of bodyLines) {
    drawText(ln, x, yy, 2, [52, 52, 58]);
    yy += 14;
  }
}

function drawPage(): void {
  fill(PAPER);

  // Masthead.
  drawTextCentred("THE WORLD TODAY", W / 2, 18, 6, INK);
  hline(M, 66, CW, INK);
  hline(M, 69, CW, INK);
  drawTextCentred("ONE DAY IN THE WORLD'S NEWS", W / 2, 78, 1, GREY);

  // Navy date bar. 20 November 2026 was a Friday.
  rect(M, 96, CW, 36, NAVY);
  drawTextCentred("FRIDAY, 20 NOVEMBER 2026", W / 2, 106, 2, [255, 255, 255]);

  // Lead story: text left, night scene right.
  const leadY = 144;
  const leadH = 172;
  const artW = 330;
  const textW = CW - artW - 24;
  drawText(LEAD.kicker, M, leadY, 1, LEAD.color);
  const leadHead = wrap(LEAD.head, textW, 3, 2);
  let yy = leadY + 16;
  for (const ln of leadHead) {
    drawText(ln, M, yy, 3, INK);
    yy += 22;
  }
  const leadBody = wrap(LEAD.body, textW, 2, 5);
  yy += 4;
  for (const ln of leadBody) {
    drawText(ln, M, yy, 2, [52, 52, 58]);
    yy += 15;
  }
  drawLeadArt(M + textW + 24, leadY, artW, leadH);
  hline(M, leadY + leadH + 8, CW, INK);

  // Grid of eight stories: two columns, four rows.
  const gridY = 336;
  const colW = Math.floor((CW - 24) / 2);
  const rowH = 96;
  for (let i = 0; i < GRID.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawStoryCell(
      GRID[i],
      M + col * (colW + 24),
      gridY + row * rowH,
      colW,
      rowH,
    );
  }

  // The day in numbers.
  const numY = 724;
  rect(M, numY, CW, 92, NAVY);
  drawText("THE DAY IN NUMBERS", M + 12, numY + 8, 1, GOLD);
  const cellW = Math.floor(CW / 5);
  for (let i = 0; i < NUMBERS.length; i++) {
    const cx = M + i * cellW + Math.floor(cellW / 2);
    drawTextCentred(NUMBERS[i].n, cx, numY + 26, 4, [255, 255, 255]);
    const lab = wrap(NUMBERS[i].label, cellW - 16, 1, 2);
    let ly = numY + 58;
    for (const ln of lab) {
      drawTextCentred(ln, cx, ly, 1, [200, 208, 224]);
      ly += 9;
    }
    if (i > 0) vline(M + i * cellW, numY + 24, 56, NAVY_LIGHT);
  }

  // Also today.
  const alsoY = 832;
  drawText("ALSO TODAY", M, alsoY, 2, INK);
  hline(M, alsoY + 18, CW, INK);
  let ay = alsoY + 28;
  for (const item of ALSO) {
    rect(M + 2, ay + 4, 6, 6, RED);
    const lines = wrap(item, CW - 22, 2, 1);
    for (const ln of lines) drawText(ln, M + 18, ay, 2, [52, 52, 58]);
    ay += 16;
  }

  // Footer.
  hline(M, 972, CW, RULE);
  drawTextCentred(
    "THE WORLD TODAY  -  FRIDAY 20 NOVEMBER 2026  -  STORIES AS REPORTED ON THE DAY",
    W / 2,
    982,
    1,
    GREY,
  );
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  drawPage();
  const png = encodePng();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
