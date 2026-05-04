import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(_req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await adminDb().collection("reservas").doc(id).delete();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { estado, pago_saldo, fecha, hora } = body;

  const estadosValidos = ["pendiente", "confirmada", "en_proceso", "completada", "cancelada"];
  if (estado && !estadosValidos.includes(String(estado))) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  if (pago_saldo !== undefined) {
    const saldo = Number(pago_saldo);
    if (isNaN(saldo) || saldo < 0) {
      return NextResponse.json({ error: "Pago inválido" }, { status: 400 });
    }
  }
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const db = adminDb();
  const update: Record<string, unknown> = {};

  if (estado) update.estado = estado;
  if (pago_saldo !== undefined) update.pago_saldo = Number(pago_saldo);
  if (fecha) update.fecha = String(fecha);
  if (hora) update.hora = String(hora);
  if (estado === "confirmada") update.confirmada_en = FieldValue.serverTimestamp();
  if (estado === "completada") update.completada_en = FieldValue.serverTimestamp();
  if (estado === "cancelada") update.cancelada_en = FieldValue.serverTimestamp();
  if (estado === "pendiente") {
    update.expira_en = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    update.cancelada_en = null;
  }
  if (fecha || hora) update.reagendada_en = FieldValue.serverTimestamp();

  await db.collection("reservas").doc(id).update(update);
  const doc = await db.collection("reservas").doc(id).get();
  const data = doc.data() as Record<string, unknown>;

  return NextResponse.json({ id: doc.id, ...data });
}
