import { NextRequest, NextResponse } from "next/server";

const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://leila-studio.vercel.app https://*.firebaseio.com https://*.googleapis.com https://*.firebase.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const PATRONES_MALICIOSOS = [
  /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i,
  /(union\s+select|drop\s+table|insert\s+into|delete\s+from)/i,
  /(<script|javascript:|vbscript:|data:text\/html)/i,
  /(\$\{|#\{|\{\{|%7B%7B)/i,
  /(eval\(|exec\(|system\(|passthru\()/i,
  /(%00|%0d%0a|%0a%0d|\r\n|\x00)/i,
];

const BOT_AGENTS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
  /havij/i, /acunetix/i, /nessus/i, /openvas/i, /burpsuite/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i, /medusa/i,
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl.toString();
  const ua = req.headers.get("user-agent") || "";

  if (BOT_AGENTS.some(r => r.test(ua))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const rawUrl = decodeURIComponent(url);
  if (PATRONES_MALICIOSOS.some(r => r.test(rawUrl))) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const allowed = ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"];
  if (!allowed.includes(req.method)) {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
