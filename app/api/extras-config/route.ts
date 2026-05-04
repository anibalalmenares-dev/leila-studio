import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const DEFAULTS = { unaAdicional: 2500, descuentoCumpleanos: 25 };

export async function GET() {
  const db = adminDb();
  const doc = await db.collection("config").doc("extras").get();
  if (!doc.exists) return NextResponse.json(DEFAULTS);
  const d = doc.data()!;
  return NextResponse.json({
    unaAdicional: Number(d.unaAdicional ?? 2500),
    descuentoCumpleanos: Number(d.descuentoCumpleanos ?? 25),
  });
}
