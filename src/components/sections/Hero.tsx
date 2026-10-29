"use client";

import Image from "next/image";
import type { SiteSettings } from "@/lib/data";
import { ArrowRight } from "lucide-react";

interface HeroProps { siteSettings: SiteSettings; }

export function Hero({ siteSettings }: HeroProps) {
  return (
    <section id="hero" className="relative flex min-h-[min(760px,90svh)] items-center overflow-hidden bg-[var(--color-primary-dark)] pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="absolute inset-0">
        <div className="relative h-full w-full">
          <Image src={siteSettings.heroImage || "/images/hero.jpg"} alt="" aria-hidden="true" fill priority sizes="100vw" className="object-cover" />
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-5 text-sm font-semibold tracking-wider text-white/90">{siteSettings.name}</p>
        <h1 className="max-w-3xl font-serif text-white leading-[1.08]">Descanse junto<br className="hidden sm:block" /> à natureza.</h1>
        <p className="mt-6 max-w-xl text-lg text-white/90">{siteSettings.tagline}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href="/reservas" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[var(--color-accent)] px-7 py-3.5 font-semibold text-[var(--color-primary-dark)] transition-colors hover:bg-[var(--color-secondary-light)]">
            Reservar agora <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
          <a href="/sobre" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 px-7 py-3.5 font-medium text-white hover:bg-white/10 hover:text-white">Conhecer a pousada</a>
        </div>
      </div>
    </section>
  );
}
