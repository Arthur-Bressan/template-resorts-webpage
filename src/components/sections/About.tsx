import Image from "next/image";
import Link from "next/link";

export function About() {
  return (
    <section id="about" className="section-padding">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-surface)]">
          <Image src="/images/hero.jpg" alt="Chalés de madeira entre árvores e jardins" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        </div>
        <div>
          <h2 className="mb-6 font-serif">Um tempo para descansar</h2>
          <p className="mb-5 text-base leading-relaxed">Conheça a pousada e escolha a acomodação para sua próxima viagem. Nas páginas dos quartos, você encontra fotos, capacidade e comodidades de cada opção.</p>
          <p className="mb-7 text-base leading-relaxed">Explore a pousada, consulte as condições da estadia e fale com nossa equipe para organizar sua visita.</p>
          <Link href="/sobre" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Conhecer a pousada</Link>
        </div>
      </div>
    </section>
  );
}
