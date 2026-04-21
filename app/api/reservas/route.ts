import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { calcularAnticipo } from "@/lib/servicios";
import { notificarNuevaReserva } from "@/lib/whatsapp";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    servicio_id, servicio_nombre, precio, duracion_min,
    fecha, hora, cliente_nombre, cliente_telefono,
  } = body;

  if (!servicio_id || !fecha || !hora || !cliente_nombre || !cliente_telefono) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const db = adminDb();
  const anticipo = calcularAnticipo(precio);
  const expira_en = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const clienteRef = db.collection("clientes").doc(cliente_telefono);
  await clienteRef.set(
    { nombre: cliente_nombre, telefono: cliente_telefono, actualizado_en: FieldValue.serverTimestamp() },
    { merge: true }
  );

  const reservaRef = await db.collection("reservas").add({
    cliente_telefono,
    cliente_nombre,
    servicio_id,
    servicio_nombre,
    precio,
    duracion_min,
    fecha,
    hora,
    anticipo,
    pago_saldo: null,
    estado: "pendiente",
    expira_en,
    creado_en: FieldValue.serverTimestamp(),
  });

  const reserva = { id: reservaRef.id, cliente_nombre, servicio_nombre, precio, anticipo, fecha, hora, cliente_telefono };
  await notificarNuevaReserva({ reserva });

  return NextResponse.json(reserva);
}

export async function GET() {
  const db = adminDb();
  const snap = await db.collection("reservas").orderBy("fecha").orderBy("hora").get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(data);
}
