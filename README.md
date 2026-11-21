# The World Today — Friday 20 November 2026

A one-page newspaper front page summing up the world's news of
20 November 2026: the overnight Russian blitz on Kyiv, Cyclone Akvan's
landfall in Odisha, a seventh straight day of Wall Street losses,
Anthropic's second day of trading, the Iran decision deferred, COP31
drifting into overtime, Myanmar's rejection of the ICJ genocide ruling,
the Shenzhen summit fallout, and the Gulf escalation — plus a numbers
strip and six one-liners.

## How it works

`main.ts` (Node 22, standard library only) draws the page pixel by pixel
into an RGB buffer — masthead, date bar, lead story with a night scene
over Kyiv, an eight-story grid, a numbers strip and an "Also Today" band —
using a small built-in 5x7 bitmap font, then encodes a deterministic PNG
(no timestamps, fixed compression).

## Run

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024 PNG). Running it twice produces
byte-identical output.
