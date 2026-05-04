import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { nombre, categoria, precio, duracion_min } = await req.json();

  if (!nombre || !categoria || !precio || !duracion_min) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const db = adminDb();
  await db.collection("servicios").doc(id).update({
    nombre,
    categoria,
    precio: Number(precio),
    duracion_min: Number(duracion_min),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const db = adminDb();
  await db.collection("servicios").doc(id).delete();

  return NextResponse.json({ ok: true });
}
