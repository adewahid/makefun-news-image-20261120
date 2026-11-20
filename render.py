#!/usr/bin/env python3
"""Draw the front page of THE WORLD TODAY for Friday 20 November 2026.

Everything here is drawn fresh with Pillow: a masthead, a navy date bar,
one lead story with a hand-drawn storm panel, two rows of three stories,
a "Day After" band for Thursday's news, a short "Also Today" list and a
numbers strip. Run it and it writes entry.png next to this file.
"""

from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1024
PAPER = (248, 244, 232)
INK = (18, 18, 16)
NAVY = (22, 38, 78)
NAVY_SOFT = (228, 233, 242)
RED = (158, 27, 30)
GREY = (92, 90, 82)
RULE = (150, 146, 132)
BAND = (232, 236, 244)

LIB = "/usr/share/fonts/truetype/liberation/"
SERIF = LIB + "LiberationSerif-Bold.ttf"
SERIF_R = LIB + "LiberationSerif-Regular.ttf"
SERIF_I = LIB + "LiberationSerif-Italic.ttf"
SANS = LIB + "LiberationSans-Bold.ttf"
SANS_R = LIB + "LiberationSans-Regular.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, fnt, width):
    """Split text into lines that fit `width` pixels, word by word."""
    lines, current = [], ""
    for word in text.split():
        trial = (current + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def para(draw, x, y, width, text, fnt, fill=INK, leading=1.28):
    """Draw wrapped paragraph text; return the y just below it."""
    size = fnt.size
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += int(size * leading)
    return y


def kicker(draw, x, y, text, color=RED):
    draw.text((x, y), text, font=font(SANS, 13), fill=color)
    return y + 19


def headline(draw, x, y, width, text, size=25):
    fnt = font(SERIF, size)
    return para(draw, x, y, width, text, fnt, leading=1.08)


def story(draw, x, y, width, kick, head, body, head_size=25, body_size=13):
    """One column story: kicker, headline, body. Returns bottom y."""
    y = kicker(draw, x, y, kick)
    y = headline(draw, x, y + 2, width, head, size=head_size)
    y = para(draw, x, y + 6, width, body, font(SERIF_R, body_size),
             leading=1.3)
    return y


def hrule(draw, y, x0=28, x1=996, width=2):
    draw.line([(x0, y), (x1, y)], fill=RULE, width=width)


def storm_panel(draw, x, y, w, h):
    """A stylised cyclone: concentric arcs and rain, drawn with PIL only."""
    draw.rectangle([x, y, x + w, y + h], fill=NAVY)
    cx, cy = x + w - 92, y + 58
    for r, col in [(56, (90, 120, 170)), (42, (140, 165, 205)),
                   (30, (190, 205, 230)), (16, (240, 244, 250))]:
        draw.arc([cx - r, cy - r, cx + r, cy + r], start=25, end=335,
                 fill=col, width=6)
    draw.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(255, 255, 255))
    # rain slashes under the swirl
    for i, rx in enumerate(range(x + 22, x + w - 14, 34)):
        draw.line([(rx, y + h - 58), (rx - 9, y + h - 34)],
                  fill=(150, 175, 215), width=3)
    draw.text((x + 16, y + 10), "CYCLONE AKVAN",
              font=font(SANS, 15), fill=(255, 255, 255))
    draw.text((x + 16, y + h - 92), "LANDFALL 08:30",
              font=font(SANS, 12), fill=(200, 210, 230))
    draw.text((x + 16, y + h - 74), "WINDS 70–80 KM/H",
              font=font(SANS, 12), fill=(200, 210, 230))


