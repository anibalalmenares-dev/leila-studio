import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard, rootGuard } from "@/lib/rbac";

const DEFAULT = { activo: true, tipo: "fijo", monto: 10000, porcentaje: 30, restricciones: { activoEditable: true, tipoEditable: true, montoEditable: true } };

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const doc = await db.collection("config").doc("anticipo").get();
  if (!doc.exists) return NextResponse.json(DEFAULT);
  const d = doc.data()!;
  return NextResponse.json({
    activo: d.activo !== false,
    tipo: d.tipo || "fijo",
    monto: Number(d.monto ?? 10000),
    porcentaje: Number(d.porcentaje ?? 30),
    restricciones: { ...DEFAULT.restricciones, ...(d.restricciones || {}) },
  });
}

export async function POST(req: NextRequest) {
  const esRoot = await rootGuard(req);
  const esAdmin = !esRoot && await rbacGuard(req);
  if (!esRoot && !esAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const db = adminDb();
  const doc = await db.collection("config").doc("anticipo").get();
  const actual = doc.exists ? doc.data()! : DEFAULT;
  const restricciones = { ...DEFAULT.restricciones, ...(actual.restricciones || {}) };

  const update: Record<string, unknown> = {};

  if (esRoot) {
    if (body.activo !== undefined) update.activo = Boolean(body.activo);
    if (body.tipo) update.tipo = body.tipo;
    if (body.monto !== undefined) update.monto = Number(body.monto) || 0;
    if (body.porcentaje !== undefined) update.porcentaje = Math.min(100, Math.max(0, Number(body.porcentaje) || 0));
    if (body.restricciones) update.restricciones = { ...restricciones, ...body.restricciones };
  } else {
    if (restricciones.activoEditable && body.activo !== undefined) update.activo = Boolean(body.activo);
    if (restricciones.tipoEditable && body.tipo) update.tipo = body.tipo;
    if (restricciones.montoEditable && body.monto !== undefined) update.monto = Number(body.monto) || 0;
    if (restricciones.montoEditable && body.porcentaje !== undefined) update.porcentaje = Math.min(100, Math.max(0, Number(body.porcentaje) || 0));
  }

  await db.collection("config").doc("anticipo").set(update, { merge: true });
  return NextResponse.json({ ok: true });
}
