"use client";

import { useReveal } from "@/hooks/useReveal";
import { faqItems } from "@/data/site";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FAQ() {
  const ref = useReveal();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section
      ref={ref}
      id="faq"
      className="relative section-padding overflow-hidden"
    >
      <div className="blob w-[500px] h-[500px] bg-[var(--color-secondary-light)] -top-40 right-0" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="reveal inline-block text-sm font-semibold text-[var(--color-primary)] tracking-wider uppercase mb-4">
            Dúvidas Frequentes
          </span>
          <h2 className="reveal font-serif text-[var(--color-text)] mb-4">
            <span className="text-mask-line">
              <span>Perguntas & Respostas</span>
            </span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3" data-stagger>
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              data-stagger-child
              className="rounded-xl bg-[var(--color-surface)] overflow-hidden transition-shadow hover:shadow-md"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50"
                aria-expanded={openIdx === idx}
              >
                <span className="text-base font-medium text-[var(--color-text)] pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-text-muted)] shrink-0 transition-transform duration-300 ${
                    openIdx === idx ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIdx === idx ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="px-6 pb-5 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
