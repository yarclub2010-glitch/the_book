"""Генератор коллажа «Комната Тихона в двух мирах» (статичные SVG-кадры)."""

import math
import random
from pathlib import Path

OUT = Path(__file__).with_name("collage-tikhon.html")

# ---------- Перспектива ----------
D = 4.0            # расстояние от камеры до задней стены, м
F = 170.0          # пикселей на метр у задней стены
VX, VY = 860.0, 400.0
CAMH = 200.0 / F   # высота камеры, м
XL, XR = -2.0, 2.235   # левая и правая стены
YC = 2.705             # потолок


def P(X, Y, d):
    f = D / (D - d)
    return (VX + X * F * f, VY + (CAMH - Y) * F * f)


def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def poly(points, fill, extra=""):
    return f'<polygon points="{pts(points)}" fill="{fill}" {extra}/>'


def line(a, b, stroke, w=2, extra=""):
    return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{stroke}" stroke-width="{w}" {extra}/>'


def front(X0, X1, Y0, Y1, d):
    return [P(X0, Y0, d), P(X1, Y0, d), P(X1, Y1, d), P(X0, Y1, d)]


def box(X0, X1, Y0, Y1, d0, d1, cf, ct, cs, extra=""):
    """Коробка: видимые грани в порядке отрисовки."""
    out = []
    if X0 > 0:
        out.append(poly([P(X0, Y0, d0), P(X0, Y1, d0), P(X0, Y1, d1), P(X0, Y0, d1)], cs, extra))
    elif X1 < 0:
        out.append(poly([P(X1, Y0, d0), P(X1, Y1, d0), P(X1, Y1, d1), P(X1, Y0, d1)], cs, extra))
    if Y1 < CAMH:
        out.append(poly([P(X0, Y1, d0), P(X1, Y1, d0), P(X1, Y1, d1), P(X0, Y1, d1)], ct, extra))
    out.append(poly(front(X0, X1, Y0, Y1, d1), cf, extra))
    return out


def ell(c, rx, ry, fill, extra=""):
    return f'<ellipse cx="{c[0]:.1f}" cy="{c[1]:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{fill}" {extra}/>'


