import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const snap = await db.collection("cumpleanos").orderBy("nombre").get();
  return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { nombre, whatsapp, fecha_nacimiento } = await req.json();
  if (!nombre?.trim() || !whatsapp?.trim() || !fecha_nacimiento) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
    return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
  }
  const db = adminDb();
  const ref = await db.collection("cumpleanos").add({
    nombre: nombre.trim(),
    whatsapp: whatsapp.trim(),
    fecha_nacimiento,
    creado_en: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ id: ref.id });
}
