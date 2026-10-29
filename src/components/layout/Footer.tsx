"use client";

import type { SiteSettings, Stat } from "@/lib/data";
import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";

interface FooterProps { siteSettings: SiteSettings; stats: Stat[]; }

export function Footer({ siteSettings, stats }: FooterProps) {
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), consent: data.get("consent") === "on" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Não foi possível concluir a inscrição. Tente novamente.");
      setFeedback({ kind: "success", message: "Inscrição registrada. Você poderá receber novidades da pousada." });
      form.reset();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Não foi possível concluir a inscrição. Tente novamente." });
    } finally {
      setSending(false);
    }
  }

  return (
    <footer className="bg-[var(--color-primary-dark)] text-[var(--color-background)]">
      {stats.length > 0 && <div className="border-b border-white/15">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => <div key={stat.id} className="text-center">
            <span className="font-serif text-4xl text-[var(--color-secondary-light)]">{stat.value.toLocaleString("pt-BR")}{stat.suffix}</span>
            <p className="mt-2 text-sm text-white/80">{stat.label}</p>
          </div>)}
        </div>
      </div>}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="/" className="mb-4 flex items-center gap-2.5 text-white hover:text-white"><Leaf className="h-5 w-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" /><span className="font-serif text-lg font-medium">{siteSettings.name}</span></a>
            <p className="text-sm leading-relaxed text-white/80">{siteSettings.description.length > 160 ? siteSettings.description.slice(0, 160).trimEnd() + "…" : siteSettings.description}</p>
          </div>
          <div>
            <h2 className="mb-5 font-sans text-sm font-semibold text-white">Navegação</h2>
            <ul className="space-y-3">
              {[{ label: "A pousada", href: "/sobre" }, { label: "Acomodações", href: "/#rooms" }, { label: "Experiências", href: "/#experiences" }, { label: "Galeria", href: "/#gallery" }, { label: "Perguntas frequentes", href: "/#faq" }, { label: "Reservar online", href: "/reservas" }].map((link) => <li key={link.href}><a href={link.href} className="inline-block py-1 text-sm text-white/80 hover:text-white">{link.label}</a></li>)}
            </ul>
          </div>
          <div>
            <h2 className="mb-5 font-sans text-sm font-semibold text-white">Contato</h2>
            <ul className="space-y-4">
              {siteSettings.phone && <li><a href={`tel:${siteSettings.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2.5 text-sm text-white/80 hover:text-white"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" />{siteSettings.phone}</a></li>}
              {siteSettings.email && <li><a href={`mailto:${siteSettings.email}`} className="flex items-start gap-2.5 break-all text-sm text-white/80 hover:text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{siteSettings.email}</a></li>}
              {siteSettings.address && <li className="flex items-start gap-2.5 text-sm text-white/80"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><address className="not-italic">{siteSettings.address}</address></li>}
            </ul>
          </div>
          <div>
            <h2 className="mb-5 font-sans text-sm font-semibold text-white">Novidades da pousada</h2>
            <p id="newsletter-description" className="mb-4 text-sm text-white/80">Cadastre seu e-mail para receber novidades.</p>
            <form onSubmit={subscribe} aria-describedby="newsletter-description" className="space-y-4">
              <div>
                <label htmlFor="newsletter-email" className="mb-2 block text-sm text-white">Seu e-mail</label>
                <input id="newsletter-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={sending} aria-describedby={feedback?.kind === "error" ? "newsletter-feedback" : undefined} className="min-h-11 w-full min-w-0 rounded-lg border border-white/40 bg-white/10 px-3 py-2.5 text-base text-white disabled:opacity-60" />
              </div>
              <label className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
                <input name="consent" type="checkbox" required disabled={sending} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
                Autorizo o uso do meu e-mail para receber comunicações da pousada.
              </label>
              <a href="/politica-de-privacidade" className="inline-block text-sm text-white underline underline-offset-4 hover:text-white">Como tratamos seus dados</a>
              <button type="submit" disabled={sending} className="flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-dark)] hover:bg-[var(--color-secondary-light)] disabled:cursor-wait disabled:opacity-60">{sending ? "Registrando…" : "Receber novidades"}</button>
              <p id="newsletter-feedback" role={feedback?.kind === "error" ? "alert" : "status"} aria-live={feedback?.kind === "error" ? "assertive" : "polite"} aria-atomic="true" className="min-h-6 text-sm text-white">{feedback?.message}</p>
            </form>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
          <p className="text-xs text-white/75">© {new Date().getFullYear()} {siteSettings.name}. Todos os direitos reservados.</p>
          <nav aria-label="Informações legais e redes sociais" className="flex flex-wrap gap-x-5 gap-y-3">
            <a href="/politica-de-privacidade" className="text-xs text-white/80 hover:text-white">Privacidade</a>
            <a href="/termos-de-uso" className="text-xs text-white/80 hover:text-white">Termos de uso</a>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("cookie-consent-open"))} className="text-xs text-white/80 hover:text-white">Preferências de cookies</button>
            {[{ label: "Instagram", href: siteSettings.instagram }, { label: "Facebook", href: siteSettings.facebook }, { label: "TripAdvisor", href: siteSettings.tripadvisor }].filter((link) => /^https?:\/\//.test(link.href)).map((link) => <a key={link.label} href={link.href} className="text-xs text-white/80 hover:text-white">{link.label}</a>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
