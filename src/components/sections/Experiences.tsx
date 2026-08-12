"use client";

import Image from "next/image";
import { useReveal } from "@/hooks/useReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { Clock, Mountain, ImageIcon } from "lucide-react";
import type { Experience } from "@/lib/data";

function ExperienceCard({ exp, idx }: { exp: Experience; idx: number }) {
  const tiltRef = useCardTilt<HTMLElement>();

  return (
    <article
      ref={tiltRef}
      data-stagger-child
      data-cursor="card"
      data-cursor-label="Detalhes"
      className="group relative rounded-2xl overflow-hidden bg-[var(--color-background)] shadow-md transition-shadow duration-500 hover:shadow-xl"
    >
        {/* Image area */}
        <div className="relative h-52 overflow-hidden bg-[var(--color-surface-alt)] flex items-center justify-center">
          {exp.image ? (
            <Image
              src={exp.image}
              alt={exp.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-2"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)] transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-2">
              <ImageIcon className="w-8 h-8 opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <span className="text-xs opacity-40">{exp.title}</span>
            </div>
          )}
          {/* Bottom accent line on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-accent)] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

          <div className="absolute bottom-4 left-4 glass-strong rounded-full px-3 py-1 flex items-center gap-1.5 transition-transform duration-500 group-hover:translate-y-0.5">
            <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-xs font-medium text-[var(--color-text)]">
              {exp.duration}
            </span>
          </div>
          {/* Number badge — glow on hover */}
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full glass-strong flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10">
            <span className="text-sm font-serif text-[var(--color-primary)] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
              {String(idx + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-serif text-lg text-[var(--color-text)] mb-2 transition-colors duration-300 group-hover:text-[var(--color-primary)]">
            {exp.title}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">
            {exp.description}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] transition-colors duration-300 group-hover:text-[var(--color-primary)]">
            <Mountain className="w-3.5 h-3.5 transition-transform duration-500 group-hover:scale-125" />
            {exp.difficulty}
          </div>
        </div>
    </article>
  );
}

interface ExperiencesProps {
  experiences: Experience[];
}

export function Experiences({ experiences }: ExperiencesProps) {
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
            <ExperienceCard key={exp.id} exp={exp} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
