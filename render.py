#!/usr/bin/env python3
"""Render the front page for Friday 20 November 2026 as a 1024x1024 PNG.

Build-time tool only: it runs here, on this machine, to produce entry.png.
The graded program (main.ts) just copies that image, so the entry is
byte-deterministic. All stories below were checked against reporting
dated 20 November 2026 (IMD, The Hindu BusinessLine, Daily Jagran,
educationtimes.com, studmentor.in, jagranjosh.com, WARNPOINT).
Stories from 19 Nov (the Shenzhen summit, the ICJ genocide ruling, the
Riyadh PIF Tower strike) appear only in a clearly dated "THE DAY AFTER"
strip, never as 20 November news.
"""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1024
M = 36                      # side margin
CW = W - 2 * M              # content width

PAPER = (247, 243, 234)     # warm newsprint
INK = (20, 20, 20)
GREY = (90, 86, 78)
RED = (163, 22, 33)
NAVY = (27, 58, 92)
NAVY_D = (18, 40, 64)
TEAL = (14, 92, 96)
RULE = (180, 172, 156)
CARD = (255, 255, 255)
CARD_LINE = (205, 198, 184)

SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, fnt, width):
    """Greedy word wrap by pixel width; returns list of lines."""
    lines, cur = [], ""
    for word in text.split(" "):
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def para(draw, x, y, text, fnt, width, fill=INK, leading=4):
    """Draw wrapped paragraph; return y just below it."""
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + leading
    return y


def kicker(draw, x, y, text, color=RED, size=15):
    f = font(SANS_B, size)
    draw.text((x, y), text, font=f, fill=color)
    return y + size + 5


def rule(draw, x, y, w, color=RULE, width=1):
    draw.line([(x, y), (x + w, y)], fill=color, width=width)


def draw_cyclone(draw, x0, y0, x1, y1):
    """Stylised cyclone swirl: concentric broken arcs + rain, on navy."""
    draw.rectangle([x0, y0, x1, y1], fill=NAVY)
    cx, cy = x1 - 83, y0 + 73
    for i, r in enumerate(range(12, 66, 12)):
        a0 = 25 + i * 52
        a1 = a0 + 235
        col = (255, 255, 255) if i % 2 == 0 else (140, 190, 220)
        draw.arc([cx - r, cy - r, cx + r, cy + r], a0, a1, fill=col, width=5)
    draw.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(255, 255, 255))
    # rain streaks in the far bottom-right corner, clear of the labels
    for i in range(2):
        rx = x1 - 16 - i * 26
        draw.line([(rx, y1 - 36), (rx - 9, y1 - 14)], fill=(140, 190, 220),
                  width=3)
    draw.text((x0 + 14, y0 + 10), "AKVAN", font=font(SANS_B, 20),
              fill=(255, 255, 255))
    draw.text((x0 + 14, y0 + 34), "SEVERE CYCLONIC STORM",
              font=font(SANS_B, 12), fill=(170, 205, 230))
    draw.text((x0 + 14, y1 - 52), "LANDFALL: FRIDAY NOON",
              font=font(SANS_B, 14), fill=(255, 255, 255))
    draw.text((x0 + 14, y1 - 32), "NEAR GOPALPUR, ODISHA",
              font=font(SANS_B, 14), fill=(255, 255, 255))


def story_card(draw, x, y, w, h, tag, tag_color, headline, deck,
               head_size=21, deck_size=14):
    draw.rectangle([x, y, x + w, y + h], fill=CARD, outline=CARD_LINE, width=1)
    draw.rectangle([x, y, x + w, y + 5], fill=tag_color)
    tx, ty = x + 14, y + 14
    ty = kicker(draw, tx, ty, tag, color=tag_color, size=13)
    ty = para(draw, tx, ty, headline, font(SERIF_B, head_size), w - 28,
              leading=2)
    para(draw, tx, ty + 2, deck, font(SERIF, deck_size), w - 28, fill=GREY,
         leading=3)


