"use client";

import { useEffect, useRef } from "react";
import { useReveal } from "@/hooks/useReveal";
import type { SiteSettings, AboutAmenity, Distance, Direction, SensoryConfig } from "@/lib/data";
import {
  ChevronRight,
  Coffee,
  Wifi,
  Car,
  TreePine,
  Waves,
  Dog,
  Flame,
  Wine,
  Shield,
  Baby,
  Recycle,
  Flower2,
  MapPin,
  Clock,
  Bus,
  Plane,
  Phone,
  Mail,
  ImageIcon,
  Star,
} from "lucide-react";
import { gsap } from "@/components/layout/SmoothScrollProvider";

/* ─── Icon mapping ─── */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Coffee, Wifi, Car, TreePine, Waves, Dog, Flame, Wine, Shield, Baby, Recycle, Flower2,
};

/* ─── Breadcrumb Hero ─── */
function BreadcrumbHero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      const els = ref.current?.querySelectorAll<HTMLElement>(".fade-in");
      if (els?.length) {
        gsap.set(els, { opacity: 0, y: 20 });
        gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", delay: 0.2 });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#3F5A48] via-[#29392F] to-[#2E2A22]" />
      <div className="absolute inset-0 opacity-[0.04]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sobre-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sobre-grid)" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="fade-in mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-white/60">
            <li>
              <a href="/" className="hover:text-white transition-colors">
                Início
              </a>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5" />
            </li>
            <li className="text-white/90">Sobre a Pousada</li>
          </ol>
        </nav>

        <h1 className="fade-in font-serif text-white text-4xl md:text-5xl lg:text-6xl leading-tight max-w-3xl">
          Conheça o Refúgio
          <br />
          <span className="text-[var(--color-accent)]">
            Mata Atlântica
          </span>
        </h1>
        <p className="fade-in mt-4 text-lg text-white/70 max-w-2xl font-sans">
          50 hectares de Mata Atlântica preservada, 12 anos acolhendo hóspedes e uma
          filosofia simples: descanso genuíno.
        </p>
      </div>
    </section>
  );
}

