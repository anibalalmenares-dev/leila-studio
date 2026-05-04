import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { enviarGraciasCompletada } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { reserva_id } = await req.json();
  if (!reserva_id) return NextResponse.json({ error: "Falta reserva_id" }, { status: 400 });

  const doc = await adminDb().collection("reservas").doc(String(reserva_id)).get();
  if (!doc.exists) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  const data = doc.data()!;
  await enviarGraciasCompletada({
    cliente_nombre: String(data.cliente_nombre ?? ""),
    cliente_telefono: String(data.cliente_telefono ?? ""),
    servicio_nombre: String(data.servicio_nombre ?? ""),
  });

  return NextResponse.json({ ok: true });
}
