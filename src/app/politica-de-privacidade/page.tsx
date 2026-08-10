import Link from "next/link"
import { siteConfig } from "@/data/site"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade e proteção de dados pessoais conforme a LGPD — Refúgio Mata Atlântica.",
}

export default function PoliticaDePrivacidade() {
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
            Política de Privacidade
          </h1>
          <p className="mt-4 text-lg opacity-80">
            Proteção dos seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
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

        {/* 1. Controlador dos dados */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            1. Controlador dos Dados
          </h2>
          <p className="leading-relaxed">
            O controlador dos seus dados pessoais é{" "}
            <strong>{siteConfig.name}</strong>, com sede na{" "}
            <strong>{siteConfig.address}</strong>. Para quaisquer questões
            relacionadas a esta política, entre em contato pelo e-mail{" "}
            <a
              href={`mailto:${siteConfig.email}`}
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              {siteConfig.email}
            </a>
            .
          </p>
        </article>

        {/* 2. Dados coletados */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            2. Dados Coletados
          </h2>
          <p className="mb-4 leading-relaxed">
            Coletamos os seguintes dados pessoais, fornecidos diretamente por
            você ou obtidos de forma automática durante a navegação:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Dados de identificação:</strong> nome completo, CPF
              ou passaporte, data de nascimento, telefone e endereço de
              e-mail, necessários para a realização de reservas e
              check-in.
            </li>
            <li>
              <strong>Dados de pagamento:</strong> informações necessárias
              para o processamento de transações financeiras, tratadas
              exclusivamente por plataformas de pagamento certificadas (PCI
              DSS).
            </li>
            <li>
              <strong>Dados de navegação:</strong> endereço IP, tipo de
              navegador, páginas visitadas, tempo de permanência, região
              geográfica aproximada e dados de cookies, conforme detalhado
              na Seção 8.
            </li>
            <li>
              <strong>Dados de comunicação:</strong> mensagens enviadas
              através de formulários de contato, WhatsApp ou e-mail.
            </li>
            <li>
              <strong>Dados de preferências:</strong> preferências de
              acomodação, alimentação e experiências, utilizados para
              personalizar sua estadia.
            </li>
          </ul>
        </article>

        {/* 3. Finalidade do tratamento */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            3. Finalidade do Tratamento
          </h2>
          <p className="mb-4 leading-relaxed">
            Seus dados pessoais são tratados para as seguintes finalidades:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Gestão de reservas e hospedagem:</strong> processar
              reservas, realizar check-in/check-out e garantir a qualidade do
              serviço durante sua estadia.
            </li>
            <li>
              <strong>Comunicação:</strong> responder a solicitações,
              enviar confirmações de reserva, informações sobre sua
              estadia e, com seu consentimento, materiais promocionais e
              ofertas especiais.
            </li>
            <li>
              <strong>Personalização:</strong> adaptar a experiência de
              hospedagem às suas preferências e necessidades.
            </li>
            <li>
              <strong>Obrigações legais e regulatórias:</strong> cumprir
              obrigações fiscais, de segurança pública e
              regulamentações do setor hoteleiro.
            </li>
            <li>
              <strong>Melhoria dos serviços:</strong> analisar dados de
              navegação e feedback para aprimorar nossos serviços e
              experiências.
            </li>
          </ul>
        </article>

        {/* 4. Compartilhamento */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            4. Compartilhamento de Dados
          </h2>
          <p className="mb-4 leading-relaxed">
            Seus dados pessoais poderão ser compartilhados com:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Plataformas de pagamento:</strong> para processar
              transações financeiras de forma segura.
            </li>
            <li>
              <strong>Órgãos públicos:</strong> quando exigido por lei ou
              determinação judicial.
            </li>
            <li>
              <strong>Prestadores de serviço:</strong> empresas que atuam em
              nosso nome (limpeza, manutenção, gastronomia), sob
              contratos de confidencialidade.
            </li>
            <li>
              <strong>Parceiros de experiências:</strong> guias, transportadoras
              e provedores de experiências locais, exclusivamente para
              viabilizar os serviços contratados.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Não comercializamos, alugamos ou compartilhamos seus dados
            pessoais com terceiros para fins de marketing sem o seu
            consentimento expresso.
          </p>
        </article>

        {/* 5. Retenção */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            5. Retenção de Dados
          </h2>
          <p className="leading-relaxed">
            Seus dados pessoais serão retidos pelo período necessário para
            cumprir as finalidades descritas nesta política, respeitando os
            prazos legais aplicáveis. Dados de hospedagem são mantidos por
            5 (cinco) anos para fins fiscais, conforme legislação
            brasileira. Dados de navegação são retidos por até 180
            (cento e oitenta) dias. Ao término do período de retenção,
            os dados serão eliminados de forma segura.
          </p>
        </article>

        {/* 6. Direitos do titular */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            6. Direitos do Titular (Art. 18 da LGPD)
          </h2>
          <p className="mb-4 leading-relaxed">
            Conforme a Lei Geral de Proteção de Dados, você possui os
            seguintes direitos em relação aos seus dados pessoais:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Confirmação e acesso:</strong> confirmar a existência
              de tratamento e acessar seus dados pessoais.
            </li>
            <li>
              <strong>Correção:</strong> solicitar a correção de dados
              incompletos, inexatos ou desatualizados.
            </li>
            <li>
              <strong>Anonimização, bloqueio ou eliminação:</strong>
              solicitar a anonimização, bloqueio ou eliminação de dados
              desnecessários ou em excesso.
            </li>
            <li>
              <strong>Portabilidade:</strong> solicitar a portabilidade dos dados
              a outro fornecedor de serviço.
            </li>
            <li>
              <strong>Eliminação de dados tratados com consentimento:</strong>{" "}
              solicitar a eliminação dos dados pessoais tratados com base
              no seu consentimento.
            </li>
            <li>
              <strong>Informação sobre compartilhamento:</strong> ser
              informado sobre as entidades públicas e privadas com as quais
              seus dados foram compartilhados.
            </li>
            <li>
              <strong>Revogação do consentimento:</strong> revogar o
              consentimento a qualquer momento, sem comprometer a licitude do
              tratamento anterior.
            </li>
          </ul>
        </article>

        {/* 7. Como exercer seus direitos */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            7. Como Exercer Seus Direitos
          </h2>
          <p className="leading-relaxed">
            Para exercer qualquer dos direitos descritos acima, entre em
            contato conosco através do e-mail{" "}
            <a
              href={`mailto:${siteConfig.email}`}
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              {siteConfig.email}
            </a>{" "}
            ou pelo telefone{" "}
            <a
              href={`tel:${siteConfig.phone}`}
              className="underline"
              style={{ color: "var(--color-primary)" }}
            >
              {siteConfig.phone}
            </a>
            . As solicitações serão respondidas no prazo de até 15
            (quinze) dias, conforme previsto na LGPD.
          </p>
        </article>

        {/* 8. Cookies e tecnologias */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            8. Cookies e Tecnologias de Rastreamento
          </h2>
          <p className="mb-4 leading-relaxed">
            Nosso site utiliza cookies e tecnologias semelhantes para melhorar
            sua experiência de navegação. Os cookies utilizados são
            classificados em:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Cookies essenciais:</strong> necessários para o
              funcionamento básico do site, como segurança e
              preferências de sessão. Não requerem consentimento.
            </li>
            <li>
              <strong>Cookies de desempenho:</strong> coletam informações
              sobre como os visitantes utilizam o site, permitindo-nos
              otimizar a experiência.
            </li>
            <li>
              <strong>Cookies de funcionalidade:</strong> permitem lembrar suas
              preferências (como idioma) e personalizar sua experiência.
            </li>
            <li>
              <strong>Cookies de marketing:</strong> utilizados para exibir
              conteúdo relevante. Somente ativados com seu consentimento
              expresso.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Você pode gerenciar suas preferências de cookies a qualquer
            momento através das configurações do seu navegador. A
            desativação de certos cookies pode afetar a funcionalidade
            do site.
          </p>
        </article>

        {/* 9. Alterações */}
        <article className="mb-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            9. Alterações nesta Política
          </h2>
          <p className="leading-relaxed">
            Esta Política de Privacidade pode ser atualizada periodicamente
            para refletir mudanças em nossas práticas ou alterações
            na legislação aplicável. Recomendamos que você a consulte
            regularmente. As alterações significativas serão comunicadas
            através do nosso site ou por e-mail.
          </p>
        </article>

        {/* 10. Contato */}
        <article className="mb-16">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">
            10. Disponível para Contato
          </h2>
          <p className="leading-relaxed">
            Se você tiver qualquer dúvida, preocupação ou
            solicitação relacionada a esta Política de Privacidade ou ao
            tratamento dos seus dados pessoais, entre em contato:
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
