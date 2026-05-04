import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { rbacGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = adminDb();
  const [reservasSnap, clientesSnap, configSnap] = await Promise.all([
    db.collection("reservas").get(),
    db.collection("clientes").get(),
    db.collection("config").get(),
  ]);

  const backup = {
    version: "1.0",
    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" }),
    reservas: reservasSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    clientes: clientesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    config: Object.fromEntries(
      configSnap.docs
        .filter((d) => !["admin", "sessions", "ratelimit"].includes(d.id))
        .map((d) => [d.id, d.data()])
    ),
  };

  const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="leila-backup-${fecha}.json"`,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!await rbacGuard(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const backup = await req.json();
  const db = adminDb();

  type Batch = ReturnType<typeof db.batch>;
  const batches: Batch[] = [];
  let batch = db.batch();
  let count = 0;

  const addOp = (fn: (b: Batch) => void) => {
    fn(batch);
    count++;
    if (count >= 490) { batches.push(batch); batch = db.batch(); count = 0; }
  };

  for (const reserva of backup.reservas || []) {
    const { id, ...data } = reserva;
    addOp((b) => b.set(db.collection("reservas").doc(id), data));
  }
  for (const cliente of backup.clientes || []) {
    const { id, ...data } = cliente;
    addOp((b) => b.set(db.collection("clientes").doc(id), data));
  }
  for (const [id, data] of Object.entries(backup.config || {})) {
    addOp((b) => b.set(db.collection("config").doc(id), data as Record<string, unknown>));
  }

  batches.push(batch);
  for (const b of batches) { await b.commit(); }

  return NextResponse.json({
    ok: true,
    restaurados: {
      reservas: (backup.reservas || []).length,
      clientes: (backup.clientes || []).length,
    },
  });
}
