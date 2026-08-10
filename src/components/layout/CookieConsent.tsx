"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";

type ConsentValue = "accepted" | "rejected";

function getStoredConsent(): ConsentValue | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "rejected") return stored;
  } catch {
    // localStorage not available
  }
  return null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  const handleConsent = useCallback((value: ConsentValue) => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-0 inset-x-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="glass rounded-xl shadow-lg max-w-4xl mx-auto p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-text-muted flex-1 leading-relaxed">
          Utilizamos cookies para melhorar sua experiência. Ao continuar
          navegando, você concorda com nossa{" "}
          <Link
            href="/politica-de-privacidade"
            className="underline underline-offset-2 font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Política de Privacidade
          </Link>
          .
        </p>

        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => handleConsent("accepted")}
            className="flex-1 sm:flex-none rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
          >
            Aceitar todos
          </button>
          <button
            onClick={() => handleConsent("rejected")}
            className="flex-1 sm:flex-none rounded-lg border border-border bg-transparent text-text-muted px-5 py-2.5 text-sm font-medium hover:bg-surface-alt hover:text-text transition-colors cursor-pointer"
          >
            Rejeitar não-essenciais
          </button>
        </div>
      </div>
    </div>
  );
}
