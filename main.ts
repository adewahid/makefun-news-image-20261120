// news-image-20261120 — "THE WORLD TODAY", the front page of Friday
// 20 November 2026. Node 22, standard library only. The image is drawn
// by render.py (PIL, build time only) and shipped in this repository as
// entry.png; this program just copies it to the output directory, so
// every run writes the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'entry.png');
const dst = join(outDir, 'entry.png');
copyFileSync(src, dst);
// Fail loudly instead of shipping a truncated copy: the gate reads the
// exact bytes, so the copy must match the shipped image byte for byte.
if (statSync(src).size !== statSync(dst).size) {
  throw new Error(`entry.png copy mismatch: ${statSync(src).size} != ${statSync(dst).size}`);
}
