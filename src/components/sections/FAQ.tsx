import type { FAQ as FAQType } from "@/lib/data";
import { ChevronDown } from "lucide-react";

interface FAQProps { faqItems: FAQType[]; }

export function FAQ({ faqItems }: FAQProps) {
  return (
    <section id="faq" className="section-padding">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center font-serif">Perguntas e respostas</h2>
        {faqItems.length === 0 ? <p className="text-center">As perguntas frequentes estão indisponíveis no momento. <a href="/#booking" className="underline underline-offset-4">Fale com a equipe</a> para esclarecer suas dúvidas.</p> : (
          <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {faqItems.map((item) => (
              <details key={item.id} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
                  {item.question}<ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pb-6 text-base leading-relaxed whitespace-pre-line">{item.answer}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
