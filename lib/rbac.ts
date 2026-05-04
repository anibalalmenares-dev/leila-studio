import { NextRequest } from "next/server";
import { adminDb } from "./firebase-admin";

async function checkSession(token: string, docId: string): Promise<boolean> {
  const db = adminDb();
  const doc = await db.collection("config").doc(docId).get();
  if (!doc.exists) return false;
  const tokens: Record<string, string> = doc.data()?.tokens || {};
  const expira = tokens[token];
  if (!expira) return false;
  return new Date(expira) >= new Date();
}

export async function rbacGuard(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  return (await checkSession(token, "sessions")) || (await checkSession(token, "root_sessions"));
}

export async function rootGuard(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  return await checkSession(token, "root_sessions");
}

async function crearSesionEnDoc(docId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expira_en = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const db = adminDb();
  await db.collection("config").doc(docId).set(
    { tokens: { [token]: expira_en } },
    { merge: true }
  );
  return token;
}

export async function crearSesion(): Promise<string> {
  return crearSesionEnDoc("sessions");
}

export async function crearSesionRoot(): Promise<string> {
  return crearSesionEnDoc("root_sessions");
}

export async function invalidarSesion(token: string): Promise<void> {
  const db = adminDb();
  for (const docId of ["sessions", "root_sessions"]) {
    const ref = db.collection("config").doc(docId);
    const doc = await ref.get();
    if (!doc.exists) continue;
    const tokens: Record<string, string> = doc.data()?.tokens || {};
    if (token in tokens) {
      delete tokens[token];
      await ref.set({ tokens });
      return;
    }
  }
}
