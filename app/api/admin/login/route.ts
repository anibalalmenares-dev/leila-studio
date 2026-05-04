import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { crearSesion, crearSesionRoot } from "@/lib/rbac";
import { checkRateLimit, registrarFallo, resetRateLimit, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  const limite = await checkRateLimit(ip);
  if (limite.bloqueado) {
    return NextResponse.json(
      { error: `Demasiados intentos fallidos. Intenta en ${limite.minutosRestantes} minuto(s).` },
      { status: 429 }
    );
  }

  const { clave, usuario } = await req.json();
  const db = adminDb();

  // Verificar credenciales root
  const rootDoc = await db.collection("config").doc("root").get();
  const rootUser = rootDoc.exists ? (rootDoc.data()?.username || "root") : "root";
  const rootPass = rootDoc.exists ? (rootDoc.data()?.password || "root") : "root";
  if (usuario === rootUser && clave === rootPass) {
    await resetRateLimit(ip);
    const token = await crearSesionRoot();
    return NextResponse.json({ ok: true, token, rol: "root" });
  }

  const configDoc = await db.collection("config").doc("admin").get();

  let correcta: string;
  let primerIngreso = false;

  if (configDoc.exists) {
    correcta = configDoc.data()?.password || "";
    primerIngreso = configDoc.data()?.primer_ingreso === true;
  } else {
    correcta = process.env.ADMIN_PASSWORD || "leila2024";
    primerIngreso = true;
  }

  if (clave !== correcta) {
    const fallo = await registrarFallo(ip);
    const msg = fallo.bloqueado
      ? "Cuenta bloqueada por 15 minutos por demasiados intentos fallidos."
      : `Contraseña incorrecta. ${fallo.intentosRestantes} intento(s) restante(s).`;
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  await resetRateLimit(ip);
  const token = await crearSesion();
  return NextResponse.json({ ok: true, token, rol: "admin", primer_ingreso: primerIngreso });
}
