#!/usr/bin/env python3
"""Front page of THE WORLD TODAY for Friday 20 November 2026.

Draws a one-page newspaper front page with Pillow and writes entry.png
next to this file. Thirty stories in all: nine full stories, six compact
headlines in a second grid, three Thursday items in a labelled
"The Day After" band, and twelve one-liners under "Also Today".
Run it with:  python3 render.py
"""

from PIL import Image, ImageDraw, ImageFont

PAGE_W, PAGE_H = 1024, 1024
MARGIN = 28
RIGHT = PAGE_W - MARGIN

PAPER = (247, 243, 230)
INK = (20, 19, 15)
NAVY = (24, 40, 80)
NAVY_PALE = (231, 235, 243)
RED = (156, 26, 30)
GREY = (96, 93, 84)
RULE = (152, 148, 134)

FONTS = "/usr/share/fonts/truetype/liberation/"
SERIF_B = FONTS + "LiberationSerif-Bold.ttf"
SERIF = FONTS + "LiberationSerif-Regular.ttf"
SERIF_I = FONTS + "LiberationSerif-Italic.ttf"
SANS_B = FONTS + "LiberationSans-Bold.ttf"
SANS = FONTS + "LiberationSans-Regular.ttf"

_cache = {}


def fnt(path, size):
    key = (path, size)
    if key not in _cache:
        _cache[key] = ImageFont.truetype(path, size)
    return _cache[key]


def fit_lines(d, text, font, width):
    """Word-wrap `text` to the given pixel width; returns a list of lines."""
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if d.textlength(trial, font=font) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_lines(d, x, y, lines, font, fill, leading):
    """Draw lines top to bottom; returns the y just below the last line."""
    for line in lines:
        d.text((x, y), line, font=font, fill=fill)
        y += int(font.size * leading)
    return y


def kicker(d, x, y, text):
    d.text((x, y), text, font=fnt(SANS_B, 13), fill=RED)
    return y + 18


def headline(d, x, y, width, text, size):
    font = fnt(SERIF_B, size)
    return draw_lines(d, x, y, fit_lines(d, text, font, width),
                      font, INK, 1.08)


def body(d, x, y, width, text, size):
    font = fnt(SERIF, size)
    return draw_lines(d, x, y, fit_lines(d, text, font, width),
                      font, INK, 1.32)


def story_block(d, x, y, width, kick, head, text, head_size, body_size):
    """Kicker + headline + body column; returns the bottom y."""
    y = kicker(d, x, y, kick)
    y = headline(d, x, y + 2, width, head, head_size)
    return body(d, x, y + 5, width, text, body_size)


def rule(d, y, x0=MARGIN, x1=RIGHT, width=2):
    d.line([(x0, y), (x1, y)], fill=RULE, width=width)


def cyclone_art(d, x, y, w, h):
    """Stylised cyclone over a coastline, drawn with Pillow only."""
    d.rectangle([x, y, x + w, y + h], fill=NAVY)
    cx, cy = x + w - 88, y + 62
    # spiral: arcs whose sweep grows outward, like a turning storm
    for i, r in enumerate((58, 46, 34, 22)):
        start = 15 + i * 55
        shade = (95 + i * 38, 122 + i * 26, 172 + i * 16)
        d.arc([cx - r, cy - r, cx + r, cy + r], start=start,
              end=start + 300, fill=shade, width=6)
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(255, 255, 255))
    d.text((x + 16, y + 12), "CYCLONE AKVAN", font=fnt(SANS_B, 15),
           fill=(255, 255, 255))
    # labels sit clear of the rain strip along the bottom edge
    d.text((x + 16, y + h - 72), "LANDFALL 08:30  •  GOPALPUR",
           font=fnt(SANS_B, 12), fill=(205, 214, 232))
    d.text((x + 16, y + h - 54), "WINDS 70–80 KM/H, GUSTS 90",
           font=fnt(SANS_B, 12), fill=(205, 214, 232))
    # rain slashes in the bottom strip only, clear of the labels
    for rx in range(x + 18, x + w - 12, 32):
        d.line([(rx, y + h - 32), (rx - 8, y + h - 12)],
               fill=(150, 175, 215), width=3)


# ---------------------------------------------------------------- stories
LEAD = {
    "kick": "INDIA  •  CYCLONE",
    "head": "Akvan comes ashore on India's east coast",
    "deck": ("The third cyclone in a month crosses near Gopalpur at dawn, "
             "after more than 300,000 people were moved to shelters."),
    "body": ("Heavy rain lashed Odisha and northern Andhra Pradesh as "
             "Akvan came ashore with winds of 70–80 km/h, gusting to 90. "
             "Trains were cancelled and schools shut; officials reported "
             "no major damage or deaths by midday."),
}

