import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSlotsDisponibles, slotAMinutos, HORARIO_DEFAULT, HorarioConfig } from "@/lib/horarios";

function horaActualBogota(): number {
  const now = new Date();
  const bogota = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  return bogota.getHours() * 60 + bogota.getMinutes();
}

function fechaHoyBogota(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

async function cargarConfig(db: ReturnType<typeof adminDb>): Promise<HorarioConfig> {
  try {
    const doc = await db.collection("config").doc("horarios").get();
    if (!doc.exists) return HORARIO_DEFAULT;
    const d = doc.data()!;
    const perfiles: { id: string; turnos: { inicio: string; fin: string }[] }[] = d.perfiles || [];
    const perfil = perfiles.find(p => p.id === (d.perfilActivo || "estandar"));
    if (perfil?.turnos?.length) return { turnos: perfil.turnos };
  } catch { /* usa default */ }
  return HORARIO_DEFAULT;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const duracion = parseInt(searchParams.get("duracion") || "60");
  const categoria = searchParams.get("categoria") || "";

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ horas: [] });

  const [y, m, d] = fecha.split("-").map(Number);
  const fechaObj = new Date(y, m - 1, d);
  if (isNaN(fechaObj.getTime())) return NextResponse.json({ horas: [] });
  if (fechaObj.getDay() === 0) return NextResponse.json({ horas: [] });

  const esHoy = fecha === fechaHoyBogota();
  const db = adminDb();

  const [reservasSnap, bloqueoDoc, trabajadoresSnap, config] = await Promise.all([
    db.collection("reservas").where("fecha", "==", fecha).where("estado", "in", ["pendiente", "confirmada"]).get(),
    db.collection("dias_bloqueados").doc(fecha).get(),
    db.collection("trabajadores").where("activo", "==", true).get(),
    cargarConfig(db),
  ]);

  // Último inicio posible (para filtrar slots pasados hoy)
  const lastTurno = config.turnos[config.turnos.length - 1];
  const ULTIMO_INICIO = slotAMinutos(lastTurno.fin) - 30;

  // Punto de división mañana/tarde para bloqueos parciales
  const TARDE_INICIO = config.turnos.length > 1
    ? slotAMinutos(config.turnos[1].inicio)
    : 14 * 60;

  function filtrarPasados(horas: string[]): string[] {
    if (!esHoy) return horas;
    const ahora = horaActualBogota();
    if (ahora >= ULTIMO_INICIO) return [];
    return horas.filter(h => slotAMinutos(h) > ahora);
  }

  const bloqueo = bloqueoDoc.exists ? bloqueoDoc.data() : null;
  if (bloqueo?.tipo === "todo") return NextResponse.json({ horas: [] });

  function aplicarBloqueo(horas: string[]): string[] {
    if (bloqueo?.tipo === "manana") return horas.filter(h => slotAMinutos(h) >= TARDE_INICIO);
    if (bloqueo?.tipo === "tarde") return horas.filter(h => slotAMinutos(h) < TARDE_INICIO);
    return horas;
  }

  if (trabajadoresSnap.empty) {
    const reservas = reservasSnap.docs.map(doc => ({ hora: doc.data().hora, duracion_min: doc.data().duracion_min }));
    return NextResponse.json({ horas: filtrarPasados(aplicarBloqueo(getSlotsDisponibles(reservas, duracion, config))) });
  }

  const trabajadoresCategoria = trabajadoresSnap.docs.filter(t => {
    const areas: string[] = t.data().areas || [];
    return !categoria || areas.length === 0 || areas.includes(categoria);
  });

  if (trabajadoresCategoria.length === 0) {
    const reservas = reservasSnap.docs.map(doc => ({ hora: doc.data().hora, duracion_min: doc.data().duracion_min }));
    return NextResponse.json({ horas: filtrarPasados(aplicarBloqueo(getSlotsDisponibles(reservas, duracion, config))) });
  }

  const reservasSinWorker = reservasSnap.docs
    .filter(doc => !doc.data().trabajador_id)
    .map(doc => ({ hora: doc.data().hora, duracion_min: doc.data().duracion_min }));

  const slotsSet = new Set<string>();

  for (const tDoc of trabajadoresCategoria) {
    const tBloqueoDoc = await db.collection("trabajadores").doc(tDoc.id).collection("bloqueos").doc(fecha).get();
    const tBloqueo = tBloqueoDoc.exists ? tBloqueoDoc.data() : null;
    if (tBloqueo?.tipo === "todo") continue;

    const reservasWorker = reservasSnap.docs
      .filter(doc => doc.data().trabajador_id === tDoc.id)
      .map(doc => ({ hora: doc.data().hora, duracion_min: doc.data().duracion_min }));

    let horas = getSlotsDisponibles([...reservasSinWorker, ...reservasWorker], duracion, config);

    if (tBloqueo?.tipo === "manana") horas = horas.filter(h => slotAMinutos(h) >= TARDE_INICIO);
    if (tBloqueo?.tipo === "tarde") horas = horas.filter(h => slotAMinutos(h) < TARDE_INICIO);

    horas.forEach(h => slotsSet.add(h));
  }

  return NextResponse.json({ horas: filtrarPasados(aplicarBloqueo(Array.from(slotsSet).sort())) });
}
