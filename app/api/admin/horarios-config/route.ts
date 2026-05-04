import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rootGuard, rbacGuard } from "@/lib/rbac";
import { HORARIO_DEFAULT } from "@/lib/horarios";

const PERFIL_DEFAULT = {
  id: "estandar",
  nombre: "Estándar",
  emoji: "📅",
  color: "#10b981",
  esDefault: true,
  turnos: HORARIO_DEFAULT.turnos,
};

type Perfil = typeof PERFIL_DEFAULT;

async function getConfig(db: ReturnType<typeof adminDb>) {
  const doc = await db.collection("config").doc("horarios").get();
  if (!doc.exists) return { perfilActivo: "estandar", perfiles: [PERFIL_DEFAULT] };
  const d = doc.data()!;
  return {
    perfilActivo: d.perfilActivo || "estandar",
    perfiles: (d.perfiles?.length ? d.perfiles : [PERFIL_DEFAULT]) as Perfil[],
  };
}

export async function GET(req: NextRequest) {
  const esRoot = await rootGuard(req);
  const esAdmin = !esRoot && await rbacGuard(req);
  if (!esRoot && !esAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  return NextResponse.json(await getConfig(db));
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = adminDb();
  const body = await req.json();
  const config = await getConfig(db);

  if (body.accion === "activar") {
    const existe = config.perfiles.find(p => p.id === body.id);
    if (!existe) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    await db.collection("config").doc("horarios").set({ perfilActivo: body.id, perfiles: config.perfiles });
    return NextResponse.json({ ok: true });
  }

  if (body.accion === "crear") {
    const id = `perfil_${Date.now()}`;
    const nuevo: Perfil = { id, nombre: body.nombre, emoji: body.emoji, color: body.color, turnos: body.turnos, esDefault: false };
    await db.collection("config").doc("horarios").set({ perfilActivo: config.perfilActivo, perfiles: [...config.perfiles, nuevo] });
    return NextResponse.json({ ok: true, id });
  }

  if (body.accion === "editar") {
    const perfiles = config.perfiles.map(p =>
      p.id === body.id ? { ...p, nombre: body.nombre, emoji: body.emoji, color: body.color, turnos: body.turnos } : p
    );
    await db.collection("config").doc("horarios").set({ perfilActivo: config.perfilActivo, perfiles });
    return NextResponse.json({ ok: true });
  }

  if (body.accion === "eliminar") {
    const perfil = config.perfiles.find(p => p.id === body.id);
    if (perfil?.esDefault) return NextResponse.json({ error: "No se puede eliminar el perfil Estándar" }, { status: 400 });
    const perfiles = config.perfiles.filter(p => p.id !== body.id);
    const perfilActivo = config.perfilActivo === body.id ? "estandar" : config.perfilActivo;
    await db.collection("config").doc("horarios").set({ perfilActivo, perfiles });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
