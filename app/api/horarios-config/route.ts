import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { HORARIO_DEFAULT } from "@/lib/horarios";

const PERFIL_DEFAULT = {
  id: "estandar",
  nombre: "Estándar",
  emoji: "📅",
  color: "#10b981",
  esDefault: true,
  turnos: HORARIO_DEFAULT.turnos,
};

export async function GET() {
  const db = adminDb();
  const doc = await db.collection("config").doc("horarios").get();
  if (!doc.exists) return NextResponse.json(PERFIL_DEFAULT);
  const d = doc.data()!;
  const perfilActivo = d.perfilActivo || "estandar";
  const perfiles: typeof PERFIL_DEFAULT[] = d.perfiles || [PERFIL_DEFAULT];
  const perfil = perfiles.find(p => p.id === perfilActivo) || PERFIL_DEFAULT;
  return NextResponse.json(perfil);
}
