import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST() {
  const db = adminDb();
  const ahora = new Date().toISOString();

  const snap = await db
    .collection("reservas")
    .where("estado", "==", "pendiente")
    .where("expira_en", "<", ahora)
    .get();

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      estado: "cancelada",
      cancelada_en: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  return NextResponse.json({ canceladas: snap.size });
}

export async function GET() {
  return POST();
}
