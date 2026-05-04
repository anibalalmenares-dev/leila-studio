import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const allowed = ["estado", "mostrar_banner", "nombre", "premio", "fecha_sorteo", "precio_ticket", "max_tickets", "max_por_persona", "servicio_id", "servicio_nombre"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  await adminDb().collection("rifas").doc(id).update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await adminDb().collection("rifas").doc(id).delete();
  return NextResponse.json({ ok: true });
}
