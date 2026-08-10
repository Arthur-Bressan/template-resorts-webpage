"use client";

import { useReveal } from "@/hooks/useReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { Star, Quote } from "lucide-react";
import type { Testimonial } from "@/lib/data";

function TestimonialCard({ t }: { t: Testimonial }) {
  const tiltRef = useCardTilt<HTMLElement>();

  return (
    <article
      ref={tiltRef}
      data-stagger-child
      className="group relative bg-[var(--color-background)] rounded-2xl p-8 shadow-md transition-shadow duration-500 hover:shadow-xl"
    >
        {/* Decorative border accent on hover */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />

        <div className="absolute top-6 right-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
          <Quote className="w-8 h-8 text-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)]/25 transition-colors duration-500" />
        </div>

        {/* Stars — subtle pulse on hover */}
        <div className="flex gap-1 mb-5">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star
              key={i}
              className="w-4 h-4 text-[var(--color-accent)] fill-[var(--color-accent)] transition-all duration-300 group-hover:scale-110"
              style={{ transitionDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        <blockquote className="text-base text-[var(--color-text)] leading-relaxed mb-6 font-serif italic">
          &ldquo;{t.text}&rdquo;
        </blockquote>

        <div className="flex items-center gap-3 pt-5 border-t border-[var(--color-border)]">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-[var(--color-surface)] shrink-0 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:ring-2 group-hover:ring-[var(--color-primary)]/20 group-hover:ring-offset-2">
            {t.avatar ? (
              <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-sm font-medium text-[var(--color-primary)]">
                {t.name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)] transition-colors duration-300 group-hover:text-[var(--color-primary)]">
              {t.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t.location}
            </p>
          </div>
        </div>
    </article>
  );
}

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const ref = useReveal();

  return (
    <section
      ref={ref}
      id="testimonials"
      className="relative section-padding bg-[var(--color-surface)] overflow-hidden"
    >
      <div className="blob w-[400px] h-[400px] bg-[var(--color-accent)] top-20 -left-32" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Depoimentos
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>O que nossos hóspedes dizem</span>
            </span>
          </h2>
          <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
            Histórias reais de quem viveu o Refúgio e voltou transformado.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6" data-stagger>
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
