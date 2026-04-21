import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSlotsDisponibles } from "@/lib/horarios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const duracion = parseInt(searchParams.get("duracion") || "60");

  if (!fecha) return NextResponse.json({ horas: [] });

  const db = adminDb();
  const snap = await db
    .collection("reservas")
    .where("fecha", "==", fecha)
    .where("estado", "in", ["pendiente", "confirmada"])
    .get();

  const reservas = snap.docs.map((d) => ({
    hora: d.data().hora,
    duracion_min: d.data().duracion_min,
  }));

  const horas = getSlotsDisponibles(reservas, duracion);
  return NextResponse.json({ horas });
}
