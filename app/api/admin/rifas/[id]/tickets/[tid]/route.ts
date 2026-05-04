import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; tid: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, tid } = await params;
  const { estado } = await req.json();

  const estadosValidos = ["pendiente_pago", "confirmado", "cancelado"];
  if (!estadosValidos.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const update: Record<string, unknown> = { estado };
  if (estado === "confirmado") update.confirmado_en = FieldValue.serverTimestamp();

  await adminDb()
    .collection("rifas").doc(id)
    .collection("tickets").doc(tid)
    .update(update);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; tid: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, tid } = await params;

  await adminDb()
    .collection("rifas").doc(id)
    .collection("tickets").doc(tid)
    .delete();

  return NextResponse.json({ ok: true });
}
