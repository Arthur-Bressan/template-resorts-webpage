import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem da solicitação inválida." }, { status: 403 });
  }
  const limit = rateLimit(`newsletter:${getClientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato de solicitação inválido." }, { status: 415 });
  }
  let body: unknown;
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "Solicitação muito grande." }, { status: 413 });
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: "Solicitação muito grande." }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (data.consent !== true) {
    return NextResponse.json({ error: "Autorize o uso do e-mail para receber novidades." }, { status: 400 });
  }
  try {
    await db.newsletterSubscriber.upsert({ where: { email }, create: { email, consent: true }, update: { consent: true } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    console.error("[newsletter] Não foi possível persistir a inscrição.");
    return NextResponse.json({ error: "Não foi possível registrar sua inscrição. Tente novamente mais tarde." }, { status: 503 });
  }
}
