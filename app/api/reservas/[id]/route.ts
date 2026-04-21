import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { estado, pago_saldo } = body;

  const db = adminDb();
  const update: Record<string, unknown> = {};

  if (estado) update.estado = estado;
  if (pago_saldo !== undefined) update.pago_saldo = pago_saldo;
  if (estado === "confirmada") update.confirmada_en = FieldValue.serverTimestamp();
  if (estado === "completada") update.completada_en = FieldValue.serverTimestamp();
  if (estado === "cancelada") update.cancelada_en = FieldValue.serverTimestamp();

  await adminDb().collection("reservas").doc(id).update(update);
  const doc = await adminDb().collection("reservas").doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}
