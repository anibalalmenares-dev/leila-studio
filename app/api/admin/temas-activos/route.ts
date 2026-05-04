import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard, rootGuard } from "@/lib/rbac";
import { TEMAS } from "@/lib/temas";

const TODOS = TEMAS.map(t => t.id);

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const doc = await db.collection("config").doc("temas_activos").get();
  const activos: string[] = doc.exists ? (doc.data()?.activos ?? TODOS) : TODOS;
  return NextResponse.json({ activos });
}

export async function POST(req: NextRequest) {
  if (!await rootGuard(req)) return NextResponse.json({ error: "Solo SuperAdmin" }, { status: 403 });
  const { activos } = await req.json();
  if (!Array.isArray(activos)) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  const db = adminDb();
  await db.collection("config").doc("temas_activos").set({ activos });
  return NextResponse.json({ ok: true });
}
