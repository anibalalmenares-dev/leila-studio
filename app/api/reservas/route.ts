import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { calcularAnticipo } from "@/lib/servicios";
import { notificarNuevaReserva } from "@/lib/whatsapp";
import { rbacGuard } from "@/lib/rbac";
import { sanitize } from "@/lib/sanitize";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    servicio_id, servicio_nombre, precio, duracion_min,
    fecha, hora, cliente_nombre, cliente_telefono,
    trabajador_id, trabajador_nombre,
    es_premio_rifa, rifa_id, rifa_nombre,
  } = body;

  if (!servicio_id || !fecha || !hora || !cliente_nombre || !cliente_telefono || !servicio_nombre) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (isNaN(Number(precio)) || Number(precio) <= 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }
  if (isNaN(Number(duracion_min)) || Number(duracion_min) <= 0) {
    return NextResponse.json({ error: "Duración inválida" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const nombreLimpio = sanitize(String(cliente_nombre), 100);
  const telefonoLimpio = sanitize(String(cliente_telefono), 20);

  const db = adminDb();

  const anticipoDoc = await db.collection("config").doc("anticipo").get();
  const anticipoCfg = anticipoDoc.exists ? anticipoDoc.data()! : { activo: true, tipo: "fijo", monto: 10000, porcentaje: 30 };
  const anticipoActivo = anticipoCfg.activo !== false;
  let anticipo = 0;
  if (anticipoActivo) {
    if (anticipoCfg.tipo === "porcentaje") {
      anticipo = Math.round(Number(precio) * Number(anticipoCfg.porcentaje ?? 30) / 100);
    } else {
      anticipo = Number(anticipoCfg.monto ?? 10000);
    }
  }

  const expira_en = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const clienteRef = db.collection("clientes").doc(telefonoLimpio);
  await clienteRef.set(
    { nombre: nombreLimpio, telefono: telefonoLimpio, actualizado_en: FieldValue.serverTimestamp() },
    { merge: true }
  );

  const reservaRef = await db.collection("reservas").add({
    cliente_telefono: telefonoLimpio,
    cliente_nombre: nombreLimpio,
    servicio_id,
    servicio_nombre,
    precio,
    duracion_min,
    fecha,
    hora,
    anticipo,
    trabajador_id: trabajador_id || null,
    trabajador_nombre: trabajador_nombre || null,
    pago_saldo: null,
    estado: es_premio_rifa ? "confirmada" : "pendiente",
    expira_en,
    creado_en: FieldValue.serverTimestamp(),
    ...(es_premio_rifa ? { es_premio_rifa: true, rifa_id: rifa_id || null, rifa_nombre: rifa_nombre || null } : {}),
  });

  if (es_premio_rifa && rifa_id) {
    await db.collection("rifas").doc(rifa_id).update({
      ganador_agendado: true,
      ganador_reserva_fecha: fecha,
      ganador_reserva_hora: hora,
      ganador_reserva_id: reservaRef.id,
    });
  }

  const reserva = { id: reservaRef.id, cliente_nombre: nombreLimpio, servicio_nombre, precio, anticipo, fecha, hora, cliente_telefono: telefonoLimpio, trabajador_nombre: trabajador_nombre || null };
  await notificarNuevaReserva({ reserva });

  return NextResponse.json(reserva);
}

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = adminDb();
  const snap = await db.collection("reservas").get();
  const data = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const fa = String(a.fecha ?? ""), fb = String(b.fecha ?? "");
      if (fa !== fb) return fa.localeCompare(fb);
      return String(a.hora ?? "").localeCompare(String(b.hora ?? ""));
    });
  return NextResponse.json(data);
}
