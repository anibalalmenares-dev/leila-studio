import { adminDb } from "./firebase-admin";

const MAX_INTENTOS = 4;
const BLOQUEO_MS = 15 * 60 * 1000;

export function getIP(req: Request): string {
  const xff = (req as { headers: { get: (k: string) => string | null } }).headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0] : "unknown").trim().replace(/[.:]/g, "_");
}

export async function checkRateLimit(ip: string): Promise<{ bloqueado: boolean; minutosRestantes?: number }> {
  const db = adminDb();
  const doc = await db.collection("ratelimit").doc(ip).get();
  if (!doc.exists) return { bloqueado: false };

  const data = doc.data()!;
  const bloqueadoHasta = data.bloqueado_hasta ? new Date(data.bloqueado_hasta) : null;
  if (bloqueadoHasta && bloqueadoHasta > new Date()) {
    const minutos = Math.ceil((bloqueadoHasta.getTime() - Date.now()) / 60000);
    return { bloqueado: true, minutosRestantes: minutos };
  }
  return { bloqueado: false };
}

export async function registrarFallo(ip: string): Promise<{ bloqueado: boolean; intentosRestantes: number }> {
  const db = adminDb();
  const ref = db.collection("ratelimit").doc(ip);
  const doc = await ref.get();

  const intentos = doc.exists ? (doc.data()?.intentos || 0) + 1 : 1;
  const bloqueado = intentos >= MAX_INTENTOS;

  await ref.set({
    intentos,
    bloqueado_hasta: bloqueado ? new Date(Date.now() + BLOQUEO_MS).toISOString() : null,
    ultimo_intento: new Date().toISOString(),
  });

  return { bloqueado, intentosRestantes: Math.max(0, MAX_INTENTOS - intentos) };
}

export async function resetRateLimit(ip: string): Promise<void> {
  const db = adminDb();
  await db.collection("ratelimit").doc(ip).delete();
}
