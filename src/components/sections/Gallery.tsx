"use client";

import Image from "next/image";
import { useReveal } from "@/hooks/useReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { ImageIcon, X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useState } from "react";
import type { GalleryImage } from "@/lib/data";

function GalleryItem({ img, idx, onClick }: { img: GalleryImage; idx: number; onClick: () => void }) {
  const tiltRef = useCardTilt<HTMLElement>();

  return (
    <button
      ref={tiltRef}
      onClick={onClick}
      data-stagger-child
      data-cursor="card"
      data-cursor-label="Abrir"
      aria-label={`Abrir imagem: ${img.alt}`}
      className={`${img.span} relative rounded-xl overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:ring-offset-2 bg-[var(--color-surface-alt)]`}
    >
      <div className="w-full h-full flex items-center justify-center">
        {/* Gallery image */}
        {img.src ? (
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)] transition-transform duration-700 ease-out group-hover:scale-110">
            <ImageIcon className="w-8 h-8 opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <span className="text-xs opacity-30">{img.alt.split(" ").slice(0, 3).join(" ")}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[var(--color-primary-dark)]/0 group-hover:bg-[var(--color-primary-dark)]/30 transition-colors duration-500" />

        {/* Expand icon — reveals from center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full glass-strong flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 ease-out">
            <Expand className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Border glow on hover */}
        <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-white/20 transition-colors duration-500 pointer-events-none" />
      </div>
    </button>
  );
}

interface GalleryProps {
  galleryImages: GalleryImage[];
}

export function Gallery({ galleryImages }: GalleryProps) {
  const ref = useReveal();
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = () => setLightbox(null);
  const next = () => setLightbox((lightbox! + 1) % galleryImages.length);
  const prev = () =>
    setLightbox(
      (lightbox! - 1 + galleryImages.length) % galleryImages.length
    );

  return (
    <>
      <section
        ref={ref}
        id="gallery"
        className="relative section-padding bg-[var(--color-surface)] overflow-hidden"
      >
        <div className="blob w-[400px] h-[400px] bg-[var(--color-primary)] top-20 -left-40" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
              Galeria
            </span>
            <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
              <span className="text-mask-line">
                <span>Momentos que inspiram</span>
              </span>
            </h2>
            <p className="reveal text-base text-[var(--color-text-muted)] max-w-xl mx-auto">
              Substitua os skeletons por suas fotos reais.
            </p>
          </div>

          {/* Masonry Grid */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] md:auto-rows-[220px] gap-3 md:gap-4"
            data-stagger
          >
            {galleryImages.map((img, idx) => (
              <GalleryItem
                key={img.id}
                img={img}
                idx={idx}
                onClick={() => setLightbox(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-300"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-300"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-300"
            aria-label="Próxima"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center w-full max-w-4xl aspect-video rounded-xl bg-[var(--color-surface)]">
            {galleryImages[lightbox].src ? (
              <Image
                src={galleryImages[lightbox].src}
                alt={galleryImages[lightbox].alt}
                fill
                sizes="90vw"
                className="object-contain rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                <ImageIcon className="w-16 h-16 opacity-30" />
                <span className="text-sm">{galleryImages[lightbox].alt}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
