"""Render the v6 front page: one day's world news, Friday 20 November 2026.

Draws a premium broadsheet front page (1024x1024) with PIL and writes
entry.png next to this file. Deterministic: same fonts, same text, same
bytes on every run.
"""

from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1024
MARGIN = 44
CONTENT = W - 2 * MARGIN  # 936

PAPER = (247, 243, 234)
NAVY = (22, 35, 63)
RED = (176, 30, 36)
INK = (26, 26, 26)
GREY = (90, 88, 82)
NAVY_BAND = (22, 35, 63)
BAND_LABEL = (201, 207, 221)
HAIR = (200, 196, 186)

F = "/usr/share/fonts/truetype/noto/"


def font(name, size):
    return ImageFont.truetype(F + name, size)


def text_w(draw, s, f):
    return draw.textlength(s, font=f)


def fit_font(draw, s, name, size, max_w):
    """Largest size <= `size` that fits `s` in max_w."""
    while size > 8 and text_w(draw, s, font(name, size)) > max_w:
        size -= 1
    return font(name, size)


def wrap(draw, s, f, max_w):
    """Greedy word wrap; returns list of lines."""
    lines, cur = [], ""
    for word in s.split(" "):
        trial = (cur + " " + word).strip()
        if text_w(draw, trial, f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_rule(draw, x0, x1, y, color=NAVY, width=1):
    draw.line([(x0, y), (x1, y)], fill=color, width=width)


def main():
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    right = W - MARGIN

    # --- Date bar ------------------------------------------------------
    sans_b = font("NotoSans-Bold.ttf", 13)
    d.text((MARGIN, 22), "FRIDAY, 20 NOVEMBER 2026", font=sans_b, fill=NAVY)
    ed = "WORLD EDITION"
    d.text((right - text_w(d, ed, sans_b), 22), ed, font=sans_b, fill=NAVY)
    draw_rule(d, MARGIN, right, 44)

    # --- Masthead ------------------------------------------------------
    # Drawn on its baseline (anchor "ls") so the rules below sit clear of
    # the glyphs no matter the font's internal leading.
    mast = "THE WORLD TODAY"
    mast_f = fit_font(d, mast, "NotoSerifDisplay-Black.ttf", 80, CONTENT)
    mw = text_w(d, mast, mast_f)
    d.text(((W - mw) / 2, 116), mast, font=mast_f, fill=NAVY, anchor="ls")
    draw_rule(d, MARGIN, right, 126, width=2)
    draw_rule(d, MARGIN, right, 130, width=1)

    # --- Lead story ----------------------------------------------------
    y = 142
    kick_f = font("NotoSans-Bold.ttf", 14)
    d.text((MARGIN, y), "UKRAINE  ·  WAR IN EUROPE", font=kick_f, fill=RED)
    y += 28
    head_f = font("NotoSerif-Bold.ttf", 48)
    for line in wrap(d, "Russia hits Kyiv bridges in overnight blitz", head_f, 720):
        d.text((MARGIN, y), line, font=head_f, fill=NAVY)
        y += 52
    y += 4
    stand_f = font("NotoSerif-Italic.ttf", 18)
    stand = ("More than 400 drones and 110 missiles strike three crossings over "
             "the Dnipro; at least nine people are killed. "
             "Two missiles come down in Poland.")
    for line in wrap(d, stand, stand_f, CONTENT):
        d.text((MARGIN, y), line, font=stand_f, fill=INK)
        y += 21
    y += 8
    draw_rule(d, MARGIN, right, y)
    y += 10

    # --- Numbers band --------------------------------------------------
    band_y = y
    band_h = 58
    d.rectangle([MARGIN, band_y, right, band_y + band_h], fill=NAVY_BAND)
    nums = [
        ("110+", "MISSILES FIRED"),
        ("9", "KILLED IN KYIV"),
        ("300,000", "EVACUATED IN ODISHA"),
        ("-5.28%", "NASDAQ FALL"),
        ("$88.91", "ANTHROPIC CLOSE"),
    ]
    cell = CONTENT / 5
    num_f = font("NotoSerif-Bold.ttf", 28)
    lab_f = font("NotoSans-Bold.ttf", 10)
    for i, (num, lab) in enumerate(nums):
        cx = MARGIN + i * cell
        nw = text_w(d, num, num_f)
        d.text((cx + (cell - nw) / 2, band_y + 6), num, font=num_f, fill=(255, 255, 255))
        lw = text_w(d, lab, lab_f)
        d.text((cx + (cell - lw) / 2, band_y + 37), lab, font=lab_f, fill=BAND_LABEL)
        if i:
            d.line([(cx, band_y + 10), (cx, band_y + band_h - 10)], fill=(70, 82, 110), width=1)
    y = band_y + band_h + 10
    draw_rule(d, MARGIN, right, y)
    y += 10

    # --- Main grid: 8 stories, 2 columns x 4 rows ----------------------
    col_w = (CONTENT - 24) / 2
    col_x = [MARGIN, MARGIN + col_w + 24]
    main_stories = [
        ("CYCLONE", "Cyclone Akvan batters Odisha",
         "Landfall brings the year's fiercest storm to eastern India."),
        ("MARKETS", "Wall Street slides for a seventh day",
         "The Nasdaq drops 5.28% as the sell-off deepens."),
        ("MARKETS", "Anthropic falls a day after record debut",
         "Shares close at $88.91, down 8.5% from the listing."),
        ("DIPLOMACY", "Trump delays Iran decision to new year",
         "A call on Tehran is deferred to January."),
        ("CLIMATE", "COP31 drifts into overtime",
         "Negotiators miss the deadline in Antalya."),
        ("JUSTICE", "Myanmar rejects ICJ ruling",
         "The government dismisses the genocide ruling."),
        ("SUMMIT", "Trump: Shenzhen \u201c12 out of 10\u201d",
         "At the summit, Merz warns of a \u201cnew Yalta\u201d."),
        ("YEMEN", "Coalition strikes Hodeida",
         "Warplanes hit the Red Sea port city."),
    ]
    k_f = font("NotoSans-Bold.ttf", 11)
    h_f = font("NotoSerif-Bold.ttf", 19)
    de_f = font("NotoSans-Regular.ttf", 12)
    row_h = 53
    for i, (kick, head, deck) in enumerate(main_stories):
        r, c = divmod(i, 2)
        x = col_x[c]
        yy = y + r * row_h
        d.text((x, yy), kick, font=k_f, fill=RED)
        d.text((x, yy + 13), head, font=h_f, fill=NAVY)
        d.text((x, yy + 33), deck, font=de_f, fill=GREY)
        if r < 3:
            draw_rule(d, x, x + col_w, yy + row_h - 6, color=HAIR)
    y += 4 * row_h + 8

    # --- More headlines: 8 stories, denser ------------------------------
    sec_f = font("NotoSans-Bold.ttf", 14)
    label = "MORE HEADLINES"
    d.text((MARGIN, y), label, font=sec_f, fill=NAVY)
    lw = text_w(d, label, sec_f)
    draw_rule(d, MARGIN + lw + 12, right, y + 8, color=HAIR)
    y += 26
    more_stories = [
        ("EU and UK hold second summit in Brussels",
         "Costa and von der Leyen meet PM Burnham to deepen ties."),
        ("Magnitude 6.7 quake shakes central Peru",
         "Andes tremor rattles Junin region; magnitude put at 6.7-6.9."),
        ("Harden drops 51 as Cavs top Pacers",
         "Cleveland wins 128-119; 26th career 50-point game."),
        ("California subpoenas Nvidia over China",
         "State probes chip sales and investor disclosures."),
        ("TSMC, Samsung halt advanced chips to China",
         "New US export curbs hit AI chips and servers."),
        ("US and China agree AI arms oversight",
         "Human oversight agreed for military AI."),
        ("Pancreatic cancer pill shows promise",
         "Tumours undetectable in one in 12 patients."),
        ("Ukraine retakes 14 villages in Kharkiv",
         "Operation Bear Trap retakes nearly 200 sq km."),
    ]
    mh_f = font("NotoSerif-Bold.ttf", 16)
    md_f = font("NotoSans-Regular.ttf", 11)
    mrow_h = 43
    for i, (head, deck) in enumerate(more_stories):
        r, c = divmod(i, 2)
        x = col_x[c]
        yy = y + r * mrow_h
        d.text((x, yy), head, font=mh_f, fill=NAVY)
        d.text((x, yy + 20), deck, font=md_f, fill=GREY)
        if r < 3:
            draw_rule(d, x, x + col_w, yy + mrow_h - 7, color=HAIR)
    y += 4 * mrow_h + 6

    # --- Also today: 12 one-liners, 2 columns x 6 rows ------------------
    draw_rule(d, MARGIN, right, y, width=2)
    y += 8
    d.text((MARGIN, y), "ALSO TODAY", font=sec_f, fill=NAVY)
    y += 24
    today = [
        "Missiles and a drone down in south-east Poland",
        "WHO: Ebola in DR Congo \u201cnot under control\u201d",
        "Estonia to close Russia border from 1 December",
        "Haiti police kill 34 in gang raid",
        "IMF: world debt near 100% of GDP",
        "Gold falls 4%; Bitcoin below $59,000",
        "Nikkei falls 5.06% as Asia joins rout",
        "Kerch Bridge hit by Ukrainian strikes",
        "Saudi coalition downs Houthi missiles",
        "Visa, Mastercard, JPMorgan hit by breaches",
        "Trump floats penalties for AI plants abroad",
        "Wales stun All Blacks 35-28",
    ]
    one_f = font("NotoSans-Regular.ttf", 13)
    orow_h = 17
    for i, item in enumerate(today):
        r, c = divmod(i, 2)
        x = col_x[c]
        yy = y + r * orow_h
        d.rectangle([x, yy + 4, x + 7, yy + 11], fill=RED)
        d.text((x + 13, yy), item, font=one_f, fill=INK)
    y += 6 * orow_h + 8

    # --- Footer ----------------------------------------------------------
    draw_rule(d, MARGIN, right, y, color=HAIR)
    y += 8
    foot_f = font("NotoSans-Regular.ttf", 10)
    foot = "THE WORLD TODAY  ·  FRIDAY, 20 NOVEMBER 2026  ·  ONE DAY'S NEWS"
    fw = text_w(d, foot, foot_f)
    d.text(((W - fw) / 2, y), foot, font=foot_f, fill=GREY)
    y += 14
    assert y <= H, f"layout overflow: final y={y}"

    img.save("entry.png", format="PNG")


if __name__ == "__main__":
    main()
