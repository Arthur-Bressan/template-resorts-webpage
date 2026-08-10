"use client";

import { useEffect, useRef, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import type { Room, Room as RoomType, SiteSettings } from "@/lib/data";
import { gsap } from "@/components/layout/SmoothScrollProvider";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  Users,
  Maximize2,
  BedDouble,
  Wifi,
  TreePine,
  Mountain,
  Flame,
  Dog,
  Flower2,
  Wine,
  ImageIcon,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Shield,
  Star,
  ArrowRight,
} from "lucide-react";

/* ─── Icon map ─── */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BedDouble, Wifi, TreePine, Mountain, Flame, Dog, Flower2, Wine, ShowerHead: CheckCircle2, AirVent: CheckCircle2, Sparkles: CheckCircle2, Bath: CheckCircle2, Trees: TreePine, DoorOpen: CheckCircle2, Sun: CheckCircle2, Shirt: CheckCircle2, CookingPot: CheckCircle2,
};

/* ─── Breadcrumb Hero ─── */
function BreadcrumbHero({ room }: { room: Room }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      const els = ref.current?.querySelectorAll<HTMLElement>(".fade-in");
      if (els?.length) {
        gsap.set(els, { opacity: 0, y: 20 });
        gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power2.out", delay: 0.2 });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#3F5A48] via-[#29392F] to-[#2E2A22]" />
      <div className="absolute inset-0 opacity-[0.04]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="room-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#room-grid)" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="fade-in mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-white/60 flex-wrap">
            <li><a href="/" className="hover:text-white transition-colors">Início</a></li>
            <li><ChevronRight className="w-3.5 h-3.5" /></li>
            <li><a href="/#rooms" className="hover:text-white transition-colors">Acomodações</a></li>
            <li><ChevronRight className="w-3.5 h-3.5" /></li>
            <li className="text-white/90">{room.name}</li>
          </ol>
        </nav>

        <div className="fade-in flex items-center gap-3 mb-4">
          <Link
            href="/#rooms"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para acomodações
          </Link>
        </div>

        <h1 className="fade-in font-serif text-white text-4xl md:text-5xl lg:text-6xl leading-tight max-w-3xl">
          {room.name}
        </h1>

        <div className="fade-in mt-4 flex flex-wrap items-center gap-4 text-white/70">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {room.capacity} hóspedes
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="w-4 h-4" /> {room.size}m²
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="w-4 h-4" /> {room.bedType}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Gallery ─── */
function GallerySection({ room }: { room: Room }) {
  const ref = useReveal();
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section ref={ref} className="section-padding bg-[var(--color-background)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="reveal font-serif text-[var(--color-text)] mb-8">
          <span className="text-mask-line"><span>Galeria</span></span>
        </h2>

        {/* Main image */}
        <div
          className="reveal rounded-2xl overflow-hidden bg-[var(--color-surface)] aspect-[16/9] md:aspect-[21/9] flex items-center justify-center mb-4"
        >
          <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
            <ImageIcon className="w-16 h-16 opacity-20" />
            <span className="text-sm opacity-40">{room.images[activeIdx]?.alt || "Foto principal"}</span>
          </div>
        </div>

        {/* Thumbnails */}
        <div className="flex gap-3 overflow-x-auto pb-2" data-stagger>
          {room.images.map((img, idx) => (
            <button
              key={img.id}
              data-stagger-child
              onClick={() => setActiveIdx(idx)}
              className={`shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-[var(--color-surface)] flex items-center justify-center transition-all duration-300 border-2 ${
                activeIdx === idx
                  ? "border-[var(--color-primary)] shadow-md"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex flex-col items-center gap-1 text-[var(--color-text-muted)]">
                <ImageIcon className="w-5 h-5 opacity-20" />
                <span className="text-[10px] opacity-30">Foto {idx + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Description ─── */
function DescriptionSection({ room }: { room: Room }) {
  const ref = useReveal();

  return (
    <section ref={ref} className="section-padding bg-[var(--color-surface)]">
      <div className="blob w-[400px] h-[400px] bg-[var(--color-primary-light)] -top-40 -right-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Description */}
          <div className="lg:col-span-3">
            <h2 className="reveal font-serif text-[var(--color-text)] mb-6">
              <span className="text-mask-line"><span>Sobre esta acomodação</span></span>
            </h2>
            <p className="reveal text-base text-[var(--color-text-muted)] leading-relaxed">
              {room.descriptionLong}
            </p>
          </div>

          {/* Amenities */}
          <div className="lg:col-span-2">
            <h3 className="reveal font-serif text-xl text-[var(--color-text)] mb-5">
              Amenidades
            </h3>
            <div className="space-y-3" data-stagger>
              {room.amenities.map((a) => {
                const Icon = iconMap[a.icon] || CheckCircle2;
                return (
                  <div
                    key={a.id}
                    data-stagger-child
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-background)]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-[var(--color-primary)]" />
                    </div>
                    <span className="text-sm text-[var(--color-text)]">{a.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Info Strip ─── */
function InfoStrip({ room }: { room: Room }) {
  return (
    <section className="bg-[var(--color-background)] border-y border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: BedDouble, label: "Tipo de Cama", value: room.bedType },
            { icon: Users, label: "Capacidade", value: `${room.capacity} hóspedes` },
            { icon: Maximize2, label: "Área", value: `${room.size}m²` },
            { icon: Star, label: "Avaliação", value: "4.9 / 5.0" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Policy ─── */
function PolicySection({ room }: { room: Room }) {
  return (
    <section className="bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start gap-4 p-6 rounded-2xl bg-[var(--color-background)]">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-[var(--color-text)] mb-2">Política de Reserva</h3>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{room.policy}</p>
            <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Check-in: 15h</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Check-out: 12h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Price CTA ─── */
function PriceCTA({ room, siteSettings }: { room: Room; siteSettings: SiteSettings }) {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-primary-dark)]" />
      <div className="blob w-72 h-72 bg-[var(--color-accent)] top-10 -left-36" />
      <div className="blob w-96 h-96 bg-[var(--color-primary-light)] -bottom-48 right-0" />

      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="room-cta-dots" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="1" fill="white" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#room-cta-dots)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-white/50 uppercase tracking-wider mb-4">A partir de</p>
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="font-serif text-5xl md:text-6xl text-white">R$ {room.price}</span>
          <span className="text-lg text-white/50">/noite</span>
        </div>
        <p className="text-sm text-white/50 mb-2">Café da manhã incluso • Wi-Fi grátis</p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-white/80">Café da manhã grátis em reservas diretas</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`tel:${siteSettings.phone}`}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-semibold text-base hover:bg-[var(--color-accent)]/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-w-[220px] justify-center"
          >
            <Phone className="w-4 h-4" />
            Reservar Agora
          </a>
          <a
            href={`mailto:${siteSettings.email}?subject=Reserva%20-%20${room.name}`}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white/15 backdrop-blur-sm text-white font-medium text-base border border-white/25 hover:bg-white/25 transition-all min-w-[220px] justify-center"
          >
            <Mail className="w-4 h-4" />
            Solicitar Disponibilidade
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── You Might Also Like ─── */
function AlsoLike({ currentSlug, rooms }: { currentSlug: string; rooms: Room[] }) {
  const ref = useReveal();
  const others = rooms.filter((r) => r.slug !== currentSlug).slice(0, 3);

  return (
    <section ref={ref} className="section-padding bg-[var(--color-background)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="reveal font-serif text-[var(--color-text)] mb-10 text-center">
          <span className="text-mask-line"><span>Você também pode gostar</span></span>
        </h2>

        <div className="grid sm:grid-cols-3 gap-6" data-stagger>
          {others.map((room) => (
            <Link
              key={room.id}
              href={`/quartos/${room.slug}`}
              data-stagger-child
              className="group rounded-2xl overflow-hidden bg-[var(--color-surface)] hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
            >
              {/* Skeleton */}
              <div className="relative h-48 overflow-hidden bg-[var(--color-surface-alt)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                  <ImageIcon className="w-8 h-8 opacity-20" />
                  <span className="text-xs opacity-30">{room.name}</span>
                </div>
                <div className="absolute bottom-3 right-3 glass-strong rounded-full px-2.5 py-1">
                  <span className="text-xs font-semibold text-[var(--color-primary-dark)]">R$ {room.price}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-serif text-lg text-[var(--color-text)] mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                  {room.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">{room.bedType} • {room.size}m²</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
                  Ver mais
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Not Found ─── */
function NotFound() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-5xl text-[var(--color-text)] mb-4">Acomodação não encontrada</h1>
        <p className="text-[var(--color-text-muted)] mb-8">O quarto que você procura não existe ou foi removido.</p>
        <Link href="/#rooms" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-dark)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Ver todas as acomodações
        </Link>
      </div>
    </section>
  );
}

/* ─── Page ─── */
interface RoomDetailPageProps {
  room: Room | null;
  allRooms: Room[];
  siteSettings: SiteSettings;
}

export default function RoomDetailPage({ room, allRooms, siteSettings }: RoomDetailPageProps) {
  if (!room) return <NotFound />;

  return (
    <>
      <BreadcrumbHero room={room} />
      <GallerySection room={room} />
      <DescriptionSection room={room} />
      <InfoStrip room={room} />
      <PolicySection room={room} />
      <PriceCTA room={room} siteSettings={siteSettings} />
      <AlsoLike currentSlug={room.slug} rooms={allRooms} />
    </>
  );
}