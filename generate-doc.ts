import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, ImageRun, PageBreak, TableOfContents, Header, Footer,
  ShadingType, AlignmentType, BorderStyle, WidthType, PageNumber,
  NumberFormat, TabStopType, TabStopPosition, convertInchesToTwip,
  LevelFormat, SectionType
} from "docx";
import * as fs from "fs";

// ─── COLOR PALETTE (Swiss Tech adapted) ───
const COLORS = {
  primary: "1B5E3B",      // forest green ( Mata Atlântica theme)
  primaryDark: "0F3D26",
  primaryLight: "2E7D52",
  accent: "C4841D",        // golden amber
  accentLight: "D4972E",
  body: "2C3E2D",          // dark green-gray
  bodyLight: "4A5E4B",
  surface: "F5F0EB",       // warm sand
  white: "FFFFFF",
  gray: "6B7280",
  grayLight: "E5E7EB",
  black: "1A1A1A",
  headerBg: "1B5E3B",
  tableBorder: "D1D5DB",
  tocHint: "9CA3AF",
};

// ─── FONTS ───
const FONT_BODY = "Calibri";
const FONT_HEADING = "Calibri";

// ─── PAGE LAYOUT (A4) ───
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_TOP = 1440;
const MARGIN_BOTTOM = 1701;
const MARGIN_LEFT = 1440;
const MARGIN_RIGHT = 1440;

// ─── HELPER: empty paragraph ───
function emptyPara(spacing?: number): Paragraph {
  return new Paragraph({ spacing: spacing !== undefined ? { after: spacing } : {} });
}

// ─── HELPER: body paragraph ───
function bodyPara(text: string, opts?: { bold?: boolean; spacing?: { before?: number; after?: number } }): Paragraph {
  return new Paragraph({
    spacing: opts?.spacing || { after: 120, line: 312 },
    children: [
      new TextRun({ text, font: FONT_BODY, size: 22, color: COLORS.body, bold: opts?.bold || false }),
    ],
  });
}

// ─── HELPER: bullet item ───
function bulletItem(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    indent: { left: 720 + level * 360, hanging: 360 },
    children: [
      new TextRun({ text: "\u2022  ", font: FONT_BODY, size: 22, color: COLORS.accent }),
      new TextRun({ text, font: FONT_BODY, size: 22, color: COLORS.body }),
    ],
  });
}

// ─── HELPER: sub-bullet ───
function subBullet(text: string): Paragraph {
  return bulletItem(text, 1);
}

// ─── HELPER: key-value pair ───
function kvPair(key: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: 312 },
    indent: { left: 720 },
    children: [
      new TextRun({ text: `${key}: `, font: FONT_BODY, size: 22, color: COLORS.primary, bold: true }),
      new TextRun({ text: value, font: FONT_BODY, size: 22, color: COLORS.body }),
    ],
  });
}

// ─── HELPER: code/monospace ───
function codePara(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 280 },
    indent: { left: 720 },
    shading: { type: ShadingType.CLEAR, fill: COLORS.surface },
    children: [
      new TextRun({ text, font: "Courier New", size: 20, color: COLORS.primaryDark }),
    ],
  });
}

// ─── HELPER: section divider ───
function sectionDivider(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014", font: FONT_BODY, size: 18, color: COLORS.grayLight }),
    ],
  });
}

// ─── HELPER: info box (table) ───
function infoBox(title: string, items: string[]): Table {
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: COLORS.primary },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, font: FONT_HEADING, size: 22, bold: true, color: COLORS.white })],
            }),
          ],
        }),
      ],
    }),
  ];

  for (const item of items) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLORS.surface },
            margins: { top: 60, bottom: 60, left: 200, right: 200 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            children: [
              new Paragraph({
                spacing: { after: 40, line: 296 },
                children: [new TextRun({ text: item, font: FONT_BODY, size: 20, color: COLORS.body })],
              }),
            ],
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// ─── HELPER: data table ───
function dataTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: COLORS.primary },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, font: FONT_BODY, size: 20, bold: true, color: COLORS.white })],
            }),
          ],
        })
    ),
  });

  const dataRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              shading: {
                type: ShadingType.CLEAR,
                fill: idx % 2 === 0 ? COLORS.white : COLORS.surface,
              },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.tableBorder },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.tableBorder },
                left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.tableBorder },
                right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.tableBorder },
              },
              children: [
                new Paragraph({
                  spacing: { line: 296 },
                  children: [new TextRun({ text: cell, font: FONT_BODY, size: 20, color: COLORS.body })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── COVER PAGE (R4: Top Color Block) ───
function buildCover(): Paragraph[] {
  return [
    emptyPara(4000),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "DOCUMENTO TECNICO DO PROJETO", font: FONT_HEADING, size: 48, bold: true, color: COLORS.primary }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", font: FONT_BODY, size: 22, color: COLORS.accent }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "Refugio Mata Atlantica", font: FONT_HEADING, size: 60, bold: true, color: COLORS.body }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: "Website & Sistema de Gestao para Pousadas", font: FONT_BODY, size: 28, color: COLORS.bodyLight }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: "Template Whitelabel com Next.js 16, GSAP, Lenis e CMS Admin", font: FONT_BODY, size: 24, color: COLORS.gray }),
      ],
    }),
    emptyPara(2000),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Versao 1.0.0  |  Julho 2025", font: FONT_BODY, size: 22, color: COLORS.gray }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Confidencial \u2014 Uso Interno", font: FONT_BODY, size: 20, color: COLORS.gray }),
      ],
    }),
  ];
}

