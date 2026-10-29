# Auditoria do site — Refúgio Mata Atlântica

**Data:** 29/10/2026

**Objetivo:** registrar o diagnóstico inicial e acompanhar os ajustes aplicados depois. A auditoria foi feita antes das mudanças; nesta branch, os itens A1–A16 foram implementados a pedido do usuário.

## Resumo

O projeto já tem uma base visual consistente: paleta inspirada na mata, tipografia Fraunces + Nunito Sans, containers responsivos e componentes com estados de foco. Os maiores problemas estão no conteúdo ainda com cara de template, em ações que parecem funcionais mas não concluem o que prometem, e no fluxo de reserva, que não valida disponibilidade ou capacidade antes de encaminhar para pagamento.

As prioridades abaixo foram implementadas na branch `codex/aplicar-auditoria-site`. Os itens que exigem credenciais, validação no navegador ou confirmação do negócio estão listados em “Pontos para concluir antes da publicação”.

| ID | Prioridade | Área | Problema resumido | Decisão |
|---|---|---|---|---|
| A1 | P1 | Conteúdo e visual | Há instruções e espaços de imagem/mapa ainda em formato de placeholder nas páginas públicas. | Implementado nesta branch |
| A2 | P1 | Reservas | O fluxo não consulta disponibilidade nem valida a capacidade real do quarto. | Implementado nesta branch |
| A3 | P1 | Pagamento | A página de sucesso exibe “reserva confirmada” sem verificar o status persistido. | Implementado nesta branch |
| A4 | P1 | Conversão | O formulário de newsletter não envia o e-mail nem dá retorno. | Implementado nesta branch |
| A5 | P1 | Privacidade e acessibilidade | A escolha de rejeitar cookies não controla o Analytics; o link de privacidade no consentimento é inerte. | Implementado nesta branch |
| A6 | P2 | Navegação | Links do rodapé usam âncoras sem considerar a página atual; faltam links legais no próprio rodapé. | Implementado nesta branch |
| A7 | P2 | Confiança | Há preço, nota, escassez e números apresentados como fatos sem origem ou atualização clara. | Implementado nesta branch |
| A8 | P2 | Layout | A composição de localização da home distribui mapa, botão e informações em células desalinhadas. | Implementado nesta branch |
| A9 | P2 | Acessibilidade | Lightbox, menu móvel e mensagens de erro têm lacunas de teclado/leitor de tela; valores do rodapé viram zero com movimento reduzido. | Implementado nesta branch |
| A10 | P2 | Resiliência | Se o banco falha ou não há registros, seções públicas ficam vazias sem explicação ou alternativa. | Implementado nesta branch |
| A11 | P2 | SEO | A imagem OG configurável não é usada nos metadados; o sitemap lista quartos fixos. | Implementado nesta branch |
| A12 | P2 | Painel admin | No menu móvel, o botão “X” não fecha o painel; há botão de sair só com ícone e sem nome acessível. | Implementado nesta branch |
| A13 | P3 | Direção visual | Cartões, pills, sombras, blobs e animações se repetem em muitas seções. | Implementado nesta branch |
| A14 | P1 | Galeria e quartos | Imagens com `fill` não têm wrapper posicionado em lightbox e galeria de quarto; podem sair do quadro esperado. | Implementado nesta branch |
| A15 | P2 | Jornada de reserva | O CTA “Reservar agora” tem destinos diferentes entre Hero, cards e página de quarto. | Implementado nesta branch |
| A16 | P2 | Configuração | Páginas de falha/legais usam dados estáticos diferentes das configurações do admin. | Implementado nesta branch |

## Achados

### A1 — Conteúdo e imagens ainda sinalizam template incompleto — P1

**Evidências:** `src/components/sections/About.tsx` mostra “Sua imagem aqui”; `Gallery.tsx` pede para substituir os skeletons por fotos reais; em `SobrePage.tsx`, o mapa e a foto da experiência são blocos de placeholder.

**Impacto:** partes importantes da página parecem inacabadas e reduzem confiança numa hospedagem que depende de mostrar quartos, localização e experiência. Há imagens reais em `public/images`, mas algumas seções não as usam.

**Sugestão:** substituir as áreas em branco por imagens e mapa válidos, remover o texto de instrução e conferir se as fotos disponíveis correspondem aos espaços descritos.

