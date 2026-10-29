"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Images, BedDouble } from "lucide-react";

const badges = [
  { icon: BedDouble, label: "Conheça as acomodações", href: "/#rooms" },
  { icon: Images, label: "Explore a galeria", href: "/#gallery" },
  { icon: MapPin, label: "Veja como chegar", href: "/#location" },
  { icon: CalendarDays, label: "Planeje sua estadia", href: "/reservas" },
];

export function SocialProof() {
  return (
    <section className="relative bg-[var(--color-surface)] py-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {badges.map((badge) => (
            <Link
              key={badge.label}
              href={badge.href}
              className="flex min-h-11 items-center gap-2.5 px-2 py-2 text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
            >
              <badge.icon className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {badge.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
