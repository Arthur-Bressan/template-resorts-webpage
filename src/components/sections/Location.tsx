"use client";

import { useReveal } from "@/hooks/useReveal";
import { siteConfig } from "@/data/site";
import { MapPin, Compass, Car, Clock, Waves, TreePine } from "lucide-react";

const nearby = [
  { icon: TreePine, name: "Parque Estadual da Serra do Mar", distance: "25 min" },
  { icon: Waves, name: "Cachoeira do Véu da Noiva", distance: "15 min" },
  { icon: Compass, name: "Centro Histórico de Cunha", distance: "20 min" },
  { icon: Car, name: "Acesso por Rodovia SP-247", distance: "3h de SP" },
];

const directions = [
  { label: "São Paulo", time: "3 horas", route: "Via Dutra → Taubaté → Cunha" },
  { label: "Rio de Janeiro", time: "3.5 horas", route: "Via Dutra → Volta Redonda → Cunha" },
  { label: "Campinas", time: "2.5 horas", route: "Rod. Dom Pedro I → Taubaté → Cunha" },
];

export function Location() {
  const ref = useReveal();

  return (
    <section
      ref={ref}
      id="location"
      className="relative section-padding overflow-hidden"
    >
      {/* Background blob */}
      <div
        className="blob w-[500px] h-[500px] bg-[var(--color-primary-light)] -bottom-40 right-0"
        style={{ opacity: 0.1 }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Localização
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>No coração da Serra da Mantiqueira</span>
            </span>
          </h2>
          <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
            Localizada em Cunha, na região do Vale do Paraíba, a pousada está
            cercada por montanhas, cachoeiras e trilhas da Mata Atlântica.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Map placeholder */}
          <div className="reveal-left relative rounded-2xl overflow-hidden shadow-lg">
            <div className="w-full h-[400px] md:h-[480px] bg-[var(--color-surface)] relative">
              {/* Stylized map illustration */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-10 h-10 text-[var(--color-primary)]" />
                  </div>
                  <p className="font-serif text-xl text-[var(--color-text)] mb-2">
                    Refúgio Mata Atlântica
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {siteConfig.address}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {siteConfig.coordinates.lat}°S, {siteConfig.coordinates.lng}°O
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${siteConfig.coordinates.lat},${siteConfig.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Abrir no Google Maps
                  </a>
                </div>
              </div>

              {/* Decorative terrain lines */}
              <svg
                className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
                viewBox="0 0 400 300"
                preserveAspectRatio="none"
              >
                <path d="M0,200 Q100,100 200,150 T400,100" stroke="var(--color-primary)" fill="none" strokeWidth="1.5" />
                <path d="M0,220 Q100,120 200,170 T400,120" stroke="var(--color-primary)" fill="none" strokeWidth="1" />
                <path d="M0,240 Q100,140 200,190 T400,140" stroke="var(--color-primary)" fill="none" strokeWidth="0.8" />
                <path d="M0,260 Q100,160 200,210 T400,160" stroke="var(--color-primary)" fill="none" strokeWidth="0.5" />
              </svg>
            </div>
          </div>

          {/* Info */}
          <div>
            {/* Nearby */}
            <div className="mb-10">
              <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[var(--color-primary)]" />
                Pontos de Interesse
              </h3>
              <div className="grid sm:grid-cols-2 gap-3" data-stagger>
                {nearby.map((item) => (
                  <div
                    key={item.name}
                    data-stagger-child
                    className="p-4 rounded-xl bg-[var(--color-surface)] flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {item.distance}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Directions */}
            <div>
              <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5 flex items-center gap-2">
                <Car className="w-5 h-5 text-[var(--color-primary)]" />
                Como Chegar
              </h3>
              <div className="space-y-3" data-stagger>
                {directions.map((dir) => (
                  <div
                    key={dir.label}
                    data-stagger-child
                    className="p-4 rounded-xl bg-[var(--color-surface)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {dir.label}
                      </p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {dir.time}
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
