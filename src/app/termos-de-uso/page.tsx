import Link from "next/link"
import { siteConfig } from "@/data/site"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos e condições de uso do site e dos serviços do Refúgio Mata Atlântica.",
}

export default function TermosDeUso() {
  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-text)",
      }}
    >
      {/* Hero banner */}
      <section
        className="relative py-24 md:py-32"
        style={{
          backgroundColor: "var(--color-primary-dark)",
          color: "white",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight">
            Termos de Uso
          </h1>
          <p className="mt-4 text-lg opacity-80">
            Condições gerais para utilização do site e dos serviços oferecidos pela {siteConfig.name}.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p
          className="mb-12 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Última atualização: Janeiro de 2025
        </p>

        {/* 1. Aceitação dos termos */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            1. Aceitação dos Termos
          </h2>
          <p className="leading-relaxed">
            Ao acessar e utilizar o site da <strong>{siteConfig.name}</strong>,
            você concorda integralmente com os presentes Termos de Uso. Caso
            não concorde com qualquer disposição aqui contida, solicitamos
            que não utilize o site. O uso continuado do site após
            possíveis atualizações destes termos constitui aceitação das
            alterações realizadas.
          </p>
        </article>

        {/* 2. Uso do site */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            2. Uso do Site
          </h2>
          <p className="mb-4 leading-relaxed">
            O site é disponibilizado para fins informativos e de reserva de
            hospedagem e experiências. Ao utilizar o site, você concorda em:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Fornecer informações verdadeiras, precisas e completas ao
              realizar reservas ou preencher formulários.
            </li>
            <li>
              Não utilizar o site para fins ilegais, fraudulentos ou que
              possam causar danos a terceiros ou à {siteConfig.name}.
            </li>
            <li>
              Não tentar acessar áreas restritas do site, sistemas ou
              redes conectadas ao servidor sem autorização.
            </li>
            <li>
              Não utilizar robôs, scrapers ou qualquer meio automatizado
              para acessar ou coletar dados do site sem autorização prévia.
            </li>
            <li>
              Respeitar as políticas de reserva, cancelamento e
              no-show descritas nas páginas de acomodação e reserva.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            A {siteConfig.name} reserva-se o direito de suspender ou cancelar
            contas e reservas de usuários que violem estes termos.
          </p>
        </article>

        {/* 3. Propriedade intelectual */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            3. Propriedade Intelectual
          </h2>
          <p className="mb-4 leading-relaxed">
            Todo o conteúdo presente neste site — incluindo, mas não se
            limitando a, textos, imagens, fotografias, logotipos, ícones,
            gráficos, vídeos, layout, design, software e demais materiais — é
            de propriedade exclusiva da {siteConfig.name} ou de seus
            licenciadores, estando protegido pelas leis brasileiras de
            propriedade intelectual e direitos autorais (Lei nº 9.610/1998).
          </p>
          <p className="leading-relaxed">
            É vedada a reprodução, distribuição, modificação, exibição
            pública, transmissão ou utilização do conteúdo deste site para
            fins comerciais sem autorização prévia e expressa da{" "}
            {siteConfig.name}.
          </p>
        </article>

        {/* 4. Limitação de responsabilidade */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            4. Limitação de Responsabilidade
          </h2>
          <p className="mb-4 leading-relaxed">
            A {siteConfig.name} emprega esforços razoáveis para manter as
            informações do site atualizadas e precisas, porém não garante
            que o conteúdo esteja livre de erros ou inexatidões. Em
            particular:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              As fotografias e descrições das acomodações e experiências são
              representativas, mas a disponibilidade de serviços pode variar
              conforme condições climáticas, sazonalidade e outros fatores.
            </li>
            <li>
              Os preços exibidos no site estão sujeitos a alterações sem
              aviso prévio. O valor confirmado no momento da reserva é o
              valor definitivo.
            </li>
            <li>
              A {siteConfig.name} não se responsabiliza por danos diretos,
              indiretos, incidentais ou consequenciais decorrentes do uso
              ou da impossibilidade de uso do site.
            </li>
            <li>
              A {siteConfig.name} não se responsabiliza pelo conteúdo de
              sites de terceiros acessíveis por meio de links disponíveis
              neste site.
            </li>
          </ul>
        </article>

        {/* 5. Links externos */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            5. Links Externos
          </h2>
          <p className="leading-relaxed">
            Este site pode conter links para sites de terceiros, como
            plataformas de reserva, redes sociais e parceiros comerciais.
            Estes links são disponibilizados apenas para conveniência do
            usuário. A {siteConfig.name} não revisa, controla ou endossa o
            conteúdo de sites de terceiros, e não se responsabiliza por
            suas práticas de privacidade, políticas ou conteúdos. O acesso
            a sites externos é por conta e risco do usuário.
          </p>
        </article>

        {/* 6. Alterações nos termos */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            6. Alterações nos Termos
          </h2>
          <p className="leading-relaxed">
            A {siteConfig.name} reserva-se o direito de modificar estes Termos
            de Uso a qualquer momento, sem aviso prévio. As alterações
            entrarão em vigor imediatamente após a publicação no site.
            Recomendamos que você revise esta página periodicamente para se
            manter informado sobre as condições vigentes. O uso continuado
            do site após alterações constitui aceitação dos novos termos.
          </p>
        </article>

        {/* 7. Legislação aplicável */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            7. Legislação Aplicável
          </h2>
          <p className="leading-relaxed">
            Estes Termos de Uso são regidos pelas leis da República
            Federativa do Brasil. Qualquer disputa ou controvérsia
            decorrente do uso deste site será submetida ao foro da Comarca
            de Cunha, Estado de São Paulo, com renúncia a qualquer outro,
            por mais privilegiado que seja. Para questões relacionadas à
            proteção de dados pessoais, aplica-se complementarmente a Lei
            Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e o
            Marco Civil da Internet (Lei nº 12.965/2014).
          </p>
        </article>

        {/* 8. Contato */}
        <article className="mb-16">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            8. Contato
          </h2>
          <p className="leading-relaxed">
            Para esclarecimentos sobre estes Termos de Uso ou qualquer
            assunto relacionado ao nosso site e serviços, entre em contato:
          </p>
          <div
            className="mt-6 rounded-xl p-6"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="font-serif text-lg font-medium mb-1">
              {siteConfig.name}
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              {siteConfig.address}
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              E-mail: {" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="underline"
                style={{ color: "var(--color-primary)" }}
              >
                {siteConfig.email}
              </a>
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              Telefone: {" "}
              <a
                href={`tel:${siteConfig.phone}`}
                className="underline"
                style={{ color: "var(--color-primary)" }}
              >
                {siteConfig.phone}
              </a>
            </p>
          </div>
        </article>

        {/* Back link */}
        <div className="border-t pt-8" style={{ borderColor: "var(--color-border)" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: "var(--color-primary)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Voltar para a página inicial
          </Link>
        </div>
      </section>
    </main>
  )
}
