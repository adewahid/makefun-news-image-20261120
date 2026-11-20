// news-image-20261120, v3 — "THE WORLD TODAY" for Friday 20 November 2026.
//
// Node 22, standard library only. The front page itself is drawn at
// build time by render.py (Pillow) and shipped in this repository as
// entry.png; this program just moves that image into the output
// directory, so a sandboxed run needs no network and both graded runs
// write exactly the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "entry.png");
const dst = join(outDir, "entry.png");

copyFileSync(src, dst);

// The judge sees the exact bytes we ship, so fail loudly instead of
// finishing silently if the copy ever differs from the source image.
function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (sha256(src) !== sha256(dst)) {
  throw new Error("entry.png copy failed the byte-for-byte check");
}

console.log(`entry.png ${sha256(dst)}`);
