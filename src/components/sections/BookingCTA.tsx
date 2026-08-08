"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";
import { siteConfig } from "@/data/site";
import { Phone, Mail, Calendar } from "lucide-react";

export function BookingCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!sectionRef.current || prefersReduced) return;

    const ctx = gsap.context(() => {
      // Parallax on background
      const bg = sectionRef.current?.querySelector(".cta-bg");
      if (bg) {
        gsap.to(bg, {
          y: 60,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="booking"
      className="relative py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="cta-bg absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/cta-bg.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-[var(--color-primary-dark)]/80 backdrop-blur-sm" />
      </div>

      {/* Decorative blobs */}
      <div
        className="blob w-72 h-72 bg-[var(--color-accent)] top-10 -left-36"
        style={{ opacity: 0.1 }}
      />
      <div
        className="blob w-96 h-96 bg-[var(--color-primary-light)] -bottom-48 right-0"
        style={{ opacity: 0.12 }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <Calendar className="w-10 h-10 text-[var(--color-accent)] mx-auto mb-6" />
        <h2 className="font-serif text-white mb-4 leading-tight">
          Pronto para sua próxima
          <br />
          <span className="text-[var(--color-accent)]">
            grande escapada?
          </span>
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
          Reserve agora e garanta os melhores preços diretamente conosco.
          Diárias a partir de R$ 380 com café da manhã incluso.
        </p>

        {/* Contact options */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href={`tel:${siteConfig.phone}`}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-[var(--color-text)] font-semibold hover:bg-white/90 transition-colors shadow-lg min-w-[200px] justify-center"
          >
            <Phone className="w-4 h-4" />
            Ligar Agora
          </a>
          <a
            href={`mailto:${siteConfig.email}?subject=Reserva`}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-semibold hover:bg-[var(--color-accent)]/90 transition-colors min-w-[200px] justify-center"
          >
            <Mail className="w-4 h-4" />
            Enviar E-mail
          </a>
        </div>

        <p className="text-sm text-white/50">
          Ou fale pelo WhatsApp: {siteConfig.phone}
        </p>
      </div>
    </section>
  );
}
