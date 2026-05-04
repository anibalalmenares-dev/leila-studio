import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await adminDb().collection("rifas").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Rifa no encontrada" }, { status: 404 });
  const d = doc.data()!;
  return NextResponse.json({
    id: doc.id,
    nombre: d.nombre,
    estado: d.estado,
    servicio_id: d.servicio_id ?? null,
    servicio_nombre: d.servicio_nombre ?? null,
    ganador_nombre: d.ganador_nombre ?? null,
    ganador_telefono: d.ganador_telefono ?? null,
  });
}
