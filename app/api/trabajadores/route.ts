import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const db = adminDb();
  const snap = await db.collection("trabajadores").get();
  const trabajadores = snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
    .filter((d: Record<string, unknown>) => d.activo === true)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.orden as number) ?? 0) - ((b.orden as number) ?? 0))
    .map((d: Record<string, unknown>) => ({ id: d.id as string, nombre: d.nombre as string, especialidad: (d.especialidad as string) || "", areas: (d.areas as string[]) || [], porcentaje: (d.porcentaje as number) ?? 0 }));
  return NextResponse.json(trabajadores);
}
