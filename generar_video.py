"""
Genera manual-cliente.mp4 — video tipo historia para estado de WhatsApp
Formato: 1080x1920 (9:16), ~28 seg, H.264, < 10 MB
"""

from PIL import Image, ImageDraw, ImageFont
import numpy as np
import imageio.v3 as iio
import imageio
import os, sys

# ──────────────────────────────────────────────
W, H = 1080, 1920
FPS  = 30
HOLD = 3.0      # segundos por slide
FADE = 0.6      # segundos de crossfade entre slides
OUT  = os.path.join(os.path.dirname(__file__), "manual-cliente.mp4")

# ── Paleta ──
CREAM      = (255, 248, 240)
ROSE       = (244, 167, 185)
ROSE_DARK  = (233,  30, 140)
GOLD       = (201, 168,  76)
GOLD_LIGHT = (240, 208, 128)
DARK       = ( 45,  45,  45)
DARK2      = ( 26,  26,  26)
WHITE      = (255, 255, 255)
GREEN_DARK = (  6,  78,  59)
GREEN_MID  = ( 28,  58,  48)
GREEN_TEXT = (209, 250, 229)

# ── Tipografía (usa fuentes del sistema Windows) ──
def font(size, bold=False):
    candidates_bold   = ["arialbd.ttf", "calibrib.ttf", "verdanab.ttf"]
    candidates_normal = ["arial.ttf",   "calibri.ttf",  "verdana.ttf",  "segoeui.ttf"]
    candidates = candidates_bold if bold else candidates_normal
    dirs = [
        "C:/Windows/Fonts/",
        os.path.expanduser("~/AppData/Local/Microsoft/Windows/Fonts/"),
    ]
    for d in dirs:
        for name in candidates:
            path = os.path.join(d, name)
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# ── Helpers de dibujo ──
def gradient_bg(colors, direction="down"):
    """Crea fondo degradado vertical u horizontal."""
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    c1, c2 = np.array(colors[0]), np.array(colors[-1])
    for i in range(H):
        t = i / (H - 1)
        arr[i, :] = (c1 * (1 - t) + c2 * t).astype(np.uint8)
    return Image.fromarray(arr, "RGB")

def rounded_rect(draw, xy, radius, fill, outline=None, outline_width=2):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                           outline=outline, width=outline_width)

def circle(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)

