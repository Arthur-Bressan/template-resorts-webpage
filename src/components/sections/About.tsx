"use client";

import { useReveal } from "@/hooks/useReveal";
import { Leaf, ImageIcon } from "lucide-react";
import type { SiteSettings } from "@/lib/data";

export function About({ siteSettings }: { siteSettings: SiteSettings }) {
  const ref = useReveal();

  return (
    <section ref={ref} id="about" className="relative section-padding overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[var(--color-primary-light)] -top-40 -right-40" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image skeleton */}
          <div className="reveal-left relative">
            <div className="rounded-2xl overflow-hidden shadow-xl bg-[var(--color-surface-alt)] flex items-center justify-center aspect-[4/3]">
              <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                <ImageIcon className="w-12 h-12 opacity-40" />
                <span className="text-sm opacity-50">Sua imagem aqui</span>
              </div>
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -right-4 md:right-6 glass-strong rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-serif text-lg text-[var(--color-text)]">
                    {siteSettings.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Nossa hospedagem
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
              Nossa História
            </span>

            <h2 className="reveal font-serif text-[var(--color-text)] mb-6">
              <span className="text-mask-line">
                <span>
                  Uma hospedagem pensada com
                  <span className="text-[var(--color-secondary)]"> cuidado </span>
                  em cada detalhe
                </span>
              </span>
            </h2>

            <div className="space-y-4">
              <p className="reveal text-base leading-relaxed">
                {siteSettings.description || "Conheça a proposta e os espaços preparados para receber você."}
              </p>
              <p className="reveal text-base leading-relaxed">
                Encontre informações sobre acomodações, serviços e localização para planejar sua próxima estadia.
              </p>
            </div>

            {/* Features mini */}
            <div className="mt-8 grid grid-cols-2 gap-4" data-stagger>
              {[
                { label: "Acomodações", description: "Veja as opções disponíveis" },
                { label: "Estrutura", description: "Conheça os espaços e serviços" },
                { label: "Localização", description: "Consulte os dados do endereço" },
                { label: "Planejamento", description: "Organize sua próxima estadia" },
              ].map((item) => (
                <div
                  key={item.label}
                  data-stagger-child
                  className="p-4 rounded-xl bg-[var(--color-surface)]"
                >
                  <p className="font-serif text-lg text-[var(--color-text)]">
                    {item.label}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
