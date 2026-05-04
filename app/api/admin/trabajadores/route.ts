import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const snap = await db.collection("trabajadores").get();
  type TRow = Record<string, unknown> & { id: string };
  const raw: TRow[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as TRow));
  raw.sort((a, b) => ((a.orden as number) ?? 0) - ((b.orden as number) ?? 0));
  const trabajadores = raw.map(d => ({
    id: d.id,
    nombre: (d.nombre as string) ?? "",
    especialidad: (d.especialidad as string) || "",
    areas: (d.areas as string[]) || [],
    porcentaje: (d.porcentaje as number) ?? 0,
    activo: d.activo !== false,
  }));
  return NextResponse.json(trabajadores);
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, especialidad, areas, porcentaje } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const db = adminDb();
  const snap = await db.collection("trabajadores").get();
  if (snap.size >= 10) return NextResponse.json({ error: "Máximo 10 trabajadores" }, { status: 400 });

  let maxOrden = -1;
  for (const doc of snap.docs) {
    const o = doc.data().orden;
    if (typeof o === "number" && o > maxOrden) maxOrden = o;
  }
  const orden = maxOrden + 1;
  const pct = typeof porcentaje === "number" ? Math.min(100, Math.max(0, porcentaje)) : 0;

  const ref = await db.collection("trabajadores").add({
    nombre: nombre.trim(),
    especialidad: especialidad?.trim() || "",
    areas: Array.isArray(areas) ? areas.filter((a: unknown) => typeof a === "string") : [],
    porcentaje: pct,
    activo: true,
    orden,
    creado_en: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
}
