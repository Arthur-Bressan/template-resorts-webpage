import type { Room, SiteSettings } from "@/lib/data";
import { Calendar, Phone, Mail } from "lucide-react";

import { GreenSparkles } from "@/components/ui/GreenSparkles";

interface BookingCTAProps {
  siteSettings: SiteSettings;
  rooms?: Room[];
}

export function BookingCTA({ siteSettings, rooms = [] }: BookingCTAProps) {
  const prices = rooms.filter((room) => room.published && Number.isFinite(room.price) && room.price > 0).map((room) => room.price);
  const startingPrice = prices.length ? Math.min(...prices) : null;
  return (
    <section id="booking" className="relative isolate overflow-hidden bg-[var(--color-primary-dark)] py-20 sm:py-24">
      <GreenSparkles />
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-5 font-serif text-4xl leading-tight text-white sm:text-5xl">Planeje sua próxima <span className="text-[var(--color-secondary-light)]">estadia</span></h2>
        <p className="mx-auto mb-4 max-w-2xl text-lg text-[var(--color-surface)] sm:text-xl">Escolha sua acomodação e consulte as datas e condições da reserva.</p>
        {startingPrice !== null && <p className="mb-8 text-lg font-semibold text-[var(--color-accent)]">Diárias a partir de {startingPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. <span className="font-normal text-[var(--color-surface)]">O valor final depende da acomodação e das datas.</span></p>}
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
          <a href="/reservas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 font-semibold text-[var(--color-primary-dark)] hover:bg-[var(--color-secondary-light)]"><Calendar className="h-4 w-4" aria-hidden="true" />Reservar online</a>
          {siteSettings.phone && <a href={`tel:${siteSettings.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-semibold text-white hover:bg-white/10 hover:text-white"><Phone className="h-4 w-4" aria-hidden="true" />Ligar para a pousada</a>}
          {siteSettings.email && <a href={`mailto:${siteSettings.email}?subject=Reserva`} className="inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3.5 text-white underline underline-offset-4 hover:text-white"><Mail className="h-4 w-4" aria-hidden="true" />Enviar e-mail</a>}
        </div>
      </div>
    </section>
  );
}
