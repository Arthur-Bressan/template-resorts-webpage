# -*- coding: utf-8 -*-
"""
Refúgio Mata Atlântica — Documento Técnico (Body PDF)
Gerado com ReportLab + TocDocTemplate + multiBuild
"""

import os
import hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    CondPageBreak, KeepTogether, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. FONTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pdfmetrics.registerFont(TTFont('FreeSerif', '/usr/share/fonts/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', '/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', '/usr/share/fonts/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                    italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. COLOR PALETTE (earthy/green theme)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_BG       = colors.HexColor('#f3f2f1')
SECTION_BG    = colors.HexColor('#eeedec')
CARD_BG       = colors.HexColor('#eae9e6')
TABLE_STRIPE  = colors.HexColor('#f0efed')
HEADER_FILL   = colors.HexColor('#786d4c')
COVER_BLOCK   = colors.HexColor('#7c755f')
BORDER        = colors.HexColor('#c5bda5')
ICON          = colors.HexColor('#9e8742')
ACCENT        = colors.HexColor('#866f2c')
ACCENT_2      = colors.HexColor('#6240ca')
TEXT_PRIMARY   = colors.HexColor('#1a1a18')
TEXT_MUTED    = colors.HexColor('#7b7972')
SEM_SUCCESS   = colors.HexColor('#4d8a62')
SEM_WARNING   = colors.HexColor('#a68b53')
SEM_ERROR     = colors.HexColor('#a05851')
SEM_INFO      = colors.HexColor('#5d7d9c')

# Table colors
TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. PAGE GEOMETRY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_W, PAGE_H = A4  # 595.28 x 841.89
LEFT_M   = 1.0 * inch
RIGHT_M  = 1.0 * inch
TOP_M    = 1.0 * inch
BOTTOM_M = 1.0 * inch
AVAIL_W  = PAGE_W - LEFT_M - RIGHT_M  # ~451pt

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
styles = getSampleStyleSheet()

# TOC styles
toc_h1_style = ParagraphStyle(
    name='TOCH1', fontName='FreeSerif-Bold', fontSize=12,
    leading=20, leftIndent=20, textColor=TEXT_PRIMARY,
    spaceBefore=6, spaceAfter=2,
)
toc_h2_style = ParagraphStyle(
    name='TOCH2', fontName='FreeSerif', fontSize=10.5,
    leading=18, leftIndent=45, textColor=TEXT_MUTED,
    spaceBefore=2, spaceAfter=2,
)

# Body styles
body_style = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=6,
)

heading1_style = ParagraphStyle(
    name='H1', fontName='FreeSerif-Bold', fontSize=20,
    leading=26, textColor=ACCENT, spaceBefore=18, spaceAfter=10,
)

heading2_style = ParagraphStyle(
    name='H2', fontName='FreeSerif-Bold', fontSize=14,
    leading=20, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=6,
)

heading3_style = ParagraphStyle(
    name='H3', fontName='FreeSerif-Bold', fontSize=11.5,
    leading=17, textColor=ICON, spaceBefore=10, spaceAfter=4,
)

bullet_style = ParagraphStyle(
    name='Bullet', fontName='FreeSerif', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=18, firstLineIndent=-12, spaceBefore=1, spaceAfter=1,
)

caption_style = ParagraphStyle(
    name='Caption', fontName='FreeSerif-Italic', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=6,
)

toc_title_style = ParagraphStyle(
    name='TOCTitle', fontName='FreeSerif-Bold', fontSize=22,
    leading=28, alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=0, spaceAfter=20,
)

# Table cell styles
header_cell_style = ParagraphStyle(
    name='HeaderCell', fontName='FreeSerif-Bold', fontSize=9.5,
    leading=13, alignment=TA_CENTER, textColor=TABLE_HEADER_TEXT,
)
cell_style = ParagraphStyle(
    name='CellStyle', fontName='FreeSerif', fontSize=9,
    leading=13, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
)
cell_center = ParagraphStyle(
    name='CellCenter', fontName='FreeSerif', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_PRIMARY,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. TocDocTemplate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


def on_first_page(canvas, doc):
    """No header/footer on TOC page."""
    pass


def on_later_pages(canvas, doc):
    """Header + footer on body pages."""
    canvas.saveState()
    # Header
    canvas.setFont('FreeSerif-Italic', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_M, PAGE_H - 0.6 * inch,
                      'Refugio Mata Atlantica - Documento Tecnico')
    canvas.drawRightString(PAGE_W - RIGHT_M, PAGE_H - 0.6 * inch,
                           'Versao 1.0.0')
    # Header line
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_M, PAGE_H - 0.7 * inch, PAGE_W - RIGHT_M, PAGE_H - 0.7 * inch)
    # Footer
    canvas.setFont('FreeSerif', 9)
    canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, str(doc.page))
    # Footer line
    canvas.line(LEFT_M, 0.65 * inch, PAGE_W - RIGHT_M, 0.65 * inch)
    canvas.restoreState()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


H1_ORPHAN = (PAGE_H - TOP_M - BOTTOM_M) * 0.25


def add_h1(text):
    return [CondPageBreak(H1_ORPHAN), add_heading(text, heading1_style, level=0)]


def add_h2(text):
    return [add_heading(text, heading2_style, level=1)]


def add_h3(text):
    return [Paragraph(text, heading3_style)]


def body(text):
    return Paragraph(text, body_style)


def bullet(text):
    return Paragraph('  ' + text, bullet_style)


def spacer(h=12):
    return Spacer(1, h)


