import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const snap = await adminDb().collection("rifas")
    .orderBy("creada_en", "desc")
    .get();

  const rifas = await Promise.all(snap.docs.map(async (doc) => {
    const data = doc.data();
    const ticketsSnap = await adminDb()
      .collection("rifas").doc(doc.id)
      .collection("tickets")
      .get();
    const confirmados = ticketsSnap.docs
      .filter(t => t.data().estado === "confirmado")
      .reduce((s, t) => s + (t.data().cantidad ?? 1), 0);
    const pendientes = ticketsSnap.docs
      .filter(t => t.data().estado === "pendiente_pago")
      .reduce((s, t) => s + (t.data().cantidad ?? 1), 0);
    return { id: doc.id, ...data, tickets_confirmados: confirmados, tickets_pendientes: pendientes };
  }));

  return NextResponse.json(rifas);
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, premio, servicio_id, servicio_nombre, fecha_sorteo, tipo, precio_ticket, max_tickets, max_por_persona, mostrar_banner } = body;

  if (!nombre || !premio || !servicio_id || !fecha_sorteo || !tipo) {
    return NextResponse.json({ error: "Faltan campos requeridos (nombre, premio, servicio y fecha son obligatorios)" }, { status: 400 });
  }

  // Solo puede haber una rifa activa a la vez
  const activaSnap = await adminDb().collection("rifas").where("estado", "==", "activa").get();
  if (!activaSnap.empty) {
    return NextResponse.json({ error: "Ya existe una rifa activa. Ciérrala antes de crear una nueva." }, { status: 400 });
  }

  const ref = await adminDb().collection("rifas").add({
    nombre: String(nombre),
    premio: String(premio),
    servicio_id: String(servicio_id),
    servicio_nombre: String(servicio_nombre || premio),
    fecha_sorteo: String(fecha_sorteo),
    tipo: tipo === "pago" ? "pago" : "gratis",
    precio_ticket: tipo === "pago" ? Number(precio_ticket ?? 0) : 0,
    max_tickets: Number(max_tickets ?? 0),
    max_por_persona: Number(max_por_persona ?? 0),
    mostrar_banner: mostrar_banner !== false,
    estado: "activa",
    creada_en: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
