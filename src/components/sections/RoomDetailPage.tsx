"use client";

import Image from "next/image";
import { useState, type ComponentType } from "react";
import type { Room, SiteSettings } from "@/lib/data";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Users, Maximize2, BedDouble, Wifi, TreePine, Mountain, Flame, Dog, Flower2, Wine, CheckCircle2, Phone, Calendar, Mail } from "lucide-react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  BedDouble, Wifi, TreePine, Mountain, Flame, Dog, Flower2, Wine, Trees: TreePine,
};

function RoomGallery({ room }: { room: Room }) {
  const images = room.images.filter((image) => image.src.trim());
  const [selected, setSelected] = useState(0);
  const active = images[Math.min(selected, Math.max(0, images.length - 1))];
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">Fotos de {room.name}</h2>
        <div className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface)] md:aspect-[16/9]">
          {active ? <Image src={active.src} alt={active.alt || room.name} fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" /> : <p className="px-6 text-center">As fotos desta acomodação estão indisponíveis no momento.</p>}
        </div>
        {images.length > 1 && <div role="group" aria-label="Escolher foto da acomodação" className="flex gap-3 overflow-x-auto py-2">
          {images.map((image, index) => <button key={image.id} type="button" onClick={() => setSelected(index)} aria-pressed={active?.id === image.id} aria-label={`Ver foto ${index + 1}: ${image.alt || room.name}`} className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${active?.id === image.id ? "border-[var(--color-primary)]" : "border-transparent opacity-70 hover:opacity-100"}`}>
            <Image src={image.src} alt="" fill sizes="96px" className="object-cover" />
          </button>)}
        </div>}
        {active?.alt && <p aria-live="polite" className="mt-3 text-sm">{active.alt}</p>}
      </div>
    </section>
  );
}

interface RoomDetailPageProps { room: Room | null; allRooms: Room[]; siteSettings: SiteSettings; }

export default function RoomDetailPage({ room, allRooms, siteSettings }: RoomDetailPageProps) {
  if (!room) return <section className="flex min-h-[60vh] items-center justify-center px-4 pt-28 pb-16"><div className="max-w-2xl text-center"><h1 className="mb-5 font-serif text-4xl">Acomodação não encontrada</h1><p className="mb-6">Esta acomodação está indisponível ou foi removida.</p><Link href="/#rooms" className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Ver acomodações</Link></div></section>;
  const others = allRooms.filter((other) => other.slug !== room.slug).slice(0, 3);
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[var(--color-primary-dark)] pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#3F5A48] via-[#29392F] to-[#2E2A22]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="room-detail-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#room-detail-grid)" />
          </svg>
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/60">
              <li><Link href="/" className="hover:text-white">Início</Link></li>
              <li><ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></li>
              <li><Link href="/#rooms" className="hover:text-white">Acomodações</Link></li>
              <li><ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></li>
              <li aria-current="page" className="text-white/90">{room.name}</li>
            </ol>
          </nav>
          <Link href="/#rooms" className="mb-5 inline-flex min-h-8 items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar para acomodações
          </Link>
          <h1 className="max-w-3xl font-serif text-4xl leading-tight text-white md:text-5xl lg:text-6xl">{room.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-white/75">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" />{room.capacity} hóspedes</span>
            <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4" aria-hidden="true" />{room.size}m²</span>
            {room.bedType && <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" aria-hidden="true" />{room.bedType}</span>}
          </div>
        </div>
      </section>
      <RoomGallery key={room.id} room={room} />
      <section className="section-padding bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:px-8">
          <div className="lg:col-span-3">
            <h2 className="mb-6 font-serif">Sobre a acomodação</h2>
            <p className="text-base leading-relaxed whitespace-pre-line">{room.descriptionLong || room.description || "Consulte a equipe para conhecer os detalhes desta acomodação."}</p>
          </div>
          <div className="lg:col-span-2">
            <h3 className="mb-6 font-serif text-2xl">Comodidades</h3>
            {room.amenities.length === 0 ? <p>As comodidades estão indisponíveis no momento. Confirme os detalhes antes de reservar.</p> : <ul className="space-y-4">{room.amenities.map((amenity) => { const Icon = iconMap[amenity.icon] || CheckCircle2; return <li key={amenity.id} className="flex items-center gap-3"><Icon className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><span>{amenity.name}</span></li>; })}</ul>}
          </div>
        </div>
      </section>
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-5 font-serif text-3xl">Condições da reserva</h2>
          <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed">{room.policy || "Confirme as condições, horários de entrada e saída e regras de cancelamento com a equipe antes de reservar."}</p>
        </div>
      </section>
      <section className="bg-[var(--color-primary-dark)] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-5 font-serif text-white">Reserve {room.name}</h2>
          <p className="mb-3 font-serif text-4xl text-white">{room.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<span className="ml-2 font-sans text-base text-white/85">/ noite</span></p>
          <p className="mb-8 text-base text-white/85">Consulte as datas e o valor total da estadia antes de concluir a reserva.</p>
          <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:flex-wrap">
            <Link href={`/reservas?room=${encodeURIComponent(room.slug)}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 font-semibold text-[var(--color-primary-dark)] hover:bg-[var(--color-secondary-light)]"><Calendar className="h-4 w-4" aria-hidden="true" />Reservar agora</Link>
            {siteSettings.phone && <a href={`tel:${siteSettings.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-semibold text-white hover:bg-white/10 hover:text-white"><Phone className="h-4 w-4" aria-hidden="true" />Tirar dúvidas por telefone</a>}
            {siteSettings.email && <a href={`mailto:${siteSettings.email}?subject=${encodeURIComponent(`Consulta sobre ${room.name}`)}`} className="inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3.5 text-white underline underline-offset-4 hover:text-white"><Mail className="h-4 w-4" aria-hidden="true" />Consultar por e-mail</a>}
          </div>
        </div>
      </section>
      {others.length > 0 && <section className="section-padding">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 font-serif">Outras acomodações</h2>
          <div className="grid gap-8 sm:grid-cols-3">{others.map((other) => <Link key={other.id} href={`/quartos/${other.slug}`} className="group">
            <div className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface)]">{other.images[0]?.src ? <Image src={other.images[0].src} alt={other.images[0].alt || other.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <span className="p-4 text-sm">Fotos indisponíveis</span>}</div>
            <h3 className="mb-2 font-serif text-xl">{other.name}</h3>
            <p className="text-sm">{other.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / noite</p>
          </Link>)}</div>
        </div>
      </section>}
    </>
  );
}