ROW2 = [
    {"kick": "UKRAINE  •  WAR",
     "head": "Missiles rain on Kyiv hours after peace summit",
     "body": ("Russia fired more than 110 missiles and about 400 drones "
              "overnight, killing at least six, Kyiv said. Three bridges "
              "over the Dnipro were hit, cutting links across the capital, "
              "and power failed in several districts as the cold set in."),
     "w": 540},
    {"kick": "SHENZHEN  •  AFTERMATH",
     "head": "Summit's peace declaration brings no breakthrough",
     "body": ("Trump, Xi and Putin left Shenzhen with a four-point "
              "declaration but no deal on Ukraine, Iran or nuclear arms. "
              "In Berlin, allies said Europe was ready to talk to Moscow."),
     "w": 384},
]

ROW3 = [
    {"kick": "INDIA  •  MARKETS",
     "head": "Sensex and Nifty surge to nine-month highs",
     "body": ("The Sensex jumped 898 to 83,919.71 and the Nifty closed at "
              "25,800.60, led by banks; the rupee firmed to 92.67.")},
    {"kick": "TECHNOLOGY  •  AI",
     "head": "AI sell-off deepens despite Anthropic's big debut",
     "body": ("Anthropic closed 17% above its $83 IPO price, yet tech kept "
              "falling: the Nasdaq lost 2.25%, its fifth straight drop, "
              "and the Nikkei fell 4.8%.")},
    {"kick": "BRITAIN  •  UKRAINE AID",
     "head": "Britain pledges 1,000 drones for Ukraine",
     "body": ("London announced a £260m package of long-range drones and "
              "other kit, as Kyiv's allies met in Berlin to weigh next "
              "steps after the Shenzhen summit.")},
]

ROW4 = [
    {"kick": "GAMES  •  CULTURE",
     "head": "GTA VI banks an estimated $2.36bn in a day",
     "body": ("Sensor Tower estimates the game sold 24.58 million copies "
              "by Thursday evening — a record first day for entertainment "
              "— though Rockstar has yet to confirm the figures.")},
    {"kick": "UNITED STATES  •  WASHINGTON",
     "head": "Senate backs bill to speed up energy projects",
     "body": ("Senators voted 62–33 for a bipartisan permitting bill to "
              "fast-track power plants, transmission lines, mines and "
              "data centres. It now goes to the House.")},
    {"kick": "WEST AFRICA  •  NIGERIA",
     "head": "Nigeria moves to end jail for attempted suicide",
     "body": ("Lawmakers backed scrapping prison terms for attempted "
              "suicide, shifting the law towards treatment and support "
              "instead of punishment.")},
]

# Second compact grid: headline + one-line deck each.
MORE = [
    {"kick": "EUROPE  •  YOUTH STRIKE",
     "head": "Students walk out across 25 countries",
     "deck": "Tens of thousands protest living costs and rearmament."},
    {"kick": "UKRAINE  •  CRIMEA",
     "head": "Third strike this week hits Kerch Bridge",
     "deck": "Ukraine hits the Crimea link again; rail traffic halts."},
    {"kick": "UNITED STATES  •  CHIPS",
     "head": "US approved 879,000 AI chips for China",
     "deck": "Commerce Dept licences for Nvidia and AMD chips."},
    {"kick": "CLIMATE  •  ENERGY",
     "head": "IEA: AI data centres may lift emissions",
     "deck": "AI demand could push emissions much higher by 2030."},
    {"kick": "LATIN AMERICA  •  EL SALVADOR",
     "head": "Bukele to seek a third term",
     "deck": "El Salvador's president will run for a third term."},
    {"kick": "UNITED STATES  •  OUTAGES",
     "head": "Outages hit US flights, banks, NSA network",
     "deck": "FAA pauses router work tied to last week's stop."},
]

# Thursday 19 November only — kept in the labelled band below.
DAY_AFTER = [
    "ICJ: Myanmar committed genocide of the Rohingya",
    "Trump, Xi, Putin sign peace declaration",
    "Houthi missiles damage Riyadh's PIF Tower",
]

ALSO = [
    "Saudi defences stop Houthi missile and five drones",
    "Trump pardons baseball legend Pete Rose",
    "UK and EU agree a youth mobility scheme",
    "Nations League draw held in Nyon",
    "Hunger Games: Sunrise on the Reaping opens",
    "World Children's Day marked around the globe",
    "Italy fines Meta €805m over photo access",
    "Poland probes unknown objects near Ukraine border",
    "Argentina Senate backs disability framework",
    "US sanctions Comancheros and 'Ndrangheta",
    "White House names Kirsten Davies cyber chief",
    "Fiona the hippo dies at Cincinnati Zoo",
]


