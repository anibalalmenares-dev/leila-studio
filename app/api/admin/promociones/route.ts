import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

type PromoRecurrente = { id: string; dia: string; porcentaje: number };
type PromoPuntual = { id: string; fecha: string; porcentaje: number };

const DOC = "promociones";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const doc = await db.collection("config").doc(DOC).get();
  if (!doc.exists) return NextResponse.json({ recurrentes: [], puntuales: [] });
  return NextResponse.json(doc.data());
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { accion, tipo, id, dia, fecha, porcentaje } = body;

  const db = adminDb();
  const ref = db.collection("config").doc(DOC);
  const snap = await ref.get();
  const data = snap.exists ? snap.data()! : { recurrentes: [], puntuales: [] };
  const recurrentes: PromoRecurrente[] = data.recurrentes || [];
  const puntuales: PromoPuntual[] = data.puntuales || [];

  if (accion === "agregar") {
    const pct = Math.min(100, Math.max(1, Number(porcentaje) || 0));
    if (!pct) return NextResponse.json({ error: "Porcentaje inválido" }, { status: 400 });

    if (tipo === "recurrente") {
      const DIAS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
      if (!DIAS.includes(dia)) return NextResponse.json({ error: "Día inválido" }, { status: 400 });
      const nuevo: PromoRecurrente = { id: `${dia}-${Date.now()}`, dia, porcentaje: pct };
      const filtradas = recurrentes.filter(r => r.dia !== dia);
      await ref.set({ recurrentes: [...filtradas, nuevo], puntuales }, { merge: true });
    } else {
      if (!fecha) return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
      const nueva: PromoPuntual = { id: `${fecha}-${Date.now()}`, fecha, porcentaje: pct };
      const filtradas = puntuales.filter(p => p.fecha !== fecha);
      await ref.set({ recurrentes, puntuales: [...filtradas, nueva] }, { merge: true });
    }
    return NextResponse.json({ ok: true });
  }

  if (accion === "eliminar") {
    if (tipo === "recurrente") {
      await ref.set({ recurrentes: recurrentes.filter(r => r.id !== id), puntuales }, { merge: true });
    } else {
      await ref.set({ recurrentes, puntuales: puntuales.filter(p => p.id !== id) }, { merge: true });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