### A2 — Reserva não verifica disponibilidade nem capacidade do quarto — P1

**Evidências:** `src/app/api/reservations/create-preference/route.ts` valida datas e aceita até 10 hóspedes, mas não compara hóspedes com `room.capacity` nem consulta reservas já existentes no período. O formulário em `src/app/reservas/page.tsx` só limita o seletor pela capacidade do quarto no navegador.

**Impacto:** uma requisição direta pode exceder a capacidade; duas reservas podem ser iniciadas para as mesmas datas. Trocar de quarto também pode preservar uma quantidade de hóspedes acima da nova capacidade, e o check-out igual ao check-in deixa o botão desabilitado sem explicar por quê.

**Sugestão:** validar capacidade e conflito de datas no servidor antes de criar preferência/pagamento; ajustar hóspedes e datas incompatíveis no cliente e explicar como corrigir.

### A3 — Página de sucesso declara confirmação sem validar pagamento — P1

**Evidências:** `src/app/reservas/sucesso/page.tsx` mostra “Reserva Confirmada!” sem consultar o status da reserva; a tela pendente também não acompanha o status. O webhook em `src/app/api/reservations/webhook/route.ts` atualiza o status separadamente. O retorno promete e-mail, mas não encontrei serviço de envio no fluxo do repositório. Sem `MERCADO_PAGO_ACCESS_TOKEN`, a rota de preferência entra em modo mock e encaminha para pendente sem iniciar uma transação real (comportamento condicional à configuração).

**Impacto:** a mensagem pode afirmar que a hospedagem está confirmada antes da confirmação do pagamento e comunicar um próximo passo que o sistema não executa.

**Sugestão:** consultar o status pelo identificador da reserva e diferenciar pagamento aprovado, pendente e recusado; alinhar o texto de e-mail a um envio realmente configurado e confirmar que o mock não esteja ativo no ambiente público.

### A4 — Newsletter é um formulário sem ação — P1

**Evidências:** `src/components/layout/Footer.tsx` cancela o `submit` com `preventDefault()` e não chama API nem apresenta confirmação ou erro.

**Impacto:** o formulário pede o e-mail do visitante, mas não conclui a inscrição. Isso cria uma promessa quebrada no fim de todas as páginas.

**Sugestão:** conectar a inscrição à rota/serviço de newsletter existente no projeto e adicionar estados de envio, sucesso e falha; ou remover o formulário até estar conectado.

### A5 — Consentimento não controla Analytics e o link de privacidade da reserva é inerte — P1

**Evidências:** `src/app/layout.tsx` renderiza `Analytics` sempre. `CookieConsent.tsx` salva “accepted/rejected” no `localStorage`, mas não condiciona Analytics à escolha. Em `src/components/ui/ConsentCheckbox.tsx`, “Política de Privacidade” aponta para `#` e impede a navegação.

**Impacto:** a escolha apresentada ao visitante não corresponde ao comportamento de analytics no código; no momento da reserva, a pessoa não consegue abrir a política pelo link que acompanha o consentimento.

**Sugestão:** decidir quais ferramentas são opcionais e ligar sua inicialização à escolha registrada; fazer o link da política apontar para `/politica-de-privacidade`.

### A6 — Navegação do rodapé falha em páginas internas — P2

**Evidências:** `src/components/layout/Footer.tsx` aponta “A Pousada”, “Acomodações” e outros itens para `#about`, `#rooms` etc. Em `/sobre`, `/quartos/[slug]` e páginas legais, essas seções não existem. O rodapé também não apresenta links para `/politica-de-privacidade` ou `/termos-de-uso`.

**Impacto:** os links parecem clicáveis, mas não levam a conteúdo útil fora da home. Também fica difícil encontrar as páginas legais pelo fluxo normal do site.

**Sugestão:** usar `/#id` para seções da home e incluir as páginas legais no rodapé.

### A7 — Confirmar afirmações e dados demonstrativos antes de publicar — P2

**Evidências:** `RoomDetailPage.tsx` fixa uma avaliação de “4.9 / 5.0”; `SobrePage.tsx` e a página inicial usam números como “+4.000 hóspedes”; `BookingCTA.tsx` afirma preço inicial de R$ 380 e oferece benefício promocional; a CTA de Sobre exibe “Últimas unidades disponíveis para o mês que vem” sem depender de disponibilidade. Os textos da política e dos termos indicam última atualização em janeiro de 2025.

