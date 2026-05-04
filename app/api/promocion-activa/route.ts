import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const DIAS_MAP: Record<number, string> = {
  0: "domingo", 1: "lunes", 2: "martes", 3: "miercoles",
  4: "jueves", 5: "viernes", 6: "sabado",
};

export async function GET(req: NextRequest) {
  const db = adminDb();
  const doc = await db.collection("config").doc("promociones").get();
  if (!doc.exists) return NextResponse.json({ activa: false });

  const { recurrentes = [], puntuales = [] } = doc.data()!;
  const fechaParam = req.nextUrl.searchParams.get("fecha");
  const hoy = fechaParam || new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const diaSemana = DIAS_MAP[new Date(hoy + "T12:00:00").getDay()];

  // Puntual gana sobre recurrente
  const puntual = puntuales.find((p: { fecha: string; porcentaje: number }) => p.fecha === hoy);
  if (puntual) return NextResponse.json({ activa: true, porcentaje: puntual.porcentaje, tipo: "puntual", label: hoy });

  const recurrente = recurrentes.find((r: { dia: string; porcentaje: number }) => r.dia === diaSemana);
  if (recurrente) return NextResponse.json({ activa: true, porcentaje: recurrente.porcentaje, tipo: "recurrente", label: diaSemana });

  return NextResponse.json({ activa: false });
}
