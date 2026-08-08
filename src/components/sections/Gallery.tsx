"use client";

import { useReveal } from "@/hooks/useReveal";
import { galleryImages } from "@/data/site";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function Gallery() {
  const ref = useReveal();
  const [lightbox, setLightbox] = useState<number | null>(null);

  const openLightbox = (idx: number) => setLightbox(idx);
  const closeLightbox = () => setLightbox(null);

  const next = () => {
    if (lightbox !== null) {
      setLightbox((lightbox + 1) % galleryImages.length);
    }
  };

  const prev = () => {
    if (lightbox !== null) {
      setLightbox(
        (lightbox - 1 + galleryImages.length) % galleryImages.length
      );
    }
  };

  return (
    <>
      <section
        ref={ref}
        id="gallery"
        className="relative section-padding bg-[var(--color-surface)] overflow-hidden"
      >
        {/* Background blob */}
        <div
          className="blob w-[400px] h-[400px] bg-[var(--color-primary)] top-20 -left-40"
          style={{ opacity: 0.08 }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
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
              Cada ângulo da pousada conta uma história. Descubra a beleza que
              espera por você.
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
                onClick={() => openLightbox(idx)}
                className={`${img.span} relative rounded-xl overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:ring-offset-2`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-sm font-medium px-4 py-2 rounded-full glass">
                    Ver
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar imagem"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <img
            src={galleryImages[lightbox].src}
            alt={galleryImages[lightbox].alt}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-6 text-sm text-white/60">
            {lightbox + 1} / {galleryImages.length} — {galleryImages[lightbox].alt}
          </p>
        </div>
      )}
    </>
  );
}
