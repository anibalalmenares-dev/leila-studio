import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
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
  const doc = await db.collection("config").doc("root").get();

  if (!doc.exists || !doc.data()?.pin_reset) {
    return NextResponse.json({ error: "No hay PIN configurado para root." }, { status: 400 });
  }

  if (String(doc.data()?.pin_reset) !== String(pin)) {
    await registrarFallo(ip);
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  await resetRateLimit(ip);

  if (nueva_clave) {
    if (nueva_clave.length < 4) {
      return NextResponse.json({ error: "La clave debe tener al menos 4 caracteres" }, { status: 400 });
    }
    await db.collection("config").doc("root").set({ password: nueva_clave }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, pin_valido: true });
}
