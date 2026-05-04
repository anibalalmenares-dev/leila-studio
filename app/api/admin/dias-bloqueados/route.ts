import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const snap = await db.collection("dias_bloqueados").orderBy("fecha").get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { fecha, tipo, motivo } = await req.json();
  if (!fecha || !["todo", "manana", "tarde"].includes(tipo)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const db = adminDb();
  await db.collection("dias_bloqueados").doc(fecha).set({
    fecha,
    tipo,
    motivo: motivo || "",
    creado_en: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { fecha } = await req.json();
  if (!fecha) return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
  const db = adminDb();
  await db.collection("dias_bloqueados").doc(fecha).delete();
  return NextResponse.json({ ok: true });
}
