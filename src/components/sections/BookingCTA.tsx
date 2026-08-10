"use client";

import type { SiteSettings } from "@/lib/data";
import { Phone, Mail, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";

interface BookingCTAProps {
  siteSettings: SiteSettings;
}

export function BookingCTA({ siteSettings }: BookingCTAProps) {
  return (
    <section
      id="booking"
      className="relative py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--color-primary-dark)]" />
      <div className="blob w-72 h-72 bg-[var(--color-accent)] top-10 -left-36" />
      <div className="blob w-96 h-96 bg-[var(--color-primary-light)] -bottom-48 right-0" />

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <Calendar className="w-10 h-10 text-[var(--color-accent)] mx-auto mb-6" />
        <h2 className="font-serif text-white mb-4 leading-tight">
          Pronto para sua próxima
          <br />
          <span className="text-[var(--color-accent)]">grande escapada?</span>
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
          Reserve agora e garanta os melhores preços diretamente conosco.
          Diárias a partir de R$ 380 com café da manhã incluso.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/reservas"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-semibold hover:bg-[var(--color-accent)]/90 transition-colors shadow-lg min-w-[200px] justify-center"
          >
            <CreditCard className="w-4 h-4" />
            Reservar Online
          </Link>
          <a
            href={`tel:${siteSettings.phone}`}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-[var(--color-text)] font-semibold hover:bg-white/90 transition-colors shadow-lg min-w-[200px] justify-center"
          >
            <Phone className="w-4 h-4" />
            Ligar Agora
          </a>
          <a
            href={`mailto:${siteSettings.email}?subject=Reserva`}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white/15 text-white font-semibold hover:bg-white/25 transition-colors border border-white/20 min-w-[200px] justify-center"
          >
            <Mail className="w-4 h-4" />
            Enviar E-mail
          </a>
        </div>

        <p className="text-sm text-white/50">
          Ou fale pelo WhatsApp: {siteSettings.phone}
        </p>
      </div>
    </section>
  );
}
