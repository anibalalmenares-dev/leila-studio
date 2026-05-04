"""
Genera 7 imágenes de publicidad diaria para estado de WhatsApp — Leila Studio
Formato: 1080x1920 (9:16), PNG + video MP4
"""

import os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import imageio

# ─── Config del negocio ─────────────────────────────
NEGOCIO  = "Leila Studio"
SLOGAN   = "Nails Beauty"
WA_NUM   = "3234661252"
URL      = "leila-studio.vercel.app"
WA_LINK  = f"wa.me/57{WA_NUM}"

W, H = 1080, 1920
OUT_DIR = os.path.join(os.path.dirname(__file__), "publicidad")
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Paleta ─────────────────────────────────────────
CREAM      = (255, 248, 240)
ROSE       = (244, 167, 185)
ROSE_DARK  = (233,  30, 140)
GOLD       = (201, 168,  76)
GOLD_L     = (240, 208, 128)
DARK       = ( 30,  28,  28)
DARK2      = ( 20,  18,  18)
WHITE      = (255, 255, 255)
PURPLE     = ( 72,  52, 100)
PURPLE_L   = (180, 140, 220)
TEAL       = ( 20,  70,  72)
TEAL_L     = (100, 200, 190)
WARM_RED   = (160,  40,  40)
WARM_RED_L = (255, 140, 100)

# ─── Tipografía ─────────────────────────────────────
def fnt(size, bold=False):
    candidates = (["arialbd.ttf","calibrib.ttf","verdanab.ttf"]
                  if bold else
                  ["arial.ttf","calibri.ttf","verdana.ttf","segoeui.ttf"])
    for d in ["C:/Windows/Fonts/",
              os.path.expanduser("~/AppData/Local/Microsoft/Windows/Fonts/")]:
        for name in candidates:
            p = os.path.join(d, name)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# ─── Helpers ────────────────────────────────────────
def vgrad(img, top, bot):
    arr = np.array(img.convert("RGB"), dtype=np.float32)
    t, b = np.array(top, dtype=np.float32), np.array(bot, dtype=np.float32)
    for y in range(H):
        f = y / (H - 1)
        arr[y] = np.clip(t * (1 - f) + b * f, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))

def rrect(d, xy, r, fill, stroke=None, sw=3):
    d.rounded_rectangle(xy, radius=r, fill=fill,
                        outline=stroke, width=sw)

def circ(d, cx, cy, r, fill):
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill)

def tw(d, text, f):
    bb = d.textbbox((0,0), text, font=f)
    return bb[2] - bb[0]

