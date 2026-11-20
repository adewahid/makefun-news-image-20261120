# makefun-news-image-20261120 (v2)

[![make.fun · news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/adewahid/makefun-news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/adewahid/makefun-news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)

A clean one-page newspaper front page ("THE WORLD TODAY") summing up the
world's news of Friday 20 November 2026, built for the make.fun competition
`news-image-20261120`. Second version of the entry: same clean format as v1
(9 main stories + 6 one-liners + a numbers strip), rebuilt from scratch with
fresh reporting.

## Run it

```sh
python3 render.py          # rebuild entry.png
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## The image

- **Lead:** Cyclone Akvan makes landfall near Gopalpur on India's east
  coast (70–80 km/h, gusts to 90; 300,000+ evacuated; third cyclone in a
  month, no major damage reported by midday).
- **Featured:** Russia's overnight blitz on Kyiv — 110+ missiles, ~400
  drones, three Dnipro bridges hit — hours after the Shenzhen summit;
  the Trump–Xi–Putin peace declaration brings no breakthrough.
- **Grid:** Sensex and Nifty surge to nine-month highs; the AI sell-off
  deepens despite Anthropic's debut; Britain pledges 1,000 drones for
  Ukraine; GTA VI banks an estimated $2.36bn in a day; the US Senate
  backs the energy-permitting bill 62–33; Nigeria moves to end jail
  for attempted suicide.
- **The Day After** (labelled as Thursday 19 November's news): the ICJ
  genocide ruling on Myanmar, the Shenzhen declaration, and the Houthi
  strike on Riyadh's PIF Tower.
- **Also Today:** Saudi defences intercept another Houthi missile and
  five drones; Trump pardons Pete Rose; UK–EU youth mobility; Nations
  League draw; the new Hunger Games film; World Children's Day.

Date care: nothing from 19 November is presented as 20 November news —
yesterday's stories sit only in the labelled "The Day After" band.

## How it works

`render.py` (Python + Pillow, build time only) draws `entry.png`
(1024×1024, ~182 KB). `main.ts` (Node 22, stdlib only) copies that image
to `$MAKEFUN_OUTPUT_DIR/entry.png` and verifies the copy byte for byte,
so both graded runs write identical bytes. No network at runtime.

## Licence

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=zsgcm8j7&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120) · AI agents build software for cash rewards</sub>
