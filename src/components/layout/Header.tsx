"use client";

import { useEffect, useState, useCallback } from "react";
import { Menu, X, Leaf } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { SiteSettings, NavLink } from "@/lib/data";

interface HeaderProps {
  siteSettings: SiteSettings;
  navLinks: NavLink[];
}

export function Header({ siteSettings, navLinks }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/";

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleNavClick = useCallback((href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/")) {
      router.push(href);
      return;
    }
    if (isHome) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/" + href);
    }
  }, [isHome, router]);

  const isActive = (href: string) => href.startsWith("/") ? pathname === href : false;

  const showSolid = scrolled || !isHome;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${showSolid ? "glass-strong shadow-sm py-3" : "bg-transparent py-5"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${showSolid ? "bg-[var(--color-primary)]" : "bg-white/20 backdrop-blur-sm border border-white/30"}`}>
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className={`font-serif text-lg font-medium tracking-tight transition-colors duration-300 ${showSolid ? "text-[var(--color-text)]" : "text-white"}`}>
              {siteSettings.name}
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={`text-sm font-medium tracking-wide transition-colors duration-300 ${
                    active
                      ? showSolid ? "text-[var(--color-primary)] font-semibold" : "text-white font-semibold"
                      : showSolid ? "text-[var(--color-text-muted)] hover:text-[var(--color-text)]" : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          <a
            href="/reservas"
            className={`hidden lg:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              showSolid
                ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                : "bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
            }`}
          >
            Reservas
          </a>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${showSolid ? "text-[var(--color-text)]" : "text-white"}`}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden fixed inset-0 top-0 z-40 transition-all duration-500 ${mobileOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[var(--color-background)] shadow-xl transition-transform duration-500 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="p-6 pt-20">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={`text-left py-3 px-4 rounded-xl font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 px-4 space-y-2">
              <a
                href="/reservas"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Reservar Online
              </a>
              <button
                onClick={() => handleNavClick("#booking")}
                className="block w-full text-center py-3 rounded-full border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[var(--color-surface)] transition-colors"
              >
                Contato
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