def ctext(d, text, y, f, color, max_w=None, lh=None):
    max_w = max_w or W - 80
    lh    = lh    or (f.size + 14)
    lines = []
    for raw in text.split("\n"):
        ws = raw.split()
        if not ws:
            lines.append("")
            continue
        cur = ""
        for w in ws:
            t = (cur + " " + w).strip()
            if tw(d, t, f) <= max_w:
                cur = t
            else:
                if cur: lines.append(cur)
                cur = w
        lines.append(cur)
    cy = y
    for ln in lines:
        lw = tw(d, ln, f)
        d.text(((W - lw)//2, cy), ln, font=f, fill=color)
        cy += lh
    return cy

def pill(d, text, cx, cy, f, bg, fg, px=28, py=12):
    tw_ = tw(d, text, f)
    bb  = d.textbbox((0,0), text, font=f)
    th  = bb[3] - bb[1]
    x0, y0 = cx - tw_//2 - px, cy - py
    x1, y1 = cx + tw_//2 + px, cy + th + py
    rrect(d, [x0,y0,x1,y1], 999, fill=bg)
    d.text((cx - tw_//2, cy), text, font=f, fill=fg)
    return y1 + py

def footer_bar(d, dia_txt):
    """Franja inferior con URL, WhatsApp y día."""
    by = H - 190
    rrect(d, [0, by, W, H], 0, fill=(0,0,0,200) if False else (20,18,18))
    # Logo mini
    d.text((50, by+28), "👑", font=fnt(52))
    d.text((120, by+28), NEGOCIO,  font=fnt(44, bold=True), fill=GOLD_L)
    d.text((120, by+84), SLOGAN,   font=fnt(36),             fill=ROSE)
    # Derecha
    url_txt = f"  {URL}"
    wa_txt  = f"  {WA_NUM}"
    ux = W - tw(d, url_txt, fnt(36)) - 50
    wx = W - tw(d, wa_txt,  fnt(36)) - 50
    d.text((ux, by+28), "🔗" + f" {URL}",      font=fnt(36), fill=(180,180,180))
    d.text((wx, by+84), "📱" + f" {WA_NUM}",   font=fnt(36), fill=(180,180,180))
    # Badge día
    pill(d, dia_txt, W//2, by - 50, fnt(38, bold=True), GOLD, DARK)

def noise_overlay(img, alpha=0.03):
    """Textura sutil para que no parezca tan plano."""
    arr = np.array(img, dtype=np.float32)
    noise = np.random.normal(0, 8, arr.shape)
    arr = np.clip(arr + noise * alpha * 10, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))

def precio_tag(d, precio, y, accent):
    """Muestra precio con etiqueta visual."""
    txt = f"${precio:,}".replace(",",".")
    rrect(d, [W//2-180, y, W//2+180, y+90], 18, fill=accent)
    lw = tw(d, txt, fnt(54, bold=True))
    d.text(((W-lw)//2, y+10), txt, font=fnt(54, bold=True), fill=WHITE)
    return y + 110

def anticipo_tag(d, precio, y):
    ant = int(precio * 0.3)
    ant_str = f"Anticipo: ${ant:,}".replace(",",".")
    lw = tw(d, ant_str, fnt(38))
    d.text(((W-lw)//2, y), ant_str, font=fnt(38), fill=(180,180,180))
    return y + 58

# ════════════════════════════════════════════════════
#  SLIDES DIARIOS
# ════════════════════════════════════════════════════

def lunes():
    """Lunes – Arranca la semana 💅 | Manicura semi permanente"""
    img = vgrad(Image.new("RGB",(W,H)), DARK2, (40,30,35))
    d   = ImageDraw.Draw(img)

    # Acento dorado superior
    for i in range(340):
        t = i/340
        clr = tuple(int(GOLD[c]*(1-t) + DARK2[c]*t) for c in range(3))
        d.line([(0,i),(W,i)], fill=clr)

    # Día
    ctext(d, "LUNES", 60, fnt(46, bold=True), GOLD, lh=60)
    d.line([(W//2-120, 140),(W//2+120, 140)], fill=GOLD, width=2)

    # Headline
    ctext(d, "Arranca la semana", 180, fnt(90, bold=True), WHITE)
    ctext(d, "con unas perfectas", 290, fnt(90, bold=True), WHITE)
    ctext(d, "💅", 410, fnt(120), WHITE)

    # Servicio destacado
    rrect(d, [80, 570, W-80, 900], 32, fill=(50,42,45), stroke=GOLD, sw=2)
    ctext(d, "SERVICIO DEL DIA", 600, fnt(38, bold=True), GOLD)
    ctext(d, "Manicura", 666, fnt(72, bold=True), WHITE)
    ctext(d, "Semi Permanente", 760, fnt(58), ROSE)
    precio_tag(d, 35000, 860, ROSE_DARK)

    # Duracion
    ctext(d, "Duracion: 1:30 h  |  Larga duracion", 990, fnt(38), (160,160,160))

    # Beneficios
    for i,(ico,txt) in enumerate([
        ("✨","Brillo duradero hasta 3 semanas"),
        ("💪","No se pela ni se rompe"),
        ("🎨","Amplia variedad de colores"),
    ]):
        y0 = 1070 + i*90
        circ(d, 84, y0+28, 28, (60,50,50))
        d.text((60, y0+6), ico, font=fnt(44))
        d.text((132, y0+6), txt, font=fnt(42), fill=(210,210,210))

    # CTA
    rrect(d, [120, 1360, W-120, 1480], 999, fill=GOLD)
    ctext(d, "Reserva GRATIS en:", 1378, fnt(40, bold=True), DARK)
    ctext(d, URL, 1430, fnt(40, bold=True), DARK)

    footer_bar(d, "LUNES")
    return noise_overlay(img)


def martes():
    """Martes – Lujo en tus manos 🌟 | Manicura con Gel"""
    img = vgrad(Image.new("RGB",(W,H)), PURPLE, (20,16,28))
    d   = ImageDraw.Draw(img)

    ctext(d, "MARTES", 60, fnt(46, bold=True), PURPLE_L, lh=60)
    d.line([(W//2-120,140),(W//2+120,140)], fill=PURPLE_L, width=2)

    ctext(d, "Lujo en", 185, fnt(96, bold=True), WHITE)
    ctext(d, "tus manos", 295, fnt(96, bold=True), WHITE)
    ctext(d, "🌟", 415, fnt(120), WHITE)

    # Tarjeta servicio
    rrect(d, [60, 575, W-60, 990], 32, fill=(40,32,56), stroke=PURPLE_L, sw=2)
    ctext(d, "SERVICIO DESTACADO", 610, fnt(36, bold=True), PURPLE_L)
    ctext(d, "Manicura Semi", 676, fnt(68, bold=True), WHITE)
    ctext(d, "con Gel", 756, fnt(68, bold=True), WHITE)
    ctext(d, "El acabado mas premium ✨", 854, fnt(42), (200,180,240))
    precio_tag(d, 55000, 920, PURPLE)

    anticipo_tag(d, 55000, 1042)

    # Puntos clave
    for i,(ico,txt) in enumerate([
        ("💎","Acabado espejo de alta duracion"),
        ("🌈","Efecto cromado y glitter disponible"),
        ("⏱️ ","Dura hasta 4 semanas"),
    ]):
        y0 = 1120 + i*88
        d.text((60, y0), ico, font=fnt(48))
        d.text((130, y0+6), txt, font=fnt(42), fill=(210,200,240))

    rrect(d, [120,1380,W-120,1500], 999, fill=PURPLE_L)
    ctext(d, "Reserva ahora — es gratis", 1400, fnt(40, bold=True), DARK)
    ctext(d, URL, 1452, fnt(40, bold=True), DARK)

    footer_bar(d, "MARTES")
    return noise_overlay(img)


def miercoles():
    """Miercoles – Combo ahorro 🌸 | Mani + Pedi tradicional"""
    img = vgrad(Image.new("RGB",(W,H)), (255,240,248), CREAM)
    d   = ImageDraw.Draw(img)

    # Franja rosa superior
    for i in range(260):
        t = i/260
        clr = tuple(int(ROSE[c]*(1-t) + (255,240,248)[c]*t) for c in range(3))
        d.line([(0,i),(W,i)], fill=clr)

    ctext(d, "MIERCOLES", 60, fnt(44, bold=True), ROSE_DARK, lh=60)
    d.line([(W//2-140,136),(W//2+140,136)], fill=ROSE_DARK, width=2)

    ctext(d, "El mejor", 175, fnt(90, bold=True), DARK)
    ctext(d, "combo para ti", 278, fnt(90, bold=True), DARK)
    ctext(d, "🌸", 406, fnt(110), WHITE)

    # Tarjeta combo
    rrect(d, [60,555,W-60,940], 32, fill=WHITE, stroke=ROSE, sw=3)
    pill(d, "COMBO POPULAR", W//2, 575, fnt(36,bold=True), ROSE_DARK, WHITE, px=24, py=8)
    ctext(d, "Manicura + Pedicura", 660, fnt(66, bold=True), DARK)
    ctext(d, "Tradicional", 740, fnt(60), ROSE_DARK)

    # Antes / ahora
    bx = W//2 - 200
    d.text((bx-60, 840), "Precio:", font=fnt(44), fill=(120,120,120))
    precio_tag(d, 24000, 840, ROSE_DARK)

    anticipo_tag(d, 24000, 962)

    # Lo que incluye
    ctext(d, "Que incluye:", 1042, fnt(44, bold=True), DARK)
    for i,(ico,txt) in enumerate([
        ("💅","Manicura tradicional completa"),
        ("🦶","Pedicura tradicional completa"),
        ("⏱️ ","Solo 2:00 horas"),
        ("💰","Ahorra vs contratar por separado"),
    ]):
        y0 = 1110 + i*84
        circ(d, 76, y0+26, 26, (252,228,236))
        d.text((54, y0+4), ico, font=fnt(40))
        d.text((122, y0+6), txt, font=fnt(40), fill=DARK)

    rrect(d, [100,1450,W-100,1560], 999, fill=ROSE_DARK)
    ctext(d, "Reserva tu combo ahora", 1468, fnt(42, bold=True), WHITE)
    ctext(d, URL, 1520, fnt(40, bold=True), WHITE)

    footer_bar(d, "MIERCOLES")
    return noise_overlay(img)


def jueves():
    """Jueves – Prep para el fin de semana 🦶 | Pedicura semi"""
    img = vgrad(Image.new("RGB",(W,H)), TEAL, (10,30,32))
    d   = ImageDraw.Draw(img)

    ctext(d, "JUEVES", 60, fnt(46, bold=True), TEAL_L, lh=60)
    d.line([(W//2-120,140),(W//2+120,140)], fill=TEAL_L, width=2)

    ctext(d, "Prepara tus pies", 182, fnt(82, bold=True), WHITE)
    ctext(d, "para el fin de", 276, fnt(82, bold=True), WHITE)
    ctext(d, "semana 🦶", 370, fnt(82, bold=True), WHITE)

    # Servicio
    rrect(d, [60,500,W-60,870], 32, fill=(16,50,52), stroke=TEAL_L, sw=2)
    ctext(d, "SERVICIO RECOMENDADO", 536, fnt(36,bold=True), TEAL_L)
    ctext(d, "Pedicura Semi", 602, fnt(72, bold=True), WHITE)
    ctext(d, "Permanente", 688, fnt(72, bold=True), WHITE)
    ctext(d, "Pies impecables todo el finde semana", 784, fnt(40), (160,220,210))
    precio_tag(d, 30000, 844, TEAL)

    anticipo_tag(d, 30000, 966)

    for i,(ico,txt) in enumerate([
        ("✨","Duracion de 2 a 3 semanas"),
        ("🧴","Incluye exfoliacion y humectacion"),
        ("🎨","Elige tu color favorito"),
        ("⏰","Duracion: 2:30 h"),
    ]):
        y0 = 1046 + i*88
        d.text((60, y0), ico, font=fnt(48))
        d.text((130, y0+6), txt, font=fnt(42), fill=(200,240,235))

    rrect(d, [120,1400,W-120,1510], 999, fill=TEAL_L)
    ctext(d, "Agendalo hoy — entra en:", 1418, fnt(40, bold=True), DARK)
    ctext(d, URL, 1466, fnt(40, bold=True), DARK)

    footer_bar(d, "JUEVES")
    return noise_overlay(img)


def viernes():
    """Viernes – Date un gusto 👑 | Press On"""
    img = vgrad(Image.new("RGB",(W,H)), (60,20,10), DARK2)
    d   = ImageDraw.Draw(img)

    # Franja gold
    for i in range(300):
        t = i/300
        clr = tuple(int(GOLD[c]*(1-t) + (60,20,10)[c]*t) for c in range(3))
        d.line([(0,i),(W,i)], fill=clr)

    ctext(d, "VIERNES", 60, fnt(46, bold=True), GOLD_L, lh=60)
    d.line([(W//2-120,140),(W//2+120,140)], fill=GOLD_L, width=2)

    ctext(d, "Es viernes...", 180, fnt(86, bold=True), WHITE)
    ctext(d, "date un gusto", 278, fnt(86, bold=True), WHITE)
    ctext(d, "👑", 398, fnt(120), WHITE)

    # Servicio premium
    rrect(d, [60,560,W-60,930], 32, fill=(45,30,20), stroke=GOLD, sw=3)
    pill(d, "PREMIUM", W//2, 582, fnt(36, bold=True), GOLD, DARK, px=30, py=10)
    ctext(d, "Manicura Press On", 672, fnt(68, bold=True), WHITE)
    ctext(d, "El look mas espectacular", 754, fnt(44), GOLD_L)
    precio_tag(d, 70000, 826, WARM_RED)

    anticipo_tag(d, 70000, 948)

    for i,(ico,txt) in enumerate([
        ("💎","Unas de porcelana de alta calidad"),
        ("🎨","Disenos exclusivos y personalizados"),
        ("⏱️ ","Duracion aproximada: 2:30 h"),
        ("📸","Resultado digno de Instagram"),
    ]):
        y0 = 1030 + i*86
        d.text((60, y0), ico, font=fnt(46))
        d.text((128, y0+4), txt, font=fnt(42), fill=(240,220,160))

    rrect(d, [100,1386,W-100,1500], 999, fill=GOLD)
    ctext(d, "Reserva tu cita de lujo:", 1404, fnt(42, bold=True), DARK)
    ctext(d, URL, 1454, fnt(40, bold=True), DARK)

    footer_bar(d, "VIERNES")
    return noise_overlay(img)


def sabado():
    """Sabado – Ultimo cupo! ⚡ | Urgencia + todos los servicios"""
    img = vgrad(Image.new("RGB",(W,H)), (18,18,18), DARK)
    d   = ImageDraw.Draw(img)

    # Banner urgencia
    for i in range(160):
        t = i/160
        clr = tuple(int(ROSE_DARK[c]*(1-t) + (18,18,18)[c]*t) for c in range(3))
        d.line([(0,i),(W,i)], fill=clr)

    ctext(d, "SABADO", 55, fnt(46, bold=True), ROSE, lh=60)
    d.line([(W//2-120,132),(W//2+120,132)], fill=ROSE, width=2)

    ctext(d, "Ultimos cupos", 175, fnt(90, bold=True), WHITE)
    ctext(d, "del fin de semana", 278, fnt(78, bold=True), WHITE)
    ctext(d, "Agenda YA antes de que se agoten!", 382, fnt(42), ROSE)

    # Servicios en grid
    servicios = [
        ("💅", "Mani Tradicional",  "$12.000"),
        ("🦶", "Pedi Tradicional",  "$12.000"),
        ("✨", "Mani Semi Perm.",    "$35.000"),
        ("🌿", "Pedi Semi Perm.",   "$30.000"),
        ("🌟", "Semi con Gel",      "$55.000"),
        ("👑", "Press On",          "$70.000"),
    ]
    cw, ch = 460, 240
    gap    = 24
    sx     = (W - 2*cw - gap) // 2
    sy     = 470

    for idx,(ico,nom,prec) in enumerate(servicios):
        col = idx % 2
        row = idx // 2
        x0  = sx + col*(cw+gap)
        y0  = sy + row*(ch+gap)
        rrect(d, [x0,y0,x0+cw,y0+ch], 22, fill=(38,32,32), stroke=(80,60,60), sw=2)
        d.text((x0+18, y0+20), ico, font=fnt(56))
        d.text((x0+92, y0+18), nom,  font=fnt(36,bold=True), fill=WHITE)
        d.text((x0+92, y0+70), prec, font=fnt(38,bold=True), fill=GOLD_L)

    # CTA urgente
    uy = sy + 3*(ch+gap) + 20
    rrect(d, [60,uy,W-60,uy+120], 999, fill=ROSE_DARK)
    ctext(d, "No te quedes sin cita!", uy+18, fnt(46, bold=True), WHITE)
    ctext(d, URL, uy+74, fnt(40, bold=True), WHITE)

    # WhatsApp alternativo
    rrect(d, [60,uy+138,W-60,uy+258], 999, fill=(37,211,102))
    ctext(d, "Escribe por WhatsApp:", uy+156, fnt(42, bold=True), WHITE)
    ctext(d, WA_NUM, uy+210, fnt(42, bold=True), WHITE)

    footer_bar(d, "SABADO")
    return noise_overlay(img)


def domingo():
    """Domingo – Planea tu semana 📅 | Llamado a reservar con tiempo"""
    img = vgrad(Image.new("RGB",(W,H)), CREAM, (255,240,235))
    d   = ImageDraw.Draw(img)

    # Degradado gold abajo
    arr = np.array(img, dtype=np.float32)
    for i in range(H//2, H):
        t = (i - H//2) / (H//2)
        arr[i] = np.clip(arr[i] * (1-t*0.35) + np.array(GOLD_L)*t*0.35, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))
    d   = ImageDraw.Draw(img)

    ctext(d, "DOMINGO", 60, fnt(46, bold=True), GOLD, lh=60)
    d.line([(W//2-130,138),(W//2+130,138)], fill=GOLD, width=2)

    ctext(d, "Planea tu semana", 180, fnt(84, bold=True), DARK)
    ctext(d, "con tiempo 📅", 278, fnt(84, bold=True), DARK)
    ctext(d, "Las mejores horas\nse agotan rapido!", 390, fnt(52), (130,100,80))

    # Horario visual
    rrect(d, [80,540,W-80,740], 28, fill=WHITE, stroke=GOLD, sw=3)
    ctext(d, "Horario de atencion", 566, fnt(42, bold=True), DARK)
    ctext(d, "Lunes a Sabado", 628, fnt(50, bold=True), ROSE_DARK)
    ctext(d, "7:00 AM  —  6:00 PM", 692, fnt(48, bold=True), GOLD)

    # Servicios con precios
    ctext(d, "Nuestros servicios:", 780, fnt(46, bold=True), DARK)
    svcs = [
        ("💅","Mani Tradicional",    "$12.000","60 min"),
        ("✨","Mani Semi Permanente","$35.000","1:30 h"),
        ("🌟","Mani Semi con Gel",   "$55.000","2:30 h"),
        ("👑","Manicura Press On",   "$70.000","2:30 h"),
        ("🌸","Combo Mani + Pedi",   "$50.000","2:30 h"),
    ]
    y = 850
    for ico,nom,prec,dur in svcs:
        rrect(d, [60,y,W-60,y+92], 16, fill=(255,248,240), stroke=(220,190,160), sw=2)
        d.text((80, y+16), ico, font=fnt(52))
        d.text((150, y+14), nom,  font=fnt(42, bold=True), fill=DARK)
        ptw = tw(d, prec, fnt(42,bold=True))
        d.text((W-80-ptw, y+14), prec, font=fnt(42,bold=True), fill=ROSE_DARK)
        d.text((150, y+56), dur, font=fnt(34), fill=(150,140,130))
        y += 104

    # CTA domingo
    rrect(d, [80,y+20,W-80,y+130], 999, fill=GOLD)
    ctext(d, "Reserva gratis en:", y+38, fnt(42, bold=True), DARK)
    ctext(d, URL, y+90, fnt(42, bold=True), DARK)

    footer_bar(d, "DOMINGO")
    return noise_overlay(img)


# ════════════════════════════════════════════════════
#  GENERAR ARCHIVOS
# ════════════════════════════════════════════════════

SLIDES = [
    ("1_lunes",     lunes),
    ("2_martes",    martes),
    ("3_miercoles", miercoles),
    ("4_jueves",    jueves),
    ("5_viernes",   viernes),
    ("6_sabado",    sabado),
    ("7_domingo",   domingo),
]

print("Generando publicidad diaria para Leila Studio...")
images = []
for nombre, fn in SLIDES:
    print(f"  Creando {nombre}...")
    img = fn()
    path = os.path.join(OUT_DIR, f"{nombre}.png")
    img.save(path, "PNG", optimize=True)
    images.append(img)
    kb = os.path.getsize(path) / 1024
    print(f"    Guardado: {path}  ({kb:.0f} KB)")

# ── Video con todas las piezas ───────────────────────
print("\nGenerando video publicidad_semana.mp4...")
FPS    = 30
HOLD   = 3.5
FADE   = 0.5
hold_n = int(HOLD * FPS)
fade_n = int(FADE * FPS)

def to_np(img): return np.array(img.convert("RGB"))
def holds(np_img, n): return [np_img.copy() for _ in range(n)]
def xfade(a, b, n):
    fa, fb = a.astype(np.float32), b.astype(np.float32)
    return [np.clip(fa*(1-i/(n-1))+fb*(i/(n-1)),0,255).astype(np.uint8) for i in range(n)]

nps = [to_np(img) for img in images]
frames = []
for i, npimg in enumerate(nps):
    h = holds(npimg, hold_n)
    if i < len(nps)-1:
        frames += h
        frames += xfade(h[-1], nps[i+1], fade_n)
    else:
        frames += h

vid_path = os.path.join(OUT_DIR, "publicidad_semana.mp4")
w = imageio.get_writer(
    vid_path, fps=FPS, codec="libx264", quality=None,
    output_params=["-crf","26","-preset","fast",
                   "-pix_fmt","yuv420p","-movflags","+faststart",
                   "-vf",f"scale={W}:{H}"],
)
for i,f in enumerate(frames):
    w.append_data(f)
    if i % (FPS*4)==0:
        print(f"  {i}/{len(frames)} frames...")
w.close()

total_s = len(frames)/FPS
size_mb = os.path.getsize(vid_path)/1024/1024
print(f"\nListo! Archivos generados en: {OUT_DIR}")
print(f"  7 imagenes PNG  (una por dia)")
print(f"  1 video MP4     {total_s:.0f}s  /  {size_mb:.1f} MB")
print(f"\nSube cada imagen como estado de WhatsApp segun el dia de la semana.")
