import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snap = await adminDb().collection("rifas")
      .where("estado", "==", "activa")
      .limit(1)
      .get();

    if (snap.empty) return NextResponse.json(null);

    const doc = snap.docs[0];
    const data = doc.data();

    if (!data.mostrar_banner) return NextResponse.json(null);

    const ticketsSnap = await adminDb()
      .collection("rifas").doc(doc.id)
      .collection("tickets")
      .where("estado", "==", "confirmado")
      .get();

    return NextResponse.json({
      id: doc.id,
      nombre: data.nombre,
      premio: data.premio,
      fecha_sorteo: data.fecha_sorteo,
      tipo: data.tipo,
      precio_ticket: data.precio_ticket ?? 0,
      max_tickets: data.max_tickets ?? 0,
      max_por_persona: data.max_por_persona ?? 0,
      tickets_confirmados: ticketsSnap.size,
    });
  } catch {
    return NextResponse.json(null);
  }
}
