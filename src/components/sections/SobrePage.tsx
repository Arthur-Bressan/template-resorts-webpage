"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import type { SiteSettings, AboutAmenity, Distance, Direction, SensoryConfig } from "@/lib/data";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { Location } from "@/components/sections/Location";
import { GreenSparkles } from "@/components/ui/GreenSparkles";
import { ChevronRight, Coffee, Wifi, Car, TreePine, Waves, Dog, Flame, Wine, Shield, Baby, Recycle, Flower2, Bus, Plane } from "lucide-react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Coffee, Wifi, Car, TreePine, Waves, Dog, Flame, Wine, Shield, Baby, Recycle, Flower2,
};

interface SobrePageProps {
  siteSettings: SiteSettings;
  amenities: AboutAmenity[];
  distances: Distance[];
  directions: Direction[];
  sensory: SensoryConfig | null;
}

export default function SobrePage({ siteSettings, amenities, distances, directions, sensory }: SobrePageProps) {
  let paragraphs: string[] = [];
  try {
    const parsed: unknown = sensory?.paragraphs ? JSON.parse(sensory.paragraphs) : [];
    if (Array.isArray(parsed)) paragraphs = parsed.filter((paragraph): paragraph is string => typeof paragraph === "string" && paragraph.trim().length > 0);
  } catch {
    // An incomplete CMS entry should not prevent reading the rest of the page.
  }
  const schema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: siteSettings.name,
    description: siteSettings.description,
    telephone: siteSettings.phone,
    email: siteSettings.email,
    address: siteSettings.address,
    geo: { "@type": "GeoCoordinates", latitude: siteSettings.lat, longitude: siteSettings.lng },
    amenityFeature: amenities.map((amenity) => ({ "@type": "LocationFeatureSpecification", name: amenity.label, description: amenity.desc, value: true })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <section className="relative isolate overflow-hidden bg-[var(--color-primary-dark)] pt-32 pb-16">
        <GreenSparkles />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Caminho da página" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-surface)]">
              <li><a href="/" className="text-white hover:text-white underline underline-offset-4">Início</a></li>
              <li><ChevronRight className="h-4 w-4" aria-hidden="true" /></li>
              <li aria-current="page">Sobre a pousada</li>
            </ol>
          </nav>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-accent)] sm:text-sm">Um refúgio para desacelerar</p>
          <h1 className="max-w-4xl font-serif text-[clamp(3rem,6.2vw,5.25rem)] leading-[1.04] tracking-[-0.03em] text-[var(--color-surface)]">{siteSettings.name}</h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--color-secondary-light)] sm:text-xl">Conheça os espaços, as comodidades e as orientações para planejar sua estadia.</p>
        </div>
      </section>
      <section className="section-padding">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 font-serif">Comodidades da pousada</h2>
          <p className="mb-10 max-w-2xl">Consulte os serviços e confirme as condições da sua acomodação antes de reservar.</p>
          {amenities.length === 0 ? <p>As informações sobre comodidades estão indisponíveis no momento. Consulte a equipe para esclarecer suas dúvidas.</p> : (
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((amenity) => {
                const Icon = iconMap[amenity.icon] || Coffee;
                return <div key={amenity.id} className="flex items-start gap-4">
                  <Icon className="mt-1 h-6 w-6 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                  <div><h3 className="mb-2 font-serif text-xl">{amenity.label}</h3><p className="text-base leading-relaxed">{amenity.desc}</p></div>
                </div>;
              })}
            </div>
          )}
        </div>
      </section>
      <Location siteSettings={siteSettings} />
      <section className="bg-[var(--color-surface)] py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="mb-6 font-serif text-3xl">Distâncias e trajetos</h2>
            {distances.length === 0 ? <p>Consulte o mapa para planejar seu trajeto. Os tempos variam conforme as condições da viagem.</p> : <ul className="divide-y divide-[var(--color-border)]">
              {distances.map((distance) => <li key={distance.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4"><span className="font-semibold">{distance.place}</span><span className="text-sm text-[var(--color-text-muted)]">{distance.distance} · {distance.time}</span></li>)}
            </ul>}
          </div>
          <div>
            <h2 className="mb-6 font-serif text-3xl">Orientações de acesso</h2>
            {directions.length === 0 ? <p>Para orientações de acesso, fale com a equipe antes da viagem.</p> : <div className="space-y-6">
              {directions.map((direction) => {
                const Icon = direction.type === "ônibus" ? Bus : direction.type === "transfer" ? Plane : Car;
                return <div key={direction.id}><h3 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold"><Icon className="h-4 w-4" aria-hidden="true" />{direction.city} · {direction.type}</h3><p className="text-base">{direction.route}</p></div>;
              })}
            </div>}
          </div>
        </div>
      </section>
      <section className="section-padding">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--color-surface)]">
            <Image src="/images/experience-trail.jpg" alt="Caminho de terra entre árvores e pedras cobertas de musgo" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div>
            <h2 className="mb-7 font-serif">{sensory?.title || "Conheça a experiência"}</h2>
            <div className="space-y-5">
              {paragraphs.length === 0 ? <p>As informações sobre a experiência estão indisponíveis no momento. Fale com a equipe para conhecer as opções durante sua estadia.</p> : paragraphs.map((paragraph, index) => <p key={index} className="text-base leading-relaxed">{paragraph}</p>)}
            </div>
          </div>
        </div>
      </section>
      <BookingCTA siteSettings={siteSettings} />
    </>
  );
}
