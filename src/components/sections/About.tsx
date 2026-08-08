"use client";

import { useReveal } from "@/hooks/useReveal";
import { Leaf } from "lucide-react";

export function About() {
  const ref = useReveal();

  return (
    <section
      ref={ref}
      id="about"
      className="relative section-padding overflow-hidden"
    >
      {/* Background blob */}
      <div
        className="blob w-[500px] h-[500px] bg-[var(--color-primary-light)] -top-40 -right-40"
        style={{ opacity: 0.15 }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div className="reveal-left relative">
            <div className="img-reveal rounded-2xl overflow-hidden shadow-xl">
              <img
                src="/images/about.jpg"
                alt="Área comum da pousada com decoração rústica e vista para o jardim"
                className="w-full h-[400px] md:h-[500px] object-cover"
                loading="lazy"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -right-4 md:right-6 glass-strong rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-serif text-lg text-[var(--color-text)]">
                    12 anos
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    acolhendo hóspedes
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
                  Um refúgio nascido do
                  <span className="text-[var(--color-secondary)]"> amor </span>
                  pela natureza
                </span>
              </span>
            </h2>

            <div className="space-y-4">
              <p className="reveal text-base leading-relaxed">
                Em 2012, idealizamos um espaço onde o luxo encontrasse a
                simplicidade do campo. A partir de uma antiga fazenda de café na
                Serra da Mantiqueira, nascemos como uma proposta diferente:
                hospedagem que respeita o tempo da natureza.
              </p>
              <p className="reveal text-base leading-relaxed">
                Hoje, com 8 chalés e suítes integrados à Mata Atlântica, somos
                referência em turismo sustentável. Cada detalhe — do café da
                manhã com ingredientes orgânicos da nossa horta aos trilhas
                guiadas por naturalistas — é pensado para que você viva uma
                experiência autêntica.
              </p>
            </div>

            {/* Features mini */}
            <div
              className="mt-8 grid grid-cols-2 gap-4"
              data-stagger
            >
              {[
                { label: "8 Acomodações", desc: "Entre suítes e chalés" },
                { label: "50 hectares", desc: "De Mata Atlântica" },
                { label: "15km de trilhas", desc: "Sinalizadas e guiadas" },
                { label: "Menu autoral", desc: "Com produtos locais" },
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
                    {item.desc}
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
