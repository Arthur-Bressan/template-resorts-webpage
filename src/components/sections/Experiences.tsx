"use client";

import { useReveal } from "@/hooks/useReveal";
import { experiences } from "@/data/site";
import { Clock, Mountain, ImageIcon } from "lucide-react";

export function Experiences() {
  const ref = useReveal();

  return (
    <section
      ref={ref}
      id="experiences"
      className="relative section-padding overflow-hidden"
    >
      <div className="blob w-[500px] h-[500px] bg-[var(--color-accent)] top-20 -right-40" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Experiências
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>Viva momentos inesquecíveis</span>
            </span>
          </h2>
          <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
            Mais do que hospedagem — experiências que conectam corpo, mente e natureza.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" data-stagger>
          {experiences.map((exp, idx) => (
            <article
              key={exp.id}
              data-stagger-child
              className="group relative rounded-2xl overflow-hidden bg-[var(--color-background)] shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Image skeleton */}
              <div className="relative h-52 overflow-hidden bg-[var(--color-surface-alt)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                  <ImageIcon className="w-8 h-8 opacity-30" />
                  <span className="text-xs opacity-40">{exp.title}</span>
                </div>
                <div className="absolute bottom-4 left-4 glass-strong rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    {exp.duration}
                  </span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full glass-strong flex items-center justify-center">
                  <span className="text-sm font-serif text-[var(--color-primary)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-serif text-lg text-[var(--color-text)] mb-2">
                  {exp.title}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
                  {exp.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <Mountain className="w-3.5 h-3.5" />
                  {exp.difficulty}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
