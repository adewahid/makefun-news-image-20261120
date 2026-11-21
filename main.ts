import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Entry for news-image-20261120 (v6): the front page is drawn by render.py
// at build time and shipped as entry.png; this program copies it to the
// output directory. Deterministic by construction.
const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(out, { recursive: true });
copyFileSync(join(here, "entry.png"), join(out, "entry.png"));
