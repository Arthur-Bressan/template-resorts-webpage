"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, CircleAlert, Loader2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "confirmed" | "pending" | "cancelled" | "expired" | "review";
const copy: Record<Status, { title: string; text: string }> = {
  confirmed: { title: "Reserva confirmada", text: "O pagamento foi aprovado e a reserva está confirmada no nosso sistema. Guarde o número da reserva para falar com a pousada." },
  pending: { title: "Aguardando confirmação", text: "O sistema ainda não confirmou esta reserva. Aguarde a atualização do pagamento antes de iniciar uma nova tentativa." },
  cancelled: { title: "Reserva não confirmada", text: "Esta reserva está cancelada no sistema. Em caso de cobrança, fale com a pousada antes de realizar outro pagamento." },
  expired: { title: "Prazo do checkout encerrado", text: "O prazo para iniciar o pagamento terminou. Consulte novamente a disponibilidade antes de reservar. Se já pagou, entre em contato para verificar o processamento." },
  review: { title: "Pagamento em verificação", text: "Precisamos verificar este pagamento e a disponibilidade com a pousada. A reserva ainda não está confirmada. Entre em contato e evite um novo pagamento." },
};

export default function StatusClient({ phone, email }: { phone: string; email: string }) {
  const params = useSearchParams();
  const reservationId = params.get("reservationId") || params.get("external_reference") || "";
  const token = params.get("token") || "";
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async (signal: AbortSignal) => {
    if (!reservationId || !token) {
      setError("Este link não permite consultar a reserva com segurança. Use o link recebido ao abrir o pagamento ou entre em contato com a pousada.");
      return false;
    }
    setLoading(true);
    try {
      const query = new URLSearchParams({ reservationId, token });
      const response = await fetch(`/api/reservations/status?${query}`, { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar a reserva.");
      if (!Object.hasOwn(copy, data.status)) throw new Error("Não foi possível verificar o status. Entre em contato com a pousada.");
      setStatus(data.status);
      setError("");
      return data.status === "pending";
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : "Falha de conexão. Tente atualizar novamente.");
      return false;
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [reservationId, token]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus(null);
    setError("");
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      const pending = await load(controller.signal);
      if (pending && !controller.signal.aborted && ++attempts < 12) timer = setTimeout(poll, 5_000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [load, refresh]);

  const message = status ? copy[status] : { title: "Consultar reserva", text: "A confirmação depende do status registrado no sistema de reservas." };
  const Icon = status === "confirmed" ? CheckCircle2 : status === "pending" ? Clock : CircleAlert;
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <Icon aria-hidden="true" className="w-14 h-14 mx-auto mb-6 text-[var(--color-primary)]" />
        <div role="status" aria-live="polite" aria-atomic="true">
          <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text)] mb-4">{message.title}</h1>
          <p className="text-[var(--color-text-muted)] mb-6">{message.text}</p>
        </div>
        {status && reservationId && /^[a-zA-Z0-9_-]{1,100}$/.test(reservationId) && (
          <p className="text-sm mb-6 break-all">Número da reserva: <span className="font-mono">{reservationId}</span></p>
        )}
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-4 mb-6">{error}</p>}
        <div className="space-y-3">
          <Button className="w-full" disabled={loading || !reservationId || !token} onClick={() => setRefresh((value) => value + 1)}>
            {loading && <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "Consultando…" : "Atualizar status"}
          </Button>
          {status !== "confirmed" && <Button asChild variant="outline" className="w-full"><Link href="/reservas">Consultar novas datas</Link></Button>}
          {phone && <Button asChild variant="outline" className="w-full"><a href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone aria-hidden="true" className="w-4 h-4 mr-2" />{phone}</a></Button>}
          {email && <Button asChild variant="outline" className="w-full"><a href={`mailto:${email}?subject=${encodeURIComponent(`Consulta da reserva ${reservationId}`)}`}><Mail aria-hidden="true" className="w-4 h-4 mr-2" />Falar com a pousada por e-mail</a></Button>}
          <Link href="/" className="block underline text-sm py-3">Voltar ao início</Link>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-6">O retorno do pagamento pode levar alguns instantes para ser atualizado.</p>
      </div>
    </main>
  );
}
