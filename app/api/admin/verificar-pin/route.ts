import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { checkRateLimit, registrarFallo, resetRateLimit, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ip = getIP(req);
  const limite = await checkRateLimit(ip);
  if (limite.bloqueado) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta en ${limite.minutosRestantes} minuto(s).` },
      { status: 429 }
    );
  }

  const { pin } = await req.json();
  const doc = await adminDb().collection("config").doc("admin").get();

  if (!doc.exists || !doc.data()?.pin) {
    return NextResponse.json({ error: "PIN no configurado" }, { status: 400 });
  }

  if (String(doc.data()?.pin) !== String(pin)) {
    await registrarFallo(ip);
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  await resetRateLimit(ip);
  return NextResponse.json({ ok: true });
}