def main():
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    mx = 28  # page margin

    # ---- masthead ------------------------------------------------------
    d.text((mx, 14), "THE WORLD TODAY", font=font(SERIF, 66), fill=INK)
    d.text((W - mx - 212, 30), "FRIDAY EDITION", font=font(SANS, 14),
           fill=GREY)
    d.text((W - mx - 212, 50), "ONE PAGE, ONE DAY", font=font(SANS, 14),
           fill=GREY)
    hrule(d, 96, width=3)
    d.text((mx, 102), "THE WORLD'S NEWS IN ONE PAGE",
           font=font(SANS, 11), fill=GREY)
    right = "VOL. 47  •  No. 324"
    d.text((W - mx - d.textlength(right, font=font(SANS, 11)), 102), right,
           font=font(SANS, 11), fill=GREY)

    # ---- navy date bar ---------------------------------------------------
    d.rectangle([mx, 122, W - mx, 152], fill=NAVY)
    d.text((mx + 14, 130), "FRIDAY, 20 NOVEMBER 2026",
           font=font(SANS, 17), fill=(255, 255, 255))
    tail = "LONDON  •  NEW DELHI  •  NEW YORK"
    d.text((W - mx - 14 - d.textlength(tail, font=font(SANS, 12)), 133),
           tail, font=font(SANS, 12), fill=(190, 200, 225))

    # ---- lead story ------------------------------------------------------
    ly = 168
    y = kicker(d, mx, ly, "INDIA  •  CYCLONE")
    y = headline(d, mx, y + 2, 620, "Akvan slams into India's east coast",
                 size=32)
    y = para(d, mx, y + 6, 620,
             "The third cyclone in a month crosses near Gopalpur at dawn, "
             "gusts to 90 km/h, after more than 300,000 people were moved "
             "to shelters.",
             font(SERIF_I, 17), leading=1.3)
    y = para(d, mx, y + 8, 620,
             "Heavy rain lashed Odisha and northern Andhra Pradesh on "
             "Friday as Cyclone Akvan came ashore weakened but still "
             "dangerous. Trains were cancelled and schools shut; "
             "officials reported no major damage or loss of life by "
             "midday.",
             font(SERIF_R, 14), leading=1.32)
    storm_panel(d, 676, 168, 320, 168)

    # ---- second row: Kyiv + Shenzhen -------------------------------------
    hrule(d, 348)
    story(d, mx, 360, 560, "UKRAINE  •  WAR",
          "Missiles rain on Kyiv hours after peace summit",
          "Russia fired more than 110 missiles and about 400 drones "
          "overnight, killing eight and wounding 28, Kyiv said. Three "
          "bridges over the Dnipro were hit, cutting links across the "
          "capital, and power failed in several districts as the cold "
          "set in.",
          head_size=24, body_size=13)
    d.line([(612, 360), (612, 478)], fill=RULE, width=1)
    story(d, 632, 360, 364, "SHENZHEN  •  AFTERMATH",
          "Summit's peace declaration brings no breakthrough",
          "Trump, Xi and Putin left Shenzhen with a four-point "
          "declaration but no deal on Ukraine, Iran or nuclear arms. "
          "In Berlin, Ukraine's allies said Europe was ready to talk "
          "to Moscow; France asked the UN Security Council to meet.",
          head_size=24, body_size=13)

    # ---- third row: markets, AI, Britain ---------------------------------
    hrule(d, 516)
    col_w, gap = 304, 28
    xs = [mx, mx + col_w + gap, mx + 2 * (col_w + gap)]
    story(d, xs[0], 528, col_w, "INDIA  •  MARKETS",
          "Sensex and Nifty surge to nine-month highs",
          "The Sensex jumped 898 points to 83,919.71 and the Nifty "
          "closed at 25,800.60, led by banks. The rupee strengthened "
          "to 92.67 to the dollar as foreign investors poured a record "
          "$12.21bn into Indian shares this month.",
          head_size=21, body_size=12)
    story(d, xs[1], 528, col_w, "TECHNOLOGY  •  AI",
          "AI sell-off deepens despite Anthropic's big debut",
          "Anthropic closed 17% above its $83 IPO price, valuing the "
          "AI firm near $2 trillion — yet tech kept falling. The "
          "Nasdaq dropped 2.25%, its fifth straight loss; the Nikkei "
          "fell 4.8%.",
          head_size=21, body_size=12)
    story(d, xs[2], 528, col_w, "BRITAIN  •  UKRAINE AID",
          "Britain pledges 1,000 drones for Ukraine",
          "London announced a £260m package of long-range drones and "
          "other kit, as Kyiv's allies met in Berlin to weigh next "
          "steps after the Shenzhen summit.",
          head_size=21, body_size=12)

    # ---- fourth row: games, Washington, Nigeria --------------------------
    hrule(d, 668)
    story(d, xs[0], 680, col_w, "GAMES  •  CULTURE",
          "GTA VI banks an estimated $2.36bn in a day",
          "Sensor Tower estimates the game sold 24.58 million copies "
          "by Thursday evening — a record first day for entertainment "
          "— though Rockstar has yet to confirm the figures.",
          head_size=21, body_size=12)
    story(d, xs[1], 680, col_w, "UNITED STATES  •  WASHINGTON",
          "Senate backs bill to speed up energy projects",
          "Senators voted 62–33 for a bipartisan permitting bill to "
          "fast-track power plants, transmission lines, mines and "
          "data centres. It now goes to the House.",
          head_size=21, body_size=12)
    story(d, xs[2], 680, col_w, "WEST AFRICA  •  NIGERIA",
          "Nigeria moves to end jail for attempted suicide",
          "Lawmakers backed scrapping prison terms for attempted "
          "suicide, shifting the law towards treatment and support "
          "instead of punishment.",
          head_size=21, body_size=12)

    # ---- The Day After (Thursday 19 November) ----------------------------
    d.rectangle([mx, 806, W - mx, 872], fill=BAND)
    d.text((mx + 12, 814), "THE DAY AFTER  —  THURSDAY 19 NOVEMBER",
           font=font(SANS, 12), fill=NAVY)
    para(d, mx + 12, 836, 300, "•  World court: Myanmar committed "
         "genocide against the Rohingya", font(SERIF_R, 13), leading=1.25)
    para(d, mx + 12 + 322, 836, 300, "•  Trump, Xi and Putin sign a "
         "joint peace declaration in Shenzhen", font(SERIF_R, 13),
         leading=1.25)
    para(d, mx + 12 + 644, 836, 300, "•  Houthi missiles damage "
         "Riyadh's PIF Tower", font(SERIF_R, 13), leading=1.25)

    # ---- Also Today --------------------------------------------------------
    d.text((mx, 882), "ALSO TODAY", font=font(SANS, 13), fill=RED)
    hrule(d, 898, width=1)
    also = [
        "Saudi defences intercept another Houthi missile and five drones.",
        "Trump posthumously pardons baseball legend Pete Rose.",
        "UK and EU agree a youth mobility scheme, the BBC understands.",
        "Nations League draw held in Nyon; England, France, Germany seeded.",
        "The Hunger Games: Sunrise on the Reaping opens in cinemas.",
        "World Children's Day marked around the globe.",
    ]
    for i, item in enumerate(also):
        x = mx if i % 2 == 0 else mx + 496
        y = 906 + (i // 2) * 22
        d.text((x, y), "•  " + item, font=font(SERIF_R, 12), fill=INK)

    # ---- The Day in Numbers ------------------------------------------------
    nums = ("110+ missiles at Kyiv  •  300,000+ evacuated before Akvan  •  "
            "Sensex 83,919.71 (+898)  •  $2.36bn GTA VI day one  •  "
            "Nikkei −4.8%")
    d.text(((W - d.textlength(nums, font=font(SANS, 12))) // 2, 968), nums,
           font=font(SANS, 12), fill=NAVY)
    foot = ("Reported Friday 20 November 2026  •  Sources: Reuters, CNN, "
            "BBC, The Hindu BusinessLine, CNBC  •  “The Day After” items "
            "are from Thursday 19 November")
    d.text(((W - d.textlength(foot, font=font(SANS_R, 9))) // 2, 992), foot,
           font=font(SANS_R, 9), fill=GREY)

    img.save("entry.png", optimize=True)
    print("wrote entry.png")


if __name__ == "__main__":
    main()
