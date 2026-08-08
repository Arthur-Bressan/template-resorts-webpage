"use client";

import { useReveal } from "@/hooks/useReveal";
import { galleryImages } from "@/data/site";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export function Gallery() {
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
              <button
                key={idx}
                data-stagger-child
                onClick={() => setLightbox(idx)}
                className={`${img.span} relative rounded-xl overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:ring-offset-2 bg-[var(--color-surface-alt)] flex items-center justify-center`}
              >
                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                  <ImageIcon className="w-8 h-8 opacity-20 group-hover:opacity-40 transition-opacity" />
                  <span className="text-xs opacity-30">{img.alt.split(" ").slice(0, 3).join(" ")}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox (placeholder — habilitar quando tiver imagens reais) */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            aria-label="Próxima"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center w-full max-w-4xl aspect-video rounded-xl bg-[var(--color-surface)]">
            <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
              <ImageIcon className="w-16 h-16 opacity-30" />
              <span className="text-sm">{galleryImages[lightbox].alt}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