// ─── MAIN DOCUMENT ───
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: 22, color: COLORS.body },
          paragraph: { spacing: { line: 312 } },
        },
        heading1: {
          run: { font: FONT_HEADING, size: 36, bold: true, color: COLORS.primary },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        heading2: {
          run: { font: FONT_HEADING, size: 28, bold: true, color: COLORS.primaryDark },
          paragraph: { spacing: { before: 300, after: 160 } },
        },
        heading3: {
          run: { font: FONT_HEADING, size: 24, bold: true, color: COLORS.accent },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      },
    },
    sections: [
      // ═══ COVER SECTION ═══
      {
        properties: {
          page: {
            margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
          },
        },
        children: buildCover(),
      },

      // ═══ TOC SECTION ═══
      {
        properties: {
          page: {
            margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Refugio Mata Atlantica \u2014 Documento Tecnico", font: FONT_BODY, size: 18, color: COLORS.gray, italics: true }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            spacing: { before: 400, after: 300 },
            children: [
              new TextRun({ text: "Sumario", font: FONT_HEADING, size: 36, bold: true, color: COLORS.primary }),
            ],
          }),
          new TableOfContents("Sumario", {
            hyperlink: true,
            headingStyleRange: "1-3",
          }),
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "Dica: Clique com o botao direito no sumario e selecione \"Atualizar Campo\" para refresh das paginas.", font: FONT_BODY, size: 18, color: COLORS.tocHint, italics: true }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },

      // ═══ BODY SECTION ═══
      {
        properties: {
          page: {
            margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
            pageNumbers: { start: 1 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Refugio Mata Atlantica \u2014 Documento Tecnico", font: FONT_BODY, size: 18, color: COLORS.gray, italics: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Pagina ", font: FONT_BODY, size: 18, color: COLORS.gray }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 18, color: COLORS.gray }),
                  new TextRun({ text: " de ", font: FONT_BODY, size: 18, color: COLORS.gray }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_BODY, size: 18, color: COLORS.gray }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ═══════════════════════════════════════════
          // 1. RESUMO EXECUTIVO
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("1. Resumo Executivo")],
          }),

          bodyPara("Este documento apresenta a descricao completa do projeto Refugio Mata Atlantica, um website e sistema de gestao completo para pousadas, desenvolvido como template whitelabel. O projeto foi construido com tecnologias de ponta e oferece uma solucao abrangente que inclui um website publico com animacoes premium, um painel administrativo (CMS) completo, sistema de reservas com integracao de pagamentos, e infraestrutura pronta para deploy em nuvem."),

          bodyPara("A aplicacao foi projetada desde o inicio para ser facilmente customizavel e replicavel para diferentes estabelecimentos de hospedagem, mantendo a mesma qualidade visual e funcionalidade."),

          emptyPara(100),

          infoBox("Indicadores do Projeto", [
            "Framework: Next.js 16 com App Router e Server Components",
            "Total de Componentes: 50+ componentes React/TypeScript",
            "Rotas de API: 41 handlers em 18 arquivos",
            "Modelos de Dados: 18 tabelas Prisma com ~105 registros seed",
            "Paineis Admin: 17 paginas de gestao + dashboard",
            "Imagens Geradas por IA: 20+ imagens profissionais",
            "Sistema de Animacoes: GSAP + ScrollTrigger + Lenis Smooth Scroll",
            "Integracao de Pagamento: Mercado Pago (checkout + webhook)",
            "Compliance: LGPD (Cookie Consent + Paginas Legais)",
          ]),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 2. VISAO GERAL DA ARQUITETURA
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("2. Visao Geral da Arquitetura")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("2.1 Stack Tecnologica")],
          }),

          bodyPara("O projeto utiliza uma stack moderna e otimizada para producao, com enfase em performance, SEO e experiencia do usuario:"),

          emptyPara(80),

          dataTable(
            ["Camada", "Tecnologia", "Versao", "Proposito"],
            [
              ["Framework", "Next.js (App Router)", "16.x", "SSR/SSG, API Routes, Server Components"],
              ["Linguagem", "TypeScript", "5.x", "Tipagem estatica e seguranca"],
              ["Estilizacao", "Tailwind CSS 4 + shadcn/ui", "4.x", "Design system responsivo"],
              ["Animacoes", "GSAP + ScrollTrigger", "3.15", "Animacoes scroll-parallax e transitions"],
              ["Smooth Scroll", "Lenis", "1.0.42", "Scroll suave sincronizado com GSAP"],
              ["ORM", "Prisma", "6.x", "Modelagem de dados e queries type-safe"],
              ["Database", "SQLite / Turso (libsql)", "-", "Local dev + producao cloud"],
              ["Icons", "Lucide React", "0.525+", "Iconografia consistente"],
              ["Analytics", "@vercel/analytics", "2.x", "Metricas de desempenho"],
              ["Storage", "@vercel/blob", "2.7", "Upload de imagens em producao"],
              ["Auth Admin", "bcryptjs + HMAC-JWT", "-", "Hash de senhas + tokens assinados"],
              ["Pagamentos", "Mercado Pago SDK", "-", "Checkout e webhook de pagamentos"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("2.2 Estrutura de Diretorios")],
          }),

          bodyPara("O projeto segue a convencao padrao do Next.js App Router com organizacao modular:"),

          emptyPara(80),

          dataTable(
            ["Diretorio", "Descricao"],
            [
              ["src/app/", "Rotas da aplicacao (paginas publicas + API routes)"],
              ["src/app/admin/", "Painel administrativo completo (17 paginas)"],
              ["src/components/sections/", "Secoes do website (Hero, Rooms, Gallery, etc.)"],
              ["src/components/layout/", "Componentes de layout (Header, Footer, Cursor, etc.)"],
              ["src/components/ui/", "Componentes shadcn/ui reutilizaveis"],
              ["src/components/admin/", "Componentes especificos do admin"],
              ["src/hooks/", "Hooks customizados (useReveal, useCardTilt, etc.)"],
              ["src/lib/", "Utilidades (db, auth, data, admin-client, rate-limit)"],
              ["src/data/", "Dados estaticos de referencia (site.ts, sobre.ts)"],
              ["prisma/", "Schema, seed script e banco SQLite"],
              ["scripts/", "Scripts utilitarios (setup-turso, generate-images)"],
              ["public/images/", "Imagens otimizadas do website"],
            ]
          ),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 3. FRONTEND - WEBSITE PUBLICO
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("3. Frontend - Website Publico")],
          }),

          bodyPara("O website publico e composto por uma landing page completa com 10 secoes interativas, alem de paginas adicionais para reservas, sobre, quartos, e compliance legal."),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("3.1 Pagina Inicial - Secoes")],
          }),

          bodyPara("A homepage e construida como um Server Component async que busca dados do banco de dados e distribui para cada secao via props:"),

          emptyPara(80),

          dataTable(
            ["Secao", "Componente", "Funcionalidades Principais"],
            [
              ["Hero", "Hero.tsx", "Parallax zoom (GSAP scrub), text mask reveal linha por linha, decorative blobs, CTA buttons"],
              ["Social Proof", "SocialProof.tsx", "Badges de confianca (avaliacoes, anos de experiencia)"],
              ["Sobre", "About.tsx", "Storytelling, floating card, grid de diferenciais com stagger animation"],
              ["Quartos", "Rooms.tsx", "4 cards com 3D tilt, glow spotlight, parallax imagem, precos e CTAs"],
              ["Experiencias", "Experiences.tsx", "4 cards (trilha, spa, gastronomia, passeio de barco) com 3D tilt"],
              ["Galeria", "Gallery.tsx", "Masonry grid com lightbox (keyboard nav), 6+ imagens com 3D tilt"],
              ["Localizacao", "Location.tsx", "Google Maps embed, pontos proximos, direcoes de como chegar"],
              ["Depoimentos", "Testimonials.tsx", "3 review cards com estrelas, avatares, 3D tilt animado"],
              ["FAQ", "FAQ.tsx", "Accordion com 7 perguntas/respostas, animacao de abertura"],
              ["CTA Reservas", "BookingCTA.tsx", "Parallax background, opcoes de contato, botao de reserva"],
              ["Footer", "Footer.tsx", "Contador animado (GSAP count-up), newsletter, redes sociais"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("3.2 Sistema de Animacoes (GSAP)")],
          }),

          bodyPara("O website utiliza um sistema abrangente de animacoes baseado em GSAP e ScrollTrigger, criando uma experiencia visual premium:"),

          emptyPara(80),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("Hook useReveal")],
          }),
          bulletItem("Hook customizado para animar elementos ao entrar no viewport"),
          bulletItem("Utiliza Intersection Observer combinado com GSAP para triggers precisos"),
          bulletItem("Suporta animacoes de fade, slide-up, stagger e scale"),
          bulletItem("Respeita prefers-reduced-motion (acessibilidade)"),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("Hook useCardTilt")],
          }),
          bulletItem("Tilt 3D proporcional a distancia do mouse do centro (max 8 graus)"),
          bulletItem("Perspectiva 800px com preserve-3d transform"),
          bulletItem("Dynamic radial-gradient glow spotlight que segue o cursor"),
          bulletItem("Elastic ease-out no mouse leave (retorno organico com bounce)"),
          bulletItem("Glow element injetado via JS (evita problemas com Tailwind CSS 4 @layer)"),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("Hero - Animacoes Especificas")],
          }),
          bulletItem("Parallax zoom com scrub (imagem aumenta ao rolar)"),
          bulletItem("Text mask reveal linha por linha (cada linha revelada sequencialmente)"),
          bulletItem("Decorative blobs com animacao floating"),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("Footer - Animacoes Especificas")],
          }),
          bulletItem("Contador animado com GSAP count-up (numeros sobem de 0 ao valor real)"),
          bulletItem("Trigger no scroll para ativar contagem quando visivel"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("3.3 Smooth Scroll (Lenis)")],
          }),

          bodyPara("O sistema de scroll suave e implementado via Lenis, sincronizado com o ticker do GSAP para garantir compatibilidade total com todas as animacoes:"),

          bulletItem("Lenis instance registrada em store global (src/lib/lenis-store.ts)"),
          bulletItem("Sincronizacao via gsap.ticker.add() no SmoothScrollProvider"),
          bulletItem("Cleanup correto no useEffect (ticker.remove com closure correta)"),
          bulletItem("Suporte a configuracoes customizaveis (duration, easing, orientation)"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("3.4 Cursor Personalizado")],
          }),

          bodyPara("Um cursor customizado premium com dois elementos (dot + halo) que adiciona sofisticacao a navegacao:"),

          infoBox("CustomCursor.tsx - Estados do Cursor", [
            "Default: dot 6px branco + halo 40px com lag organico (0.35s, power3.out)",
            "Link/Button: halo expande + opacidade aumenta em a e button",
            "Card: halo expande com label de texto (data-cursor=\"card\")",
            "Input: halo expande e fica mais sutil em input/textarea",
            "Detecao hierarquica: data-cursor do target > inputs > links > ancestors > default",
            "Ativacao: apenas apos primeiro mousemove (sem flash inicial)",
            "mix-blend-mode: difference para contraste garantido em qualquer background",
            "Progressive enhancement: ativo apenas em (pointer: fine) e (hover: hover)",
            "Respeita prefers-reduced-motion e navegacao por teclado",
          ]),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("3.5 Folhas Caindo (FallingLeaves)")],
          }),

          bodyPara("Componente decorativo de particulas de folhas que caem ao rolar a pagina, criando atmosfera imersiva:"),

          bulletItem("Object pool: 10 folhas no desktop, 4 no mobile (zero churn de DOM)"),
          bulletItem("4 variantes SVG (oval, maple, willow, heart) + 5 cores (verdes + terracotta/ambers)"),
          bulletItem("SVGs criados programaticamente via createElementNS"),
          bulletItem("Spawn condicional: scroll direction DOWN + velocidade > 0.4 + throttle 200ms"),
          bulletItem("Velocidade do scroll Lenis modula duracao da queda (rapido = curto, lento = longo)"),
          bulletItem("Timeline GSAP com 5 fases: fade in, rotacao continua, sway sinusoidal, queda vertical, fade+blur out"),
          bulletItem("Randomizacao: tamanho (18-34px), escala (0.8-1.15), amplitude sway (25-70px), frequencia (2-4)"),
          bulletItem("Acessibilidade: aria-hidden, pointer-events none, z-index 5"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("3.6 Paginas Adicionais")],
          }),

          dataTable(
            ["Rota", "Pagina", "Descricao"],
            [
              ["/", "Homepage", "Landing page com 10 secoes interativas"],
              ["/sobre", "Sobre a Pousada", "Breadcrumb, 12 amenidades, localizacao, experiencia sensorial, CTA"],
              ["/quartos/[slug]", "Detalhe do Quarto", "Pagina individual com imagens, amenidades, politica, reserva"],
              ["/reservas", "Formulario de Reservas", "Selecao de quarto, datas, calculo de preco, consentimento LGPD"],
              ["/reservas/sucesso", "Pagina de Sucesso", "Confirmacao apos pagamento aprovado"],
              ["/reservas/falha", "Pagina de Falha", "Pagamento recusado ou erro"],
              ["/reservas/pendente", "Pagina Pendente", "Pagamento em processamento"],
              ["/politica-de-privacidade", "LGPD Policy", "10 secoes de politica de privacidade"],
              ["/termos-de-uso", "Termos de Uso", "8 secoes de termos e condicoes"],
            ]
          ),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 4. TEMA VISUAL E DESIGN SYSTEM
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("4. Tema Visual e Design System")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("4.1 Paleta de Cores (Mata Atlantica)")],
          }),

          bodyPara("O tema e inspirado na natureza da Mata Atlantica, com cores organicas e terrosas:"),

          emptyPara(80),

          dataTable(
            ["Token", "Cor", "Uso Principal"],
            [
              ["primary", "#1B5E3B (Forest Green)", "Elementos principais, headers, CTAs"],
              ["secondary", "#C67C4E (Terracotta)", "Acentos, badges, destaques"],
              ["accent", "#D4A853 (Golden)", "Numeros, estrelas, elementos premium"],
              ["surface", "#F5F0EB (Warm Sand)", "Backgrounds, cards, superficies"],
              ["body", "#2C3E2D (Dark Green-Grey)", "Texto principal"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("4.2 Tipografia")],
          }),

          bulletItem("Headings: Fraunces (serif) - elegante, editorial, premium"),
          bulletItem("Body: Nunito Sans (sans-serif) - legibilidade otima, amigavel"),
          bulletItem("Fontes carregadas via next/font/google (display: swap, preloading)"),
          bulletItem("Variaveis CSS: --font-fraunces e --font-nunito-sans"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("4.3 Glassmorphism")],
          }),

          bodyPara("O projeto implementa classes utilitarias de glassmorphism para criar efeitos visuais modernos:"),

          bulletItem("glass: blur(12px) + bg-opacity + border-light + backdrop-filter"),
          bulletItem("glass-strong: blur(20px) + maior opacidade para headers fixos"),
          bulletItem("glass-dark: variante escura para elementos sobre backgrounds claros"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("4.4 Design Responsivo")],
          }),

          bodyPara("Todo o projeto foi construido mobile-first com breakpoints Tailwind CSS:"),

          bulletItem("Mobile: layout base (< 640px) - menu hamburger, cards empilhados"),
          bulletItem("Tablet (sm: 640px, md: 768px) - ajustes de grid e tipografia"),
          bulletItem("Desktop (lg: 1024px, xl: 1280px) - layout completo com multi-colunas"),
          bulletItem("Touch-friendly: minimum 44px para elementos interativos"),
          bulletItem("Safe area: suporte a iOS safe area insets no footer"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 5. COMPONENTES UI E GLOBAL
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("5. Componentes UI e Elementos Globais")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("5.1 Header")],
          }),
          bulletItem("Transparente no topo, blur com glassmorphism ao rolar"),
          bulletItem("Navegacao responsiva com drawer mobile (Sheet component)"),
          bulletItem("Links dinamicos do banco de dados"),
          bulletItem("Logo e configuracoes do site"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("5.2 Footer")],
          }),
          bulletItem("Sticky ao bottom (flex column + mt-auto)"),
          bulletItem("Contador animado (GSAP count-up) para estatisticas"),
          bulletItem("Formulario de newsletter"),
          bulletItem("Links para redes sociais (Instagram, Facebook, TripAdvisor)"),
          bulletItem("Respeita bottom safe area em dispositivos iOS"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("5.3 WhatsApp Flutuante")],
          }),
          bulletItem("Botao fixo no canto inferior direito"),
          bulletItem("Cor verde #25D366 com animacao pulse/glow"),
          bulletItem("Abre link wa.me com numero configurado"),
          bulletItem("Visivel apenas quando WhatsApp esta configurado no banco"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("5.4 Cookie Consent")],
          }),
          bulletItem("Banner glassmorphism no bottom da tela"),
          bulletItem("Checkbox para aceitar/rejeitar cookies"),
          bulletItem("Persiste preferencia no localStorage"),
          bulletItem("Oculta-se apos aceitacao (nao reaparece)"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("5.5 Pagina 404 Personalizada")],
          }),
          bulletItem("Numero 404 com gradiente mask"),
          bulletItem("Botoes: Voltar ao inicio + Entrar em contato"),
          bulletItem("Mantem header e footer"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 6. BACKEND - API E BANCO DE DADOS
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("6. Backend - API e Banco de Dados")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("6.1 Prisma Schema - 18 Modelos")],
          }),

          bodyPara("O banco de dados utiliza 18 modelos Prisma que cobrem todo o conteudo gerenciavel do site:"),

          emptyPara(80),

          dataTable(
            ["Modelo", "Proposito", "Campos Chave"],
            [
              ["Admin", "Usuarios administradores", "email, name, password (bcrypt), role"],
              ["SiteSetting", "Configuracoes gerais (singleton)", "name, tagline, phone, whatsapp, email, lat/lng, redes sociais, SEO"],
              ["NavLink", "Links de navegacao", "label, href, sortOrder"],
              ["Room", "Quartos", "name, slug, price, capacity, size, bedType, descriptionLong, policy"],
              ["RoomImage", "Imagens dos quartos", "src, alt, sortOrder (cascade delete)"],
              ["RoomAmenity", "Amenidades dos quartos", "name, icon (Lucide), sortOrder (cascade delete)"],
              ["Experience", "Experiencias ofertadas", "title, description, image, duration, difficulty"],
              ["GalleryImage", "Galeria de fotos", "src, alt, span (masonry), sortOrder"],
              ["Testimonial", "Depoimentos", "name, location, avatar, text, rating"],
              ["Faq", "Perguntas frequentes", "question, answer"],
              ["AboutAmenity", "Amenidades da pousada", "icon, label, desc"],
              ["Distance", "Distancias de referencias", "place, distance, time"],
              ["Direction", "Direcoes de acesso", "city, route, type"],
              ["SensoryConfig", "Experiencia sensorial", "title, paragraphs (JSON)"],
              ["Stat", "Estatisticas do footer", "value, suffix, label"],
              ["UploadedImage", "Imagens enviadas (DB)", "filename, mimeType, data (base64), size"],
              ["NewsletterSubscriber", "Inscritos na newsletter", "email (unique), consent"],
              ["ContactSubmission", "Mensagens de contato", "name, email, phone, message, consent, read"],
              ["Reservation", "Reservas", "guest info, roomId, dates, price, status, MercadoPago IDs"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("6.2 API Routes - 41 Handlers")],
          }),

          bodyPara("Todas as rotas de API estao sob o prefixo /api/admin/ e utilizam autenticacao baseada em token JWT com expiracao de 7 dias:"),

          emptyPara(80),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("Autenticacao")],
          }),
          dataTable(
            ["Rota", "Metodo", "Descricao"],
            [
              ["/api/admin/auth", "POST", "Login (email + senha) - retorna JWT de 7 dias"],
              ["/api/admin/auth", "GET", "Verifica sessao ativa"],
              ["/api/admin/auth", "DELETE", "Logout - remove cookie"],
            ]
          ),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("CRUD de Conteudo")],
          }),
          dataTable(
            ["Recurso", "Rota", "Operacoes"],
            [
              ["Settings", "/api/admin/settings", "GET (singleton), PUT (atualiza todas config)"],
              ["Nav Links", "/api/admin/nav-links", "GET, POST, PUT, DELETE"],
              ["Quartos", "/api/admin/rooms", "GET (list), POST (criar), PUT, DELETE"],
              ["Quarto Detail", "/api/admin/rooms/[id]", "GET, PUT, DELETE"],
              ["Experiencias", "/api/admin/experiences", "GET, POST, PUT, DELETE"],
              ["Experiencia Detail", "/api/admin/experiences/[id]", "GET, PUT, DELETE"],
              ["Galeria", "/api/admin/gallery", "GET, POST, DELETE"],
              ["Depoimentos", "/api/admin/testimonials", "GET, POST, PUT, DELETE"],
              ["Depoimento Detail", "/api/admin/testimonials/[id]", "GET, PUT, DELETE"],
              ["FAQ", "/api/admin/faq", "GET, POST, PUT, DELETE"],
              ["FAQ Detail", "/api/admin/faq/[id]", "GET, PUT, DELETE"],
              ["About", "/api/admin/about", "GET, PUT (amenidades, distancias, direcoes, sensorial, stats)"],
              ["Newsletter", "/api/admin/newsletter", "GET (listar inscritos)"],
              ["Contatos", "/api/admin/contacts", "GET, PUT (marcar como lido)"],
              ["Reservas", "/api/admin/reservations", "GET, PUT (atualizar status)"],
              ["Upload", "/api/admin/upload", "POST (multipart, 5MB max, jpeg/png/webp/gif)"],
            ]
          ),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun("Rotas Publicas")],
          }),
          dataTable(
            ["Rota", "Metodo", "Descricao"],
            [
              ["/api/admin/dashboard", "GET", "Estatisticas (total quartos, experiencias, etc.)"],
              ["/api/reservations/create-preference", "POST", "Cria preferencia Mercado Pago"],
              ["/api/reservations/webhook", "POST", "Recebe eventos de pagamento MP"],
              ["/api/images/[id]", "GET", "Serve imagens do DB (base64)"],
              ["/api/rooms/public", "GET", "Lista quartos publicados"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("6.3 Sistema de Autenticacao")],
          }),

          bodyPara("O sistema de autenticacao do painel admin utiliza um modelo simples e seguro:"),

          bulletItem("Hash de senhas: bcryptjs com salt rounds automatico"),
          bulletItem("Tokens: HMAC-SHA256 assinatura com segredo do .env"),
          bulletItem("Expiracao: 7 dias por token"),
          bulletItem("Storage: cookie httpOnly para protecao contra XSS"),
          bulletItem("Middleware: requireAdmin helper para proteger rotas"),
          bulletItem("Credenciais default: admin@refugio.com / admin123"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("6.4 Sistema de Dados (src/lib/data.ts)")],
          }),

          bodyPara("Camada de abstracao que fornece 8 funcoes async para buscas tipadas no banco:"),

          codePara("getSiteConfig()    -> settings, links, stats, distances, directions"),
          codePara("getRooms()         -> published rooms with images + amenities"),
          codePara("getRoomBySlug()     -> single room detail page"),
          codePara("getExperiences()   -> published experiences"),
          codePara("getGalleryImages()  -> published gallery images"),
          codePara("getTestimonials()  -> published testimonials"),
          codePara("getFAQs()           -> published FAQs"),
          codePara("getAboutData()      -> amenities, sensory config"),

          emptyPara(80),
          bodyPara("Todas as funcoes possuem try/catch com fallback para dados vazios, garantindo que o site funcione mesmo se o banco estiver inacessivel."),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 7. PAINEL ADMINISTRATIVO (CMS)
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("7. Painel Administrativo (CMS)")],
          }),

          bodyPara("O painel administrativo e uma aplicacao completa dentro do proprio site, acessivel via /admin, com 17 paginas de gestao organizadas em uma sidebar dark com icones Lucide."),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("7.1 Layout Admin")],
          }),

          bulletItem("Sidebar escura com navegacao por icones + labels"),
          bulletItem("Header com informacoes do usuario e botao de logout"),
          bulletItem("Conteudo central com scroll area"),
          bulletItem("Redireciona para login se nao autenticado"),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("7.2 Paginas de Gestao")],
          }),

          dataTable(
            ["Pagina", "Rota", "Funcionalidades"],
            [
              ["Login", "/admin/login", "Email + senha, redirect apos autenticacao"],
              ["Dashboard", "/admin", "Cards de estatisticas (quartos, experiencias, depoimentos, reservas)"],
              ["Quartos (Lista)", "/admin/rooms", "Tabela com todos quartos, botoes editar/excluir"],
              ["Quarto (Novo)", "/admin/rooms/new", "Formulario completo: nome, slug, preco, capacidade, amenidades"],
              ["Quarto (Editar)", "/admin/rooms/[id]", "Formulario preenchido + imagens + policy"],
              ["Experiencias (Lista)", "/admin/experiences", "Tabela com experiencias, CRUD completo"],
              ["Experiencia (Editar)", "/admin/experiences/[id]", "Formulario preenchido"],
              ["Galeria", "/admin/gallery", "Grid de imagens, upload e exclusao"],
              ["Depoimentos (Lista)", "/admin/testimonials", "Tabela com depoimentos, CRUD completo"],
              ["Depoimento (Editar)", "/admin/testimonials/[id]", "Formulario preenchido"],
              ["FAQ (Lista)", "/admin/faq", "Tabela com perguntas, CRUD completo"],
              ["FAQ (Editar)", "/admin/faq/[id]", "Formulario preenchido"],
              ["Sobre", "/admin/about", "5 tabs: Amenidades, Localizacao, Direcoes, Sensorial, Stats"],
              ["Configuracoes", "/admin/settings", "5 tabs: Geral, Contato, Redes Sociais, SEO, Mapas"],
              ["Newsletter", "/admin/newsletter", "Lista de inscritos com email e data"],
              ["Contatos", "/admin/contacts", "Mensagens recebidas, marcar como lido"],
              ["Reservas", "/admin/reservations", "Lista de reservas com status, atualizar pagamento"],
              ["Links Nav", "/admin/nav-links", "Gerenciar links de navegacao do header"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("7.3 Componente de Upload de Imagens")],
          }),

          bodyPara("O componente ImageUpload suporta modo dual para compatibilidade com ambientes dev e producao:"),

          bulletItem("Desenvolvimento: salva no filesystem local (public/images/uploads/)"),
          bulletItem("Producao (Vercel): utiliza @vercel/blob com CDN"),
          bulletItem("Validacao: tipo (JPEG/PNG/WebP/GIF), tamanho (5MB max)"),
          bulletItem("Preview da imagem antes do upload"),
          bulletItem("Retorna URL publica (CDN ou local path)"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 8. SISTEMA DE RESERVAS
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("8. Sistema de Reservas")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("8.1 Formulario Publico (/reservas)")],
          }),

          bulletItem("Selecao de quarto via dropdown (quartos publicados)"),
          bulletItem("Selecao de datas (check-in e check-out)"),
          bulletItem("Calculo automatico de preco (noites x diaria)"),
          bulletItem("Campos: nome, email, telefone, observacoes"),
          bulletItem("Checkbox LGPD de consentimento (obrigatorio)"),
          bulletItem("Honeypot anti-spam"),
          bulletItem("Validacao client-side + server-side"),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("8.2 Fluxo de Pagamento")],
          }),

          bodyPara("O fluxo de pagamento utiliza a integracao com Mercado Pago:"),

          emptyPara(80),

          infoBox("Fluxo de Pagamento", [
            "1. Usuario preenche formulario e submete",
            "2. API cria registro no banco (status: pending)",
            "3. API cria preferencia de pagamento no Mercado Pago",
            "4. Usuario e redirecionado para checkout do Mercado Pago",
            "5. Apos pagamento, webhook recebe notificacao",
            "6. Webhook atualiza status (approved/rejected/pending)",
            "7. Usuario e redirecionado para pagina de resultado",
          ]),

          emptyPara(100),

          bodyPara("Modo de desenvolvimento: quando MERCADO_PAGO_ACCESS_TOKEN nao esta configurado, o sistema redireciona para /reservas/pendente sem pagamento real, permitindo testes completos."),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("8.3 Paginas de Resultado")],
          }),

          dataTable(
            ["Rota", "Status", "Visualizacao"],
            [
              ["/reservas/sucesso", "Pagamento aprovado", "Check verde, mensagem de confirmacao, CTA para inicio"],
              ["/reservas/falha", "Pagamento recusado", "X vermelho, mensagem de erro, opcao de tentar novamente"],
              ["/reservas/pendente", "Pagamento pendente", "Relogio amarelo, mensagem de aguardo, info de contato"],
            ]
          ),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 9. COMPLIANCE LGPD
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("9. Compliance LGPD")],
          }),

          bodyPara("O projeto implementa medidas de conformidade com a Lei Geral de Protecao de Dados (LGPD):"),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("9.1 Cookie Consent")],
          }),
          bulletItem("Banner glassmorphism aparece no bottom da tela"),
          bulletItem("Checkbox explicito para aceitar cookies"),
          bulletItem("Preferencia persistida no localStorage"),
          bulletItem("So reaparece se o consentimento for removido"),
          bulletItem("Bloqueia scripts de analytics ate consentimento"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("9.2 Paginas Legais")],
          }),
          bulletItem("Politica de Privacidade: 10 secoes LGPD (dados coletados, finalidade, direitos, etc.)"),
          bulletItem("Termos de Uso: 8 secoes (condicoes, responsabilidades, cancelamento, etc.)"),
          bulletItem("Sitemap XML gerado automaticamente via sitemap.ts"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("9.3 Consentimento em Formularios")],
          }),
          bulletItem("Formulario de reservas: checkbox LGPD obrigatorio"),
          bulletItem("Formulario de contato: checkbox LGPD obrigatorio"),
          bulletItem("Newsletter: campo de consentimento gravado no banco"),
          bulletItem("Honeypot fields para protecao anti-spam"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 10. INTEGRACAO TURSO / VERCEL
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("10. Integracao Turso / Vercel")],
          }),

          bodyPara("O projeto suporta dois modos de banco de dados para compatibilidade entre desenvolvimento local e producao em nuvem:"),

          emptyPara(100),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("10.1 Modo Local (Desenvolvimento)")],
          }),
          bulletItem("SQLite local via Prisma padrao (provider: sqlite)"),
          bulletItem("DATABASE_URL: file:./db/custom.db"),
          bulletItem("Comandos: db:push (schema) + db:seed (dados)"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("10.2 Modo Turso (Producao Vercel)")],
          }),
          bulletItem("Turso via @prisma/adapter-libsql"),
          bulletItem("DATABASE_URL: libsql://db-name.turso.io?auth_token=xxx"),
          bulletItem("Adapter PrismaLibSQL com parseLibsqlUrl() helper"),
          bulletItem("datasourceUrl: \"file:./placeholder.db\" para passar validacao Prisma"),
          bulletItem("Script setup-turso.ts: gera DDL + executa contra Turso + optional --seed"),
          bulletItem("Pages com force-dynamic para evitar falhas de build estatico"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("10.3 Resiliencia de Erros")],
          }),
          bulletItem("Todas as queries build-time tem try/catch com fallback"),
          bulletItem("Paginas funcionam mesmo com DB inacessivel (fallback para dados hardcoded)"),
          bulletItem("generateMetadata() com fallback para valores padrao"),
          bulletItem("Layout.tsx com tratamento de erro para WhatsAppFloat"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 11. SEO E PERFORMANCE
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("11. SEO e Performance")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("11.1 Otimizacoes SEO")],
          }),
          bulletItem("Metadata dinamica via generateMetadata() com dados do banco"),
          bulletItem("Open Graph tags (title, description, type: website)"),
          bulletItem("Keywords relevantes configuradas no layout"),
          bulletItem("Sitemap XML gerado automaticamente (sitemap.ts)"),
          bulletItem("robots.txt configurado"),
          bulletItem("Favicon e icons configurados"),
          bulletItem("HTML semantico (main, header, nav, section, article, footer)"),
          bulletItem("Lang attribute: pt-BR"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("11.2 Performance")],
          }),
          bulletItem("Server Components para renderizacao no servidor (zero JS cliente desnecessario)"),
          bulletItem("Image preloading para hero image"),
          bulletItem("Fontes com display: swap (sem FOIT)"),
          bulletItem("Lazy loading de componentes pesados"),
          bulletItem("Object pooling para animacoes (zero DOM churn)"),
          bulletItem("Vercel Analytics para monitoramento de Core Web Vitals"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 12. IMAGENS GERADAS POR IA
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("12. Imagens Geradas por IA")],
          }),

          bodyPara("Todas as imagens do website foram geradas artificialmente via CLI de geracao de imagens, totalizando 20+ assets visuais profissionais:"),

          emptyPara(80),

          dataTable(
            ["Categoria", "Quantidade", "Arquivos"],
            [
              ["Hero", "1", "hero.jpg (1920x1080, paisagem Mata Atlantica)"],
              ["Quartos", "4", "room-master.jpg, room-chalet.jpg, room-garden.jpg, room-standard.jpg"],
              ["Experiencias", "4", "experience-trail.jpg, experience-spa.jpg, experience-gastronomy.jpg, experience-boat.jpg"],
              ["Galeria", "6", "gallery-1.jpg ate gallery-6.jpg"],
              ["Avatares", "3", "avatar-1.jpg, avatar-2.jpg, avatar-3.jpg"],
              ["Favicon", "1", "favicon.png (icon folha ecologica)"],
              ["Logo", "1", "logo.svg (SVG vetorizado)"],
            ]
          ),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 13. CONFIGURACAO E DEPLOY
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("13. Configuracao e Deploy")],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("13.1 Variaveis de Ambiente")],
          }),

          dataTable(
            ["Variavel", "Obrigatorio", "Descricao"],
            [
              ["DATABASE_URL", "Sim", "URL do banco (file: ou libsql://)"],
              ["AUTH_SECRET", "Sim", "Segredo para assinatura JWT"],
              ["MERCADO_PAGO_ACCESS_TOKEN", "Nao", "Token Mercado Pago (modo mock se ausente)"],
              ["BLOB_READ_WRITE_TOKEN", "Nao", "Token Vercel Blob (upload em producao)"],
              ["GOOGLE_MAPS_API_KEY", "Nao", "API Key para Google Maps embed"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("13.2 Scripts Disponiveis")],
          }),

          dataTable(
            ["Script", "Comando", "Descricao"],
            [
              ["dev", "next dev -p 3000", "Servidor de desenvolvimento com hot reload"],
              ["build", "next build", "Build de producao"],
              ["lint", "eslint .", "Verificacao de code quality"],
              ["db:generate", "prisma generate", "Gera Prisma Client"],
              ["db:push", "prisma db push", "Push schema ao banco"],
              ["db:seed", "tsx prisma/seed.ts", "Popula banco com ~105 registros"],
              ["db:setup", "generate + push + seed", "Setup completo do banco"],
              ["turso:setup", "setup-turso --force --seed", "Deploy schema ao Turso + seed"],
            ]
          ),

          emptyPara(200),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("13.3 Deploy na Vercel")],
          }),

          bodyPara("O projeto esta otimizado para deploy na Vercel:"),

          bulletItem("Zero configuracao adicional (framework detectado automaticamente)"),
          bulletItem("Banco Turso via variavel DATABASE_URL com adapter libsql"),
          bulletItem("Upload de imagens via @vercel/blob"),
          bulletItem("Analytics nativo via @vercel/analytics"),
          bulletItem("Pages com force-dynamic para DB externo"),
          bulletItem("Error handling resilient para DB inacessivel"),
          bulletItem("Image Optimization via next/image"),

          emptyPara(200),

          // ═══════════════════════════════════════════
          // 14. CONSIDERACOES FINAIS
          // ═══════════════════════════════════════════
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("14. Consideracoes Finais")],
          }),

          bodyPara("O projeto Refugio Mata Atlantica representa uma solucao completa e profissional para websites de pousadas e hoteis boutique. A arquitetura foi projetada para ser um template whitelabel, permitindo rapida adaptacao para diferentes estabelecimentos."),

          emptyPara(80),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("14.1 Pontos Fortes")],
          }),
          bulletItem("Stack moderna e unificada (Next.js 16 + TypeScript + Tailwind 4)"),
          bulletItem("Experiencia visual premium com animacoes GSAP e glassmorphism"),
          bulletItem("CMS completo para gestao de todo conteudo sem codigo"),
          bulletItem("Sistema de reservas com pagamento integrado (Mercado Pago)"),
          bulletItem("Compliance LGPD integrada (cookies, consentimento, paginas legais)"),
          bulletItem("Design responsivo mobile-first"),
          bulletItem("Arquitetura resilient (fallbacks para DB inacessivel)"),
          bulletItem("Infraestrutura pronta para producao (Vercel + Turso)"),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun("14.2 Possibilidades de Expansao")],
          }),
          bulletItem("Multi-idioma (i18n) para atender turistas internacionais"),
          bulletItem("Checkout nativo (sem redirecionamento) com Mercado Pago"),
          bulletItem("Sistema de avaliacoes verificadas"),
          bulletItem("Integracao com Google Calendar / Booking.com"),
          bulletItem("Painel de relatorios com graficos avancados"),
          bulletItem("Notificacoes por email (confirmacao, lembrete, avaliacao)"),
          bulletItem("Blog integrado para SEO de conteudo"),
          bulletItem("Multi-moeda para reservas internacionais"),

          emptyPara(200),

          sectionDivider(),

          emptyPara(100),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Refugio Mata Atlantica", font: FONT_HEADING, size: 24, bold: true, color: COLORS.primary }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Documento Tecnico v1.0.0", font: FONT_BODY, size: 20, color: COLORS.gray }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Gerado em Julho 2025", font: FONT_BODY, size: 20, color: COLORS.gray }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/Refugio-Mata-Atlantica-Documento-Tecnico.docx", buffer);
  console.log("Document generated successfully!");
  console.log("Path: /home/z/my-project/Refugio-Mata-Atlantica-Documento-Tecnico.docx");
  console.log("Size:", (buffer.length / 1024).toFixed(1), "KB");
}

main().catch(console.error);