def centered_text(draw, text, y, fnt, color, max_w=None, line_h=None):
    max_w = max_w or W - 80
    line_h = line_h or (fnt.size + 12)
    lines = []
    for raw_line in text.split("\n"):
        words = raw_line.split()
        if not words:
            lines.append("")
            continue
        cur = ""
        for w in words:
            test = (cur + " " + w).strip()
            bbox = draw.textbbox((0, 0), test, font=fnt)
            if bbox[2] - bbox[0] <= max_w:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = w
        lines.append(cur)
    total_h = len(lines) * line_h
    cy = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=fnt)
        lw = bbox[2] - bbox[0]
        draw.text(((W - lw) // 2, cy), line, font=fnt, fill=color)
        cy += line_h
    return cy

def badge_text(draw, text, cx, cy, fnt, bg, fg):
    bb = draw.textbbox((0, 0), text, font=fnt)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad_x, pad_y = 22, 10
    x0 = cx - tw // 2 - pad_x
    x1 = cx + tw // 2 + pad_x
    y0 = cy - pad_y
    y1 = cy + th + pad_y
    rounded_rect(draw, [x0, y0, x1, y1], radius=999, fill=bg)
    draw.text((cx - tw // 2, cy), text, font=fnt, fill=fg)
    return y1 + pad_y

# ──────────────────────────────────────────────
# SLIDES
# ──────────────────────────────────────────────

def slide_badge(img, num, total=8):
    d = ImageDraw.Draw(img)
    txt = f"{num} / {total}"
    f = font(28)
    bb = d.textbbox((0, 0), txt, font=f)
    tw = bb[2] - bb[0]
    x0, y0 = W - tw - 60, 50
    rounded_rect(d, [x0 - 16, y0 - 8, x0 + tw + 16, y0 + 36], 999,
                 fill=(255, 255, 255, 60) if img.mode == "RGBA" else (220, 200, 210))
    d.text((x0, y0), txt, font=f, fill=(200, 200, 200))


def s1_portada():
    img = gradient_bg([CREAM, (255, 248, 235)])
    d = ImageDraw.Draw(img)
    # Fondo dorado difuso arriba
    for i in range(300):
        t = i / 300
        row_color = tuple(int(GOLD_LIGHT[c] * (1 - t) + CREAM[c] * t) for c in range(3))
        d.line([(0, i), (W, i)], fill=row_color)
    # Corona
    crown_f = font(160)
    centered_text(d, "👑", 220, crown_f, GOLD)
    # Título principal
    centered_text(d, "Leila Studio", 480, font(110, bold=True), GOLD)
    centered_text(d, "Nails Beauty", 610, font(70), ROSE_DARK)
    # Separador
    d.line([(W // 2 - 160, 720), (W // 2 + 160, 720)], fill=GOLD, width=3)
    # Subtítulo
    centered_text(d, "¿Cómo reservar tu cita\npaso a paso?", 760, font(52), DARK)
    # Tag
    badge_text(d, "GUÍA PARA CLIENTES", W // 2, 970, font(40, bold=True),
               GOLD, WHITE)
    # Footer
    centered_text(d, "💅  Uñas · Manicura · Pedicura", 1100, font(40), (150, 120, 100))
    # Nota inferior
    centered_text(d, "📱 Todo desde tu celular\nen menos de 3 minutos",
                  1230, font(44), (120, 100, 90))
    slide_badge(img, 1)
    return img


def s2_servicios():
    img = gradient_bg([DARK, DARK2])
    d = ImageDraw.Draw(img)
    centered_text(d, "NUESTROS SERVICIOS", 90, font(38, bold=True), GOLD)
    centered_text(d, "Elige lo que más te gusta ✨", 160, font(64), GOLD_LIGHT)

    servicios = [
        ("💅", "Manicura\nTradicional", "desde $12.000"),
        ("🦶", "Pedicura\nTradicional", "desde $20.000"),
        ("✨", "Semi\nPermanente",  "desde $30.000"),
        ("🌟", "Gel & Press On",    "desde $45.000"),
        ("🌸", "Combos\nMani+Pedi", "desde $50.000"),
        ("👑", "Paquetes\nEspeciales", "hasta $82.000"),
    ]
    cols, rows = 2, 3
    card_w, card_h = 460, 330
    gap = 30
    start_x = (W - cols * card_w - (cols - 1) * gap) // 2
    start_y = 300

    for idx, (ico, name, price) in enumerate(servicios):
        col = idx % cols
        row = idx // cols
        x0 = start_x + col * (card_w + gap)
        y0 = start_y + row * (card_h + gap)
        # Tarjeta
        rounded_rect(d, [x0, y0, x0 + card_w, y0 + card_h], 28,
                     fill=(255, 255, 255, 15) if img.mode == "RGBA" else (60, 55, 55),
                     outline=(201, 168, 76, 80) if img.mode == "RGBA" else (100, 85, 50),
                     outline_width=2)
        # Icono
        d.text((x0 + card_w // 2 - 28, y0 + 24), ico, font=font(68))
        # Nombre
        lines = name.split("\n")
        ty = y0 + 116
        for ln in lines:
            bb = d.textbbox((0, 0), ln, font=font(38))
            lw = bb[2] - bb[0]
            d.text((x0 + (card_w - lw) // 2, ty), ln, font=font(38), fill=(252, 228, 236))
            ty += 50
        # Precio
        bb = d.textbbox((0, 0), price, font=font(36, bold=True))
        lw = bb[2] - bb[0]
        d.text((x0 + (card_w - lw) // 2, y0 + card_h - 64),
               price, font=font(36, bold=True), fill=GOLD_LIGHT)

    centered_text(d, "Los precios exactos se muestran al reservar",
                  start_y + rows * (card_h + gap) + 20, font(36), (120, 120, 120))
    slide_badge(img, 2)
    return img


def s3_pasos():
    img = gradient_bg([CREAM, (255, 240, 245)])
    d = ImageDraw.Draw(img)
    centered_text(d, "¿CÓMO RESERVAR?", 80, font(40, bold=True), ROSE_DARK)
    centered_text(d, "4 pasos súper fáciles 🌸", 160, font(64), DARK)

    pasos = [
        ("1", "Abre el link de reserva",
         "Ingresa a la página web desde tu celular o computador"),
        ("2", "Elige tu servicio",
         "Manicura, pedicura, combo o gel — lo que prefieras"),
        ("3", "Escoge fecha y hora",
         "Selecciona el día y elige entre las horas disponibles"),
        ("4", "Ingresa tus datos",
         "Solo tu nombre completo y número de WhatsApp"),
    ]
    y = 310
    for num, titulo, desc in pasos:
        # Círculo numerado
        circle(d, 120, y + 44, 44,
               tuple(int(ROSE_DARK[c] * 0.8 + ROSE[c] * 0.2) for c in range(3)))
        bb = d.textbbox((0, 0), num, font=font(52, bold=True))
        tw = bb[2] - bb[0]
        th = bb[3] - bb[1]
        d.text((120 - tw // 2, y + 44 - th // 2 - 4), num, font=font(52, bold=True), fill=WHITE)
        # Textos
        d.text((196, y + 10), titulo, font=font(48, bold=True), fill=DARK)
        d.text((196, y + 72), desc,   font=font(36), fill=(100, 100, 100))
        y += 200

    # Caja dorada inferior
    bx0, by0, bx1, by1 = 60, y + 30, W - 60, y + 190
    rounded_rect(d, [bx0, by0, bx1, by1], 24, fill=GOLD_LIGHT)
    d.text((bx0 + 24, by0 + 24), "🔗", font=font(68))
    d.text((bx0 + 112, by0 + 18),
           "Pide el link a Leila por WhatsApp",
           font=font(38, bold=True), fill=DARK)
    d.text((bx0 + 112, by0 + 76),
           "¡Es rápido y sencillo!",
           font=font(36), fill=(80, 70, 40))
    slide_badge(img, 3)
    return img


def s4_fecha():
    img = gradient_bg([DARK, DARK2])
    d = ImageDraw.Draw(img)
    centered_text(d, "PASO 2", 90, font(40, bold=True), GOLD_LIGHT)
    centered_text(d, "Fecha y hora\ndisponible 📅", 170, font(72), GOLD_LIGHT)

    bloques = [
        ("📅", "Selecciona la fecha",
         "Escoge desde hoy. El calendario\nsolo muestra fechas válidas."),
        ("🕐", "Elige la hora libre",
         "Solo verás horas según la duración\ndel servicio elegido."),
        ("⏰", "Horario de atención",
         "Lunes a Sábado\n7:00 AM  —  6:00 PM"),
    ]
    y = 420
    for ico, titulo, desc in bloques:
        bx0, by0, bx1, by1 = 60, y, W - 60, y + 220
        rounded_rect(d, [bx0, by0, bx1, by1], 24,
                     fill=(60, 55, 55), outline=(100, 85, 50), outline_width=2)
        d.text((bx0 + 24, by0 + 60), ico, font=font(78))
        d.text((bx0 + 130, by0 + 24), titulo, font=font(44, bold=True), fill=ROSE)
        lines = desc.split("\n")
        ty = by0 + 88
        for ln in lines:
            d.text((bx0 + 130, ty), ln, font=font(36), fill=(200, 200, 200))
            ty += 50
        y += 244

    centered_text(d, "Las horas ocupadas no aparecen ✅",
                  y + 20, font(38), (100, 150, 100))
    slide_badge(img, 4)
    return img


def s5_datos():
    img = gradient_bg([(252, 228, 236), (255, 240, 248)])
    d = ImageDraw.Draw(img)
    centered_text(d, "PASO 3", 80, font(40, bold=True), ROSE_DARK)
    centered_text(d, "Tus datos de\ncontacto 📋", 160, font(72), DARK)

    # Campos mock
    for ico, label, y_off in [("👤", "Nombre completo", 390), ("📱", "Número de WhatsApp", 540)]:
        rounded_rect(d, [60, y_off, W - 60, y_off + 120], 20,
                     fill=WHITE, outline=ROSE, outline_width=3)
        d.text((90, y_off + 24), ico, font=font(64))
        d.text((184, y_off + 36), label, font=font(46), fill=(160, 140, 150))

    # Resumen
    ry = 700
    rounded_rect(d, [60, ry, W - 60, ry + 420], 24,
                 fill=(233, 30, 140, 20) if img.mode == "RGBA" else (255, 224, 235),
                 outline=ROSE, outline_width=2)
    d.text((90, ry + 24), "📋  Resumen de tu cita", font=font(44, bold=True), fill=ROSE_DARK)
    filas = [
        ("Servicio",    "Manicura semi"),
        ("Fecha",       "Viernes 25 abr"),
        ("Hora",        "10:00 AM"),
        ("Precio total","$35.000"),
    ]
    ty = ry + 96
    for lbl, val in filas:
        d.text((90, ty), lbl, font=font(40), fill=(100, 100, 100))
        bb = d.textbbox((0, 0), val, font=font(40, bold=True))
        d.text((W - 60 - (bb[2] - bb[0]), ty), val, font=font(40, bold=True), fill=DARK)
        ty += 64
    # Línea separadora
    d.line([(90, ty + 6), (W - 90, ty + 6)], fill=ROSE, width=2)
    ty += 20
    d.text((90, ty), "Anticipo (30%)", font=font(44, bold=True), fill=DARK)
    bb = d.textbbox((0, 0), "$10.500", font=font(44, bold=True))
    d.text((W - 60 - (bb[2] - bb[0]), ty), "$10.500", font=font(44, bold=True), fill=ROSE_DARK)

    centered_text(d, "El resumen se calcula automáticamente 😊",
                  1200, font(38), (160, 140, 150))
    slide_badge(img, 5)
    return img


def s6_pago():
    img = gradient_bg([DARK, DARK2])
    d = ImageDraw.Draw(img)
    centered_text(d, "PASO 4 – PAGO", 90, font(40, bold=True), GOLD_LIGHT)
    centered_text(d, "Anticipo del 30% 💳", 170, font(68), GOLD_LIGHT)

    pasos = [
        ("1", "Recibe la confirmación",
         "Verás el monto exacto del anticipo\npara asegurar tu cita"),
        ("2", "Elige cómo pagar",
         "Nequi o Bancolombia. Los datos\naparecen en pantalla."),
        ("3", "Envía el comprobante",
         "Haz el pago y envía la foto\ndel comprobante por WhatsApp"),
    ]
    y = 370
    for num, titulo, desc in pasos:
        circle(d, 88, y + 38, 38,
               (int(GOLD[0] * 0.9), int(GOLD[1] * 0.9), int(GOLD[2] * 0.5)))
        bb = d.textbbox((0, 0), num, font=font(46, bold=True))
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        d.text((88 - tw // 2, y + 38 - th // 2 - 4), num, font=font(46, bold=True), fill=DARK)
        d.text((156, y + 4), titulo, font=font(44, bold=True), fill=(252, 228, 236))
        lines = desc.split("\n")
        ty2 = y + 60
        for ln in lines:
            d.text((156, ty2), ln, font=font(36), fill=(160, 160, 160))
            ty2 += 50
        y += 210

    # Métodos de pago
    my = y + 30
    for cx, ico, name in [(W // 4, "📱", "Nequi"), (3 * W // 4, "🏦", "Bancolombia")]:
        bx0, bx1 = cx - 210, cx + 210
        rounded_rect(d, [bx0, my, bx1, my + 200], 24,
                     fill=(60, 55, 55), outline=(100, 85, 50), outline_width=2)
        d.text((cx - 28, my + 18), ico, font=font(68))
        bb = d.textbbox((0, 0), name, font=font(44, bold=True))
        d.text((cx - (bb[2] - bb[0]) // 2, my + 112), name, font=font(44, bold=True), fill=GOLD_LIGHT)
        sub = "Número en pantalla"
        bb2 = d.textbbox((0, 0), sub, font=font(32))
        d.text((cx - (bb2[2] - bb2[0]) // 2, my + 162), sub, font=font(32), fill=(150, 150, 150))

    slide_badge(img, 6)
    return img


def s7_whatsapp():
    img = gradient_bg([GREEN_DARK, (6, 60, 44)])
    d = ImageDraw.Draw(img)
    centered_text(d, "ÚLTIMO PASO", 90, font(40, bold=True), (110, 231, 183))
    centered_text(d, "Envía tu\ncomprobante 📲", 170, font(72), WHITE)

    # Burbuja WhatsApp
    bx0, by0, bx1, by1 = 60, 420, W - 60, 730
    rounded_rect(d, [bx0, by0, bx1, by1], 24, fill=GREEN_MID)
    # Cola de la burbuja
    d.polygon([(bx0, by0 + 30), (bx0 - 28, by0 + 60), (bx0, by0 + 90)], fill=GREEN_MID)

    mensaje = [
        "Hola Leila! 👋",
        "Acabo de hacer la reserva para el",
        "Viernes 25 abr a las 10:00 AM.",
        "",
        "Te envío el comprobante del anticipo.",
        "¡Nos vemos pronto! 💅",
    ]
    ty = by0 + 28
    for ln in mensaje:
        f = font(38, bold=True) if ln.startswith("Viernes") else font(38)
        d.text((bx0 + 28, ty), ln, font=f, fill=GREEN_TEXT)
        ty += 52

    # Botón WhatsApp
    btn_y = 790
    rounded_rect(d, [200, btn_y, W - 200, btn_y + 110], 999,
                 fill=(37, 211, 102))
    d.text((226, btn_y + 14), "💬", font=font(72))
    d.text((330, btn_y + 26), "Enviar por WhatsApp",
           font=font(46, bold=True), fill=WHITE)

    # Advertencia
    wy = 960
    rounded_rect(d, [60, wy, W - 60, wy + 280], 20,
                 fill=(30, 60, 48), outline=(251, 191, 36), outline_width=3)
    d.text((84, wy + 24), "⚠️", font=font(56))
    lines = [
        "Recuerda: El anticipo no es",
        "reembolsable si cancelas con",
        "menos de 24 hrs de anticipación.",
        "Tu cita se confirma cuando Leila",
        "recibe el pago.",
    ]
    ty = wy + 24
    d.text((160, ty), "⚠️  Importante", font=font(40, bold=True), fill=(251, 191, 36))
    ty += 56
    for ln in lines:
        d.text((84, ty), ln, font=font(36), fill=(253, 230, 138))
        ty += 50

    slide_badge(img, 7)
    return img


def s8_cierre():
    img = gradient_bg([CREAM, (255, 245, 220)])
    d = ImageDraw.Draw(img)
    # Franja dorada abajo
    arr = np.array(img)
    for i in range(H // 2, H):
        t = (i - H // 2) / (H // 2)
        row = np.array(GOLD_LIGHT) * t + arr[i] * (1 - t)
        arr[i] = np.clip(row, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    d = ImageDraw.Draw(img)

    d.text(((W - 100) // 2, 120), "💅", font=font(140))
    centered_text(d, "¡Listo!\nTu cita está\nreservada", 370, font(80, bold=True), GOLD)
    centered_text(d, "Te esperamos 🌸", 700, font(60), ROSE_DARK)

    checks = [
        "Elige servicio, fecha y hora",
        "Ingresa nombre y WhatsApp",
        "Paga el 30% de anticipo",
        "Envía comprobante",
        "¡Espera confirmación!",
    ]
    y = 840
    for txt in checks:
        circle(d, 110, y + 26, 26,
               tuple(int(ROSE_DARK[c] * 0.9 + ROSE[c] * 0.1) for c in range(3)))
        d.text((94, y + 8), "✓", font=font(36, bold=True), fill=WHITE)
        d.text((160, y + 4), txt, font=font(46), fill=DARK)
        y += 88

    # Caja horario
    hy = 1340
    rounded_rect(d, [80, hy, W - 80, hy + 260], 24, fill=GOLD_LIGHT)
    centered_text(d, "⏰  Horario de atención", hy + 28, font(44, bold=True), DARK)
    centered_text(d, "Lun – Sáb  |  7:00 AM – 6:00 PM", hy + 106, font(46, bold=True), DARK)
    centered_text(d, "📍  Reservas 100% online", hy + 176, font(40), (80, 70, 40))

    slide_badge(img, 8)
    return img


# ──────────────────────────────────────────────
# RENDER  —  genera frames con crossfade
# ──────────────────────────────────────────────

def to_np(img):
    return np.array(img.convert("RGB"))


def crossfade(frames_a, frames_b, n_frames):
    """Interpolación lineal entre último frame de a y primero de b."""
    a = frames_a[-1].astype(np.float32)
    b = frames_b[0].astype(np.float32)
    out = []
    for i in range(n_frames):
        t = i / max(n_frames - 1, 1)
        out.append(np.clip(a * (1 - t) + b * t, 0, 255).astype(np.uint8))
    return out


def hold_frames(img_np, n):
    return [img_np.copy() for _ in range(n)]


print("Generando diapositivas…")
slides_fn = [s1_portada, s2_servicios, s3_pasos, s4_fecha,
             s5_datos, s6_pago, s7_whatsapp, s8_cierre]

slides = []
for fn in slides_fn:
    print(f"  • {fn.__name__}")
    slides.append(to_np(fn()))

hold_n  = int(HOLD * FPS)
fade_n  = int(FADE * FPS)

print("Montando video…")
all_frames = []
for idx, slide in enumerate(slides):
    held = hold_frames(slide, hold_n)
    if idx < len(slides) - 1:
        cf = crossfade(held, hold_frames(slides[idx + 1], hold_n), fade_n)
        all_frames.extend(held)
        all_frames.extend(cf)
    else:
        all_frames.extend(held)

total_frames = len(all_frames)
duration_s   = total_frames / FPS
print(f"  Frames: {total_frames}  |  Duración: {duration_s:.1f}s")

print("Codificando MP4…")
writer = imageio.get_writer(
    OUT,
    fps=FPS,
    codec="libx264",
    quality=None,
    output_params=[
        "-crf", "28",          # calidad/tamaño: 28 = buena relación
        "-preset", "fast",
        "-pix_fmt", "yuv420p", # compatible con WhatsApp
        "-movflags", "+faststart",
        "-vf", f"scale={W}:{H}",
    ],
)

for i, frame in enumerate(all_frames):
    writer.append_data(frame)
    if i % (FPS * 3) == 0:
        print(f"  {i}/{total_frames} frames…")

writer.close()

size_mb = os.path.getsize(OUT) / 1024 / 1024
print(f"\n✅  Video generado: {OUT}")
print(f"   Tamaño: {size_mb:.1f} MB  |  Duración: {duration_s:.1f}s")
print("   Listo para subir como estado de WhatsApp 🎉")