/* ─── Amenities ─── */
function AmenitiesSection({ amenities }: { amenities: AboutAmenity[] }) {
  const ref = useReveal();

  return (
    <section ref={ref} className="section-padding bg-[var(--color-background)] overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[var(--color-primary-light)] -top-60 -right-40" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            O que oferecemos
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>Diferenciais pensados para você</span>
            </span>
          </h2>
          <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
            Tudo incluído para que sua experiência seja completa — sem surpresas, sem custo extra.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" data-stagger>
          {amenities.map((item) => {
            const Icon = iconMap[item.icon] || Coffee;
            return (
              <div
                key={item.label}
                data-stagger-child
                className="group p-6 rounded-2xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors duration-300 hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/15 transition-colors">
                  <Icon className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-serif text-lg text-[var(--color-text)] mb-2">
                  {item.label}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Location ─── */
function LocationSection({ siteSettings, distances, directions }: { siteSettings: SiteSettings; distances: Distance[]; directions: Direction[] }) {
  const ref = useReveal();

  return (
    <section ref={ref} id="location" className="section-padding bg-[var(--color-surface)] overflow-hidden">
      <div className="blob w-[600px] h-[600px] bg-[var(--color-secondary-light)] -bottom-80 -left-60" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Localização
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>Onde a natureza encontra a serra</span>
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Map */}
          <div className="reveal-left">
            <div className="rounded-2xl overflow-hidden shadow-lg bg-[var(--color-background)] aspect-[4/3] flex items-center justify-center">
              {/* Substitua pelo iframe do Google Maps ou componente customizado */}
              <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                <ImageIcon className="w-16 h-16 opacity-20" />
                <span className="text-sm opacity-40">Mapa do Google Maps aqui</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${siteSettings.lat},${siteSettings.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Abrir no Maps
                </a>
              </div>
            </div>

            {/* Address */}
            <address className="mt-6 not-italic">
              <div className="flex items-start gap-3 p-5 rounded-xl bg-[var(--color-background)] shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                    {siteSettings.name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {siteSettings.address}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {siteSettings.lat}°S, {siteSettings.lng}°O
                  </p>
                </div>
              </div>
            </address>
          </div>

          {/* Distance + Directions */}
          <div>
            {/* Distances */}
            <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              Distâncias
            </h3>
            <div className="mb-10 space-y-2" data-stagger>
              {distances.map((d) => (
                <div
                  key={d.place}
                  data-stagger-child
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-background)] hover:shadow-sm transition-shadow"
                >
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {d.place}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {d.distance}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] min-w-[60px] text-center">
                      {d.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Como Chegar */}
            <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5 flex items-center gap-2">
              <Car className="w-5 h-5 text-[var(--color-primary)]" />
              Como Chegar
            </h3>
            <div className="space-y-3" data-stagger>
              {directions.map((dir) => {
                const Icon = dir.type === "ônibus" ? Bus : dir.type === "transfer" ? Plane : Car;
                return (
                  <div
                    key={dir.city}
                    data-stagger-child
                    className="p-5 rounded-xl bg-[var(--color-background)] hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {dir.city}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] capitalize">
                        {dir.type}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                      {dir.route}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Sensory Experience ─── */
function SensorySection({ sensory }: { sensory: SensoryConfig | null }) {
  const ref = useReveal();
  const paragraphs: string[] = sensory?.paragraphs ? JSON.parse(sensory.paragraphs) : [];

  return (
    <section ref={ref} className="section-padding overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[var(--color-accent)] -top-40 right-0" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Photo skeleton */}
          <div className="reveal-left order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden shadow-xl bg-[var(--color-surface)] aspect-[3/4] md:aspect-[4/5] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                <ImageIcon className="w-16 h-16 opacity-20" />
                <span className="text-sm opacity-40">Foto da experiência</span>
              </div>
            </div>
          </div>

          {/* Storytelling */}
          <div className="order-1 lg:order-2">
            <span className="reveal inline-block text-sm font-semibold text-[var(--color-accent)] tracking-wider uppercase mb-4">
              A experiência
            </span>

            <h2 className="reveal font-serif text-[var(--color-text)] mb-8 text-3xl md:text-4xl leading-tight">
              {sensory?.title || ""}
            </h2>

            <div className="space-y-5">
              {paragraphs.map((p, i) => (
                <p key={i} className="reveal text-base text-[var(--color-text-muted)] leading-relaxed font-sans">
                  {p}
                </p>
              ))}
            </div>

            {/* Social proof mini */}
            <div className="reveal mt-8 flex items-center gap-4 p-5 rounded-xl bg-[var(--color-surface)]">
              <div className="flex -space-x-3">
                {["MA", "CL", "HR"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-[var(--color-background)] bg-[var(--color-primary)] flex items-center justify-center"
                  >
                    <span className="text-xs font-semibold text-white">{initials}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 text-[var(--color-accent)] fill-[var(--color-accent)]" />
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  +4.000 hóspedes satisfeitos nos últimos 12 anos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Final ─── */
function FinalCTA({ siteSettings }: { siteSettings: SiteSettings }) {
  return (
    <section id="booking" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-primary-dark)]" />
      <div className="blob w-72 h-72 bg-[var(--color-accent)] top-10 -left-36" />
      <div className="blob w-96 h-96 bg-[var(--color-primary-light)] -bottom-48 right-0" />

      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-dots" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-dots)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-serif text-white mb-4 leading-tight text-3xl md:text-4xl lg:text-5xl">
          Sua próxima grande
          <br />
          <span className="text-[var(--color-accent)]">escapada começa aqui</span>
        </h2>

        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-4">
          Reserve diretamente conosco e ganhe café da manhã incluso + late check-out grátis.
          Diárias a partir de R$ 380.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-white/80">
            Últimas unidades disponíveis para o mês que vem
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`tel:${siteSettings.phone}`}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-semibold text-base hover:bg-[var(--color-accent)]/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-w-[220px] justify-center"
          >
            <Phone className="w-4 h-4" />
            Reservar por Telefone
          </a>
          <a
            href={`mailto:${siteSettings.email}?subject=Reserva%20-%20Sobre%20a%20Pousada`}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white/15 backdrop-blur-sm text-white font-medium text-base border border-white/25 hover:bg-white/25 transition-all min-w-[220px] justify-center"
          >
            <Mail className="w-4 h-4" />
            Enviar E-mail
          </a>
        </div>

        <p className="text-sm text-white/40 mt-6">
          Ou fale pelo WhatsApp: {siteSettings.phone}
        </p>
      </div>
    </section>
  );
}

/* ─── Schema.org (JSON-LD) ─── */
function LodgingSchema({ siteSettings, amenities }: { siteSettings: SiteSettings; amenities: AboutAmenity[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: siteSettings.name,
    description: siteSettings.description,
    url: "https://refugiomataatlantica.com.br",
    telephone: siteSettings.phone,
    email: siteSettings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Estrada da Serra, Km 12",
      addressLocality: "Cunha",
      addressRegion: "SP",
      postalCode: "23980-000",
      addressCountry: "BR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteSettings.lat,
      longitude: siteSettings.lng,
    },
    amenityFeature: amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.label,
      description: a.desc,
      value: true,
    })),
    starRating: {
      "@type": "Rating",
      ratingValue: "5",
    },
    priceRange: "R$ 380 - R$ 920 / noite",
    checkinTime: "15:00",
    checkoutTime: "12:00",
    petsAllowed: true,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ─── Props Interface ─── */
interface SobrePageProps {
  siteSettings: SiteSettings;
  amenities: AboutAmenity[];
  distances: Distance[];
  directions: Direction[];
  sensory: SensoryConfig | null;
}

/* ─── Page Component ─── */
export default function SobrePage({ siteSettings, amenities, distances, directions, sensory }: SobrePageProps) {
  return (
    <>
      <LodgingSchema siteSettings={siteSettings} amenities={amenities} />
      <BreadcrumbHero />
      <AmenitiesSection amenities={amenities} />
      <LocationSection siteSettings={siteSettings} distances={distances} directions={directions} />
      <SensorySection sensory={sensory} />
      <FinalCTA siteSettings={siteSettings} />
    </>
  );
}
