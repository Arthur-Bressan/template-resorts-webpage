"use client";

import { useReveal } from "@/hooks/useReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { Users, Maximize2, CheckCircle2, ImageIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Room } from "@/lib/data";

function RoomCard({ room }: { room: Room }) {
  const tiltRef = useCardTilt<HTMLElement>();

  return (
    <article
      ref={tiltRef}
      data-stagger-child
      data-cursor="card"
      data-cursor-label="Ver detalhes"
      className="group relative bg-[var(--color-background)] rounded-2xl overflow-hidden shadow-md transition-shadow duration-500 hover:shadow-xl"
    >
        {/* Image skeleton */}
        <div className="relative h-64 overflow-hidden bg-[var(--color-surface-alt)] flex items-center justify-center">
          {/* Parallax image placeholder — shifts on hover */}
          <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)] transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-3">
            <ImageIcon className="w-10 h-10 opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            <span className="text-xs opacity-40">{room.name}</span>
          </div>
          {/* Overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary-dark)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="absolute top-4 right-4 glass-strong rounded-full px-3 py-1.5 transition-transform duration-500 group-hover:scale-105">
            <span className="text-sm font-semibold text-[var(--color-primary-dark)]">
              R$ {room.price}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              /noite
            </span>
          </div>
          <div className="absolute top-4 left-4 glass-strong rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-transform duration-500 group-hover:scale-105">
            <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-xs font-medium text-[var(--color-text)]">
              {room.capacity} hóspedes
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-xl text-[var(--color-text)] transition-colors duration-300 group-hover:text-[var(--color-primary)]">
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

          {/* Amenity tags — stagger fade-in on hover */}
          <div className="flex flex-wrap gap-2 mb-5">
            {room.amenities.slice(0, 4).map((a, i) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] transition-all duration-300 ease-out group-hover:translate-y-[-2px] group-hover:shadow-sm"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <CheckCircle2 className="w-3 h-3 text-[var(--color-primary)] transition-transform duration-500 group-hover:scale-125" />
                {a.name}
              </span>
            ))}
            {room.amenities.length > 4 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] transition-all duration-300 ease-out" style={{ transitionDelay: "180ms" }}>
                +{room.amenities.length - 4}
              </span>
            )}
          </div>

          {/* CTA button — slide + shimmer */}
          <Link
            href={`/quartos/${room.slug}`}
            className="relative w-full py-3 rounded-xl bg-[var(--color-secondary)] text-white font-medium text-sm overflow-hidden flex items-center justify-center gap-2 group/btn transition-colors duration-500 hover:bg-[var(--color-secondary-light)]"
          >
            {/* Shimmer sweep on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="relative z-10">Ver mais</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover/btn:translate-x-1.5" />
          </Link>
        </div>
    </article>
  );
}

interface RoomsProps {
  rooms: Room[];
}

export function Rooms({ rooms }: RoomsProps) {
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
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>
    </section>
  );
}
