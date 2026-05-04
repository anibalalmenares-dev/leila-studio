import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";
import { SERVICIOS_SEED } from "@/lib/servicios";
import { FieldValue } from "firebase-admin/firestore";

// Mapa de categorías viejas → nuevas para migración automática
const MIGRACION: Record<string, string> = {
  individual: "",       // ambiguo: se resuelve por ID del documento
  semi:       "",
  gel:        "manicura",
  extension:  "manicura",
  press:      "manicura",
  combo:      "combos",
};

// Servicios que en la categoría vieja "individual" o "semi" son pedicura
const IDS_PEDICURA = new Set(["ped-trad", "ped-semi"]);

function migraCat(id: string, cat: string): string {
  if (!MIGRACION[cat] && cat in MIGRACION) {
    return IDS_PEDICURA.has(id) ? "pedicura" : "manicura";
  }
  return MIGRACION[cat] ?? cat;
}

export async function GET() {
  const db = adminDb();
  const snap = await db.collection("servicios").orderBy("orden").get();

  if (snap.empty) {
    const batch = db.batch();
    SERVICIOS_SEED.forEach((s, i) => {
      const ref = db.collection("servicios").doc(s.id);
      batch.set(ref, {
        nombre: s.nombre,
        categoria: s.categoria,
        precio: s.precio,
        duracion_min: s.duracionMin,
        orden: i,
        creado_en: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    return NextResponse.json(SERVICIOS_SEED);
  }

  // Migrar documentos con categorías viejas
  const necesitaMigrar = snap.docs.filter((d) => d.data().categoria in MIGRACION);
  if (necesitaMigrar.length > 0) {
    const batch = db.batch();
    necesitaMigrar.forEach((d) => {
      const nuevaCat = migraCat(d.id, d.data().categoria);
      batch.update(d.ref, { categoria: nuevaCat });
    });
    await batch.commit();
  }

  return NextResponse.json(
    snap.docs.map((d) => {
      const data = d.data();
      const categoria = data.categoria in MIGRACION
        ? migraCat(d.id, data.categoria)
        : data.categoria;
      return {
        id: d.id,
        nombre: data.nombre,
        categoria,
        precio: data.precio,
        duracionMin: data.duracion_min,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, categoria, precio, duracion_min } = await req.json();
  if (!nombre || !categoria || !precio || !duracion_min) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const db = adminDb();
  const snap = await db.collection("servicios").orderBy("orden", "desc").limit(1).get();
  const orden = snap.empty ? 0 : (snap.docs[0].data().orden ?? 0) + 1;

  const ref = await db.collection("servicios").add({
    nombre,
    categoria,
    precio: Number(precio),
    duracion_min: Number(duracion_min),
    orden,
    creado_en: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
}
