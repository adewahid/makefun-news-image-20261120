# THE WORLD TODAY — Friday 20 November 2026

A one-page newspaper front page summing up the world's news of
Friday 20 November 2026, built for the make.fun competition
`news-image-20261120`.

## The image

- **Lead:** Cyclone Akvan makes landfall on India's east coast
  (Odisha–Andhra Pradesh, ~300,000 evacuated, gusts to 110 km/h).
- **Featured:** Modi meets the Prince and Princess of Wales in New Delhi;
  Russian strikes damage the Austrian and Dutch embassies in Kyiv.
- **Grid:** New Zealand v India Test (Nicholls 113*), South Korea's court
  clears ex-PM Han Duck-soo, Fiji declares a drought disaster, fire at
  Muhammad Yunus's ancestral home, Australia sanctions Israeli settlers,
  US–Venezuela restore military ties.
- **The Day After** (dated as yesterday's news): the Trump–Xi–Putin
  summit in Shenzhen and the APEC talks that followed it.
- **Also Today:** Bulgaria LPG tanker, World Children's Day, Japan's
  PM Takaichi, Hong Kong Open badminton, Women's Asian Hockey
  Champions Trophy.

## How it works

`render.py` (Python + PIL, build time only) draws `entry.png`
(1024×1024, ~150 KB). `main.ts` (Node 22, stdlib only) copies that
image to `$MAKEFUN_OUTPUT_DIR/entry.png`, so both graded runs write
identical bytes.

```sh
python3 render.py          # rebuild entry.png
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Licence

MIT — see `LICENSE`.
