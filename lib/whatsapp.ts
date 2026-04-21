import { formatPrecio } from "./servicios";

export async function notificarNuevaReserva({ reserva }: { reserva: Record<string, unknown> }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.ADMIN_WHATSAPP;

  if (!accountSid || !authToken || !from || !to) return;

  const mensaje =
    `💅 *Nueva reserva — Leila Studio*\n\n` +
    `👤 Cliente: ${reserva.cliente_nombre}\n` +
    `📱 Tel: ${reserva.cliente_telefono}\n` +
    `💆 Servicio: ${reserva.servicio_nombre}\n` +
    `📅 Fecha: ${reserva.fecha}\n` +
    `🕐 Hora: ${reserva.hora}\n` +
    `💰 Total: ${formatPrecio(reserva.precio as number)}\n` +
    `💳 Anticipo (30%): ${formatPrecio(reserva.anticipo as number)}\n\n` +
    `⏳ Estado: *Pendiente de pago*\n` +
    `ID: ${reserva.id}`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: mensaje }),
    });
  } catch (e) {
    console.error("Error enviando WhatsApp:", e);
  }
}
