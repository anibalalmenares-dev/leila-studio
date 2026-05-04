import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nombre, telefono, cantidad } = await req.json();

  if (!nombre || !telefono || !cantidad || cantidad < 1) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const db = adminDb();
  const rifaRef = db.collection("rifas").doc(id);
  const rifaDoc = await rifaRef.get();

  if (!rifaDoc.exists) return NextResponse.json({ error: "Rifa no encontrada" }, { status: 404 });

  const rifa = rifaDoc.data()!;
  if (rifa.estado !== "activa") return NextResponse.json({ error: "La rifa no está activa" }, { status: 400 });

  const telLimpio = telefono.replace(/\D/g, "");

  // Traer todos los tickets y filtrar en memoria (evita índices compuestos con !=)
  const todosSnap = await rifaRef.collection("tickets").get();
  const activos = todosSnap.docs.filter(d => d.data().estado !== "cancelado");

  // Validar máximo de tickets disponibles
  if (rifa.max_tickets > 0) {
    const totalVendidos = activos.reduce((sum, d) => sum + (d.data().cantidad ?? 1), 0);
    if (totalVendidos + cantidad > rifa.max_tickets) {
      return NextResponse.json({ error: "No hay suficientes tickets disponibles" }, { status: 400 });
    }
  }

  // Validar máximo por persona
  if (rifa.max_por_persona > 0) {
    const yaCompro = activos
      .filter(d => d.data().telefono === telLimpio)
      .reduce((sum, d) => sum + (d.data().cantidad ?? 1), 0);
    if (yaCompro + cantidad > rifa.max_por_persona) {
      return NextResponse.json({ error: `Solo puedes comprar hasta ${rifa.max_por_persona} ticket(s)` }, { status: 400 });
    }
  }

  // Generar números RF únicos aleatorios
  const maxNum = rifa.max_tickets > 0 ? rifa.max_tickets : 999;
  const digits = maxNum >= 100 ? 3 : 2;

  // Recopilar números ya asignados
  const numerosUsados = new Set<number>();
  activos.forEach(d => {
    const nums: string[] = d.data().numeros || [];
    nums.forEach(n => {
      const parsed = parseInt(n.replace("RF", ""), 10);
      if (!isNaN(parsed)) numerosUsados.add(parsed);
    });
  });

  // Asignar números únicos aleatorios
  const numerosAsignados: string[] = [];
  let intentos = 0;
  while (numerosAsignados.length < Number(cantidad) && intentos < 10000) {
    intentos++;
    const n = Math.floor(Math.random() * maxNum) + 1;
    if (!numerosUsados.has(n)) {
      numerosUsados.add(n);
      numerosAsignados.push(`RF${String(n).padStart(digits, "0")}`);
    }
  }

  const esGratis = rifa.tipo === "gratis";
  const total = esGratis ? 0 : (rifa.precio_ticket ?? 0) * cantidad;

  const ticketRef = rifaRef.collection("tickets").doc();
  await ticketRef.set({
    nombre: String(nombre),
    telefono: telLimpio,
    cantidad: Number(cantidad),
    total,
    numeros: numerosAsignados,
    estado: esGratis ? "confirmado" : "pendiente_pago",
    creado_en: FieldValue.serverTimestamp(),
    ...(esGratis ? { confirmado_en: FieldValue.serverTimestamp() } : {}),
  });

  return NextResponse.json({
    ok: true,
    ticket_id: ticketRef.id,
    estado: esGratis ? "confirmado" : "pendiente_pago",
    total,
    tipo: rifa.tipo,
    rifa_nombre: rifa.nombre,
    precio_ticket: rifa.precio_ticket ?? 0,
    numeros: numerosAsignados,
  });
}
