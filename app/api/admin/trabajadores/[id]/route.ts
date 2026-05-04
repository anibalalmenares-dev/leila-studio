import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { nombre, especialidad, areas, porcentaje, activo } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const db = adminDb();
  const ref = db.collection("trabajadores").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });

  const pct = typeof porcentaje === "number" ? Math.min(100, Math.max(0, porcentaje)) : 0;
  await ref.update({
    nombre: nombre.trim(),
    especialidad: especialidad?.trim() || "",
    areas: Array.isArray(areas) ? areas.filter((a: unknown) => typeof a === "string") : [],
    porcentaje: pct,
    activo: activo !== false,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const db = adminDb();
  const ref = db.collection("trabajadores").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
  await ref.delete();
  return NextResponse.json({ ok: true });
}
