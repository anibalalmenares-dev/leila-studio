import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const db = adminDb();
  const doc = await db.collection("config").doc("metodos_pago").get();
  if (doc.exists && doc.data()?.metodos?.length) {
    return NextResponse.json({ metodos: doc.data()!.metodos });
  }
  return NextResponse.json({
    metodos: [
      { id: "1", nombre: "Nequi", numero: "3234661252" },
      { id: "2", nombre: "Bancolombia", numero: "65629075474" },
    ],
  });
}
