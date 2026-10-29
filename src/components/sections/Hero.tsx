"use client";

import Image from "next/image";
import type { SiteSettings } from "@/lib/data";
import { ArrowRight } from "lucide-react";
import { GreenSparkles } from "@/components/ui/GreenSparkles";

interface HeroProps { siteSettings: SiteSettings; }

export function Hero({ siteSettings }: HeroProps) {
  return (
    <section id="hero" className="relative isolate flex min-h-[min(760px,90svh)] items-center overflow-hidden bg-[var(--color-primary-dark)] pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="absolute inset-0">
        <div className="relative h-full w-full">
          <Image src={siteSettings.heroImage || "/images/hero.jpg"} alt="" aria-hidden="true" fill priority sizes="100vw" className="object-cover" />
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-black/35 bg-gradient-to-r from-[var(--color-primary-dark)]/85 via-[var(--color-primary-dark)]/55 to-[var(--color-primary-dark)]/25" />
      <GreenSparkles />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] sm:text-sm">{siteSettings.name}</p>
        <h1 className="max-w-4xl font-serif text-[clamp(3.25rem,7vw,5.75rem)] leading-[1.02] tracking-[-0.035em] text-white">Descanse junto<br className="hidden sm:block" /> <span className="text-[var(--color-secondary-light)]">à natureza.</span></h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-surface)] sm:text-xl">{siteSettings.tagline}</p>
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
