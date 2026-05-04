import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function GET() {
  const db = adminDb();
  const doc = await db.collection("config").doc("tema").get();
  const temaId = doc.exists ? (doc.data()?.id || "default") : "default";
  return NextResponse.json({ id: temaId });
}

const TEMAS_VALIDOS = ["default", "lila-teal", "aqua-verde", "pastel-verano", "azul-marino", "tropical", "blush-sage", "esmeralda", "nautico", "indigo-persa", "oro-antiguo", "miel-sirocco", "festival-vallenato"];

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await req.json();
  if (!id || !TEMAS_VALIDOS.includes(String(id))) {
    return NextResponse.json({ error: "Tema inválido" }, { status: 400 });
  }
  const db = adminDb();
  await db.collection("config").doc("tema").set({ id: String(id) });
  return NextResponse.json({ ok: true });
}
