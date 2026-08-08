"use client";

import { useReveal } from "@/hooks/useReveal";
import { Leaf, TreePine, Mountain, Droplets } from "lucide-react";

const badges = [
  { icon: TreePine, label: "Mata Atlântica Preservada" },
  { icon: Mountain, label: "Altitude de 1.200m" },
  { icon: Droplets, label: "Cachoeiras Privativas" },
  { icon: Leaf, label: "Eco-Sustentável" },
];

export function SocialProof() {
  return (
    <section className="relative bg-[var(--color-surface)] py-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full glass"
            >
              <badge.icon className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