def path(d, fill="none", stroke="none", w=1, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" {extra}/>'


def mv(p):
    return f"{p[0]:.1f} {p[1]:.1f}"


# ---------- Общие части комнаты ----------

WOOD_D, WOOD_M, WOOD_L = "#2e1d12", "#4a3020", "#6b4a31"
METAL = "#1f1d1b"
WIN = (0.12, 1.76, 1.0, 2.45)   # окно на задней стене


def room_shell(sid):
    s = []
    back = front(XL, XR, 0, YC, 0)
    s.append(poly([(0, 0), (1600, 0), P(XR, YC, 0), P(XL, YC, 0)], "#2a1e14"))
    s.append(poly(back, "#7a5b38"))
    s.append(poly(back, f"url(#paper-{sid})"))
    s.append(poly([(0, 0), P(XL, YC, 0), P(XL, 0, 0), (0, 905)], "#5a4128"))
    s.append(poly([(0, 0), P(XL, YC, 0), P(XL, 0, 0), (0, 905)], f"url(#paper-{sid})", 'opacity="0.7"'))
    s.append(poly([P(XR, YC, 0), (1600, 0), (1600, 789), P(XR, 0, 0)], "#5f4529"))
    s.append(poly([P(XR, YC, 0), (1600, 0), (1600, 789), P(XR, 0, 0)], f"url(#paper-{sid})", 'opacity="0.7"'))
    # плинтус
    s.append(poly([P(XL, 0, 0), P(XR, 0, 0), P(XR, 0.08, 0), P(XL, 0.08, 0)], "#3a2716"))
    return s


def parquet():
    """Паркет «ёлочкой-шашкой», как в референсе."""
    s = []
    rnd = random.Random(3)
    floor = [(0, 905), P(XL, 0, 0), P(XR, 0, 0), (1600, 789), (1600, 905)]
    s.append(f'<clipPath id="floorclip"><polygon points="{pts(floor)}"/></clipPath>')
    s.append('<g clip-path="url(#floorclip)">')
    s.append(poly(floor, "#8f7454"))
    step_x = 0.34
    step_d = 0.34
    xs = [XL - 6 + i * step_x for i in int_range(int(14 / step_x))]
    ds = []
    d = 0.0
    while d < 3.2:
        ds.append(d)
        d += step_d
    for i in range(len(xs) - 1):
        for j in range(len(ds) - 1):
            X0, X1, d0, d1 = xs[i], xs[i + 1], ds[j], ds[j + 1]
            light = (i + j) % 2 == 0
            base = rnd.choice(["#a98b63", "#b39670", "#a3855d"]) if light else rnd.choice(["#7d6243", "#86694a", "#735a3d"])
            quad = [P(X0, 0, d0), P(X1, 0, d0), P(X1, 0, d1), P(X0, 0, d1)]
            s.append(poly(quad, base))
            # планки внутри клетки
            for k in range(1, 4):
                if light:
                    t = X0 + (X1 - X0) * k / 4
                    s.append(line(P(t, 0, d0), P(t, 0, d1), "#5a4430", 0.8, 'opacity="0.55"'))
                else:
                    t = d0 + (d1 - d0) * k / 4
                    s.append(line(P(X0, 0, t), P(X1, 0, t), "#4a3726", 0.8, 'opacity="0.55"'))
    s.append("</g>")
    return s


def int_range(n):
    return range(n)


def window_frame():
    X0, X1, Y0, Y1 = WIN
    s = []
    fr = front(X0, X1, Y0, Y1, 0)
    s.append(poly(fr, "none", 'stroke="#2b1d12" stroke-width="12"'))
    mid = (X0 + X1) / 2
    s.append(line(P(mid, Y0, 0), P(mid, Y1, 0), "#2b1d12", 10))
    s.append(line(P(X0, 1.95, 0), P(X1, 1.95, 0), "#2b1d12", 7))
    # подоконник
    s += box(X0 - 0.08, X1 + 0.08, Y0 - 0.05, Y0, 0, 0.12, "#8a7a64", "#b5a58c", "#6d604f")
    return s


def curtains(sid, tone):
    X0, X1, Y0, Y1 = WIN
    s = []
    rod_a, rod_b = P(X0 - 0.3, 2.6, 0.05), P(X1 + 0.35, 2.6, 0.05)
    s.append(line(rod_a, rod_b, "#1a120b", 5))
    # левая тюль, подхвачена
    a = P(X0 - 0.25, 2.6, 0.06)
    b = P(X0 + 0.55, 2.6, 0.06)
    c = P(X0 + 0.28, 1.55, 0.08)
    e = P(X0 + 0.05, 0.98, 0.1)
    f = P(X0 - 0.28, 0.98, 0.1)
    g = P(X0 - 0.05, 1.55, 0.08)
    s.append(path(f"M{mv(a)} L{mv(b)} Q{mv(P(X0 + 0.5, 2.0, 0.07))} {mv(c)} Q{mv(P(X0 + 0.3, 1.2, 0.1))} {mv(e)} L{mv(f)} Q{mv(P(X0 - 0.35, 1.3, 0.1))} {mv(g)} Q{mv(P(X0 - 0.3, 2.1, 0.07))} {mv(a)}Z",
                  fill=tone, extra='opacity="0.82"'))
    for k in range(5):
        t = k / 4
        top = P(X0 - 0.2 + 0.7 * t, 2.58, 0.06)
        s.append(path(f"M{mv(top)} Q{mv(P(X0 + 0.2 + 0.1 * t, 2.0, 0.07))} {mv(P(X0 + 0.02 + 0.2 * t, 1.55, 0.08))}", stroke="#00000033", w=2))
    # правая штора — прямая
    r = [P(X1 - 0.15, 2.6, 0.06), P(X1 + 0.3, 2.6, 0.06), P(X1 + 0.3, 0.95, 0.06), P(X1 - 0.15, 0.95, 0.06)]
    s.append(poly(r, tone, 'opacity="0.9"'))
    for k in range(1, 6):
        x = X1 - 0.15 + 0.45 * k / 6
        s.append(line(P(x, 2.6, 0.06), P(x, 0.95, 0.06), "#00000030", 3))
    return s


def desk():
    s = []
    s += box(1.35, 1.95, 0, 0.72, 0.05, 0.62, WOOD_M, WOOD_L, WOOD_D)   # тумба
    for k in range(3):
        y0 = 0.08 + k * 0.21
        dr = front(1.4, 1.9, y0, y0 + 0.18, 0.62)
        s.append(poly(dr, "#3d2819", 'stroke="#241609" stroke-width="2"'))
        hc = P(1.65, y0 + 0.12, 0.62)
        s.append(line((hc[0] - 14, hc[1]), (hc[0] + 14, hc[1]), "#c9a36b", 3))
    s += box(0.0, 0.05, 0, 0.72, 0.05, 0.62, WOOD_M, WOOD_L, WOOD_D)    # боковина
    s += box(-0.02, 1.97, 0.72, 0.77, 0.0, 0.66, "#3a2617", "#5e412a", WOOD_D)   # столешница
    return s


def chair():
    s = []
    c = "#23170e"
    for X in (0.42, 0.82):
        for d in (0.95, 1.3):
            s.append(line(P(X, 0, d), P(X, 0.45, d), c, 5))
    s += box(0.4, 0.85, 0.44, 0.48, 0.93, 1.32, c, "#3b2819", c)
    for X in (0.44, 0.8):
        s.append(line(P(X, 0.48, 1.32), P(X, 0.98, 1.34), c, 6))
    s.append(line(P(0.43, 0.97, 1.34), P(0.81, 0.97, 1.34), c, 8))
    for k in range(1, 4):
        X = 0.44 + 0.36 * k / 4
        s.append(line(P(X, 0.55, 1.33), P(X, 0.95, 1.34), c, 4))
    return s


def bed(blanket, sheet):
    s = []
    s += box(1.3, XR, 0.18, 0.42, 0.45, 2.45, "#1c1a18", "#2a2826", "#1c1a18")
    # матрас и одеяло
    s += box(1.33, XR - 0.02, 0.42, 0.55, 0.47, 2.43, sheet, sheet, sheet)
    s.append(poly([P(1.33, 0.56, 1.1), P(XR - 0.02, 0.56, 1.1), P(XR - 0.02, 0.56, 2.43), P(1.33, 0.56, 2.43)], blanket))
    s.append(poly([P(1.33, 0.2, 1.1), P(1.33, 0.56, 1.1), P(1.33, 0.56, 2.43), P(1.33, 0.2, 2.43)], blanket, 'opacity="0.95"'))
    s.append(ell(P(1.78, 0.62, 0.72), 58, 20, sheet))
    # металлические спинки
    for d, h in ((0.45, 1.15), (2.45, 0.95)):
        a, b = P(1.3, 0, d), P(1.3, h, d)
        s.append(line(a, b, METAL, 6))
        top_l, top_r = P(1.3, h, d), P(XR, h, d)
        s.append(path(f"M{mv(top_l)} Q{mv(P(1.75, h + 0.12, d))} {mv(top_r)}", stroke=METAL, w=6))
        for k in range(1, 6):
            X = 1.3 + (XR - 1.3) * k / 6
            s.append(line(P(X, 0.4, d), P(X, h - 0.02, d), METAL, 2.5))
    return s


def cabinet(items):
    """«Стенка» у левой стены; видна её лицевая сторона (грань X1)."""
    s = []
    X0, X1 = XL, -1.52
    s += box(X0, X1, 0, 2.25, 0.2, 2.35, WOOD_D, WOOD_M, "#3b2616")

    def F_(Y, d):
        return P(X1, Y, d)
    # полки и дверцы
    for Y in (0.75, 1.2, 1.65, 2.1):
        s.append(line(F_(Y, 0.25), F_(Y, 2.3), "#1d1209", 3))
    for d in (0.25, 1.0, 1.65, 2.3):
        s.append(line(F_(0.05, d), F_(2.2, d), "#1d1209", 4))
    # нижние дверцы
    for d0, d1 in ((0.3, 0.95), (1.05, 1.6), (1.7, 2.25)):
        s.append(poly([F_(0.1, d0), F_(0.1, d1), F_(0.7, d1), F_(0.7, d0)], "#3d2818", 'stroke="#20140a" stroke-width="2"'))
    s += items(F_)
    return s


def dresser(on_top):
    s = []
    s += box(-1.42, -0.72, 0, 0.9, 0.02, 0.5, "#2c1c10", "#4a3121", "#3a2616")
    for k in range(2):
        y0 = 0.08 + k * 0.4
        s.append(poly(front(-1.38, -0.76, y0, y0 + 0.34, 0.5), "#35231a", 'stroke="#1a1008" stroke-width="2"'))
        hc = P(-1.07, y0 + 0.24, 0.5)
        s.append(line((hc[0] - 12, hc[1]), (hc[0] + 12, hc[1]), "#a88452", 3))
    s += on_top
    return s


# ---------- Мир «Не приходи»: ночная студия ----------

def scene_np():
    sid = "np"
    s = []
    s += room_shell(sid)
    # вид из окна: ночь, насыпь на уровне крыши, проходящая электричка
    X0, X1, Y0, Y1 = WIN
    w = front(X0, X1, Y0, Y1, 0)
    s.append(f'<clipPath id="win-{sid}"><polygon points="{pts(w)}"/></clipPath>')
    s.append(f'<g clip-path="url(#win-{sid})">')
    s.append(poly(w, "url(#sky-np)"))
    a, b = P(X0, 1.55, 0), P(X1, 1.72, 0)
    s.append(poly([a, b, P(X1, 0.9, 0), P(X0, 0.9, 0)], "#0d0f14"))
    s.append(line(a, b, "#5c6470", 2))
    s.append(line(P(X0, 1.6, 0), P(X1, 1.77, 0), "#3a404a", 1.5))
    # электричка с огнями окон, смазана движением
    s.append('<g filter="url(#motion)">')
    s.append(poly([P(X0 - 0.1, 1.6, 0), P(X1 + 0.1, 1.77, 0), P(X1 + 0.1, 2.02, 0), P(X0 - 0.1, 1.85, 0)], "#15171b"))
    for k in range(9):
        t0 = X0 + (X1 - X0) * k / 9 + 0.03
        t1 = t0 + 0.11
        yb = 1.66 + 0.17 * (t0 - X0) / (X1 - X0)
        s.append(poly([P(t0, yb, 0), P(t1, yb + 0.012, 0), P(t1, yb + 0.12, 0), P(t0, yb + 0.108, 0)], "#ffcf7a", 'opacity="0.9"'))
    s.append("</g>")
    s.append(ell(P(0.3, 2.1, 0), 3.5, 3.5, "#ff4a3a"))
    s.append(ell(P(0.3, 2.1, 0), 14, 14, "#ff4a3a", 'opacity="0.25"'))
    for k in range(5):
        s.append(ell(P(0.6 + k * 0.22, 1.2, 0), 2, 2, "#ffd9a0", 'opacity="0.6"'))
    s.append("</g>")
    s += window_frame()
    # звукопоглощающие панели на стене
    for i in range(3):
        for j in range(4):
            Xa = -0.6 + i * 0.2
            Ya = 1.25 + j * 0.2
            q = front(Xa, Xa + 0.18, Ya, Ya + 0.18, 0)
            s.append(poly(q, "#262422"))
            c = P(Xa + 0.09, Ya + 0.09, 0)
            for corner in q:
                s.append(poly([corner, c, c], "none"))
            s.append(poly([q[0], q[1], c], "#1c1a19"))
            s.append(poly([q[3], q[2], c], "#34312e"))
    # постер: звуковая волна
    pw = [P(XR, 2.05, 0.35), P(XR, 2.05, 0.95), P(XR, 1.25, 0.95), P(XR, 1.25, 0.35)]
    s.append(poly(pw, "#d9602f"))
    for k in range(12):
        d = 0.4 + k * 0.045
        h = 0.08 + 0.25 * abs(math.sin(k * 1.3))
        s.append(line(P(XR, 1.65 - h, d), P(XR, 1.65 + h, d), "#1a1411", 4))
    s += curtains(sid, "#d8cbb2")
    s += parquet()
    # комод с мониторами
    top = []
    for Xa in (-1.36, -1.02):
        top += box(Xa, Xa + 0.24, 0.9, 1.26, 0.12, 0.38, "#151412", "#2a2826", "#1d1c1a")
        cw = P(Xa + 0.12, 1.02, 0.38)
        top.append(ell(cw, 17, 17, "#0a0a0a", 'stroke="#3c3a37" stroke-width="3"'))
        top.append(ell(P(Xa + 0.12, 1.19, 0.38), 6, 6, "#0a0a0a", 'stroke="#3c3a37" stroke-width="2"'))
    s += dresser(top)
    # стол
    s += desk()
    # ноутбук
    s += box(0.45, 0.95, 0.77, 0.79, 0.22, 0.48, "#2c2d30", "#3b3d41", "#232427")
    scr = [P(0.47, 0.79, 0.22), P(0.93, 0.79, 0.22), P(0.93, 1.1, 0.16), P(0.47, 1.1, 0.16)]
    s.append(poly(scr, "#1b1d22"))
    inner = [P(0.49, 0.81, 0.215), P(0.91, 0.81, 0.215), P(0.91, 1.08, 0.165), P(0.49, 1.08, 0.165)]
    s.append(poly(inner, "url(#screen)"))
    # «волна» трека на экране
    for k in range(18):
        X = 0.51 + k * 0.022
        h = 0.02 + 0.06 * abs(math.sin(k * 0.9))
        s.append(line(P(X, 0.945 - h, 0.19), P(X, 0.945 + h, 0.19), "#f2a24a", 2.5))
    # аудиокарта
    s += box(1.02, 1.22, 0.77, 0.83, 0.25, 0.42, "#b0321f", "#cf4a33", "#8c2718")
    for k in range(2):
        s.append(ell(P(1.07 + k * 0.1, 0.8, 0.42), 5, 5, "#1a1a1a"))
    # микрофон на стойке
    base = P(0.2, 0.77, 0.12)
    joint = P(0.18, 1.35, 0.1)
    mic = P(0.42, 1.22, 0.3)
    s.append(path(f"M{mv(base)} L{mv(joint)} L{mv(mic)}", stroke="#111", w=5))
    s.append(ell(mic, 16, 26, "#26272a", 'stroke="#555" stroke-width="2"'))
    s.append(ell(P(0.55, 1.2, 0.36), 30, 34, "#0e0f12", 'opacity="0.55" stroke="#333" stroke-width="2"'))
    # наушники
    hp = P(1.3, 0.8, 0.52)
    s.append(path(f"M{hp[0] - 26:.1f} {hp[1]:.1f} Q{hp[0]:.1f} {hp[1] - 42:.1f} {hp[0] + 26:.1f} {hp[1]:.1f}", stroke="#141414", w=6))
    s.append(ell((hp[0] - 26, hp[1] + 2), 10, 13, "#d9602f"))
    s.append(ell((hp[0] + 26, hp[1] + 2), 10, 13, "#d9602f"))
    # настольная лампа
    lb = P(1.72, 0.77, 0.32)
    la = P(1.66, 1.12, 0.3)
    ls = P(1.5, 1.14, 0.32)
    s.append(ell(lb, 20, 6, "#1b1b1b"))
    s.append(path(f"M{mv(lb)} L{mv(la)} L{mv(ls)}", stroke="#1b1b1b", w=4))
    s.append(path(f"M{ls[0] - 20:.1f} {ls[1] + 12:.1f} L{ls[0] - 6:.1f} {ls[1] - 10:.1f} L{ls[0] + 10:.1f} {ls[1] - 8:.1f} L{ls[0] + 20:.1f} {ls[1] + 14:.1f}Z", fill="#c9a14a"))
    s.append(ell((ls[0], ls[1] + 14), 20, 5, "#fff1c4"))
    # стенка: пластинки и колонка
    def cab_items(Fp):
        o = []
        rnd = random.Random(8)
        cols = ["#b0321f", "#d9a441", "#e7dcc3", "#2f5d7c", "#7a4a2a", "#141414"]
        d = 0.3
        while d < 2.2:
            wdt = 0.03 + rnd.random() * 0.03
            o.append(poly([Fp(1.22, d), Fp(1.22, d + wdt), Fp(1.62, d + wdt), Fp(1.62, d)], rnd.choice(cols)))
            d += wdt + 0.005
        d = 0.35
        while d < 2.2:
            wdt = 0.05 + rnd.random() * 0.04
            h = 0.25 + rnd.random() * 0.15
            o.append(poly([Fp(0.76, d), Fp(0.76, d + wdt), Fp(0.76 + h, d + wdt), Fp(0.76 + h, d)], rnd.choice(cols)))
            d += wdt + 0.02
        return o
    s += cabinet(cab_items)
    # кровать
    s += bed("#3b3a38", "#8f887c")
    rec = P(1.9, 0.57, 1.6)
    s.append(poly([(rec[0] - 16, rec[1] - 6), (rec[0] + 16, rec[1] - 6), (rec[0] + 18, rec[1] + 8), (rec[0] - 14, rec[1] + 8)], "#18191b"))
    s.append(ell((rec[0] + 10, rec[1] - 1), 3, 3, "#ff3b2f"))
    # стул
    s += chair()
    # провода на полу и удлинитель
    ps = P(0.9, 0.0, 1.0)
    s.append(poly([(ps[0] - 40, ps[1] - 5), (ps[0] + 40, ps[1] - 5), (ps[0] + 44, ps[1] + 7), (ps[0] - 44, ps[1] + 7)], "#e6e1d8"))
    for k in range(3):
        s.append(ell((ps[0] - 20 + k * 20, ps[1]), 3, 2, "#ff3b2f"))
    for k, (X, d) in enumerate(((0.6, 0.55), (1.1, 0.5), (0.25, 0.4))):
        a = P(X, 0.74, d)
        b = (ps[0] - 30 + k * 25, ps[1])
        s.append(path(f"M{mv(a)} C{a[0]:.1f} {a[1] + 80:.1f} {b[0] - 40:.1f} {b[1] - 20:.1f} {mv(b)}", stroke="#0e0e0e", w=3))
    return s


# ---------- Мир «Приходи»: мастерская под дождём ----------

def scene_p():
    sid = "p"
    s = []
    s += room_shell(sid)
    X0, X1, Y0, Y1 = WIN
    w = front(X0, X1, Y0, Y1, 0)
    s.append(f'<clipPath id="win-{sid}"><polygon points="{pts(w)}"/></clipPath>')
    s.append(f'<g clip-path="url(#win-{sid})">')
    s.append(poly(w, "url(#sky-p)"))
    # закат после дождя: силуэты города, провода, насыпь
    for Xa, Xb, h in ((0.1, 0.45, 1.75), (0.5, 0.7, 1.95), (0.72, 1.05, 1.68), (1.2, 1.5, 2.1), (1.52, 1.8, 1.8)):
        s.append(poly(front(Xa, Xb, 0.9, h, 0), "#4a2f6e"))
        for k in range(3):
            wy = h - 0.12 - k * 0.14
            s.append(poly(front(Xa + 0.05, Xa + 0.09, wy, wy + 0.06, 0), "#ffcf8a", 'opacity="0.8"'))
    a, b = P(X0, 1.45, 0), P(X1, 1.6, 0)
    s.append(poly([a, b, P(X1, 0.9, 0), P(X0, 0.9, 0)], "#2b1d4a"))
    s.append(line(a, b, "#ff9b6a", 2))
    s.append(line(P(0.9, 1.6, 0), P(0.9, 2.45, 0), "#2b1d4a", 4))
    for k in range(3):
        s.append(path(f"M{mv(P(X0, 2.25 - k * 0.07, 0))} Q{mv(P(0.9, 2.05 - k * 0.07, 0))} {mv(P(X1, 2.3 - k * 0.07, 0))}", stroke="#2b1d4a", w=1.5))
    rnd = random.Random(5)
    for _ in range(26):
        x = rnd.uniform(w[0][0], w[1][0])
        y = rnd.uniform(w[2][1], w[0][1])
        s.append(ell((x, y), 2.4, 3.4, "#ffe3f0", f'opacity="{rnd.uniform(0.35, 0.75):.2f}"'))
    s.append("</g>")
    s += window_frame()
    # перфорированная панель с инструментами
    pb = front(-0.65, 0.02, 1.2, 2.05, 0)
    s.append(poly(pb, "#8a7e6a"))
    for i in range(10):
        for j in range(12):
            s.append(ell(P(-0.62 + i * 0.065, 1.23 + j * 0.068, 0), 1.6, 1.6, "#3a332a"))
    tools = [(-0.55, 1.85, 1.35, "#c23b2a"), (-0.4, 1.95, 1.4, "#d9a441"), (-0.25, 1.9, 1.3, "#2f5d7c"), (-0.1, 1.8, 1.45, "#1f1f1f")]
    for X, ya, yb, c in tools:
        s.append(line(P(X, ya, 0), P(X, yb, 0), "#2a2a2a", 4))
        s.append(line(P(X, ya, 0), P(X, ya - 0.14, 0), c, 9))
    # доска с уликами: Тихон расследует «призрака»
    def RW(Y, d):
        return P(XR, Y, d)
    board = [RW(2.2, 0.3), RW(2.2, 1.25), RW(1.05, 1.25), RW(1.05, 0.3)]
    s.append(poly(board, "#9a5a3a", 'stroke="#5a2e1c" stroke-width="8"'))
    notes = [(2.05, 0.38, "6:40?"), (2.05, 0.7, "буквы"), (1.75, 0.5, "хлебница!"),
             (1.75, 0.95, "шёпот"), (1.45, 0.4, "холод"), (1.45, 0.78, "книга"), (1.3, 1.05, "КТО ТЫ")]
    centers = []
    for Y, d, txt in notes:
        q = [RW(Y, d), RW(Y, d + 0.2), RW(Y - 0.22, d + 0.2), RW(Y - 0.22, d)]
        s.append(poly(q, "#f4ede0"))
        c = RW(Y - 0.03, d + 0.1)
        centers.append(c)
        s.append(ell(c, 4, 4, "#e0302a"))
        tp = RW(Y - 0.12, d + 0.02)
        s.append(f'<text x="{tp[0]:.1f}" y="{tp[1]:.1f}" font-family="Caveat, cursive" font-size="16" fill="#b0221c">{txt}</text>')
    for i, j in ((0, 2), (1, 3), (2, 4), (3, 5), (5, 6), (0, 5)):
        s.append(line(centers[i], centers[j], "#e0302a", 2))
    s += curtains(sid, "#c9c3b4")
    s += parquet()
    # отражения окна на полу
    for k in range(3):
        refl = [P(0.2 + k * 0.5, 0, 0.9), P(0.6 + k * 0.5, 0, 0.9), P(0.75 + k * 0.5, 0, 1.9), P(0.3 + k * 0.5, 0, 1.9)]
        s.append(poly(refl, "#7fb6ff", 'opacity="0.12"'))
    # комод с ящиком для инструментов
    top = box(-1.35, -0.8, 0.9, 1.12, 0.1, 0.42, "#b0321f", "#cf4a33", "#8c2718")
    top.append(line(P(-1.2, 1.18, 0.26), P(-0.95, 1.18, 0.26), "#222", 5))
    s += dresser(top)
    s += desk()
    # коврик для резки
    s.append(poly([P(0.25, 0.771, 0.12), P(1.25, 0.771, 0.12), P(1.25, 0.771, 0.6), P(0.25, 0.771, 0.6)], "#2f6b4f"))
    for k in range(1, 8):
        X = 0.25 + k * 0.125
        s.append(line(P(X, 0.772, 0.12), P(X, 0.772, 0.6), "#7fc7a2", 1, 'opacity="0.5"'))
    # паяльная станция и паяльник
    s += box(0.05, 0.3, 0.77, 0.87, 0.15, 0.4, "#2a2c30", "#3a3d42", "#202226")
    s.append(f'<text x="{P(0.08, 0.8, 0.4)[0]:.1f}" y="{P(0.08, 0.8, 0.4)[1]:.1f}" font-family="Oswald, sans-serif" font-size="13" fill="#ff5a3a">320°</text>')
    tip = P(0.5, 0.95, 0.45)
    hold = P(0.35, 0.8, 0.35)
    s.append(line(hold, tip, "#101010", 7))
    s.append(ell(tip, 5, 5, "#ff8a3a"))
    s.append(ell(tip, 16, 16, "#ff8a3a", 'opacity="0.25"'))
    s.append(path(f"M{mv(tip)} C{tip[0] - 10:.1f} {tip[1] - 40:.1f} {tip[0] + 18:.1f} {tip[1] - 60:.1f} {tip[0] + 2:.1f} {tip[1] - 110:.1f}", stroke="#d9e2ec", w=5, extra='opacity="0.28" filter="url(#smoke)"'))
    # разобранные наушники
    hp = P(0.8, 0.78, 0.45)
    s.append(path(f"M{hp[0] - 34:.1f} {hp[1]:.1f} Q{hp[0] - 10:.1f} {hp[1] - 36:.1f} {hp[0] + 10:.1f} {hp[1] - 6:.1f}", stroke="#1a1a1a", w=5))
    s.append(ell((hp[0] - 34, hp[1] + 2), 11, 13, "#262626"))
    s.append(ell((hp[0] + 34, hp[1] + 4), 13, 6, "#2a2a2a", 'stroke="#888" stroke-width="1.5"'))
    s.append(ell((hp[0] + 34, hp[1] + 4), 5, 2.5, "#b58b3a"))
    rnd2 = random.Random(2)
    for _ in range(14):
        p = P(rnd2.uniform(0.4, 1.2), 0.775, rnd2.uniform(0.2, 0.58))
        s.append(ell(p, 2, 1.4, "#c7c7c7"))
    # мультиметр
    s += box(1.05, 1.22, 0.77, 0.8, 0.3, 0.55, "#e3b52e", "#f0c94a", "#b78f1f")
    s.append(poly(front(1.08, 1.19, 0.772, 0.795, 0.55), "#1d2a22"))
    # лампа-лупа с кольцевым светом
    lb = P(1.7, 0.77, 0.3)
    ring = P(1.2, 1.28, 0.5)
    s.append(ell(lb, 20, 6, "#e8e8e8"))
    s.append(path(f"M{mv(lb)} L{mv(P(1.66, 1.4, 0.3))} L{mv(ring)}", stroke="#e8e8e8", w=5))
    s.append(ell(ring, 40, 18, "none", 'stroke="#f4fbff" stroke-width="6"'))
    s.append(ell(ring, 30, 12, "#bfe3ff", 'opacity="0.35"'))
    # стенка: починенные вещи с бирками
    def cab_items(Fp):
        o = []
        items = [(1.25, 0.4, 0.75, "#c8b89a", "мама"), (1.25, 0.95, 1.35, "#3b5d7c", "Вера"),
                 (0.8, 0.45, 0.85, "#7c4a2a", "сосед"), (0.8, 1.2, 1.6, "#9aa4ad", "Вера"),
                 (1.7, 0.5, 1.0, "#3b3b3b", "")]
        for Y, d0, d1, c, tag in items:
            o.append(poly([Fp(Y, d0), Fp(Y, d1), Fp(Y + 0.3, d1), Fp(Y + 0.3, d0)], c, 'stroke="#111" stroke-width="1.5"'))
            if tag:
                tp = Fp(Y + 0.05, d1 - 0.05)
                o.append(poly([(tp[0], tp[1]), (tp[0] + 26, tp[1] + 6), (tp[0] + 26, tp[1] + 18), (tp[0], tp[1] + 12)], "#f2eee4"))
                o.append(f'<text x="{tp[0] + 3:.1f}" y="{tp[1] + 13:.1f}" font-family="Caveat, cursive" font-size="10" fill="#222">{tag}</text>')
        return o
    s += cabinet(cab_items)
    # кровать с брошенным худи
    s += bed("#56606b", "#9aa0a6")
    hd = P(1.8, 0.58, 1.5)
    s.append(path(f"M{hd[0] - 60:.1f} {hd[1]:.1f} q30 -30 70 -10 q40 -10 50 20 q-20 30 -60 24 q-40 6 -60 -34z", fill="#7c8088"))
    # мокрые кеды и лужица
    for k, X in enumerate((1.05, 1.18)):
        sp = P(X, 0.0, 2.0)
        s.append(ell((sp[0] + 8, sp[1] + 8), 40, 9, "#8fc3ff", 'opacity="0.18"'))
        s.append(path(f"M{sp[0] - 28:.1f} {sp[1]:.1f} q2 -22 26 -24 q18 4 34 18 q4 8 -2 10z", fill="#e9e6df", stroke="#333", w=2))
    s += chair()
    return s


# ---------- Свет, цвет, виньетка ----------

def lighting_np():
    ls = P(1.5, 1.1, 0.32)
    scr = P(0.7, 0.95, 0.2)
    return [
        f'<rect width="1600" height="900" fill="url(#dark-np)"/>',
        f'<circle cx="{ls[0]:.1f}" cy="{ls[1] + 40:.1f}" r="520" fill="url(#warm)" style="mix-blend-mode:screen"/>',
        f'<circle cx="{scr[0]:.1f}" cy="{scr[1]:.1f}" r="220" fill="url(#bluespill)" style="mix-blend-mode:screen"/>',
        '<rect width="1600" height="900" fill="#ffb45c" opacity="0.12" style="mix-blend-mode:soft-light"/>',
    ]


def lighting_p():
    """Аниме-закат: фиолетовая тень и оранжевые пятна света из окна."""
    win = P(0.94, 1.7, 0)
    ring = P(1.2, 1.28, 0.5)
    out = [
        '<rect width="1600" height="900" fill="#5b4ab0" opacity="0.5" style="mix-blend-mode:multiply"/>',
        '<rect width="1600" height="900" fill="#ff5f8a" opacity="0.22" style="mix-blend-mode:screen"/>',
    ]
    # пятна закатного света: окно, «перенесённое» на пол, левую стену и потолок
    beam = 'fill="#ff8a4c" opacity="0.55" style="mix-blend-mode:screen"'
    for Xa, Xb in ((0.2, 0.85), (1.0, 1.65)):
        out.append(poly([P(Xa, 0, 1.2), P(Xb, 0, 1.2), P(Xb + 0.25, 0, 2.4), P(Xa + 0.25, 0, 2.4)], "#ff8a4c", 'opacity="0.35" style="mix-blend-mode:screen"'))
    # на лицевую сторону стенки (X = -1.52), а не на стену за ней
    CX = -1.52
    out.append(poly([P(CX, 2.05, 0.4), P(CX, 2.12, 0.95), P(CX, 1.4, 1.0), P(CX, 1.33, 0.45)], "#ff8a4c", beam))
    out.append(poly([P(CX, 2.05, 1.08), P(CX, 2.12, 1.62), P(CX, 1.4, 1.67), P(CX, 1.33, 1.13)], "#ff8a4c", beam))
    for Xa in (0.2, 1.0):
        out.append(poly([P(Xa, YC, 0.9), P(Xa + 0.6, YC, 0.9), P(Xa + 0.6, YC, 1.4), P(Xa, YC, 1.4)], "#ff8a4c", 'opacity="0.45" style="mix-blend-mode:screen"'))
    out.append(f'<circle cx="{win[0]:.1f}" cy="{win[1]:.1f}" r="480" fill="url(#coolwin)" style="mix-blend-mode:screen"/>')
    out.append(f'<circle cx="{ring[0]:.1f}" cy="{ring[1] + 30:.1f}" r="260" fill="url(#ringlight)" style="mix-blend-mode:screen"/>')
    return out


def defs(sid):
    ls = P(1.5, 1.1, 0.32)
    win = P(0.94, 1.7, 0)
    ring = P(1.2, 1.28, 0.5)
    center = ls if sid == "np" else win
    return f"""
  <defs>
    <pattern id="paper-{sid}" width="46" height="60" patternUnits="userSpaceOnUse">
      <path d="M23 6c8 8 8 18 0 26c-8-8-8-18 0-26zM0 36c8 6 10 14 4 22M46 36c-8 6-10 14-4 22" fill="none" stroke="#2a1a0c" stroke-opacity="0.22" stroke-width="2"/>
    </pattern>
    <linearGradient id="sky-np" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2233"/><stop offset="1" stop-color="#2d3346"/>
    </linearGradient>
    <linearGradient id="sky-p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2a7a"/><stop offset="0.55" stop-color="#c2508f"/><stop offset="1" stop-color="#ff9b6a"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a3550"/><stop offset="1" stop-color="#101626"/>
    </linearGradient>
    <radialGradient id="dark-{sid}" cx="{center[0] / 16:.1f}%" cy="{center[1] / 9:.1f}%" r="75%">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.35" stop-color="#000" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.82"/>
    </radialGradient>
    <radialGradient id="warm"><stop offset="0" stop-color="#ffc26b" stop-opacity="0.65"/><stop offset="1" stop-color="#ffc26b" stop-opacity="0"/></radialGradient>
    <radialGradient id="bluespill"><stop offset="0" stop-color="#8fb3ff" stop-opacity="0.35"/><stop offset="1" stop-color="#8fb3ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="coolwin"><stop offset="0" stop-color="#ff9b8a" stop-opacity="0.4"/><stop offset="1" stop-color="#ff9b8a" stop-opacity="0"/></radialGradient>
    <radialGradient id="ringlight"><stop offset="0" stop-color="#eaf6ff" stop-opacity="0.45"/><stop offset="1" stop-color="#eaf6ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx="50%" cy="48%" r="75%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
    <filter id="motion" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9 1"/></filter>
    <filter id="bokeh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="smoke" x="-100%" y="-50%" width="300%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="grain-{sid}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="{4 if sid == 'np' else 9}"/>
      <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.35 0"/>
    </filter>
  </defs>"""


def frame(sid, scene, lighting, world, name_line):
    body = "\n    ".join(scene + lighting)
    return f"""
<figure class="shot">
  <div class="img">
    <svg viewBox="0 0 1600 900" role="img" aria-label="Комната Тихона, {world}">
      {defs(sid)}
      <g>
    {body}
      </g>
      <rect width="1600" height="900" fill="url(#vignette)" opacity="{1 if sid == 'np' else 0.45}"/>
      <rect width="1600" height="900" filter="url(#grain-{sid})" style="mix-blend-mode:overlay" opacity="{0.5 if sid == 'np' else 0.12}"/>
    </svg>
    <div class="subs"><b>Тихон</b><span>{name_line}</span></div>
  </div>
  <div class="bar"><span>the_book · комната Тихона</span><span>Черновик, не финальная версия</span><span>{world}</span></div>
</figure>"""


HTML = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Комната Тихона</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=Onest:wght@400;600&family=Caveat:wght@600&display=swap">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { background: #121110; color: #e9e2d6; font: 15px/1.5 "Onest", system-ui, sans-serif; padding: 24px 16px 48px; }
  .wrap { max-width: 1180px; margin: 0 auto; }
  header h1 { font: 600 24px/1.2 "Oswald", sans-serif; letter-spacing: 0.02em; margin: 0 0 4px; }
  header p { margin: 0 0 20px; color: #a39a8c; }
  .shot { margin: 0 0 12px; background: #000; border-radius: 6px; overflow: hidden; box-shadow: 0 14px 40px rgba(0,0,0,.5); }
  .img { position: relative; aspect-ratio: 16 / 9; }
  .img svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .subs { position: absolute; left: 0; right: 0; bottom: 5.5%; text-align: center; font-family: "Oswald", "Arial Narrow", sans-serif; text-shadow: 0 2px 6px rgba(0,0,0,.85); padding: 0 4%; }
  .subs b { display: block; font-weight: 600; font-size: clamp(16px, 3.1vw, 40px); color: #fff; line-height: 1.1; }
  .subs span { display: block; font-weight: 500; font-size: clamp(12px, 2.1vw, 27px); color: #f3b53f; line-height: 1.25; }
  .bar { display: flex; justify-content: space-between; gap: 12px; padding: 10px 5%; font: 500 clamp(10px, 1.1vw, 14px)/1.2 "Oswald", sans-serif; color: #9b958c; letter-spacing: 0.03em; }
  .caption { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 6px 28px; margin: 4px 0 34px; color: #cfc6b8; font-size: 14px; }
  .caption h2 { grid-column: 1 / -1; font: 600 16px/1.3 "Oswald", sans-serif; letter-spacing: 0.03em; margin: 0; color: #f3b53f; }
  .caption p { margin: 0; }
  .diff { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 6px; }
  .diff th, .diff td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #2c2925; vertical-align: top; }
  .diff th { color: #f3b53f; font: 600 14px/1.3 "Oswald", sans-serif; letter-spacing: 0.03em; }
  .diff td:first-child { color: #8d857a; width: 22%; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Комната Тихона · два мира</h1>
    <p>Коллаж по референсу. Одна и та же комната (закон 1: общее место), разные жизни и разный свет.</p>
  </header>
  __SHOT_NP__
  <section class="caption">
    <h2>Мир «Не приходи» · ночная студия</h2>
    <p>Тихон собирает звуки дома и делает из них биты: ноутбук, микрофон на стойке, аудиокарта, мониторы на комоде, звукопоглощающие панели, пластинки в стенке.</p>
    <p>За окном на уровне крыши проходит электричка — огни вагонов смазаны движением. Свет тёплый, от настольной лампы, плюс холодное пятно экрана.</p>
  </section>
  __SHOT_P__
  <section class="caption">
    <h2>Мир «Приходи» · мастерская на закате после дождя</h2>
    <p>Тихон чинит всё подряд: паяльная станция на 320°, дымок от паяльника, разобранные наушники Веры, мультиметр, лампа-лупа с кольцевым светом, инструменты на перфорированной панели.</p>
    <p>Справа — доска с уликами про «призрака»: «6:40?», «буквы», «хлебница!», «шёпот», «холод», «книга», «КТО ТЫ». В стенке — починенные вещи с бирками «мама», «Вера», «сосед». Стиль — аниме-фон: фиолетовые тени, оранжевые пятна закатного света, капли на стекле.</p>
  </section>
  <table class="diff">
    <tr><th></th><th>«Не приходи»</th><th>«Приходи»</th></tr>
    <tr><td>Стиль</td><td>Кинематографичный реализм: полумрак, зерно, виньетка</td><td>Аниме-фон: плоская заливка, яркая закатная гамма</td></tr>
    <tr><td>Занятие</td><td>Создаёт: биты из звуков дома</td><td>Чинит: чужие вещи, чтобы всё было целым</td></tr>
    <tr><td>Свет</td><td>Тёплая лампа, сухая ночь</td><td>Закат после дождя, пятна света на стенах и потолке</td></tr>
    <tr><td>На стене справа</td><td>Постер со звуковой волной</td><td>Доска с уликами про «призрака»</td></tr>
    <tr><td>Общее (связанные вещи)</td><td colspan="2">Окно, стол, стул, стенка, кровать, комод — стоят одинаково в обоих мирах: через них пойдут загадки</td></tr>
  </table>
</div>
</body>
</html>
"""


def main():
    np_shot = frame("np", scene_np(), lighting_np(), "Мир «Не приходи»",
                    "Опять этот скрип. Запишу — пусть хоть он будет в бите.")
    p_shot = frame("p", scene_p(), lighting_p(), "Мир «Приходи»",
                   "Починю — и хоть что-то в этом доме будет целым.")
    html = HTML.replace("__SHOT_NP__", np_shot).replace("__SHOT_P__", p_shot)
    OUT.write_text(html, encoding="utf-8", newline="\n")
    print("ok", OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
