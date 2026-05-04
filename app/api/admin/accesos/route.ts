import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rootGuard } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  if (!await rootGuard(req)) return NextResponse.json({ error: "Solo el root puede hacer esto" }, { status: 403 });

  const { accion, nueva_clave, nuevo_pin } = await req.json();
  const db = adminDb();

  if (accion === "cambiar_root") {
    if (!nueva_clave || nueva_clave.length < 4)
      return NextResponse.json({ error: "La clave debe tener al menos 4 caracteres" }, { status: 400 });
    await db.collection("config").doc("root").set({ password: nueva_clave }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (accion === "resetear_admin") {
    if (!nueva_clave || nueva_clave.length < 6)
      return NextResponse.json({ error: "La clave debe tener al menos 6 caracteres" }, { status: 400 });
    await db.collection("config").doc("admin").set({ password: nueva_clave }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (accion === "resetear_pin") {
    if (!nuevo_pin || !/^\d{6}$/.test(nuevo_pin))
      return NextResponse.json({ error: "El PIN debe ser 6 dígitos" }, { status: 400 });
    await db.collection("config").doc("admin").set({ pin: nuevo_pin }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (accion === "resetear_pin_root") {
    if (!nuevo_pin || !/^\d{6}$/.test(nuevo_pin))
      return NextResponse.json({ error: "El PIN debe ser 6 dígitos" }, { status: 400 });
    await db.collection("config").doc("root").set({ pin_reset: nuevo_pin }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}
