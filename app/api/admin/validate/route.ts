import { NextRequest, NextResponse } from "next/server";
import { rbacGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const ok = await rbacGuard(req);
  if (!ok) return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
