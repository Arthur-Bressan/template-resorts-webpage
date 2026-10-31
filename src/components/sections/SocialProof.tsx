"use client";

import type { Stat } from "@/lib/data";
import { Leaf, TreePine, Mountain, Droplets } from "lucide-react";

const icons = [TreePine, Mountain, Droplets, Leaf];

export function SocialProof({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;

  return (
    <section className="relative bg-[var(--color-surface)] py-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {stats.slice(0, 4).map((stat, index) => {
            const Icon = icons[index % icons.length];
            return (
            <div
              key={stat.id}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full glass"
            >
              <Icon className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm text-[var(--color-text)]">
                <strong className="font-semibold">{stat.value}{stat.suffix}</strong>{" "}
                <span className="font-medium">{stat.label}</span>
              </span>
            </div>
          )})}
        </div>
      </div>
    </section>
  );
}
