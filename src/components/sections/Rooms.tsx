"use client";

import { useReveal } from "@/hooks/useReveal";
import { rooms } from "@/data/site";
import { Users, Maximize2, CheckCircle2 } from "lucide-react";

export function Rooms() {
  const ref = useReveal();

  return (
    <section
      ref={ref}
      id="rooms"
      className="relative section-padding bg-[var(--color-surface)] overflow-hidden"
    >
      {/* Background blob */}
      <div
        className="blob w-[600px] h-[600px] bg-[var(--color-secondary-light)] -bottom-60 -left-60"
        style={{ opacity: 0.1 }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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
            Cada suíte e chalé foi pensado para integrar conforto e natureza,
            com materiais rústicos, vista privilegiada e privacidade.
          </p>
        </div>

        {/* Room Cards */}
        <div className="grid md:grid-cols-2 gap-6" data-stagger>
          {rooms.map((room) => (
            <article
              key={room.id}
              data-stagger-child
              className="group relative bg-[var(--color-background)] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-500"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-4 right-4 glass-strong rounded-full px-3 py-1.5">
                  <span className="text-sm font-semibold text-[var(--color-primary-dark)]">
                    R$ {room.price}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    /noite
                  </span>
                </div>
                {/* Capacity badge */}
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

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {room.amenities.slice(0, 4).map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[var(--color-primary)]" />
                      {amenity}
                    </span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
                      +{room.amenities.length - 4}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <button className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium text-sm hover:bg-[var(--color-primary-dark)] transition-colors duration-300">
                  Ver disponibilidade
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
