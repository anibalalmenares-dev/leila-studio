import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rootGuard } from "@/lib/rbac";

const VALORES_VALIDOS = ["gradiente", "fondo01", "fondo02", "fondo03", "fondo04", "fondoMadre01", "fondoMadre02", "fondoMadre03"];
const SECCIONES_VALIDAS = ["inicio", "reservar", "admin", "login", "confirmacion"];

export async function GET(req: NextRequest) {
  if (!await rootGuard(req)) return NextResponse.json({ error: "Solo SuperAdmin" }, { status: 403 });
  const db = adminDb();
  const doc = await db.collection("config").doc("fondos").get();
  const DEFAULT = { inicio: "gradiente", reservar: "gradiente", admin: "gradiente", login: "gradiente", confirmacion: "gradiente" };
  if (!doc.exists) return NextResponse.json(DEFAULT);
  return NextResponse.json({ ...DEFAULT, ...doc.data() });
}

export async function POST(req: NextRequest) {
  if (!await rootGuard(req)) return NextResponse.json({ error: "Solo SuperAdmin" }, { status: 403 });
  const body = await req.json();
  const update: Record<string, string> = {};
  for (const sec of SECCIONES_VALIDAS) {
    if (body[sec] && VALORES_VALIDOS.includes(body[sec])) update[sec] = body[sec];
  }
  const db = adminDb();
  await db.collection("config").doc("fondos").set(update, { merge: true });
  return NextResponse.json({ ok: true });
}
