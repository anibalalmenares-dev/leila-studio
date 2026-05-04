import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const DEFAULT = { inicio: "gradiente", reservar: "gradiente", admin: "gradiente", login: "gradiente", confirmacion: "gradiente" };

export async function GET() {
  const db = adminDb();
  const doc = await db.collection("config").doc("fondos").get();
  if (!doc.exists) return NextResponse.json(DEFAULT);
  return NextResponse.json({ ...DEFAULT, ...doc.data() });
}
