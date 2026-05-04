import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const doc = await db.collection("config").doc("metodos_pago").get();
  return NextResponse.json({ metodos: doc.exists ? (doc.data()?.metodos || []) : metodosPorDefecto() });
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { metodos } = await req.json();
  if (!Array.isArray(metodos)) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const validos = metodos.every((m: unknown) =>
    m && typeof m === "object" &&
    typeof (m as Record<string, unknown>).id === "string" && String((m as Record<string, unknown>).id).trim() &&
    typeof (m as Record<string, unknown>).nombre === "string" && String((m as Record<string, unknown>).nombre).trim() &&
    typeof (m as Record<string, unknown>).numero === "string" && String((m as Record<string, unknown>).numero).trim()
  );
  if (!validos) return NextResponse.json({ error: "Cada método debe tener id, nombre y numero" }, { status: 400 });

  const metodosLimpios = (metodos as Record<string, string>[]).map(m => ({
    id: String(m.id).slice(0, 50),
    nombre: String(m.nombre).slice(0, 100),
    numero: String(m.numero).slice(0, 60),
  }));

  const db = adminDb();
  await db.collection("config").doc("metodos_pago").set({ metodos: metodosLimpios });
  return NextResponse.json({ ok: true });
}

function metodosPorDefecto() {
  return [
    { id: "1", nombre: "Nequi", numero: "3234661252" },
    { id: "2", nombre: "Bancolombia", numero: "65629075474" },
  ];
}
