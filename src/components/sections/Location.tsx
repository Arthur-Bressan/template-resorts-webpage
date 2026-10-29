import type { SiteSettings } from "@/lib/data";
import { MapPin, Phone } from "lucide-react";

interface LocationProps { siteSettings: SiteSettings; }

export function Location({ siteSettings }: LocationProps) {
  const validCoordinates = Number.isFinite(siteSettings.lat) && Math.abs(siteSettings.lat) <= 90 && Number.isFinite(siteSettings.lng) && Math.abs(siteSettings.lng) <= 180;
  const query = validCoordinates ? `${siteSettings.lat},${siteSettings.lng}` : siteSettings.address;
  return (
    <section id="location" className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-10 font-serif">Encontre o Refúgio</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            {query ? <>
              <div className="relative h-[320px] overflow-hidden rounded-xl bg-[var(--color-surface)] md:h-[440px]">
                <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`} className="absolute inset-0 h-full w-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Localização de ${siteSettings.name} no Google Maps`} />
              </div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] hover:text-white"><MapPin className="h-4 w-4" aria-hidden="true" />Abrir no Google Maps</a>
            </> : <p>A localização está indisponível no momento. Consulte a equipe antes de viajar.</p>}
          </div>
          <div className="space-y-7 lg:pt-4">
            <div>
              <h3 className="mb-3 font-serif text-2xl">Como chegar</h3>
              <address className="not-italic text-base leading-relaxed text-[var(--color-text)]">{siteSettings.name}<br />{siteSettings.address || "Consulte o endereço com a equipe."}</address>
            </div>
            <p className="text-base leading-relaxed">Abra o mapa para planejar seu trajeto a partir do ponto de partida. Os tempos de viagem variam conforme a rota e as condições da estrada.</p>
            <p className="text-base leading-relaxed">Para orientações de acesso e dúvidas sobre a chegada, entre em contato antes da viagem.</p>
            {siteSettings.phone && <a href={`tel:${siteSettings.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"><Phone className="h-4 w-4" aria-hidden="true" />{siteSettings.phone}</a>}
          </div>
        </div>
      </div>
    </section>
  );
}