**Impacto:** se esses dados forem demonstrativos ou estiverem desatualizados, podem induzir o visitante a erro e enfraquecer a credibilidade.

**Sugestão:** conferir cada número, preço, benefício, avaliação e política com a operação; remover escassez sem dado real e atualizar as datas/textos legais com o responsável pelo conteúdo.

### A8 — Bloco de localização da home está estruturalmente desalinhado — P2

**Evidência:** em `src/components/sections/Location.tsx`, mapa, botão “Abrir no Google Maps” e informações são três filhos diretos do mesmo `grid lg:grid-cols-2`. Em telas grandes, o botão ocupa uma célula separada e desloca a coluna de informações para a linha seguinte.

**Impacto:** mapa, CTA e detalhes deixam de formar duas colunas coesas e sobra uma área vazia ao lado do mapa.

**Sugestão:** agrupar mapa e botão no mesmo wrapper/coluna e deixar as informações na segunda coluna.

### A9 — Há barreiras para navegação por teclado — P2

**Evidências:** `src/app/layout.tsx` não apresenta skip link antes do conteúdo. O lightbox em `src/components/sections/Gallery.tsx` declara `role="dialog"`, mas não define nome acessível, foco inicial/retorno, contenção de foco ou atalho Escape. O menu móvel em `Header.tsx` não expõe `aria-expanded`/`aria-controls`, fica dentro do header com `backdrop-filter` e não tem rolagem interna; o drawer fixo pode ser contido pelo header em alguns navegadores. Erros do formulário em `reservas/page.tsx` não usam região de anúncio. Em `Footer.tsx`, a animação de contagem retorna cedo com `prefers-reduced-motion`, deixando o valor inicial em zero.

**Impacto:** usuários de teclado e leitores de tela podem ter dificuldade para abrir, navegar e fechar a galeria, entender o estado do menu e perceber mensagens de erro, além de atravessar repetidamente o cabeçalho antes do conteúdo. O drawer também pode ficar limitado em telas baixas ou após rolagem. Quem solicita movimento reduzido recebe métricas incorretas no rodapé.

**Sugestão:** incluir link “Pular para o conteúdo”; dar nome ao diálogo e gerir foco/teclas do lightbox; anunciar erros, expor o estado do menu e renderizar valores finais das métricas sem depender da animação.

### A10 — Falhas ou ausência de dados deixam seções vazias — P2

**Evidências:** funções de dados em `src/lib/data.ts` retornam listas vazias quando o banco falha; a home passa essas listas para quartos, experiências, galeria, avaliações e FAQ, sem estados vazios dedicados.

**Impacto:** uma indisponibilidade ou banco recém-instalado pode deixar títulos e espaços sem conteúdo, parecendo erro de carregamento ou site quebrado.

**Sugestão:** criar estados vazios claros para conteúdo não cadastrado e uma experiência de falha apropriada para indisponibilidade do banco.

### A11 — SEO social e sitemap não acompanham o conteúdo do CMS — P2

**Evidências:** o painel permite configurar `ogImage`, mas `generateMetadata()` em `src/app/layout.tsx` não inclui `openGraph.images`. `src/app/sitemap.ts` lista quatro slugs fixos de quarto, enquanto os quartos são gerenciáveis pelo admin. O campo `googleAnalyticsId` também existe nas configurações, mas não é consumido pela instrumentação pública encontrada no código.

**Impacto:** compartilhamentos podem não usar a imagem escolhida e quartos adicionados/editados no CMS podem ficar fora do sitemap.

**Sugestão:** conectar a imagem configurada aos metadados e gerar os URLs de quartos publicados a partir dos dados atuais.

### A12 — Menu móvel do painel não fecha pelo botão de alternância — P2

**Evidências:** em `src/app/admin/layout.tsx`, o botão móvel chama sempre `setSidebarOpen(true)`, mesmo quando o ícone muda para “X”. O botão de logout do cabeçalho também não define `aria-label`.

**Impacto:** o botão visual de fechar não cumpre a ação esperada; usuários de leitor de tela recebem um controle de saída sem nome.

**Sugestão:** alternar o estado do drawer e adicionar nome acessível e estado expandido ao controle móvel; nomear o botão de sair.

### A13 — A direção visual se repete demais — P3

