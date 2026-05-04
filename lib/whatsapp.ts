import { formatPrecio } from "./servicios";

function conPrefijo(num: string): string {
  return num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;
}

async function enviarWhatsApp(to: string, mensaje: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from || !to) {
    console.error("WhatsApp: faltan variables de entorno", { accountSid: !!accountSid, authToken: !!authToken, from: !!from, to: !!to });
    return;
  }
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const fromFinal = conPrefijo(from);
  const toFinal = conPrefijo(to);
  console.log("Twilio enviando — From:", fromFinal, "To:", toFinal);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: fromFinal, To: toFinal, Body: mensaje }),
  });
  const respText = await res.text();
  console.log("Twilio respuesta:", res.status, respText);
  if (!res.ok) {
    console.error("Twilio error:", res.status, respText);
  }
}

export async function notificarCambioClave({ whatsapp }: { whatsapp: string }) {
  const to = whatsapp.startsWith("whatsapp:") ? whatsapp : `whatsapp:${whatsapp}`;
  const fecha = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
  const mensaje =
    `🔑 *Leila Studio — Cambio de clave*\n\n` +
    `La clave del panel admin fue restablecida.\n` +
    `Si no fuiste tú, verifica tu PIN de seguridad.\n\n` +
    `📅 ${fecha}`;
  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("WhatsApp error:", e); }
}

export async function notificarConfirmacionCliente(reserva: {
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  fecha: string;
  hora: string;
  precio: number;
  anticipo: number;
  trabajador_nombre?: string;
}) {
  const telefono = reserva.cliente_telefono.replace(/\D/g, "");
  const to = telefono.startsWith("57") ? `+${telefono}` : `+57${telefono}`;

  const saldo = reserva.precio - reserva.anticipo;
  const [y, m, d] = reserva.fecha.split("-");
  const fechaFormato = `${d}/${m}/${y}`;
  const profesionalLinea = reserva.trabajador_nombre
    ? `• 👩 Profesional: ${reserva.trabajador_nombre}\n`
    : "";
  const pagoLineas = reserva.anticipo > 0
    ? `• 💰 Total: ${formatPrecio(reserva.precio)}\n` +
      `• ✅ Anticipo pagado: ${formatPrecio(reserva.anticipo)}\n` +
      `• 💵 Saldo restante: ${formatPrecio(saldo)}\n`
    : `• 💰 Total a pagar el día de tu cita: ${formatPrecio(reserva.precio)}\n`;

  const mensaje =
    `✨ *¡Tu cita está confirmada!* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `Hola *${reserva.cliente_nombre}*, tu reserva ha sido confirmada exitosamente. ¡Te esperamos! 🎉\n\n` +
    `📋 *Detalle de tu cita:*\n` +
    `• 💆 Servicio: ${reserva.servicio_nombre}\n` +
    profesionalLinea +
    `• 📅 Fecha: ${fechaFormato}\n` +
    `• 🕐 Hora: ${reserva.hora}\n` +
    pagoLineas +
    `\n📍 Recuerda llegar puntual.\n` +
    `Si necesitas cancelar, comunícate con nosotras con anticipación.\n\n` +
    `¡Nos vemos pronto! 💖\n` +
    `━━━━━━━━━━━━━━━━━━━━━`;

  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("Error notif cliente:", e); }
}

export async function enviarSaludoCumpleanos({ nombre, whatsapp }: { nombre: string; whatsapp: string }) {
  const telefono = whatsapp.replace(/\D/g, "");
  const to = telefono.startsWith("57") ? `+${telefono}` : `+57${telefono}`;

  let descuento = 25;
  try {
    const { adminDb } = await import("./firebase-admin");
    const doc = await adminDb().collection("config").doc("extras").get();
    if (doc.exists) descuento = Number(doc.data()!.descuentoCumpleanos ?? 25);
  } catch { /* usa default */ }

  const mensaje =
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `🎂 *¡Feliz cumpleaños, ${nombre}!*\n\n` +
    `Hoy es tu día especial y queremos celebrarlo contigo. Gracias por confiar en nosotras para realzar tu belleza ✨\n\n` +
    `🎁 *Tu regalo de cumpleaños:*\n` +
    `${descuento}% de descuento en tu próxima cita, válido durante todo tu mes de cumpleaños 🌸\n\n` +
    `📲 Reserva cuando quieras:\n` +
    `https://leila-studio.vercel.app/reservar\n\n` +
    `*¡Te esperamos con mucho cariño!* 💖`;
  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("Error cumpleaños WhatsApp:", e); }
}