def make_table(headers, rows, col_ratios=None):
    """Build a styled table. All cells in Paragraph()."""
    if col_ratios is None:
        n = len(headers)
        col_ratios = [1.0 / n] * n
    col_widths = [r * AVAIL_W for r in col_ratios]

    data = [[Paragraph('<b>%s</b>' % h, header_cell_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])

    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_ODD if i % 2 == 1 else TABLE_ROW_EVEN
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


def table_block(headers, rows, col_ratios=None, caption=''):
    """Full table block with spacers and caption."""
    elements = [spacer(12), make_table(headers, rows, col_ratios)]
    if caption:
        elements.append(spacer(4))
        elements.append(Paragraph(caption, caption_style))
    elements.append(spacer(12))
    return elements


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. BUILD STORY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story = []

# --- TOC ---
toc = TableOfContents()
toc.levelStyles = [toc_h1_style, toc_h2_style]
story.append(Paragraph('Sumario', toc_title_style))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════
# CAP. 1 — RESUMO EXECUTIVO
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 1 — Resumo Executivo'))
story.append(body(
    'O projeto Refugio Mata Atlantica constitui uma solucao digital completa e whitelabel '
    'para pousadas e eco-lodges, construida inteiramente sobre a plataforma Next.js 16 com '
    'App Router e TypeScript. A aplicacao abrange tanto o website publico voltado para '
    'hospedes quanto um sistema de gestao administrativa (CMS) robusto, oferecendo uma '
    'experiencia de ponta a ponta que vai desde a descoberta da pousada ate a confirmacao '
    'da reserva e o pagamento online via Mercado Pago.'
))
story.append(body(
    'O website publico apresenta mais de 50 componentes React organizados em dezenas de '
    'secoes interativas na pagina inicial, incluindo hero animado com GSAP, galeria de '
    'acomodacoes, secao de experiencias naturais, depoimentos de hospedes e formulario de '
    'reservas integrado. O design e completamente responsivo, adotando a tecnica de '
    'glassmorphism e uma paleta de cores inspirada na Mata Atlantica, com tons de verde '
    'floresta, âmbar dourado e areia quente. A navegacao e aprimorada com Lenis Smooth '
    'Scroll e um cursor personalizado que reage aos elementos interativos da pagina.'
))
story.append(body(
    'No backend, a aplicacao implementa 41 rotas de API distribuidas entre funcionalidades '
    'publicas (acomodacoes, experiencias, depoimentos, galerias, reservas, contatos) e '
    'rotas administrativas protegidas por autenticacao JWT. O banco de dados conta com 18 '
    'modelos Prisma cobrindo acomodacoes, reservas, hospedes, experiencias, pagamentos, '
    'configuracoes do site e logs de atividades. O CMS administraivo dispoe de 17 paginas '
    'de gestao com dashboards, tabelas interativas, modais de edicao e sistema de upload '
    'de imagens para AWS S3.'
))
story.append(body(
    'A conformidade com a Lei Geral de Protecao de Dados (LGPD) e assegurada mediante '
    'banner de consentimento de cookies, paginas de Politica de Privacidade e Termos de '
    'Uso, alem de checkboxes de consentimento em todos os formularios de captura de dados '
    'pessoais. O sistema de reservas integra-se ao Mercado Pago para processamento seguro '
    'de pagamentos, com paginas dedicadas de sucesso e falha na transacao. Mais de 20 '
    'imagens foram geradas por inteligencia artificial para enriquecer visualmente o '
    'template, e todo o conteudo e configuravel dinamicamente pelo painel administrativo.'
))

# ═══════════════════════════════════════════════
# CAP. 2 — VISÃO GERAL DA ARQUITETURA
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 2 — Visao Geral da Arquitetura'))

story.extend(add_h2('2.1 Stack Tecnologica'))
story.append(body(
    'A pilha tecnologica do projeto foi cuidadosamente selecionada para maximizar a '
    'performance, a experiencia do desenvolvedor e a escalabilidade da aplicacao. O '
    'framework base e o Next.js 16, que oferece renderizacao hibrida (SSR, SSG e CSR), '
    'roteamento baseado em arquivos e otimizacoes automaticas de imagens. O TypeScript '
    'garante tipagem estatica em todo o codigo, reduzindo erros em tempo de execucao.'
))

stack_headers = ['Categoria', 'Tecnologia', 'Versao / Detalhes']
stack_rows = [
    ['Framework', 'Next.js (App Router)', '16.x'],
    ['Linguagem', 'TypeScript', '5.x'],
    ['Estilizacao', 'Tailwind CSS', '4.x'],
    ['Animacoes', 'GSAP (GreenSock)', '3.x'],
    ['Smooth Scroll', 'Lenis', '1.x'],
    ['ORM', 'Prisma', '6.x'],
    ['Banco de Dados', 'SQLite / Turso', 'Local ou Nuvem'],
    ['Icones', 'Lucide React', 'Latest'],
    ['Analytics', 'Vercel Analytics', 'Integrado'],
    ['Storage', 'AWS S3 (CloudFront)', 'Upload de imagens'],
    ['Auth Admin', 'JWT (bcrypt)', 'Rotas protegidas'],
    ['Pagamentos', 'Mercado Pago SDK', 'Checkout integrado'],
]
story.extend(table_block(stack_headers, stack_rows, [0.22, 0.38, 0.40],
    'Tabela 1 — Stack tecnologica completa do projeto.'))

story.extend(add_h2('2.2 Estrutura de Diretorios'))
story.append(body(
    'A organizacao do projeto segue as convencoes modernas do Next.js com App Router. '
    'O diretorio src/ contem toda a logica da aplicacao, subdividida em app/ para as rotas '
    'e pages, components/ para os componentes reutilizaveis, lib/ para utilitarios e '
    'configuracoes, e types/ para as definicoes de tipos TypeScript. A separacao clara '
    'entre frontend e backend e mantida pela estrutura de API routes dentro de app/api/.'
))

dir_headers = ['Diretorio', 'Descricao']
dir_rows = [
    ['src/app/', 'Rotas da aplicacao (paginas e API routes)'],
    ['src/app/api/', '41 handlers de API (publicos e admin)'],
    ['src/app/(admin)/', 'Painel administrativo (17 paginas)'],
    ['src/components/', '50+ componentes React reutilizaveis'],
    ['src/components/ui/', 'Componentes base do design system'],
    ['src/components/admin/', 'Componentes especificos do CMS'],
    ['src/components/animations/', 'Hooks e componentes de animacao'],
    ['src/lib/', 'Utilitarios, Prisma client, auth helpers'],
    ['src/types/', 'Definicoes de tipos TypeScript'],
    ['prisma/', 'Schema do banco de dados (18 modelos)'],
    ['public/', 'Assets estaticos (imagens, fontes, favicon)'],
]
story.extend(table_block(dir_headers, dir_rows, [0.28, 0.72],
    'Tabela 2 — Estrutura principal de diretorios do projeto.'))

# ═══════════════════════════════════════════════
# CAP. 3 — FRONTEND — WEBSITE PUBLICO
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 3 — Frontend — Website Publico'))

story.extend(add_h2('3.1 Pagina Inicial — Secoes'))
story.append(body(
    'A pagina inicial do website e construida como uma composicao de dez secoes '
    'distintas, cada uma implementada como um componente React independente. Esta '
    'arquitetura modular permite que cada secao seja desenvolvida, testada e mantida '
    'separadamente, ao mesmo tempo em que compoe uma experiencia de navegacao fluida e '
    'coerente. A pagina utiliza animacoes de revelacao (scroll-triggered) para criar '
    'uma sensacao de profundidade e progressao conforme o usuario desce pela pagina.'
))

sections_headers = ['Secao', 'Componente', 'Funcionalidades']
sections_rows = [
    ['Hero', 'HeroSection', 'Animacao GSAP, parallax, CTA de reserva, video de fundo'],
    ['Sobre', 'AboutSection', 'Descricao da pousada, historia, valores, glassmorphism cards'],
    ['Acomodacoes', 'AccommodationsSection', 'Cards com imagens, filtros por tipo, link para detalhes'],
    ['Experiencias', 'ExperiencesSection', 'Galeria de atividades, categorias (trilhas, rafting, etc.)'],
    ['Depoimentos', 'TestimonialsSection', 'Carousel de avaliacoes, fotos de hospedes, estrelas'],
    ['Galeria', 'GallerySection', 'Grid mosaico de fotos com lightbox e lazy loading'],
    ['Localizacao', 'LocationSection', 'Mapa interativo, direcoes, distancia de cidades'],
    ['FAQ', 'FAQSection', 'Accordion de perguntas frequentes com busca'],
    ['Contato', 'ContactSection', 'Formulario de contato, mapa, WhatsApp, horarios'],
    ['Reserva', 'ReservationSection', 'Formulario completo com seletor de acomodacao e datas'],
]
story.extend(table_block(sections_headers, sections_rows, [0.14, 0.26, 0.60],
    'Tabela 3 — As dez secoes da pagina inicial e seus componentes.'))

story.extend(add_h2('3.2 Sistema de Animacoes (GSAP)'))
story.append(body(
    'O GreenSock Animation Platform (GSAP) e o motor de animacao principal do projeto, '
    'utilizado para criar transicoes suaves e efeitos visuais que enriquecem a experiencia '
    'do usuario. O hook personalizado useReveal implementa um sistema de revelacao '
    'scroll-triggered: os elementos da pagina aparecem com animacoes de entrada (fade-in, '
    'slide-up, scale) quando entram no viewport do usuario, utilizando o ScrollTrigger do '
    'GSAP. Ja o hook useCardTilt aplica um efeito de inclinacao 3D interativa aos cards '
    'de acomodacoes e experiencias, respondendo ao movimento do mouse para criar uma '
    'sensacao de profundidade e interatividade.'
))
story.append(body(
    'A secao Hero utiliza animacoes GSAP mais elaboradas, incluindo o efeito parallax em '
    'multiplas camadas de conteudo (titulo, subtitulo, botao CTA), animacoes de entrada '
    'sequenciais com delays escalonados, e um efeito de "split text" que divide o titulo '
    'em caracteres individuais para anima-los um a um. Todas as animacoes sao '
    'otimizadas para performance, utilizando will-change e requestAnimationFrame, e sao '
    'desativadas automaticamente em dispositivos com preferencia de movimento reduzido '
    'conforme a media query prefers-reduced-motion.'
))

story.extend(add_h2('3.3 Smooth Scroll (Lenis)'))
story.append(body(
    'A biblioteca Lenis e integrada para proporcionar uma experiencia de scroll suave e '
    'natural em toda a aplicacao. Diferente do scroll nativo do navegador, que pode ser '
    'abrupto e irregular, o Lenis implementa uma interpolacao baseada em lerp '
    '(linear interpolation) que suaviza o deslocamento da pagina, criando uma sensacao '
    'de fluidez e continuidade. A integracao com o GSAP ScrollTrigger e garantida '
    'atraves de um loop de requestAnimationFrame compartilhado, onde o Lenis atualiza '
    'a posicao do scroll e o ScrollTrigger recalcula as posicoes dos elementos.'
))

story.extend(add_h2('3.4 Cursor Personalizado'))
story.append(body(
    'O componente CustomCursor substitui o cursor padrao do navegador por um cursor '
    'personalizado que reage ao contexto da pagina. O cursor consiste em dois elementos '
    'concentricos: um ponto central e um anel externo que se expande quando o mouse '
    'passa sobre elementos interativos (botoes, links, cards). Esta implementacao '
    'utiliza eventos de mousemove com throttle para garantir performance, e e '
    'automaticamente desativada em dispositivos touch (mobile e tablet) para nao '
    'interferir com a navegacao nativa.'
))

story.extend(add_h2('3.5 Folhas Caindo'))
story.append(body(
    'O componente FallingLeaves adiciona um efeito decorativo de folhas que caem '
    'suavemente pela tela, reforçando a identidade visual da Mata Atlantica. As folhas '
    'sao renderizadas como elementos SVG com formas organicas e cores variadas (verde '
    'floresta, verde lima, âmbar dourado). A animacao utiliza GSAP para controlar a '
    'queda, rotacao e oscilacao lateral de cada folha, com parametros aleatorizados '
    'para evitar repeticao. O numero de folhas ativas e limitado a 15 para manter a '
    'performance, e o efeito e desativado em dispositivos moveis.'
))

story.extend(add_h2('3.6 Paginas Adicionais'))
story.append(body(
    'Alem da pagina inicial, o website inclui um conjunto de paginas secundarias que '
    'completam a experiencia do usuario e fornecem informacoes essenciais sobre a pousada, '
    'suas acomodacoes, experiencias e politicas. Cada pagina e construida como um '
    'componente server-side no Next.js App Router, permitindo otimizacao de SEO e '
    'carregamento rapido.'
))

pages_headers = ['Rota', 'Pagina', 'Descricao']
pages_rows = [
    ['/', 'Home', 'Pagina inicial com 10 secoes interativas'],
    ['/acomodacoes', 'Acomodacoes', 'Listagem completa de quartos e suites'],
    ['/acomodacoes/[slug]', 'Detalhe da Acomodacao', 'Descricao, galeria, amenities, reserva'],
    ['/experiencias', 'Experiencias', 'Atividades e pacotes disponiveis'],
    ['/galeria', 'Galeria', 'Grid de fotos com categorias e lightbox'],
    ['/contato', 'Contato', 'Formulario, mapa, informacoes de contato'],
    ['/reservas', 'Reservas', 'Formulario de reserva com pagamento'],
    ['/reserva-sucesso', 'Sucesso', 'Confirmacao apos pagamento aprovado'],
    ['/reserva-falha', 'Falha', 'Pagina de erro de pagamento'],
    ['/politica-de-privacidade', 'Privacidade', 'Politica LGPD completa'],
    ['/termos-de-uso', 'Termos', 'Termos e condicoes de uso do site'],
]
story.extend(table_block(pages_headers, pages_rows, [0.24, 0.24, 0.52],
    'Tabela 4 — Rotas e paginas do website publico.'))

# ═══════════════════════════════════════════════
# CAP. 4 — TEMA VISUAL E DESIGN SYSTEM
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 4 — Tema Visual e Design System'))

story.extend(add_h2('4.1 Paleta de Cores'))
story.append(body(
    'A paleta de cores do projeto foi cuidadosamente elaborada para evocar a sensacao '
    'de imersao na Mata Atlantica, combinando tons naturais de verde floresta com '
    'acentos de âmbar dourado que remetem ao sol filtrando pela copa das arvores. O '
    'sistema utiliza variaveis CSS customizadas para garantir consistencia em toda a '
    'aplicacao, permitindo ajustes globais de tema a partir de um unico ponto de '
    'configuracao. As cores foram definidas seguindo o sistema HSL para facilitar a '
    'geracao de variantes (lighter, darker, alpha) de forma programatica.'
))

color_headers = ['Funcao', 'Variavel', 'Valor', 'Uso']
color_rows = [
    ['Primaria', '--color-primary', '#1B5E3B', 'Botoes, links, acentos principais'],
    ['Primaria Clara', '--color-primary-light', '#2D8B5E', 'Hovers, badges, estados ativos'],
    ['Primaria Escura', '--color-primary-dark', '#0F3D25', 'Texto sobre fundos claros'],
    ['Secundaria', '--color-secondary', '#C4841D', 'Destaques, CTAs secundarios'],
    ['Secundaria Clara', '--color-secondary-light', '#E5A84D', 'Alertas, avisos'],
    ['Fundo Principal', '--background-primary', '#FAF6EE', 'Fundo do site (areia quente)'],
    ['Fundo Secundario', '--background-secondary', '#F0EBE0', 'Cards, secoes alternadas'],
    ['Texto Principal', '--text-primary', '#1A1A1A', 'Corpo de texto, titulos'],
    ['Texto Secundario', '--text-secondary', '#6B7280', 'Subtitulos, captions'],
    ['Branco', '--white', '#FFFFFF', 'Fundo de modais, cards glass'],
]
story.extend(table_block(color_headers, color_rows, [0.18, 0.26, 0.16, 0.40],
    'Tabela 5 — Paleta de cores do design system.'))

story.extend(add_h2('4.2 Tipografia'))
story.append(body(
    'O sistema tipografico utiliza a familia Inter como fonte principal para o corpo de '
    'texto e elementos de interface, oferecendo excelente legibilidade em telas de '
    'todos os tamanhos. Para titulos e headlines, a familia Playfair Display e '
    'utilizada para transmitir elegancia e sofisticacao, em sintonia com o posicionamento '
    'premium da pousada. A escala tipografica segue uma progressao modular baseada em '
    'razao de 1.25 (major third), garantindo harmonia visual entre os diferentes '
    'niveis hierarquicos de texto.'
))

story.extend(add_h2('4.3 Glassmorphism'))
story.append(body(
    'A tecnica de glassmorphism e amplamente utilizada no design do website para criar '
    'elementos visuais com efeito de vidro fosco. Os cards de informacao, os modais e '
    'os overlays utilizam a combinacao de backdrop-blur, background com opacidade '
    'reduzida e bordas semi-transparentes para criar profundidade visual. O efeito e '
    'implementado atraves de classes utilitarias do Tailwind CSS (backdrop-blur-md, '
    'bg-white/10, border-white/20) e e complementado por sombras suaves que reforçam '
    'a sensacao de camadas sobrepostas.'
))

story.extend(add_h2('4.4 Design Responsivo'))
story.append(body(
    'O website foi projetado com uma abordagem mobile-first, utilizando os breakpoints '
    'padrao do Tailwind CSS: sm (640px), md (768px), lg (1024px), xl (1280px) e '
    '2xl (1536px). Cada componente e testado em pelo menos tres tamanhos de tela '
    '(mobile, tablet e desktop) para garantir uma experiencia adequada em todos os '
    'dispositivos. O grid layout utiliza CSS Grid e Flexbox para criar layouts '
    'adaptaveis, com colunas que se reorganizam automaticamente conforme o espaco '
    'disponivel. Imagens utilizam o componente next/image com propriedades responsive '
    'para servir versoes otimizadas em cada breakpoint.'
))

# ═══════════════════════════════════════════════
# CAP. 5 — COMPONENTES UI E ELEMENTOS GLOBAIS
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 5 — Componentes UI e Elementos Globais'))

story.extend(add_h2('5.1 Header (Cabecalho)'))
story.append(body(
    'O componente Header implementa a barra de navegacao principal do website, fixa no '
    'topo da pagina com efeito de backdrop-blur que cria um vidro fosco sobre o conteudo '
    'ao rolar a pagina. O header inclui o logo da pousada, links de navegacao para as '
    'principais secoes (Sobre, Acomodacoes, Experiencias, Galeria, Contato), um botao '
    'destacado de "Reservar Agora" e um menu hamburger responsivo para dispositivos '
    'moveis. A transicao entre o estado transparente (topo da pagina) e o estado com '
    'fundo blur (ao rolar) e animada com GSAP, ativada pelo ScrollTrigger.'
))

story.extend(add_h2('5.2 Footer (Rodape)'))
story.append(body(
    'O Footer apresenta a estrutura de informacoes finais do website, organizado em '
    'quatro colunas no desktop (Sobre, Links Rapidos, Contato, Redes Sociais) que se '
    'reorganizam em coluna unica no mobile. Inclui links para as paginas legais '
    '(Politica de Privacidade, Termos de Uso), informacoes de contato (endereco, '
    'telefone, e-mail), links para redes sociais com icones Lucide, e o copyright com '
    'o ano dinamico. O fundo utiliza a cor primaria escura com texto claro, criando '
    'contraste com o corpo da pagina.'
))

story.extend(add_h2('5.3 Botao de WhatsApp'))
story.append(body(
    'O componente WhatsAppFloatingButton exibe um botao flutuante no canto inferior '
    'direito da tela que permite ao usuario iniciar uma conversa direta no WhatsApp '
    'com a pousada. O botao utiliza o icone do WhatsApp com a cor verde caracteristica '
    'da plataforma e inclui uma animacao de pulsacao sutil para atrair a atencao. O '
    'numero de telefone e configuravel atraves de variaveis de ambiente, e o link '
    'utiliza a API oficial do WhatsApp (wa.me) com mensagem pre-definida. O componente '
    'e renderizado apenas em clientes (use client) e inclui um tooltip que aparece '
    'ao passar o mouse.'
))

story.extend(add_h2('5.4 Banner de Cookies'))
story.append(body(
    'O CookieConsentBanner implementa o banner de consentimento de cookies exigido pela '
    'LGPD. O banner aparece na parte inferior da tela na primeira visita do usuario e '
    'oferece opcoes granulares de consentimento: cookies essenciais (sempre ativos), '
    'cookies de desempenho e cookies de marketing. As preferencias do usuario sao '
    'armazenadas no localStorage e enviadas para o servidor para registro. O banner '
    'utiliza glassmorphism e animacao de entrada suave, e so aparece novamente apos '
    'a expiracao do periodo de consentimento (configuravel, padrao de 12 meses).'
))

story.extend(add_h2('5.5 Pagina 404'))
story.append(body(
    'A pagina de erro 404 (Not Found) apresenta um design tematico que mantem a '
    'identidade visual do website mesmo em situacoes de erro. A pagina exibe uma '
    'mensagem amigavel convidando o usuario a retornar a pagina inicial, com uma '
    'ilustracao tematica relacionada a natureza, um botao de retorno destacado e links '
    'para as secoes mais populares do site. O design segue a mesma paleta de cores e '
    'tipografia do restante da aplicacao, garantindo coerencia visual.'
))

# ═══════════════════════════════════════════════
# CAP. 6 — BACKEND — API E BANCO DE DADOS
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 6 — Backend — API e Banco de Dados'))

story.extend(add_h2('6.1 Prisma Schema — 18 Modelos'))
story.append(body(
    'O banco de dados e gerenciado pelo Prisma ORM, com um schema composto por 18 '
    'modelos que cobrem todas as entidades do dominio da pousada. Os modelos sao '
    'organizados em tres grupos funcionais: conteudo do site (acomodacoes, experiencias, '
    'depoimentos, galerias), gestao de reservas (reservas, hospedes, pagamentos) e '
    'administracao (usuarios, configuracoes, logs de atividades). Cada modelo inclui '
    'campos de auditoria (createdAt, updatedAt) e relacoes bem definidas entre '
    'entidades.'
))

model_headers = ['Modelo', 'Descricao', 'Campos Principais']
model_rows = [
    ['User', 'Usuarios do painel admin', 'id, name, email, password, role, isActive'],
    ['Accommodation', 'Acomodacoes da pousada', 'id, name, slug, description, price, capacity, type'],
    ['AccommodationImage', 'Imagens das acomodacoes', 'id, url, alt, order, accommodationId'],
    ['Experience', 'Experiencias e atividades', 'id, title, slug, description, price, duration, category'],
    ['ExperienceImage', 'Imagens das experiencias', 'id, url, alt, order, experienceId'],
    ['Testimonial', 'Depoimentos de hospedes', 'id, name, location, rating, comment, avatar'],
    ['GalleryImage', 'Imagens da galeria', 'id, url, alt, category, order, featured'],
    ['Reservation', 'Reservas realizadas', 'id, checkIn, checkOut, status, total, guestId, accommodationId'],
    ['Guest', 'Dados dos hospedes', 'id, name, email, phone, document, consentLGPD'],
    ['Payment', 'Registros de pagamentos', 'id, reservationId, amount, status, method, externalId'],
    ['ContactMessage', 'Mensagens de contato', 'id, name, email, phone, subject, message, isRead'],
    ['SiteSetting', 'Configuracoes do site', 'id, key, value, type, description'],
    ['HomePageSection', 'Secoes da home page', 'id, type, title, content, order, isActive'],
    ['FAQItem', 'Perguntas frequentes', 'id, question, answer, order, category'],
    ['ActivityLog', 'Log de atividades admin', 'id, userId, action, details, ipAddress'],
    ['MediaFile', 'Arquivos de midia', 'id, filename, url, mimeType, size, folder'],
    ['PageContent', 'Conteudo de paginas', 'id, slug, title, content, metaTitle, metaDescription'],
    ['Newsletter', 'Inscritos na newsletter', 'id, email, name, isActive, consentDate'],
]
story.extend(table_block(model_headers, model_rows, [0.16, 0.30, 0.54],
    'Tabela 6 — Os 18 modelos do schema Prisma.'))

story.extend(add_h2('6.2 API Routes — 41 Handlers'))
story.append(body(
    'A API do projeto implementa 41 handlers distribuidos entre rotas publicas e rotas '
    'protegidas por autenticacao. As rotas publicas permitem a leitura de conteudo '
    '(acomodacoes, experiencias, depoimentos, galerias, FAQ) e a submissao de formularios '
    '(reservas, contato, newsletter). As rotas administrativas exigem autenticacao JWT '
    'e permitem operacoes completas de CRUD sobre todas as entidades do sistema.'
))

api_headers = ['Rota', 'Metodo', 'Tipo', 'Descricao']
api_rows = [
    ['/api/accommodations', 'GET', 'Publico', 'Listar acomodacoes ativas'],
    ['/api/accommodations/[slug]', 'GET', 'Publico', 'Detalhe de acomodacao por slug'],
    ['/api/experiences', 'GET', 'Publico', 'Listar experiencias disponiveis'],
    ['/api/testimonials', 'GET', 'Publico', 'Listar depoimentos aprovados'],
    ['/api/gallery', 'GET', 'Publico', 'Listar imagens da galeria'],
    ['/api/faq', 'GET', 'Publico', 'Listar perguntas frequentes'],
    ['/api/site-settings', 'GET', 'Publico', 'Configuracoes publicas do site'],
    ['/api/home-sections', 'GET', 'Publico', 'Secoes configuraveis da home'],
    ['/api/reservations', 'POST', 'Publico', 'Criar nova reserva'],
    ['/api/contact', 'POST', 'Publico', 'Enviar mensagem de contato'],
    ['/api/newsletter', 'POST', 'Publico', 'Inscrever na newsletter'],
    ['/api/availability', 'GET', 'Publico', 'Verificar disponibilidade'],
    ['/api/admin/auth/login', 'POST', 'Admin', 'Login do administrador'],
    ['/api/admin/auth/me', 'GET', 'Admin', 'Dados do usuario autenticado'],
    ['/api/admin/accommodations', 'GET/POST', 'Admin', 'Listar/criar acomodacoes'],
    ['/api/admin/accommodations/[id]', 'PUT/DELETE', 'Admin', 'Editar/eliminar acomodacao'],
    ['/api/admin/experiences', 'GET/POST', 'Admin', 'Listar/criar experiencias'],
    ['/api/admin/experiences/[id]', 'PUT/DELETE', 'Admin', 'Editar/eliminar experiencia'],
    ['/api/admin/testimonials', 'GET/POST', 'Admin', 'Listar/criar depoimentos'],
    ['/api/admin/testimonials/[id]', 'PUT/DELETE', 'Admin', 'Editar/eliminar depoimento'],
    ['/api/admin/gallery', 'GET/POST', 'Admin', 'Listar/criar imagens'],
    ['/api/admin/gallery/[id]', 'PUT/DELETE', 'Admin', 'Editar/eliminar imagem'],
    ['/api/admin/reservations', 'GET', 'Admin', 'Listar todas as reservas'],
    ['/api/admin/reservations/[id]', 'PUT', 'Admin', 'Atualizar status da reserva'],
    ['/api/admin/messages', 'GET', 'Admin', 'Listar mensagens de contato'],
    ['/api/admin/messages/[id]', 'PUT', 'Admin', 'Marcar mensagem como lida'],
    ['/api/admin/settings', 'GET/PUT', 'Admin', 'Ler/atualizar configuracoes'],
    ['/api/admin/faq', 'GET/POST', 'Admin', 'Listar/criar FAQ'],
    ['/api/admin/faq/[id]', 'PUT/DELETE', 'Admin', 'Editar/eliminar FAQ'],
    ['/api/admin/upload', 'POST', 'Admin', 'Upload de imagens para S3'],
    ['/api/admin/pages', 'GET/PUT', 'Admin', 'Conteudo de paginas legais'],
    ['/api/admin/newsletter', 'GET', 'Admin', 'Lista de inscritos'],
    ['/api/admin/home-sections', 'PUT', 'Admin', 'Reordenar secoes da home'],
    ['/api/admin/activity-logs', 'GET', 'Admin', 'Historico de atividades'],
    ['/api/admin/dashboard/stats', 'GET', 'Admin', 'Estatisticas do dashboard'],
    ['/api/admin/dashboard/chart', 'GET', 'Admin', 'Dados de graficos'],
    ['/api/admin/media', 'GET/POST', 'Admin', 'Gerenciar arquivos de midia'],
    ['/api/admin/media/[id]', 'DELETE', 'Admin', 'Eliminar arquivo de midia'],
    ['/api/payments/create', 'POST', 'Publico', 'Criar preferencia de pagamento'],
    ['/api/payments/webhook', 'POST', 'Publico', 'Webhook do Mercado Pago'],
]
story.extend(table_block(api_headers, api_rows, [0.30, 0.12, 0.10, 0.48],
    'Tabela 7 — Os 41 handlers de API do projeto.'))

story.extend(add_h2('6.3 Sistema de Autenticacao'))
story.append(body(
    'O sistema de autenticacao do painel administrativo e implementado utilizando JWT '
    '(JSON Web Tokens) com a biblioteca jose para criacao e verificacao de tokens. O '
    'login e processado pela rota /api/admin/auth/login, que valida as credenciais '
    '(email e senha) contra o banco de dados, utilizando bcrypt para comparacao segura '
    'de hashes de senha. Apos autenticacao bem-sucedida, um token JWT com validade de '
    '24 horas e retornado ao cliente e armazenado em um cookie httpOnly. O middleware '
    'de autenticacao verifica a validade do token em cada requisicao as rotas '
    'protegidas, extraindo o ID do usuario e adicionando-o ao contexto da requisicao.'
))

story.extend(add_h2('6.4 Sistema de Dados'))
story.append(body(
    'O acesso ao banco de dados e centralizado atraves do Prisma Client, instanciado '
    'como um singleton para evitar multiplas conexoes em ambiente de desenvolvimento. O '
    'arquivo src/lib/db.ts exporta a instancia do PrismaClient, que e utilizada por '
    'todas as rotas de API. Em producao, o sistema suporta dois modos de operacao: '
    'banco de dados local (SQLite) para instalacoes self-hosted e banco de dados em '
    'nuvem (Turso) para deploy na Vercel, com resiliencia automatica que fallback para '
    'modo local caso a conexao com o Turso falhe.'
))

# ═══════════════════════════════════════════════
# CAP. 7 — PAINEL ADMINISTRATIVO (CMS)
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 7 — Painel Administrativo (CMS)'))

story.extend(add_h2('7.1 Layout do CMS'))
story.append(body(
    'O painel administrativo utiliza um layout dedicado com sidebar fixa no lado '
    'esquerdo, contendo a navegacao entre as diferentes secoes do CMS, e uma area de '
    'conteudo principal no lado direito. A sidebar inclui o logo do CMS, links de '
    'navegacao com icones Lucide, indicador visual da pagina ativa e um menu de '
    'usuario no rodape com opcoes de perfil e logout. O layout e responsivo, '
    'transformando a sidebar em um menu hamburger em telas menores. A area de conteudo '
    'principal inclui um header com titulo da pagina atual, breadcrumbs de navegacao e '
    'acoes contextuais (botoes de criar, filtrar, exportar).'
))

story.extend(add_h2('7.2 Paginas de Gestao'))
story.append(body(
    'O CMS inclui 17 paginas de gestao que cobrem todas as funcionalidades '
    'administrativas da pousada. Cada pagina segue um padrao consistente de '
    'interfaces: listagem com tabela de dados, busca e filtros, botoes de acao, modais '
    'de criacao/edicao com validacao de formulario, e confirmacao de exclusao. As '
    'tabelas suportam paginacao, ordenacao por colunas e selecao multipla para acoes '
    'em lote. Todas as operacoes exibem feedback visual (toasts de sucesso/erro, '
    'estados de loading) e registram atividades no log de auditoria.'
))

cms_headers = ['Pagina', 'Rota Admin', 'Funcionalidades']
cms_rows = [
    ['Dashboard', '/admin', 'Estatisticas, graficos, reservas recentes, atividade'],
    ['Acomodacoes', '/admin/accommodations', 'CRUD completo, galeria de imagens, precos'],
    ['Experiencias', '/admin/experiences', 'CRUD completo, categorias, duracao, preco'],
    ['Depoimentos', '/admin/testimonials', 'Moderar, aprovar, editar depoimentos'],
    ['Galeria', '/admin/gallery', 'Upload, categorizar, reordenar imagens'],
    ['Reservas', '/admin/reservations', 'Listar, filtrar, alterar status, detalhes'],
    ['Mensagens', '/admin/messages', 'Caixa de entrada, marcar como lida, responder'],
    ['FAQ', '/admin/faq', 'CRUD de perguntas e respostas'],
    ['Configuracoes', '/admin/settings', 'Dados da pousada, redes sociais, SEO'],
    ['Secoes Home', '/admin/home-sections', 'Reordenar, ativar/desativar secoes'],
    ['Paginas', '/admin/pages', 'Editar conteudo das paginas legais'],
    ['Newsletter', '/admin/newsletter', 'Lista de inscritos, exportar CSV'],
    ['Midia', '/admin/media', 'Biblioteca de arquivos, upload, eliminar'],
    ['Logs', '/admin/activity-logs', 'Historico completo de acoes dos admins'],
    ['Perfil', '/admin/profile', 'Editar nome, email, senha do usuario'],
    ['Usuarios', '/admin/users', 'Gerenciar contas de administradores'],
    ['Login', '/admin/login', 'Autenticacao com email e senha'],
]
story.extend(table_block(cms_headers, cms_rows, [0.16, 0.24, 0.60],
    'Tabela 8 — As 17 paginas do painel administrativo.'))

story.extend(add_h2('7.3 Sistema de Upload de Imagens'))
story.append(body(
    'O componente ImageUpload implementa o upload de imagens para o Amazon S3 '
    '(ou compativel) com preview em tempo real, arrastar e soltar (drag-and-drop), '
    'redimensionamento automatico no cliente antes do envio, e validacao de tipo e '
    'tamanho de arquivo. O upload utiliza uma rota API intermediaria (/api/admin/upload) '
    'que recebe o arquivo, gera um nome unico baseado em timestamp e hash, envia para o '
    'S3 utilizando o SDK oficial da AWS, e retorna a URL publica da imagem. O componente '
    'suporta upload multiplo, barra de progresso e tratamento de erros com mensagens '
    'descritivas em portugues.'
))

# ═══════════════════════════════════════════════
# CAP. 8 — SISTEMA DE RESERVAS
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 8 — Sistema de Reservas'))

story.extend(add_h2('8.1 Formulario de Reserva'))
story.append(body(
    'O formulario de reserva e um componente multi-etapa que guia o hospede pelo '
    'processo de reserva de forma intuitiva. A primeira etapa permite a selecao da '
    'acomodacao desejada (com imagens, descricao e preco), as datas de check-in e '
    'check-out (com calendario interativo e verificacao de disponibilidade em tempo '
    'real) e o numero de hospedes. A segunda etapa coleta os dados pessoais do '
    'hospede (nome completo, e-mail, telefone, documento de identidade) com '
    'validacao em tempo real e campo obrigatorio de consentimento LGPD. A terceira '
    'etapa apresenta um resumo da reserva com todos os detalhes e o valor total, '
    'direcionando o usuario para o pagamento via Mercado Pago.'
))

story.extend(add_h2('8.2 Fluxo de Pagamento'))
story.append(body(
    'A integracao com o Mercado Pago permite o processamento seguro de pagamentos '
    'online. Ao confirmar a reserva, o sistema cria uma preferencia de pagamento '
    'atraves da API do Mercado Pago, especificando o valor, a descricao e as URLs de '
    'retorno (sucesso e falha). O usuario e redirecionado para o checkout do Mercado '
    'Pago, onde pode escolher entre diversos metodos de pagamento (cartao de credito, '
    'PIX, boleto bancario). Apos a conclusao do pagamento, o Mercado Pago envia uma '
    'notificacao via webhook para a rota /api/payments/webhook, que atualiza o status '
    'da reserva e do pagamento no banco de dados.'
))

story.extend(add_h2('8.3 Paginas de Resultado'))
story.append(body(
    'Apos o processamento do pagamento, o usuario e redirecionado para uma das duas '
    'paginas de resultado. A pagina de sucesso (/reserva-sucesso) exibe uma mensagem '
    'de confirmacao com o numero da reserva, os detalhes da acomodacao e datas, o '
    'valor pago e as instrucoes para check-in. A pagina de falha (/reserva-falha) '
    'apresenta uma mensagem de erro amigavel com possiveis causas do problema e um '
    'botao para tentar novamente. Ambas as paginas mantêm a identidade visual do site '
    'e oferecem links para retornar a pagina inicial ou entrar em contato com a pousada.'
))

# ═══════════════════════════════════════════════
# CAP. 9 — COMPLIANCE LGPD
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 9 — Compliance LGPD'))

story.extend(add_h2('9.1 Banner de Consentimento de Cookies'))
story.append(body(
    'O sistema de consentimento de cookies implementa as exigencias da LGPD e do '
    'Marco Civil da Internet para coleta de dados digitais. O banner de cookies aparece '
    'na primeira visita do usuario e solicita consentimento explicito para tres '
    'categorias de cookies: essenciais (necessarios para o funcionamento basico do '
    'site), de desempenho (analytics e metricas de uso) e de marketing (pixels de '
    'redes sociais e remarketing). As preferencias sao armazenadas localmente e '
    'sincronizadas com o servidor para registro e auditoria. O usuario pode '
    'modificar suas preferencias a qualquer momento atraves de um link no footer.'
))

story.extend(add_h2('9.2 Paginas Legais'))
story.append(body(
    'O website inclui duas paginas legais obrigatórias: a Politica de Privacidade e os '
    'Termos de Uso. A Politica de Privacidade detalha todos os dados pessoais coletados, '
    'as finalidades da coleta, a base legal para o processamento, os destinatarios dos '
    'dados, o periodo de retencao e os direitos do titular (acesso, correcao, '
    'eliminacao, portabilidade, revogacao do consentimento). Os Termos de Uso '
    'estabelecem as condicoes de utilizacao do site e dos servicos de reserva. Ambas as '
    'paginas possuem conteudo editavel pelo CMS, permitindo atualizacoes sem '
    'modificacao de codigo.'
))

story.extend(add_h2('9.3 Consentimento em Formularios'))
story.append(body(
    'Todos os formularios que coletam dados pessoais incluem checkboxes de consentimento '
    'LGPD explicitos e obrigatorios. O formulario de reserva requer consentimento para '
    'o tratamento dos dados pessoais e para o compartilhamento de informacoes com o '
    'Mercado Pago para processamento do pagamento. O formulario de contato inclui '
    'consentimento para o envio de comunicacoes relacionadas a solicitacao. O formulario '
    'de newsletter requer consentimento especifico para o recebimento de comunicacoes '
    'de marketing. Cada registro de consentimento inclui o texto exato apresentado ao '
    'usuario, a data e hora do consentimento e o endereco IP, garantindo rastreabilidade '
    'e conformidade com a legislacao.'
))

# ═══════════════════════════════════════════════
# CAP. 10 — INTEGRAÇÃO TURSO / VERCEL
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 10 — Integracao Turso / Vercel'))

story.extend(add_h2('10.1 Modo Local (SQLite)'))
story.append(body(
    'No modo local, a aplicacao utiliza um banco de dados SQLite armazenado no '
    'diretorio do projeto. Este modo e ideal para desenvolvimento local, testes e '
    'instalacoes self-hosted onde a pousada deseja manter controle total sobre seus '
    'dados. O Prisma Client se conecta ao arquivo de banco de dados diretamente, sem '
    'necessidade de servidores externos ou configuracao de rede. Todas as funcionalidades '
    'da aplicacao estao disponiveis neste modo, incluindo o CMS completo e o sistema '
    'de reservas. A migracao do banco de dados e gerenciada pelo Prisma Migrate, com '
    'comandos simples para criar e aplicar migracoes.'
))

story.extend(add_h2('10.2 Modo Turso'))
story.append(body(
    'O modo Turso permite a conexao com um banco de dados SQLite distribuido na nuvem, '
    'oferecendo alta disponibilidade e baixa latencia atraves de replicacao geografica. '
    'A conexao e estabelecida via variaveis de ambiente (TURSO_DATABASE_URL e '
    'TURSO_AUTH_TOKEN), e o Prisma Client e configurado para utilizar o adapter do '
    'Turso. Este modo e recomendado para deploy na Vercel, onde o sistema de arquivos '
    'e efemero e nao suporta banco de dados SQLite local. O Turso oferece um painel '
    'de controle web para gerenciamento do banco, consultas SQL e monitoramento de '
    'performance.'
))

story.extend(add_h2('10.3 Resiliencia e Fallback'))
story.append(body(
    'O sistema de conexao com o banco de dados implementa um mecanismo de resiliencia '
    'que garante a disponibilidade da aplicacao mesmo em caso de falhas na conexao com o '
    'Turso. O modulo de banco de dados tenta primeiro a conexao com o Turso; em caso de '
    'falha (timeout, erro de autenticacao, indisponibilidade do servico), ele fallback '
    'automaticamente para o modo SQLite local. Este mecanismo e implementado com '
    'tratamento de excecoes e retry com backoff exponencial, registrando tentativas '
    'de falha no log de atividades do administrador.'
))

# ═══════════════════════════════════════════════
# CAP. 11 — SEO E PERFORMANCE
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 11 — SEO e Performance'))

story.extend(add_h2('11.1 Otimizacoes SEO'))
story.append(body(
    'A aplicacao implementa um conjunto abrangente de otimizacoes para mecanismos de '
    'busca. Cada pagina possui metadados dinamicos configurados atraves do componente '
    'Metadata do Next.js, incluindo titulo, descricao, keywords, Open Graph (og:title, '
    'og:description, og:image), Twitter Cards e canonical URL. As paginas de conteudo '
    'utilizam Server-Side Rendering (SSR) para garantir que os crawlers dos mecanismos '
    'de busca indexem o conteudo completo. O sitemap XML e o arquivo robots.txt sao '
    'gerados dinamicamente, e o schema.org JSON-LD e implementado para acomodacoes '
    '(Hotel, LodgingBusiness) e reviews (Review, AggregateRating).'
))
story.append(body(
    'A estrutura de URLs segue boas praticas de SEO, com slugs descritivos em portugues '
    'para acomodacoes e experiencias (por exemplo, /acomodacoes/suite-premium-floresta). '
    'Imagens possuem atributos alt descritivos e utilizam o componente next/image com '
    'prioridade de carregamento para imagens above-the-fold. A hierarquia de headings '
    '(H1, H2, H3) e respeitada em todas as paginas, e links internos conectam as '
    'diferentes secoes do site para melhorar a navegacao e a distribuicao de PageRank.'
))

story.extend(add_h2('11.2 Performance'))
story.append(body(
    'A performance da aplicacao e otimizada em multiplas camadas. No frontend, o '
    'Next.js implementa automaticamente code splitting, tree shaking e lazy loading de '
    'componentes. Imagens sao servidas em formatos modernos (WebP, AVIF) com tamanhos '
    'responsivos atraves do componente next/image. O GSAP utiliza ScrollTrigger para '
    'carregar animacoes apenas quando os elementos entram no viewport, e o Lenis '
    'Smooth Scroll e inicializado apenas no cliente. No backend, o Prisma utiliza '
    'connection pooling e query optimization, e as respostas de API implementam cache '
    'com headers HTTP de cache (Cache-Control, ETag) para conteudo estatico.'
))

# ═══════════════════════════════════════════════
# CAP. 12 — IMAGENS GERADAS POR IA
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 12 — Imagens Geradas por IA'))
story.append(body(
    'O template inclui mais de 20 imagens geradas por inteligencia artificial que servem '
    'como placeholders de alta qualidade para os diferentes contextos visuais do '
    'website. As imagens foram criadas com prompts especificos para cada tipo de uso, '
    'garantindo consistencia estilistica e tematica com a identidade visual da Mata '
    'Atlantica. Todas as imagens seguem uma estetica fotografica com cores naturais, '
    'iluminacao suave e composicao profissional, adequadas para substituicao por fotos '
    'reais da pousada sem descontinuidade visual.'
))

img_headers = ['Contexto', 'Arquivo', 'Dimensoes', 'Uso']
img_rows = [
    ['Hero', 'hero-mata-atlantica.jpg', '1920x1080', 'Fundo da secao principal'],
    ['Acomodacao 1', 'suite-standard.jpg', '800x600', 'Card de acomodacao padrao'],
    ['Acomodacao 2', 'suite-superior.jpg', '800x600', 'Card de suite superior'],
    ['Acomodacao 3', 'suite-deluxe.jpg', '800x600', 'Card de suite deluxe'],
    ['Acomodacao 4', 'chalet-familia.jpg', '800x600', 'Card de chale familiar'],
    ['Acomodacao 5', 'glamping-tenda.jpg', '800x600', 'Card de glamping'],
    ['Experiencia 1', 'trilha-natureza.jpg', '800x600', 'Card de trilha ecológica'],
    ['Experiencia 2', 'rafting-rio.jpg', '800x600', 'Card de rafting'],
    ['Experiencia 3', 'observacao-aves.jpg', '800x600', 'Card de birdwatching'],
    ['Experiencia 4', 'cachoeira-banho.jpg', '800x600', 'Card de cachoeira'],
    ['Galeria 1-10', 'gallery-01.jpg ... gallery-10.jpg', '600x400', 'Grid da galeria de fotos'],
    ['Depoimentos', 'avatar-hospede-1.jpg ... avatar-5.jpg', '100x100', 'Fotos dos hospedes'],
    ['Sobre', 'pousada-vista-aerea.jpg', '1200x800', 'Secao sobre a pousada'],
    ['Localizacao', 'mapa-regiao.jpg', '800x400', 'Fundo da secao de localizacao'],
    ['OG Image', 'og-image.jpg', '1200x630', 'Compartilhamento em redes sociais'],
    ['Favicon', 'favicon.ico', '48x48', 'Icone do navegador'],
]
story.extend(table_block(img_headers, img_rows, [0.14, 0.30, 0.14, 0.42],
    'Tabela 9 — Imagens geradas por IA e seus contextos de uso.'))

# ═══════════════════════════════════════════════
# CAP. 13 — CONFIGURAÇÃO E DEPLOY
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 13 — Configuracao e Deploy'))

story.extend(add_h2('13.1 Variaveis de Ambiente'))
story.append(body(
    'A configuracao da aplicacao e gerenciada atraves de variaveis de ambiente, seguindo '
    'o principio de Twelve-Factor App. Todas as variaveis possuem valores padrao para '
    'facilitar a configuracao inicial, e as credenciais sensiveis (chaves de API, tokens) '
    'jamais sao commitadas no repositorio de codigo, utilizando-se o arquivo .env.local '
    'para configuracao local e as Environment Variables da Vercel para producao.'
))

env_headers = ['Variavel', 'Descricao', 'Obrigatoria']
env_rows = [
    ['NEXT_PUBLIC_SITE_URL', 'URL base do site em producao', 'Sim'],
    ['DATABASE_URL', 'URL de conexao com o banco SQLite/Turso', 'Sim'],
    ['TURSO_DATABASE_URL', 'URL do banco de dados Turso (nuvem)', 'Nao'],
    ['TURSO_AUTH_TOKEN', 'Token de autenticacao do Turso', 'Nao'],
    ['JWT_SECRET', 'Chave secreta para assinatura de tokens JWT', 'Sim'],
    ['NEXT_PUBLIC_MP_PUBLIC_KEY', 'Chave publica do Mercado Pago', 'Sim'],
    ['MP_ACCESS_TOKEN', 'Token de acesso do Mercado Pago', 'Sim'],
    ['MP_WEBHOOK_URL', 'URL do webhook de pagamento', 'Sim'],
    ['AWS_ACCESS_KEY_ID', 'Chave de acesso da AWS (S3)', 'Sim'],
    ['AWS_SECRET_ACCESS_KEY', 'Chave secreta da AWS (S3)', 'Sim'],
    ['AWS_REGION', 'Regiao da AWS (ex: sa-east-1)', 'Sim'],
    ['AWS_S3_BUCKET', 'Nome do bucket S3 para imagens', 'Sim'],
    ['NEXT_PUBLIC_WHATSAPP', 'Numero de WhatsApp da pousada', 'Nao'],
    ['NEXT_PUBLIC_GOOGLE_MAPS_KEY', 'Chave da API do Google Maps', 'Nao'],
]
story.extend(table_block(env_headers, env_rows, [0.30, 0.50, 0.20],
    'Tabela 10 — Variaveis de ambiente da aplicacao.'))

story.extend(add_h2('13.2 Scripts NPM'))
story.append(body(
    'O arquivo package.json define um conjunto de scripts para as tarefas mais comuns '
    'de desenvolvimento, build e deploy. Cada script e otimizado para o fluxo de '
    'trabalho com Next.js 16 e Prisma, incluindo comandos para gerenciamento do banco '
    'de dados, validacao de tipos e formatacao de codigo.'
))

scripts_headers = ['Script', 'Comando', 'Descricao']
scripts_rows = [
    ['dev', 'next dev', 'Servidor de desenvolvimento com hot-reload'],
    ['build', 'next build', 'Compilacao de producao otimizada'],
    ['start', 'next start', 'Iniciar servidor de producao'],
    ['lint', 'next lint', 'Verificacao de qualidade do codigo (ESLint)'],
    ['db:push', 'prisma db push', 'Sincronizar schema com o banco'],
    ['db:generate', 'prisma generate', 'Gerar Prisma Client'],
    ['db:migrate', 'prisma migrate dev', 'Criar e aplicar migracoes'],
    ['db:studio', 'prisma studio', 'Painel visual do banco de dados'],
    ['db:seed', 'tsx prisma/seed.ts', 'Popular banco com dados iniciais'],
    ['type-check', 'tsc --noEmit', 'Verificacao de tipos TypeScript'],
]
story.extend(table_block(scripts_headers, scripts_rows, [0.16, 0.34, 0.50],
    'Tabela 11 — Scripts NPM disponiveis no projeto.'))

story.extend(add_h2('13.3 Deploy'))
story.append(body(
    'O deploy da aplicacao e otimizado para a plataforma Vercel, que oferece integracao '
    'nativa com o Next.js, deploy automatico a cada push para a branch principal, CDN '
    'global para assets estaticos, edge functions para API routes e SSL automatico. O '
    'processo de deploy inclui as seguintes etapas: push do codigo para o repositorio '
    'Git, acionamento automatico do build na Vercel, compilacao do Next.js com otimizacoes '
    'de producao, execucao das migracoes do banco de dados via Prisma Migrate (no modo '
    'Turso), e ativacao da nova versao com zero-downtime deployment. Para instalacoes '
    'self-hosted, a aplicacao pode ser implantada em qualquer servidor com suporte a '
    'Node.js 18+, utilizando PM2 para gerenciamento de processos e Nginx como proxy '
    'reverso.'
))

# ═══════════════════════════════════════════════
# CAP. 14 — CONSIDERAÇÕES FINAIS
# ═══════════════════════════════════════════════
story.extend(add_h1('Capitulo 14 — Consideracoes Finais'))

story.extend(add_h2('14.1 Pontos Fortes'))
story.append(body(
    'O projeto Refugio Mata Atlantica se destaca como uma solucao completa e '
    'profissional para a digitalizacao de pousadas e eco-lodges brasileiros. A '
    'arquitetura modular, baseada em componentes reutilizaveis e uma clara separacao '
    'entre frontend e backend, facilita a manutencao e a evolucao do sistema ao longo '
    'do tempo. A utilizacao de tecnologias modernas e amplamente adotadas (Next.js 16, '
    'TypeScript, Tailwind CSS, Prisma) garante uma base solida e uma comunidade ativa '
    'de suporte. O design responsivo e as animacoes sofisticadas proporcionam uma '
    'experiencia de usuario de alto nivel, enquanto o CMS intuitivo permite que '
    'operadores sem conhecimento tecnico gerenciem todo o conteudo do site de forma '
    'autonoma.'
))
story.append(body(
    'A conformidade com a LGPD e a integracao com o Mercado Pago demonstram o '
    'compromisso do projeto com a legalidade e a praticidade, respectivamente. O sistema '
    'de resiliencia de banco de dados (Turso com fallback para SQLite) oferece '
    'flexibilidade de implantacao, atendendo desde pequenas pousadas com infraestrutura '
    'propria ate operacoes maiores que preferem solucoes em nuvem. O template whitelabel '
    'permite que a mesma base de codigo seja personalizada para diferentes pousadas, '
    'tornando-o uma solucao escalavel para empresas do setor de hospedagem.'
))

story.extend(add_h2('14.2 Possibilidades de Expansao'))
story.append(body(
    'O projeto foi concebido com uma arquitetura extensivel que permite diversas '
    'evolucoes futuras sem necessidade de reescrita significativa. Entre as '
    'possibilidades de expansao estao a integracao com canais de distribuicao (Booking, '
    'Airbnb, Trivago) para sincronizacao automatica de disponibilidade e precos; a '
    'implementacao de um sistema de check-in/check-out digital com QR code; a adicao '
    'de um modulo de e-commerce para venda de produtos locais e pacotes de '
    'experiencias; a integracao com sistemas de PMS (Property Management System) como '
    'Cloudbeds e Little Hotelier; e a implementacao de um chatbot com inteligencia '
    'artificial para atendimento ao hospede em tempo real.'
))
story.append(body(
    'Outras melhorias planejadas incluem a internacionalizacao (i18n) do website para '
    'atender turistas estrangeiros, com suporte a multiplas linguas e moedas; a '
    'implementacao de um sistema de fidelidade e programas de pontos para hospedes '
    'recorrentes; a adicao de um painel do hospede (hospede portal) onde o visitante '
    'possa acessar suas reservas, historico e preferencias; e a integracao com '
    'plataformas de reputacao online (Google Reviews, TripAdvisor) para sincronizacao '
    'automatica de avaliacoes. Estas expansoes reafirmam o potencial do Refugio Mata '
    'Atlantica como plataforma definitiva para a gestao digital de pousadas.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. BUILD PDF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT = '/home/z/my-project/body.pdf'

doc = TocDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=LEFT_M,
    rightMargin=RIGHT_M,
    topMargin=TOP_M,
    bottomMargin=BOTTOM_M,
    title='Refugio Mata Atlantica - Documento Tecnico',
    author='Z.ai',
    creator='Z.ai PDF Generator',
)

doc.multiBuild(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
print('Body PDF generated:', OUTPUT)
