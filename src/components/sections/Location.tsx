"use client";

import { useReveal } from "@/hooks/useReveal";
import type { SiteSettings, Distance, Direction } from "@/lib/data";
import { MapPin, Compass, Car, Clock } from "lucide-react";

interface LocationProps {
  siteSettings: SiteSettings;
  distances: Distance[];
  directions: Direction[];
}

export function Location({ siteSettings, distances, directions }: LocationProps) {
  const ref = useReveal();
  const hasCoordinates = siteSettings.lat !== 0 || siteSettings.lng !== 0;
  const mapQuery = hasCoordinates ? `${siteSettings.lat},${siteSettings.lng}` : siteSettings.address;

  return (
    <section
      ref={ref}
      id="location"
      className="relative section-padding overflow-hidden"
    >
      <div className="blob w-[500px] h-[500px] bg-[var(--color-primary-light)] -bottom-40 right-0" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Localização
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>Localização e acesso</span>
            </span>
          </h2>
          <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
            {siteSettings.address || "Consulte o endereço da hospedagem para planejar sua chegada."}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Google Maps Embed */}
          <div className="reveal-left relative rounded-2xl overflow-hidden shadow-lg h-[400px] md:h-[480px]">
            {mapQuery ? (
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Localização de ${siteSettings.name} no Google Maps`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--color-text-muted)]">
                Endereço ainda não informado.
              </div>
            )}
          </div>
          {/* Google Maps Link Button */}
          {mapQuery && <div className="reveal mt-4">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Abrir no Google Maps
            </a>
          </div>}

          {/* Info */}
          <div>
            <div className="mb-10">
              <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[var(--color-primary)]" />
                Pontos de Interesse
              </h3>
              <div className="grid sm:grid-cols-2 gap-3" data-stagger>
                {distances.map((item) => (
                  <div
                    key={item.id}
                    data-stagger-child
                    className="p-4 rounded-xl bg-[var(--color-surface)] flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {item.place}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {[item.distance, item.time].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5 flex items-center gap-2">
                <Car className="w-5 h-5 text-[var(--color-primary)]" />
                Como Chegar
              </h3>
              <div className="space-y-3" data-stagger>
                {directions.map((dir) => (
                  <div
                    key={dir.id}
                    data-stagger-child
                    className="p-4 rounded-xl bg-[var(--color-surface)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {dir.city}
                      </p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {dir.type}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {dir.route}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
