import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const db = adminDb();
  const snap = await db.collection("trabajadores").doc(id).collection("bloqueos").orderBy("fecha").get();
  return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { fecha, tipo, motivo } = await req.json();
  if (!fecha || !["todo", "manana", "tarde"].includes(tipo)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const db = adminDb();
  await db.collection("trabajadores").doc(id).collection("bloqueos").doc(fecha).set({
    fecha, tipo, motivo: motivo || "", creado_en: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { fecha } = await req.json();
  if (!fecha) return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
  const db = adminDb();
  await db.collection("trabajadores").doc(id).collection("bloqueos").doc(fecha).delete();
  return NextResponse.json({ ok: true });
}
