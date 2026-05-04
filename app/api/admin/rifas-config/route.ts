import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const doc = await adminDb().collection("config").doc("rifas").get();
  return NextResponse.json(doc.exists ? doc.data() : {});
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { plantilla_confirmacion, plantilla_ganador } = await req.json();
  await adminDb().collection("config").doc("rifas").set(
    { plantilla_confirmacion: String(plantilla_confirmacion ?? ""), plantilla_ganador: String(plantilla_ganador ?? "") },
    { merge: true }
  );
  return NextResponse.json({ ok: true });
}