def main():
    img = Image.new("RGB", (PAGE_W, PAGE_H), PAPER)
    d = ImageDraw.Draw(img)

    # ---- masthead ------------------------------------------------------
    d.text((MARGIN, 12), "THE WORLD TODAY", font=fnt(SERIF_B, 62),
           fill=INK)
    for label, yy in (("FRIDAY EDITION", 28), ("ONE PAGE, ONE DAY", 48)):
        font = fnt(SANS_B, 13)
        d.text((RIGHT - d.textlength(label, font=font), yy), label,
               font=font, fill=GREY)
    rule(d, 92, width=3)
    rule(d, 97, width=1)
    tag = "THE WORLD'S NEWS IN ONE PAGE"
    d.text((MARGIN, 103), tag, font=fnt(SANS_B, 11), fill=GREY)
    vol = "VOL. 47  •  No. 324"
    font = fnt(SANS_B, 11)
    d.text((RIGHT - d.textlength(vol, font=font), 103), vol, font=font,
           fill=GREY)

    # ---- navy date bar ---------------------------------------------------
    d.rectangle([MARGIN, 120, RIGHT, 150], fill=NAVY)
    d.text((MARGIN + 14, 127), "FRIDAY, 20 NOVEMBER 2026",
           font=fnt(SANS_B, 16), fill=(255, 255, 255))
    tail = "LONDON  •  NEW DELHI  •  NEW YORK"
    font = fnt(SANS, 11)
    d.text((RIGHT - 14 - d.textlength(tail, font=font), 130), tail,
           font=font, fill=(190, 200, 225))

    # ---- lead story ------------------------------------------------------
    y = 162
    y = kicker(d, MARGIN, y, LEAD["kick"])
    y = headline(d, MARGIN, y + 2, 624, LEAD["head"], 30)
    y = draw_lines(d, MARGIN, y + 6,
                   fit_lines(d, LEAD["deck"], fnt(SERIF_I, 16), 624),
                   fnt(SERIF_I, 16), INK, 1.3)
    lead_bottom = body(d, MARGIN, y + 8, 624, LEAD["body"], 12)
    cyclone_art(d, 676, 162, 320, 158)
    y = max(lead_bottom, 162 + 158) + 8
    rule(d, y)
    y += 8

    # ---- second row: Kyiv + Shenzhen -------------------------------------
    bottoms = []
    bottoms.append(story_block(d, MARGIN, y, ROW2[0]["w"], ROW2[0]["kick"],
                               ROW2[0]["head"], ROW2[0]["body"], 23, 13))
    d.line([(592, y), (592, max(bottoms))], fill=RULE, width=1)
    bottoms.append(story_block(d, 612, y, ROW2[1]["w"], ROW2[1]["kick"],
                               ROW2[1]["head"], ROW2[1]["body"], 23, 13))
    y = max(bottoms) + 8
    rule(d, y)
    y += 8

    # ---- third and fourth rows: three columns each -----------------------
    col_w, gap = 304, 28
    xs = [MARGIN, MARGIN + col_w + gap, MARGIN + 2 * (col_w + gap)]
    for row in (ROW3, ROW4):
        bottoms = [story_block(d, xs[i], y, col_w, s["kick"], s["head"],
                               s["body"], 20, 12)
                   for i, s in enumerate(row)]
        y = max(bottoms) + 8
        rule(d, y)
        y += 8

    # ---- second grid: more headlines --------------------------------------
    d.text((MARGIN, y), "MORE HEADLINES", font=fnt(SANS_B, 13), fill=RED)
    y += 18
    for r in range(2):
        bottoms = []
        for c in range(3):
            s = MORE[r * 3 + c]
            x = xs[c]
            yy = kicker(d, x, y, s["kick"])
            yy = headline(d, x, yy + 2, col_w, s["head"], 15)
            yy = draw_lines(d, x, yy + 3,
                            fit_lines(d, s["deck"], fnt(SERIF, 11), col_w),
                            fnt(SERIF, 11), GREY, 1.25)
            bottoms.append(yy)
        y = max(bottoms) + 4

    # ---- The Day After (Thursday 19 November) ------------------------------
    d.rectangle([MARGIN, y, RIGHT, y + 44], fill=NAVY_PALE)
    d.text((MARGIN + 12, y + 6), "THE DAY AFTER  —  THURSDAY 19 NOVEMBER",
           font=fnt(SANS_B, 11), fill=NAVY)
    for i, item in enumerate(DAY_AFTER):
        d.text((MARGIN + 12 + i * 322, y + 24), "•  " + item,
               font=fnt(SERIF, 12), fill=INK)
    y += 44 + 8

    # ---- Also Today --------------------------------------------------------
    d.text((MARGIN, y), "ALSO TODAY", font=fnt(SANS_B, 13), fill=RED)
    y += 18
    rule(d, y, width=1)
    y += 8
    font = fnt(SERIF, 11)
    for i, item in enumerate(ALSO):
        x = MARGIN + (i % 3) * 322
        yy = y + (i // 3) * 14
        d.text((x, yy), "•  " + item, font=font, fill=INK)
    y += 4 * 14 + 6

    # ---- footer ------------------------------------------------------------
    foot = ("Reported Friday 20 November 2026  •  Sources: Reuters, CNN, "
            "BBC, The Hindu BusinessLine, CNBC  •  “The Day After” items "
            "are from Thursday 19 November")
    font = fnt(SANS, 9)
    d.text(((PAGE_W - d.textlength(foot, font=font)) // 2, y), foot,
           font=font, fill=GREY)
    y += 16
    print(f"page bottom: y={y} (limit {PAGE_H})")
    if y > PAGE_H:
        raise SystemExit(f"layout overflows by {y - PAGE_H}px")

    img.save("entry.png", optimize=True)
    print("wrote entry.png")


if __name__ == "__main__":
    main()
