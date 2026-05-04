import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard, rootGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const doc = await db.collection("config").doc("permisos_admin").get();
  return NextResponse.json(doc.exists ? doc.data() : {});
}

export async function POST(req: NextRequest) {
  if (!await rootGuard(req)) return NextResponse.json({ error: "Solo SuperAdmin" }, { status: 403 });
  const body = await req.json();
  const db = adminDb();
  await db.collection("config").doc("permisos_admin").set(body);
  return NextResponse.json({ ok: true });
}
