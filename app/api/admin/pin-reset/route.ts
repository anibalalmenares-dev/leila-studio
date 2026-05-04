import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { notificarCambioClave } from "@/lib/whatsapp";
import { checkRateLimit, registrarFallo, resetRateLimit, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  const limite = await checkRateLimit(ip);
  if (limite.bloqueado) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta en ${limite.minutosRestantes} minuto(s).` },
      { status: 429 }
    );
  }

  const { pin, nueva_clave } = await req.json();
  const db = adminDb();
  const doc = await db.collection("config").doc("admin").get();

  if (!doc.exists || !doc.data()?.pin) {
    return NextResponse.json({ error: "No hay PIN configurado. Contacta al administrador del sistema." }, { status: 400 });
  }

  if (String(doc.data()?.pin) !== String(pin)) {
    await registrarFallo(ip);
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  await resetRateLimit(ip);

  if (nueva_clave) {
    await db.collection("config").doc("admin").update({ password: nueva_clave });
    const whatsapp = doc.data()?.whatsapp;
    if (whatsapp) await notificarCambioClave({ whatsapp });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, pin_valido: true });
}
