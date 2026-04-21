import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { clave } = await req.json();
  const correcta = process.env.ADMIN_PASSWORD || "leila2024";
  if (clave === correcta) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
}
