import { formatPrecio } from "./servicios";

async function enviarMeta(to: string, mensaje: string) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("Meta WhatsApp: faltan variables META_WHATSAPP_TOKEN o META_PHONE_NUMBER_ID");
    return;
  }

  const telefono = to.replace(/\D/g, "");
  const telefonoFinal = telefono.startsWith("57") ? telefono : `57${telefono}`;

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefonoFinal,
      type: "text",
      text: { body: mensaje },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Meta WhatsApp error:", res.status, JSON.stringify(data));
  } else {
    console.log("Meta WhatsApp enviado OK:", data.messages?.[0]?.id);
  }
}

export async function notificarNuevaReservaAdmin(reserva: {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  fecha: string;
  hora: string;
  precio: number;
  anticipo: number;
}) {
  const adminWhatsapp = process.env.ADMIN_WHATSAPP;
  if (!adminWhatsapp) { console.error("Meta WhatsApp: ADMIN_WHATSAPP no configurado"); return; }

  const [y, m, d] = reserva.fecha.split("-");
  const fechaFormato = `${d}/${m}/${y}`;

  const mensaje =
    `💅 *Nueva reserva — Leila Studio*\n\n` +
    `👤 Cliente: ${reserva.cliente_nombre}\n` +
    `📱 Tel: ${reserva.cliente_telefono}\n` +
    `💆 Servicio: ${reserva.servicio_nombre}\n` +
    `📅 Fecha: ${fechaFormato}\n` +
    `🕐 Hora: ${reserva.hora}\n` +
    `💰 Total: ${formatPrecio(reserva.precio)}\n` +
    `💳 Anticipo: ${formatPrecio(reserva.anticipo)}\n\n` +
    `⏳ Estado: *Pendiente de pago*\n` +
    `ID: ${reserva.id}`;

  try { await enviarMeta(adminWhatsapp, mensaje); } catch (e) { console.error("Error notif admin:", e); }
}

export async function notificarConfirmacionCliente(reserva: {
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  fecha: string;
  hora: string;
  precio: number;
  anticipo: number;
}) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("Meta WhatsApp: faltan variables META_WHATSAPP_TOKEN o META_PHONE_NUMBER_ID");
    return;
  }

  const telefono = reserva.cliente_telefono.replace(/\D/g, "");
  const telefonoFinal = telefono.startsWith("57") ? telefono : `57${telefono}`;

  const saldo = reserva.precio - reserva.anticipo;
  const [y, m, d] = reserva.fecha.split("-");
  const fechaFormato = `${d}/${m}/${y}`;

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefonoFinal,
      type: "template",
      template: {
        name: "confirmacion_cita",
        language: { code: "es_CO" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", parameter_name: "nombre", text: reserva.cliente_nombre },
              { type: "text", parameter_name: "servicio", text: reserva.servicio_nombre },
              { type: "text", parameter_name: "fecha", text: fechaFormato },
              { type: "text", parameter_name: "hora", text: reserva.hora },
              { type: "text", parameter_name: "total", text: formatPrecio(reserva.precio) },
              { type: "text", parameter_name: "anticipo", text: formatPrecio(reserva.anticipo) },
              { type: "text", parameter_name: "saldo", text: formatPrecio(saldo) },
            ],
          },
        ],
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Meta WhatsApp template error:", res.status, JSON.stringify(data));
  } else {
    console.log("Meta WhatsApp plantilla enviada OK:", data.messages?.[0]?.id);
  }
}
