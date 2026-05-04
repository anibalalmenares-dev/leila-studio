import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = adminDb();
  const doc = await db.collection("config").doc("admin").get();
  if (!doc.exists) {
    return NextResponse.json({
      nombre: "Administrador",
      whatsapp: process.env.ADMIN_WHATSAPP?.replace("whatsapp:", "") || "",
      primer_ingreso: true,
    });
  }
  const data = doc.data()!;
  return NextResponse.json({
    nombre: data.nombre || "Administrador",
    whatsapp: data.whatsapp || "",
    primer_ingreso: data.primer_ingreso ?? false,
  });
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const db = adminDb();
  const ref = db.collection("config").doc("admin");

  const update: Record<string, unknown> = {};
  if (body.nombre !== undefined) update.nombre = body.nombre;
  if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp;
  if (body.password !== undefined) update.password = body.password;
  if (body.pin !== undefined) update.pin = body.pin;
  if (body.primer_ingreso !== undefined) update.primer_ingreso = body.primer_ingreso;

  await ref.set(update, { merge: true });
  return NextResponse.json({ ok: true });
}
