import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { slotAMinutos } from "@/lib/horarios";

const TARDE_INICIO = 14 * 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const hora = searchParams.get("hora");
  const duracion = parseInt(searchParams.get("duracion") || "60");
  const categoria = searchParams.get("categoria") || "";

  if (!fecha || !hora) return NextResponse.json({ trabajadores: [] });

  const db = adminDb();
  const snapAll = await db.collection("trabajadores").get();
  const snapDocs = snapAll.docs
    .filter(d => d.data().activo === true)
    .sort((a, b) => ((a.data().orden as number) ?? 0) - ((b.data().orden as number) ?? 0));
  if (snapDocs.length === 0) return NextResponse.json({ trabajadores: [] });

  const inicioMin = slotAMinutos(hora);
  const finMin = inicioMin + duracion;
  const esMañana = inicioMin < TARDE_INICIO;

  const reservasSnap = await db.collection("reservas")
    .where("fecha", "==", fecha)
    .where("estado", "in", ["pendiente", "confirmada"])
    .get();

  const disponibles: { id: string; nombre: string; especialidad: string }[] = [];

  for (const tDoc of snapDocs) {
    const t = tDoc.data();

    // Filtrar por área: si el trabajador tiene áreas definidas y no incluye esta categoría, saltar
    const areas: string[] = t.areas || [];
    if (categoria && areas.length > 0 && !areas.includes(categoria)) continue;

    // Verificar bloqueo del trabajador
    const bloqueoDoc = await db.collection("trabajadores").doc(tDoc.id)
      .collection("bloqueos").doc(fecha).get();
    const bloqueo = bloqueoDoc.exists ? bloqueoDoc.data() : null;
    if (bloqueo?.tipo === "todo") continue;
    if (bloqueo?.tipo === "manana" && esMañana) continue;
    if (bloqueo?.tipo === "tarde" && !esMañana) continue;

    // Verificar que no tenga reserva que se cruce
    const tieneConflicto = reservasSnap.docs.some(r => {
      const wid = r.data().trabajador_id;
      if (wid && wid !== tDoc.id) return false; // reserva de otro trabajador
      const rInicio = slotAMinutos(r.data().hora);
      const rFin = rInicio + (r.data().duracion_min || 60);
      return inicioMin < rFin && finMin > rInicio;
    });

    if (!tieneConflicto) {
      disponibles.push({ id: tDoc.id, nombre: t.nombre, especialidad: t.especialidad || "" });
    }
  }

  return NextResponse.json({ trabajadores: disponibles });
}
