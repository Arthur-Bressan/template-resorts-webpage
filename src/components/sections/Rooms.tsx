import Image from "next/image";
import Link from "next/link";
import type { Room } from "@/lib/data";
import { Users, Maximize2, ArrowRight } from "lucide-react";

interface RoomsProps { rooms: Room[]; }

export function Rooms({ rooms }: RoomsProps) {
  return (
    <section id="rooms" className="section-padding bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="mb-4 font-serif">Encontre seu refúgio</h2>
          <p className="text-base">Compare as acomodações, conheça os detalhes e escolha sua estadia.</p>
        </div>
        {rooms.length === 0 ? <div className="py-8">
          <p className="mb-4">Não foi possível apresentar as acomodações no momento.</p>
          <a href="/#booking" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Consulte a equipe sobre sua estadia</a>
        </div> : <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
          {rooms.map((room) => <article key={room.id} className="min-w-0">
            <Link href={`/quartos/${room.slug}`} className="group relative mb-5 block aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-surface-alt)]">
              {room.images[0]?.src ? <Image src={room.images[0].src} alt={room.images[0].alt || room.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center p-6 text-sm text-[var(--color-text-muted)]">Fotos desta acomodação indisponíveis</span>}
            </Link>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-serif text-2xl"><Link href={`/quartos/${room.slug}`}>{room.name}</Link></h3>
              <p className="text-sm"><strong className="font-semibold text-[var(--color-text)]">{room.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> / noite</p>
            </div>
            <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-text-muted)]"><span className="flex items-center gap-1.5"><Users aria-hidden="true" className="h-4 w-4" />Até {room.capacity} hóspedes</span><span className="flex items-center gap-1.5"><Maximize2 aria-hidden="true" className="h-4 w-4" />{room.size} m²</span></div>
            <p className="mb-5 text-base leading-relaxed">{room.description}</p>
            {room.amenities.length > 0 && <ul className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-text)]">{room.amenities.slice(0, 4).map((amenity) => <li key={amenity.id}>{amenity.name}</li>)}</ul>}
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/reservas?room=${encodeURIComponent(room.slug)}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] hover:text-white">Reservar agora</Link>
              <Link href={`/quartos/${room.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">Ver detalhes<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </article>)}
        </div>}
      </div>
    </section>
  );
}
