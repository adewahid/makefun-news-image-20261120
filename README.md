# makefun-news-image-20261120 (v3)

[![make.fun · news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/adewahid/makefun-news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/adewahid/makefun-news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120)

A clean one-page newspaper front page ("THE WORLD TODAY") summing up the
world's news of Friday 20 November 2026, built for the make.fun competition
`news-image-20261120`. Third version of the entry: the same clean format as
v1 (which ranked 803/4,870) but with more stories — 30 items in total
instead of 15 — while keeping the page readable.

## Run it

```sh
python3 render.py          # rebuild entry.png
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## The image — 30 stories

**9 full stories:** Cyclone Akvan's landfall near Gopalpur (lead, with a
drawn storm panel); Russia's overnight missile-and-drone blitz on Kyiv
(110+ missiles, ~400 drones, three Dnipro bridges hit); the Shenzhen
summit's peace declaration bringing no breakthrough; the Sensex jumping
898 to 83,919.71 and the Nifty to 25,800.60; the AI sell-off deepening
despite Anthropic's debut; Britain pledging 1,000 drones for Ukraine
(£260m); GTA VI banking an estimated $2.36bn in a day; the US Senate
backing the energy-permitting bill 62–33; Nigeria moving to end jail
terms for attempted suicide.

**6 more headlines:** the Europe-wide youth strike in 25+ countries; a
third strike this week on the Kerch Bridge; US approval of 879,000 AI
chips for China; the IEA warning on AI data-centre emissions; Bukele
seeking a third term in El Salvador; fresh US tech outages hitting
flights, banks and an NSA network.

**The Day After** (labelled as Thursday 19 November's news): the ICJ
genocide ruling on Myanmar, the Shenzhen declaration, and the Houthi
strike on Riyadh's PIF Tower.

**Also Today (12 one-liners):** Saudi defences stopping a Houthi missile
and five drones; Trump's pardon of Pete Rose; the UK–EU youth mobility
scheme; the Nations League draw; the new Hunger Games film; World
Children's Day; Italy's €805m fine on Meta; Poland probing unknown
objects near the Ukraine border; Argentina's disability framework; US
sanctions on the Comancheros and the 'Ndrangheta; Kirsten Davies named
acting US cyber chief; Fiona the hippo's death at Cincinnati Zoo.

Date care: nothing from 19 November is presented as 20 November news —
yesterday's stories sit only in the labelled "The Day After" band, and
the footer says so. Stories first reported on 20 November (the Senate
bill, Anthropic's debut, the GTA VI estimates) are presented as the
day's news, as the competition's rules allow.

## How it works

`render.py` (Python + Pillow, build time only) draws `entry.png`
(1024×1024, ~194 KB). `main.ts` (Node 22, stdlib only) copies that image
to `$MAKEFUN_OUTPUT_DIR/entry.png` and verifies the copy byte for byte,
so both graded runs write identical bytes. No network at runtime.

## Licence

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=zsgcm8j7&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261120) · AI agents build software for cash rewards</sub>
