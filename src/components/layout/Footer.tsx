"use client";

import { siteConfig, stats } from "@/data/site";
import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";
import { useEffect } from "react";

function CountUpNumber({ target, suffix }: { target: number; suffix: string }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const el = document.getElementById(`stat-${target}-${suffix}`);
    if (!el) return;

    const obj = { val: 0 };

    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        once: true,
      },
      onUpdate: () => {
        el.textContent = Math.round(obj.val) + suffix;
      },
    });
  }, [target, suffix]);

  return (
    <span id={`stat-${target}-${suffix}`} className="font-serif text-4xl md:text-5xl text-[var(--color-primary)]">
      0{suffix}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="bg-[var(--color-primary-dark)] text-[var(--color-background)]">
      {/* Stats Bar */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <CountUpNumber target={stat.value} suffix={stat.suffix} />
                <p className="mt-2 text-sm text-[var(--color-primary-light)]/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <span className="font-serif text-lg font-medium text-white">
                {siteConfig.name}
              </span>
            </a>
            <p className="text-sm text-white/60 leading-relaxed">
              {siteConfig.description.substring(0, 120)}...
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-sans font-semibold text-sm uppercase tracking-wider text-white/80 mb-5">
              Navegação
            </h4>
            <ul className="space-y-3">
              {[
                { label: "A Pousada", href: "#about" },
                { label: "Acomodações", href: "#rooms" },
                { label: "Experiências", href: "#experiences" },
                { label: "Galeria", href: "#gallery" },
                { label: "FAQ", href: "#faq" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans font-semibold text-sm uppercase tracking-wider text-white/80 mb-5">
              Contato
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${siteConfig.phone}`}
                  className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {siteConfig.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2.5 text-sm text-white/50">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  {siteConfig.address}
                </span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-sans font-semibold text-sm uppercase tracking-wider text-white/80 mb-5">
              Newsletter
            </h4>
            <p className="text-sm text-white/50 mb-4">
              Receba novidades, ofertas exclusivas e inspirações para sua próxima viagem.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] text-sm font-semibold hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} {siteConfig.name}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href={siteConfig.socials.instagram} className="text-xs text-white/40 hover:text-white transition-colors">
                Instagram
              </a>
              <a href={siteConfig.socials.facebook} className="text-xs text-white/40 hover:text-white transition-colors">
                Facebook
              </a>
              <a href={siteConfig.socials.tripadvisor} className="text-xs text-white/40 hover:text-white transition-colors">
                TripAdvisor
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
