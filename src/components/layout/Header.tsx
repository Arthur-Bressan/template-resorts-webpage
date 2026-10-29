"use client";

import { useEffect, useState } from "react";
import { Menu, X, Leaf } from "lucide-react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import type { SiteSettings, NavLink } from "@/lib/data";

interface HeaderProps { siteSettings: SiteSettings; navLinks: NavLink[]; }

export function Header({ siteSettings, navLinks }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const showSolid = scrolled || pathname !== "/";
  const destination = (href: string) => href.startsWith("#") ? "/" + href : href;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors ${showSolid ? "glass-strong py-3" : "bg-transparent py-5"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${showSolid ? "bg-[var(--color-primary)]" : "bg-white/20"}`}><Leaf className="h-5 w-5 text-white" aria-hidden="true" /></span>
            <span className={`font-serif text-base font-medium sm:text-lg ${showSolid ? "text-[var(--color-text)]" : "text-white"}`}>{siteSettings.name}</span>
          </a>
          <nav aria-label="Navegação principal" className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => <a key={link.id} href={destination(link.href)} aria-current={link.href === pathname ? "page" : undefined} className={`py-2 text-sm font-semibold ${showSolid ? "text-[var(--color-text)] hover:text-[var(--color-primary)]" : "text-white hover:text-white/80"}`}>{link.label}</a>)}
          </nav>
          <a href="/reservas" className="hidden min-h-11 items-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] hover:text-white lg:inline-flex">Reservar online</a>
          <Dialog.Trigger asChild>
            <button type="button" aria-label="Abrir menu de navegação" aria-expanded={mobileOpen} aria-controls="mobile-navigation" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg lg:hidden ${showSolid ? "text-[var(--color-text)]" : "text-white"}`}><Menu className="h-6 w-6" aria-hidden="true" /></button>
          </Dialog.Trigger>
        </div>
      </header>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/50" />
        <Dialog.Content id="mobile-navigation" data-lenis-prevent aria-describedby={undefined} className="fixed inset-y-0 right-0 z-[71] w-80 max-w-[90vw] overflow-y-auto overscroll-contain bg-[var(--color-background)] p-6 pb-12">
          <div className="mb-8 flex items-center justify-between gap-3">
            <Dialog.Title className="font-serif text-2xl">Navegação</Dialog.Title>
            <Dialog.Close aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text)]"><X className="h-6 w-6" aria-hidden="true" /></Dialog.Close>
          </div>
          <nav aria-label="Navegação móvel" className="flex flex-col">
            {navLinks.map((link) => <Dialog.Close asChild key={link.id}><a href={destination(link.href)} aria-current={link.href === pathname ? "page" : undefined} className="border-b border-[var(--color-border)] py-4 text-base font-semibold text-[var(--color-text)]">{link.label}</a></Dialog.Close>)}
          </nav>
          <Dialog.Close asChild><a href="/reservas" className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-3 font-semibold text-white hover:text-white">Reservar online</a></Dialog.Close>
          <Dialog.Close asChild><a href="/#booking" className="mt-3 flex min-h-12 items-center justify-center underline underline-offset-4">Falar com a equipe</a></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
