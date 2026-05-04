import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

const DEFAULTS = { unaAdicional: 2500, descuentoCumpleanos: 25 };

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const doc = await db.collection("config").doc("extras").get();
  if (!doc.exists) return NextResponse.json(DEFAULTS);
  const d = doc.data()!;
  return NextResponse.json({
    unaAdicional: Number(d.unaAdicional ?? 2500),
    descuentoCumpleanos: Number(d.descuentoCumpleanos ?? 25),
  });
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const db = adminDb();
  const update: Record<string, number> = {};
  if (body.unaAdicional !== undefined) update.unaAdicional = Math.max(0, Number(body.unaAdicional) || 0);
  if (body.descuentoCumpleanos !== undefined) update.descuentoCumpleanos = Math.min(100, Math.max(0, Number(body.descuentoCumpleanos) || 0));
  await db.collection("config").doc("extras").set(update, { merge: true });
  return NextResponse.json({ ok: true });
}