export async function notificarRestauracion({ cliente_nombre, cliente_telefono, servicio_nombre, fecha, hora, precio, anticipo }: {
  cliente_nombre: string; cliente_telefono: string; servicio_nombre: string;
  fecha: string; hora: string; precio: number; anticipo: number;
}) {
  const telefono = cliente_telefono.replace(/\D/g, "");
  const to = telefono.startsWith("57") ? `+${telefono}` : `+57${telefono}`;
  const [y, m, d] = fecha.split("-");
  const saldo = precio - anticipo;
  const mensaje =
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `¡Hola *${cliente_nombre}!* 🎉\n\n` +
    `Tu cita que había sido cancelada ha sido *reactivada* con éxito.\n\n` +
    `📋 *Detalle de tu cita:*\n` +
    `• 💆 Servicio: ${servicio_nombre}\n` +
    `• 📅 Fecha: ${d}/${m}/${y}\n` +
    `• 🕐 Hora: ${hora}\n` +
    (anticipo > 0 ? `• 💵 Saldo a cancelar: ${formatPrecio(saldo)}\n` : `• 💰 Total: ${formatPrecio(precio)}\n`) +
    `\n📍 Recuerda llegar puntual. ¡Te esperamos! 💖`;
  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("Error restauración WA:", e); }
}

export async function notificarReagendamiento({ cliente_nombre, cliente_telefono, servicio_nombre, nueva_fecha, nueva_hora }: {
  cliente_nombre: string; cliente_telefono: string; servicio_nombre: string;
  nueva_fecha: string; nueva_hora: string;
}) {
  const telefono = cliente_telefono.replace(/\D/g, "");
  const to = telefono.startsWith("57") ? `+${telefono}` : `+57${telefono}`;
  const [y, m, d] = nueva_fecha.split("-");
  const mensaje =
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `¡Hola *${cliente_nombre}!* 📅\n\n` +
    `Tu cita ha sido *reagendada* para una nueva fecha.\n\n` +
    `📋 *Nueva fecha:*\n` +
    `• 💆 Servicio: ${servicio_nombre}\n` +
    `• 📅 Fecha: ${d}/${m}/${y}\n` +
    `• 🕐 Hora: ${nueva_hora}\n\n` +
    `¿Te queda bien este nuevo horario? Respóndenos para confirmarlo.\n\n` +
    `¡Gracias y nos vemos pronto! 💖`;
  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("Error reagenda WA:", e); }
}

export async function enviarGraciasCompletada({ cliente_nombre, cliente_telefono, servicio_nombre }: {
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
}) {
  const telefono = cliente_telefono.replace(/\D/g, "");
  const to = telefono.startsWith("57") ? `+${telefono}` : `+57${telefono}`;
  const mensaje =
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `✨ *¡Gracias por visitarnos, ${cliente_nombre}!* ✨\n\n` +
    `Fue un placer atenderte hoy con tu *${servicio_nombre}*.\n\n` +
    `Esperamos que hayas quedado encantada con el resultado 🌸\n\n` +
    `📲 Cuando quieras repetir, reserva aquí:\n` +
    `https://leila-studio.vercel.app/reservar\n\n` +
    `*¡Te esperamos pronto!* 💖`;
  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("Error gracias completada:", e); }
}

export async function notificarNuevaReserva({ reserva }: { reserva: Record<string, unknown> }) {
  const to = process.env.ADMIN_WHATSAPP;
  if (!to) { console.error("WhatsApp: ADMIN_WHATSAPP no configurado"); return; }

  const trabajadorLinea = reserva.trabajador_nombre
    ? `👩 Profesional: ${reserva.trabajador_nombre}\n`
    : "";

  const mensaje =
    `💅 *Nueva reserva — Leila Studio*\n\n` +
    `👤 Cliente: ${reserva.cliente_nombre}\n` +
    `📱 Tel: ${reserva.cliente_telefono}\n` +
    `💆 Servicio: ${reserva.servicio_nombre}\n` +
    trabajadorLinea +
    `📅 Fecha: ${reserva.fecha}\n` +
    `🕐 Hora: ${reserva.hora}\n` +
    `💰 Total: ${formatPrecio(reserva.precio as number)}\n` +
    `💳 Anticipo: ${Number(reserva.anticipo) > 0 ? formatPrecio(reserva.anticipo as number) : "No aplica"}\n\n` +
    `⏳ Estado: *Pendiente de pago*\n` +
    `ID: ${reserva.id}`;

  try { await enviarWhatsApp(to, mensaje); } catch (e) { console.error("Error enviando WhatsApp:", e); }
}