**Evidências:** várias seções usam cartões arredondados com sombra, badges em pills, blobs decorativos e entradas animadas semelhantes (`Rooms.tsx`, `Experiences.tsx`, `Testimonials.tsx`, `FAQ.tsx`). O Hero adiciona cursor crosshair, drift, spotlight, zoom por scroll e animações escalonadas; seu título é dividido em quatro linhas fixas e usa `min-h-screen` com padding vertical amplo.

**Impacto:** a interface tem uma base de marca coerente, mas a repetição e o volume de movimento competem com o conteúdo e reduzem a sensação editorial/premium. A composição longa do Hero também merece validação em celulares baixos e notebooks com pouca altura.

**Sugestão:** manter a paleta e as fontes, variar a composição entre seções, reduzir efeitos decorativos repetidos e reservar animações para pontos que ajudam a entender ou navegar.

### A14 — Imagens de lightbox e quartos podem escapar do quadro esperado — P1

**Evidências:** `src/components/sections/Gallery.tsx` e `RoomDetailPage.tsx` usam `Image fill` dentro de wrappers sem `relative`. No lightbox, o ancestral posicionado pode ser o overlay fixo; na galeria do quarto, a transformação de animação pode mascarar o problema depois da hidratação.

**Impacto:** as fotos podem ocupar a tela ou se alinhar ao contêiner errado, cobrindo controles. O comportamento precisa ser confirmado no navegador, inclusive com redução de movimento ativa.

**Sugestão:** posicionar explicitamente os wrappers de imagem e definir camadas entre foto e controles.

### A15 — A ação de reservar muda de destino conforme a seção — P2

**Evidências:** o CTA da Hero rola até `#booking`; os cards de quarto abrem `/reservas?room=...`; já a página de detalhe de quarto inicia uma ligação telefônica.

**Impacto:** “Reservar agora” não representa o mesmo próximo passo e pode interromper o fluxo online ou perder a acomodação escolhida.

**Sugestão:** definir um destino principal consistente para reserva e preservar o quarto selecionado; deixar telefone como alternativa claramente secundária.

### A16 — Telas de falha e documentos usam contato estático — P2

**Evidências:** a página de falha de pagamento e as páginas legais importam `siteConfig` de `src/data/site.ts`, que contém telefone demonstrativo `(11) 99999-0000`; outras telas consultam dados configuráveis do banco.

**Impacto:** se os dados do CMS forem diferentes, quem precisa de suporte após falha de pagamento pode receber um contato incorreto. A divergência com os dados atuais do banco não foi verificada.

**Sugestão:** usar a mesma fonte de configurações públicas do restante do site nessas rotas.

## Escopo e limites

- Inspecionei as rotas públicas de home, sobre, quarto, reservas e retornos de pagamento, páginas legais, loading e 404; também revisei a estrutura comum do painel e amostras de Dashboard, Quartos, Reservas e Configurações.
- A análise foi feita pelo código e pelos arquivos de imagem do projeto. O navegador conectado não estava disponível nesta sessão, então não consegui validar capturas reais em desktop/mobile, contraste calculado, comportamento de rede ou o estado visual com dados atuais do banco.
- Na auditoria inicial, não executei testes nem alterei arquivos de implementação; aquele diagnóstico foi estático e não teve acesso ao navegador conectado.

## Status após implementação

Os 16 itens foram aplicados nesta branch. O diff inclui ajustes visuais e de acessibilidade, conteúdo e estados vazios, navegação, SEO, newsletter e reserva/pagamento com verificação de status. Pagamentos que chegam após conflito de disponibilidade entram em revisão manual e não são confirmados automaticamente.

## Pontos para concluir antes da publicação

- Configurar `MERCADO_PAGO_ACCESS_TOKEN` e `NEXT_PUBLIC_BASE_URL` absoluta; usar HTTPS em produção. Configurar `MERCADO_PAGO_WEBHOOK_SECRET` para validar a assinatura dos webhooks.
- Validar no navegador os fluxos desktop/mobile, checkout do Mercado Pago e concorrência de reservas com credenciais e dados reais do ambiente.
- Revisar com a operação os textos legais, contatos, preços, capacidades, conteúdo do CMS e direitos/proveniência das imagens. O código não comprova a exatidão desses dados.
- Configurar o domínio canônico em `NEXT_PUBLIC_BASE_URL` para metadados e sitemap.

Não executei testes, lint ou build nesta rodada.
