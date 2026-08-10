"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

function SucessoContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId") || searchParams.get("external_reference");

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Top bar */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text)] font-medium mb-3">
            Reserva Confirmada!
          </h1>

          <p className="text-[var(--color-text-muted)] text-lg">
            Você receberá um e-mail de confirmação em breve.
          </p>
        </div>

        {/* Reservation ID */}
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

        {/* Info */}
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)] mb-8">
          <Mail className="w-4 h-4" />
          <span>Confira também sua caixa de spam.</span>
        </div>

        {/* Actions */}
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

export default function SucessoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
        </div>
      }
    >
      <SucessoContent />
    </Suspense>
  );
}
