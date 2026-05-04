import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { notificarRestauracion, notificarReagendamiento } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { reserva_id, nueva_fecha, nueva_hora } = await req.json();
  if (!reserva_id) return NextResponse.json({ error: "Falta reserva_id" }, { status: 400 });

  const doc = await adminDb().collection("reservas").doc(String(reserva_id)).get();
  if (!doc.exists) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  const data = doc.data()!;
  const esReagenda = !!(nueva_fecha && nueva_hora);

  if (esReagenda) {
    await notificarReagendamiento({
      cliente_nombre: String(data.cliente_nombre ?? ""),
      cliente_telefono: String(data.cliente_telefono ?? ""),
      servicio_nombre: String(data.servicio_nombre ?? ""),
      nueva_fecha: String(nueva_fecha),
      nueva_hora: String(nueva_hora),
    });
  } else {
    await notificarRestauracion({
      cliente_nombre: String(data.cliente_nombre ?? ""),
      cliente_telefono: String(data.cliente_telefono ?? ""),
      servicio_nombre: String(data.servicio_nombre ?? ""),
      fecha: String(nueva_fecha ?? data.fecha ?? ""),
      hora: String(nueva_hora ?? data.hora ?? ""),
      precio: Number(data.precio ?? 0),
      anticipo: Number(data.anticipo ?? 0),
    });
  }

  return NextResponse.json({ ok: true });
}
