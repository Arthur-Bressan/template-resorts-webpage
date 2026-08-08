"use client";

import { useReveal } from "@/hooks/useReveal";
import { rooms } from "@/data/site";
import { Users, Maximize2, CheckCircle2, ImageIcon, ArrowRight } from "lucide-react";
import Link from "next/link";

export function Rooms() {
  const ref = useReveal();

  return (
    <section
      ref={ref}
      id="rooms"
      className="relative section-padding bg-[var(--color-surface)] overflow-hidden"
    >
      <div className="blob w-[600px] h-[600px] bg-[var(--color-secondary-light)] -bottom-60 -left-60" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Acomodações
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>Encontre seu refúgio</span>
            </span>
          </h2>
          <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
            Cada suíte e chalé foi pensado para integrar conforto e natureza.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6" data-stagger>
          {rooms.map((room) => (
            <article
              key={room.id}
              data-stagger-child
              data-cursor="card"
              data-cursor-label="Ver detalhes"
              className="group relative bg-[var(--color-background)] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Image skeleton */}
              <div className="relative h-64 overflow-hidden bg-[var(--color-surface-alt)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                  <ImageIcon className="w-10 h-10 opacity-30" />
                  <span className="text-xs opacity-40">{room.name}</span>
                </div>
                <div className="absolute top-4 right-4 glass-strong rounded-full px-3 py-1.5">
                  <span className="text-sm font-semibold text-[var(--color-primary-dark)]">
                    R$ {room.price}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    /noite
                  </span>
                </div>
                <div className="absolute top-4 left-4 glass-strong rounded-full px-3 py-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    {room.capacity} hóspedes
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-xl text-[var(--color-text)]">
                    {room.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                    <Maximize2 className="w-3.5 h-3.5" />
                    {room.size}m²
                  </div>
                </div>

                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-5">
                  {room.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {room.amenities.slice(0, 4).map((a) => (
                    <span
                      key={a.name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[var(--color-primary)]" />
                      {a.name}
                    </span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
                      +{room.amenities.length - 4}
                    </span>
                  )}
                </div>

                <Link
                  href={`/quartos/${room.slug}`}
                  className="w-full py-3 rounded-xl bg-[var(--color-secondary)] text-white font-medium text-sm hover:bg-[var(--color-secondary-light)] transition-colors duration-300 flex items-center justify-center gap-2 group/btn"
                >
                  Ver mais
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
