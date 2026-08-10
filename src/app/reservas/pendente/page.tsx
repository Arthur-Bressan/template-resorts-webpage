"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Clock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

function PendenteContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId") || searchParams.get("external_reference");

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text)] font-medium mb-3">
          Pagamento Pendente
        </h1>

        <p className="text-[var(--color-text-muted)] text-lg mb-8">
          Aguardando a confirmação do pagamento.
          <br />
          Você receberá um e-mail assim que o pagamento for processado.
        </p>

        {reservationId && (
          <div className="bg-[var(--color-surface)]/50 rounded-xl p-4 mb-8 border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">
              Número da Reserva
            </p>
            <p className="font-mono text-sm font-medium text-[var(--color-text)]">
              {reservationId}
            </p>
          </div>
        )}

        <Button
          asChild
          className="h-12 px-8 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold"
        >
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PendentePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
        </div>
      }
    >
      <PendenteContent />
    </Suspense>
  );
}
