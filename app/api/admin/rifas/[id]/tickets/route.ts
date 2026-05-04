import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const snap = await adminDb()
    .collection("rifas").doc(id)
    .collection("tickets")
    .orderBy("creado_en", "asc")
    .get();

  const tickets = snap.docs.map((doc, i) => ({
    id: doc.id,
    numero: i + 1,
    ...doc.data(),
    creado_en: doc.data().creado_en?.toDate?.()?.toISOString() ?? null,
    confirmado_en: doc.data().confirmado_en?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json(tickets);
}