def main():
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # ---- masthead ------------------------------------------------------
    rule(d, M, 26, CW, color=INK, width=3)
    title = "THE WORLD TODAY"
    tf = font(SERIF_B, 62)
    d.text(((W - d.textlength(title, font=tf)) / 2, 34), title, font=tf,
           fill=INK)
    rule(d, M, 112, CW, color=INK, width=3)

    # ---- dateline bar: the date must be unmistakable -------------------
    d.rectangle([M, 122, M + CW, 162], fill=NAVY)
    date = "FRIDAY, 20 NOVEMBER 2026"
    df = font(SERIF_B, 30)
    d.text(((W - d.textlength(date, font=df)) / 2, 128), date, font=df,
           fill=(255, 255, 255))
    sub = "THE WORLD'S NEWS IN ONE PAGE  •  EVERY STORY FROM FRIDAY 20 NOVEMBER 2026"
    sf = font(SANS_B, 13)
    d.text(((W - d.textlength(sub, font=sf)) / 2, 170), sub, font=sf,
           fill=GREY)

    # ---- lead story: Cyclone Akvan -------------------------------------
    ly = 192
    gx0, gy0, gx1, gy1 = 668, ly, M + CW, ly + 190
    draw_cyclone(d, gx0, gy0, gx1, gy1)
    lx, lw = M, gx0 - M - 24
    y = kicker(d, lx, ly + 2, "WEATHER  •  INDIA", color=RED, size=15)
    y = para(d, lx, y, "Cyclone Akvan slams into India's east coast",
             font(SERIF_B, 38), lw, leading=2)
    y = para(d, lx, y + 4,
             "The severe storm crosses the Andhra Pradesh\u2013Odisha coast "
             "near Gopalpur at noon, with winds gusting to 110 km/h.",
             font(SERIF, 18), lw, fill=INK, leading=3)
    y = para(d, lx, y + 4,
             "Nearly 300,000 people moved to shelters; 69 trains cancelled.",
             font(SANS, 14), lw, fill=GREY, leading=3)
    # fact chips
    chips = ["\u2248300,000 EVACUATED", "110 KM/H GUSTS", "69 TRAINS AXED"]
    cx = lx
    cf = font(SANS_B, 12)
    for chip in chips:
        cw = d.textlength(chip, font=cf) + 18
        d.rectangle([cx, y + 6, cx + cw, y + 30], outline=RED, width=2)
        d.text((cx + 9, y + 11), chip, font=cf, fill=RED)
        cx += cw + 10

    # ---- two featured stories ------------------------------------------
    fy, fh, fw = 400, 132, (CW - 18) // 2
    story_card(d, M, fy, fw, fh, "ROYALTY  •  INDIA", RED,
               "Modi meets the Prince and Princess of Wales in New Delhi",
               "Talks on India\u2013UK ties and strategic cooperation on the "
               "first day of the royal visit.",
               head_size=22, deck_size=14)
    story_card(d, M + fw + 18, fy, fw, fh, "WAR IN UKRAINE", NAVY,
               "Russian strikes damage Austrian and Dutch embassies in Kyiv",
               "Moscow's latest bombardment hits diplomatic buildings as "
               "the war grinds into another winter.",
               head_size=22, deck_size=14)

    # ---- six-card grid ---------------------------------------------------
    gy, gh = 546, 140
    gw = (CW - 2 * 18) // 3
    grid = [
        ("SPORT  •  CRICKET", TEAL,
         "Nicholls' unbeaten 113 lifts New Zealand to 243/5 on day one",
         "Wellington: the opener's century steadies the hosts against "
         "India in the first Test."),
        ("ASIA  •  SOUTH KOREA", NAVY,
         "Court clears ex-PM Han Duck-soo over martial law",
         "Supreme Court overturns the conviction tied to the 2024 "
         "martial-law declaration."),
        ("PACIFIC  •  FIJI", TEAL,
         "Fiji declares a national disaster as drought bites",
         "Water shortages spread across the islands as El Ni\u00f1o dries "
         "reservoirs and crops."),
        ("ASIA  •  BANGLADESH", RED,
         "Fire at ex-leader Yunus's ancestral home",
         "Blaze reported at the Nobel laureate's family home amid "
         "political tension."),
        ("MIDDLE EAST", NAVY,
         "Australia sanctions Israeli settlers",
         "Canberra acts against settlers and groups over West Bank "
         "expansion."),
        ("AMERICAS", RED,
         "US and Venezuela to restore military ties",
         "Agreement signed to rebuild military cooperation, the US "
         "defence chief says."),
    ]
    for i, (tag, col, head, deck) in enumerate(grid):
        gx = M + (i % 3) * (gw + 18)
        gyy = gy + (i // 3) * (gh + 16)
        story_card(d, gx, gyy, gw, gh, tag, col, head, deck,
                   head_size=19, deck_size=13)

    # ---- the day after: yesterday's big stories, dated as yesterday ----
    ay = gy + 2 * gh + 14 + 14
    d.rectangle([M, ay, M + CW, ay + 60], fill=(233, 227, 214),
                outline=CARD_LINE, width=1)
    d.text((M + 14, ay + 8), "THE DAY AFTER", font=font(SANS_B, 13),
           fill=RED)
    para(d, M + 14, ay + 28,
         "A day after the first Trump\u2013Xi\u2013Putin summit in Shenzhen, "
         "APEC leaders press on \u2014 the joint declaration promised "
         "nuclear-risk talks, but no deal on Ukraine or Iran.",
         font(SERIF, 14), CW - 28, fill=INK, leading=2)

    # ---- footer: also today ---------------------------------------------
    fy2 = ay + 60 + 12
    rule(d, M, fy2, CW, color=INK, width=2)
    y = kicker(d, M, fy2 + 8, "ALSO TODAY", color=INK, size=13)
    y = para(d, M, y,
             "LPG tanker off Bulgaria 'hit by projectiles'  •  "
             "World Children's Day marked worldwide  •  Japan's PM Takaichi "
             "seeks dialogue with China  •  Satwik\u2013Chirag reach the Hong "
             "Kong Open quarter-finals  •  Women's Asian Hockey Champions "
             "Trophy opens",
             font(SANS, 13), CW, fill=GREY, leading=3)
    rule(d, M, H - 24, CW, color=INK, width=2)
    foot = "THE WORLD TODAY  —  FRIDAY 20 NOVEMBER 2026  —  ONE DAY, ONE PAGE"
    ff = font(SANS_B, 11)
    d.text(((W - d.textlength(foot, font=ff)) / 2, H - 18), foot, font=ff,
           fill=GREY)

    img.save("entry.png", optimize=True)


if __name__ == "__main__":
    main()
