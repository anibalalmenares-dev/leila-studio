import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { enviarSaludoCumpleanos } from "@/lib/whatsapp";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const db = adminDb();
  const doc = await db.collection("cumpleanos").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const data = doc.data()!;
  await enviarSaludoCumpleanos({ nombre: data.nombre, whatsapp: data.whatsapp });
  return NextResponse.json({ ok: true });
}
