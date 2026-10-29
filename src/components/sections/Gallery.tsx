"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useRef, useState } from "react";
import type { GalleryImage } from "@/lib/data";

interface GalleryProps { galleryImages: GalleryImage[]; }

export function Gallery({ galleryImages }: GalleryProps) {
  const images = galleryImages.filter((image) => image.src.trim());
  const [lightbox, setLightbox] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const active = lightbox !== null && images.length ? Math.min(lightbox, images.length - 1) : null;
  const move = (step: number) => setLightbox((current) => current === null || !images.length ? null : (current + step + images.length) % images.length);
  return (
    <section id="gallery" className="section-padding bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="mb-4 font-serif">Um olhar sobre o Refúgio</h2>
          <p className="text-base">Explore as imagens e abra cada foto para ver os detalhes.</p>
        </div>
        {images.length === 0 ? <p className="py-8">A galeria está indisponível no momento. <a href="/#booking" className="underline underline-offset-4">Entre em contato</a> para saber mais sobre a pousada.</p> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {images.map((img, idx) => (
              <button key={img.id} type="button" aria-label={`Ampliar foto ${idx + 1}: ${img.alt || "Galeria da pousada"}`} onClick={(event) => { openerRef.current = event.currentTarget; setLightbox(idx); }} className={`group relative min-h-40 overflow-hidden rounded-lg bg-[var(--color-surface-alt)] aspect-[4/3] ${idx === 0 ? "col-span-2 row-span-2" : ""}`}>
                <Image src={img.src} alt={img.alt || "Imagem da galeria da pousada"} fill sizes={idx === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"><Expand className="h-4 w-4" aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Dialog.Root open={active !== null} onOpenChange={(open) => { if (!open) setLightbox(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/90" />
          <Dialog.Content data-lenis-prevent aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); openerRef.current?.focus(); }} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }} className="fixed inset-x-3 top-1/2 z-[71] mx-auto max-h-[95svh] max-w-6xl -translate-y-1/2 overflow-y-auto rounded-lg bg-black p-3 text-white sm:inset-x-8 sm:p-5">
            <Dialog.Title className="sr-only">Galeria de fotos — {active === null ? "" : images[active].alt || "Refúgio Mata Atlântica"}</Dialog.Title>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p aria-live="polite" aria-atomic="true" className="text-sm text-white/90">{active === null ? "" : `Foto ${active + 1} de ${images.length}`}</p>
              <Dialog.Close aria-label="Fechar galeria" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
            </div>
            <div className="relative h-[min(65svh,700px)] w-full">
              {active !== null && <Image src={images[active].src} alt={images[active].alt || "Imagem da galeria da pousada"} fill sizes="90vw" className="object-contain" />}
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <button type="button" disabled={images.length < 2} aria-label="Foto anterior" onClick={() => move(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
              <p className="text-center text-sm text-white/90">{active === null ? "" : images[active].alt}</p>
              <button type="button" disabled={images.length < 2} aria-label="Próxima foto" onClick={() => move(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
