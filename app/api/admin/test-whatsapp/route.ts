import { NextRequest, NextResponse } from "next/server";
import { rootGuard } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  if (!await rootGuard(req)) return NextResponse.json({ error: "Solo SuperAdmin" }, { status: 403 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.ADMIN_WHATSAPP;

  const vars = {
    TWILIO_ACCOUNT_SID: accountSid ? `${accountSid.slice(0, 6)}...` : "❌ NO CONFIGURADO",
    TWILIO_AUTH_TOKEN: authToken ? `${authToken.slice(0, 6)}...` : "❌ NO CONFIGURADO",
    TWILIO_WHATSAPP_FROM: from || "❌ NO CONFIGURADO",
    ADMIN_WHATSAPP: to || "❌ NO CONFIGURADO",
  };

  if (!accountSid || !authToken || !from || !to) {
    return NextResponse.json({ ok: false, error: "Faltan variables", vars });
  }

  const fromFinal = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const toFinal = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: fromFinal, To: toFinal, Body: "🔧 Prueba de diagnóstico — Leila Studio ✅" }),
  });

  const respText = await res.text();
  let respJson: unknown;
  try { respJson = JSON.parse(respText); } catch { respJson = respText; }

  return NextResponse.json({ ok: res.ok, status: res.status, from: fromFinal, to: toFinal, vars, twilio: respJson });
}
