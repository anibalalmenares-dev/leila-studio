import { NextRequest, NextResponse } from "next/server";
import { invalidarSesion } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) await invalidarSesion(token);
  }
  return NextResponse.json({ ok: true });
}
