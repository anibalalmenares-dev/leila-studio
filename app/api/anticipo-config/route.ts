import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const db = adminDb();
  const doc = await db.collection("config").doc("anticipo").get();
  const DEFAULT = { activo: true, tipo: "fijo", monto: 10000, porcentaje: 30 };
  if (!doc.exists) return NextResponse.json(DEFAULT);
  const d = doc.data()!;
  return NextResponse.json({
    activo: d.activo !== false,
    tipo: d.tipo || "fijo",
    monto: Number(d.monto ?? 10000),
    porcentaje: Number(d.porcentaje ?? 30),
  });
}
