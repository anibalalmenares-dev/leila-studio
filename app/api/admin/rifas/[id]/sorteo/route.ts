import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { numero_ganador } = await req.json().catch(() => ({}));

  const db = adminDb();
  const rifaRef = db.collection("rifas").doc(id);
  const rifaDoc = await rifaRef.get();

  if (!rifaDoc.exists) return NextResponse.json({ error: "Rifa no encontrada" }, { status: 404 });
  if (rifaDoc.data()!.estado !== "activa") {
    return NextResponse.json({ error: "La rifa no está activa" }, { status: 400 });
  }

  const ticketsSnap = await rifaRef.collection("tickets")
    .where("estado", "==", "confirmado")
    .get();

  if (ticketsSnap.empty) {
    return NextResponse.json({ error: "No hay tickets confirmados para sortear" }, { status: 400 });
  }

  // Expandir por números RF asignados
  const boletos: { ticket_id: string; rf: string; nombre: string; telefono: string }[] = [];
  ticketsSnap.docs.forEach(doc => {
    const d = doc.data();
    const nums: string[] = d.numeros || [];
    if (nums.length > 0) {
      nums.forEach(rf => boletos.push({ ticket_id: doc.id, rf, nombre: d.nombre, telefono: d.telefono }));
    } else {
      // Compatibilidad con tickets anteriores sin numeros
      for (let j = 0; j < Number(d.cantidad ?? 1); j++) {
        boletos.push({ ticket_id: doc.id, rf: `#${j + 1}`, nombre: d.nombre, telefono: d.telefono });
      }
    }
  });

  let ganador: typeof boletos[0];

  if (numero_ganador !== undefined) {
    // Sorteo manual: aceptar "RF247" o "247"
    const entrada = String(numero_ganador).trim().toUpperCase();
    const rfBuscado = entrada.startsWith("RF") ? entrada : `RF${entrada.padStart(3, "0")}`;
    const match = boletos.find(b => b.rf === rfBuscado || b.rf === `RF${entrada.padStart(2, "0")}`);
    if (!match) return NextResponse.json({ error: `Ticket ${rfBuscado} no encontrado entre los confirmados` }, { status: 400 });
    ganador = match;
  } else {
    // Sorteo automático aleatorio
    ganador = boletos[Math.floor(Math.random() * boletos.length)];
  }

  await rifaRef.update({
    estado: "sorteada",
    ganador_ticket: ganador.rf,
    ganador_nombre: ganador.nombre,
    ganador_telefono: ganador.telefono,
    sorteada_en: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    ganador: {
      numero: ganador.rf,
      nombre: ganador.nombre,
      telefono: ganador.telefono,
    },
  });
}
