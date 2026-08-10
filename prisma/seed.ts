import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: 'file:./db/custom.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // ─── ADMIN ───
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@refugio.com' },
    update: {},
    create: {
      email: 'admin@refugio.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'admin',
    },
  })
  console.log(`  ✅ Admin: ${admin.email}`)

  // ─── SITE SETTINGS ───
  const settings = await prisma.siteSetting.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      name: 'Refúgio Mata Atlântica',
      tagline: 'Onde a natureza abraça o descanso',
      description:
        'Aninhada no coração da Mata Atlântica, nossa pousada oferece um santuário de tranquilidade onde cada detalhe é pensado para reconectar você com o ritmo da natureza.',
      phone: '(11) 99999-0000',
      whatsapp: '5511999990000',
      email: 'reservas@refugiomataatlantica.com.br',
      address: 'Estrada da Serra, Km 12 — Cunha, SP, 23980-000',
      lat: -23.18,
      lng: -44.92,
      instagram: 'https://instagram.com/refugiomataatlantica',
      facebook: 'https://facebook.com/refugiomataatlantica',
      tripadvisor: 'https://tripadvisor.com/refugiomataatlantica',
      logo: '/logo.svg',
      ogImage: '/logo.svg',
    },
  })
  console.log(`  ✅ SiteSetting: ${settings.name}`)

  // ─── NAV LINKS ───
  const navLinksData = [
    { label: 'Sobre', href: '/sobre', sortOrder: 0 },
    { label: 'Acomodações', href: '#rooms', sortOrder: 1 },
    { label: 'Experiências', href: '#experiences', sortOrder: 2 },
    { label: 'Galeria', href: '#gallery', sortOrder: 3 },
    { label: 'Localização', href: '#location', sortOrder: 4 },
    { label: 'Depoimentos', href: '#testimonials', sortOrder: 5 },
    { label: 'FAQ', href: '#faq', sortOrder: 6 },
  ]
  for (const link of navLinksData) {
    await prisma.navLink.upsert({
      where: { id: `nav-${link.href.replace('#', '')}` },
      update: {},
      create: { id: `nav-${link.href.replace('#', '')}`, ...link },
    })
  }
  console.log(`  ✅ NavLinks: ${navLinksData.length} created`)

  // ─── ROOMS ───
  const roomsData = [
    {
      id: 'room-1',
      name: 'Suíte Master',
      slug: 'suite-master',
      price: 680,
      capacity: 2,
      size: 45,
      bedType: 'Cama King Size',
      description:
        'Suíte de luxo com cama king, terraço privado com rede, banheira de hidromassagem e vista panorâmica da floresta.',
      descriptionLong:
        'A Suíte Master é o nosso ápice de conforto e sofisticação. Com 45m² de área privativa, a suíte integra materiais rústicos nobres — madeira de demolição, pedra natural e fibras naturais — com o luxo discreto de um spa de selva. A cama king size com lençóis de algodão egípcio 500 fios é posicionada para que o primeiro que você veja ao acordar seja a copa das árvores pela janela panorâmica de piso a teto. O terraço privado, equipado com rede de descanso e poltronas, é o lugar ideal para ler um livro ao som dos pássaros ou degustar um vinho ao pôr do sol. A banheira de hidromassagem ao ar livre, escondida entre trepadeiras, oferece uma experiência de imersão única na natureza. amenities Premium incluem tônicas botânicas, sais de banho artesanais e roupas de banho em algodão orgânico.',
      policy:
        'Cancelamento gratuito até 7 dias antes do check-in. Café da manhã incluso. Late check-out às 14h mediante disponibilidade.',
      sortOrder: 0,
      images: [
        { src: '/images/room-master.jpg', alt: 'Vista geral da Suíte Master com cama king e janela panorâmica', sortOrder: 0 },
        { src: '/images/room-master.jpg', alt: 'Terraço privado com rede e vista da floresta', sortOrder: 1 },
        { src: '/images/room-master.jpg', alt: 'Banheira de hidromassagem ao ar livre', sortOrder: 2 },
        { src: '/images/room-master.jpg', alt: 'Detalhe da decoração rústica e janela panorâmica', sortOrder: 3 },
      ],
      amenities: [
        { name: 'Cama King Size', icon: 'BedDouble', sortOrder: 0 },
        { name: 'Banheira de Hidromassagem', icon: 'Bath', sortOrder: 1 },
        { name: 'Terraço com Rede', icon: 'Trees', sortOrder: 2 },
        { name: 'Vista Panorâmica', icon: 'Mountain', sortOrder: 3 },
        { name: 'Amenities Premium', icon: 'Sparkles', sortOrder: 4 },
        { name: 'Wi-Fi', icon: 'Wifi', sortOrder: 5 },
        { name: 'Ar-condicionado Split', icon: 'AirVent', sortOrder: 6 },
        { name: 'Minibar', icon: 'Wine', sortOrder: 7 },
      ],
    },
    {
      id: 'room-2',
      name: 'Chalé Família',
      slug: 'chale-familia',
      price: 920,
      capacity: 4,
      size: 65,
      bedType: '1 King + 2 Camas Solteiras',
      description:
        'Chalé espaçoso em estilo mezanino, ideal para famílias. Duas suítes, sala de estar com lareira e varanda cercada pela natureza.',
      descriptionLong:
        'O Chalé Família é um refúgio completo para quem viaja com os que mais ama. Com 65m² distribuídos em dois andares, o espaço foi desenhado para que cada membro da família tenha seu canto favorito. No térreo, a sala de estar com lareira a lenha é o coração do chalé — perfeita para noites de conversas, jogos de tabuleiro ou simplesmente ficar em silêncio observando o fogo. A cozinha compacta totalmente equipada permite preparar refeições leves sem sair do ambiente. No mezanino, a suíte master com cama king oferece privacidade para os pais, enquanto o segundo quarto no térreo tem duas camas confortáveis — ideal para crianças ou adolescentes. A varanda cercada pela vegetação nativa, com churrasqueira e mesa ao ar livre, é convidativa para almoços em família. Pet friendly: fornecemos cama, comedouro e brinquedos para seu pet.',
      policy:
        'Cancelamento gratuito até 10 dias antes (política familiar estendida). Café da manhã incluso para até 4 hóspedes. Berço e cadeirão disponíveis mediante reserva.',
      sortOrder: 1,
      images: [
        { src: '/images/room-chalet.jpg', alt: 'Vista externa do Chalé Família entre as árvores', sortOrder: 0 },
        { src: '/images/room-chalet.jpg', alt: 'Sala de estar com lareira a lenha', sortOrder: 1 },
        { src: '/images/room-chalet.jpg', alt: 'Mezanino com suíte master do casal', sortOrder: 2 },
        { src: '/images/room-chalet.jpg', alt: 'Varanda externa com churrasqueira e vista', sortOrder: 3 },
      ],
      amenities: [
        { name: '2 Quartos', icon: 'BedDouble', sortOrder: 0 },
        { name: 'Sala com Lareira', icon: 'Flame', sortOrder: 1 },
        { name: 'Varanda Privativa', icon: 'Trees', sortOrder: 2 },
        { name: 'Cozinha Compacta', icon: 'CookingPot', sortOrder: 3 },
        { name: 'Vista da Montanha', icon: 'Mountain', sortOrder: 4 },
        { name: 'Wi-Fi', icon: 'Wifi', sortOrder: 5 },
        { name: 'Pet Friendly', icon: 'Dog', sortOrder: 6 },
        { name: 'Churrasqueira', icon: 'Flame', sortOrder: 7 },
      ],
    },
    {
      id: 'room-3',
      name: 'Suíte Garden',
      slug: 'suite-garden',
      price: 560,
      capacity: 2,
      size: 38,
      bedType: 'Cama Queen Size',
      description:
        'Suíte em conexão direta com o jardim tropical. Portas de vidro corrediças, chuveiro ao ar livre e flores exóticas ao redor.',
      descriptionLong:
        'A Suíte Garden foi concebida para quem quer dormir literalmente dentro do jardim. Com 38m² de área interna mais o espaço externo, a suíte se abre para um canteiro de flores tropicais e plantas nativas por meio de portas de vidro corrediças que ficam de lado a lado, eliminando a fronteira entre dentro e fora. O chuveiro ao ar livre, com piso de pedra aquecido e cercado por helicônias e bromélias, é uma experiência sensorial única — banhar-se sob o dossel das árvores com o canto dos pássaros ao fundo. A cama queen size é posicionada para que o despertar seja um evento em si: a luz natural filtrada pelas folhas cria um jogo de sombras que muda a cada minuto. A privada tem 20m² de jardim exclusivo com espregadeira e mesinha de centro, perfeita para um café da manhã servido no quarto.',
      policy:
        'Cancelamento gratuito até 7 dias antes. Café da manhã incluso. Entrada tardia (até 22h) disponível sob consulta.',
      sortOrder: 2,
      images: [
        { src: '/images/room-garden.jpg', alt: 'Suíte Garden com portas de vidro abertas para o jardim', sortOrder: 0 },
        { src: '/images/room-garden.jpg', alt: 'Chuveiro ao ar livre cercado por plantas tropicais', sortOrder: 1 },
        { src: '/images/room-garden.jpg', alt: 'Área externa privada com espregadeira', sortOrder: 2 },
        { src: '/images/room-garden.jpg', alt: 'Vista interna com cama queen e decoração natural', sortOrder: 3 },
      ],
      amenities: [
        { name: 'Cama Queen Size', icon: 'BedDouble', sortOrder: 0 },
        { name: 'Chuveiro ao Ar Livre', icon: 'ShowerHead', sortOrder: 1 },
        { name: 'Jardim Privativo', icon: 'Flower2', sortOrder: 2 },
        { name: 'Portas de Vidro', icon: 'DoorOpen', sortOrder: 3 },
        { name: 'Espregadeira Externa', icon: 'Sun', sortOrder: 4 },
        { name: 'Wi-Fi', icon: 'Wifi', sortOrder: 5 },
        { name: 'Roupa de Banho', icon: 'Shirt', sortOrder: 6 },
      ],
    },
    {
      id: 'room-4',
      name: 'Quarto Standard',
      slug: 'quarto-standard',
      price: 380,
      capacity: 2,
      size: 28,
      bedType: 'Cama Casal',
      description:
        'Conforto e simplicidade com toque rústico. Ideal para casais que buscam um refúgio acessível sem abrir mão do charme.',
      descriptionLong:
        'O Quarto Standard é a porta de entrada para a experiência Refúgio — com todo o cuidado e atenção aos detalhes que definem nossa filosofia, em um formato mais compacto e acessível. Com 28m² bem aproveitados, o quarto combina cama casal em madeira maciça com roupas de cama de algodão premium, mesa de cabeceira esculpida em tronco de eucalipto e ventilação natural cruzada que dispensa ar-condicionado na maioria dos dias. O banheiro privativo tem piso de pedra rústico e box com chuveiro de pressão. A janela generosa oferece vista parcial da floresta, suficiente para acompanhar o movimento dos macacos-prego e tucanos no alto das copas. É o quarto ideal para casais que priorizam a experiência de estar imersos na natureza a confortos superficiais, e também para viajantes solo que buscam um espaço acolhedor para descansar entre trilhas.',
      policy:
        'Cancelamento gratuito até 3 dias antes. Café da manhã incluso. Tarifa reduzida para reservas de 3+ noites.',
      sortOrder: 3,
      images: [
        { src: '/images/room-standard.jpg', alt: 'Quarto Standard com cama casal e decoração rústica', sortOrder: 0 },
        { src: '/images/room-standard.jpg', alt: 'Banheiro com piso de pedra e chuveiro de pressão', sortOrder: 1 },
        { src: '/images/room-standard.jpg', alt: 'Vista parcial da floresta pela janela', sortOrder: 2 },
      ],
      amenities: [
        { name: 'Cama Casal', icon: 'BedDouble', sortOrder: 0 },
        { name: 'Banheiro Privativo', icon: 'Bath', sortOrder: 1 },
        { name: 'Vista da Floresta', icon: 'TreePine', sortOrder: 2 },
        { name: 'Roupa de Cama Premium', icon: 'Sparkles', sortOrder: 3 },
        { name: 'Ventilação Natural', icon: 'AirVent', sortOrder: 4 },
        { name: 'Wi-Fi', icon: 'Wifi', sortOrder: 5 },
      ],
    },
  ]

  let totalImages = 0
  let totalAmenities = 0
  for (const room of roomsData) {
    const { images, amenities: amens, ...roomData } = room
    await prisma.room.upsert({
      where: { id: room.id },
      update: {},
      create: { ...roomData },
    })
    for (const img of images) {
      await prisma.roomImage.create({ data: { ...img, roomId: room.id } })
      totalImages++
    }
    for (const a of amens) {
      await prisma.roomAmenity.create({ data: { ...a, roomId: room.id } })
      totalAmenities++
    }
  }
  console.log(`  ✅ Rooms: ${roomsData.length} rooms, ${totalImages} images, ${totalAmenities} amenities`)

  // ─── EXPERIENCES ───
  const experiencesData = [
    {
      id: 'exp-1',
      title: 'Trilhas & Natureza',
      description: 'Explore mais de 15km de trilhas pela Mata Atlântica, com guias especializados que revelam a fauna e flora locais.',
      image: '/images/experience-trail.jpg',
      duration: '2-4 horas',
      difficulty: 'Fácil a Moderado',
      sortOrder: 0,
    },
    {
      id: 'exp-2',
      title: 'Spa & Bem-estar',
      description: 'Terapias inspiradas nas tradições da floresta: massagens com óleos essenciais locais e sessões de meditação guiada.',
      image: '/images/experience-spa.jpg',
      duration: '1-3 horas',
      difficulty: 'Relaxante',
      sortOrder: 1,
    },
    {
      id: 'exp-3',
      title: 'Gastronomia Local',
      description: 'Menu autoral com ingredientes orgânicos da horta da pousada e produtores locais. Jantar harmonizado disponível.',
      image: '/images/experience-gastronomy.jpg',
      duration: '1-2 horas',
      difficulty: 'Para todos',
      sortOrder: 2,
    },
    {
      id: 'exp-4',
      title: 'Passeios de Barco',
      description: 'Navegação serena pelo rio que banha a propriedade, com observação de aves, pirilampos ao entardecer e piquenique na margem.',
      image: '/images/experience-boat.jpg',
      duration: '3 horas',
      difficulty: 'Fácil',
      sortOrder: 3,
    },
  ]
  for (const exp of experiencesData) {
    const { id, ...data } = exp
    await prisma.experience.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ Experiences: ${experiencesData.length} created`)

  // ─── GALLERY ───
  const galleryData = [
    { id: 'gal-1', src: '/images/gallery-1.jpg', alt: 'Vista aérea da pousada entre as montanhas', span: 'col-span-1 md:col-span-2 row-span-1 md:row-span-2', sortOrder: 0 },
    { id: 'gal-2', src: '/images/gallery-2.jpg', alt: 'Detalhes da folhagem tropical com orvalho', span: 'col-span-1 row-span-1', sortOrder: 1 },
    { id: 'gal-3', src: '/images/gallery-3.jpg', alt: 'Pôr do sol visto da varanda', span: 'col-span-1 row-span-1', sortOrder: 2 },
    { id: 'gal-4', src: '/images/gallery-4.jpg', alt: 'Café da manhã com frutas tropicais', span: 'col-span-1 row-span-1', sortOrder: 3 },
    { id: 'gal-5', src: '/images/gallery-5.jpg', alt: 'Ponte suspensa na trilha da floresta', span: 'col-span-1 row-span-1 md:row-span-2', sortOrder: 4 },
    { id: 'gal-6', src: '/images/gallery-6.jpg', alt: 'Piscina infinita com vista do vale', span: 'col-span-1 md:col-span-2 row-span-1', sortOrder: 5 },
  ]
  for (const img of galleryData) {
    const { id, ...data } = img
    await prisma.galleryImage.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ Gallery: ${galleryData.length} images created`)

  // ─── TESTIMONIALS ───
  const testimonialsData = [
    {
      id: 'test-1',
      name: 'Marina Albuquerque',
      location: 'São Paulo, SP',
      avatar: '/images/avatar-1.jpg',
      text: 'Foi a melhor experiência de viagem que já tivemos. Cada detalhe da pousada é pensado para proporcionar descanso genuíno. O spa com óleos da floresta é inesquecível.',
      rating: 5,
      sortOrder: 0,
    },
    {
      id: 'test-2',
      name: 'Carlos Eduardo Lima',
      location: 'Rio de Janeiro, RJ',
      avatar: '/images/avatar-2.jpg',
      text: 'Levei minha família para o Chalé e foi perfeito. As trilhas são incríveis, o jantar é extraordinário e a equipe é extremamente atenciosa. Já reservei para o próximo feriado.',
      rating: 5,
      sortOrder: 1,
    },
    {
      id: 'test-3',
      name: 'Helena Ribeiro',
      location: 'Belo Horizonte, MG',
      avatar: '/images/avatar-3.jpg',
      text: 'Um verdadeiro refúgio. Desliguei o celular nos 4 dias que fiquei e voltei renovada. O café da manhã com frutas colhidas na hora é um luxo simples que marca.',
      rating: 5,
      sortOrder: 2,
    },
  ]
  for (const t of testimonialsData) {
    const { id, ...data } = t
    await prisma.testimonial.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ Testimonials: ${testimonialsData.length} created`)

  // ─── FAQ ───
  const faqData = [
    { id: 'faq-1', question: 'Qual é o horário de check-in e check-out?', answer: 'O check-in é a partir das 15h e o check-out até às 12h. Oferecemos early check-in e late check-out sujeitos à disponibilidade.', sortOrder: 0 },
    { id: 'faq-2', question: 'A pousada é pet friendly?', answer: 'Sim! Aceitamos pequenos e médios portes. Possuímos áreas específicas para pets e fornecemos kit de bem-vinda completo.', sortOrder: 1 },
    { id: 'faq-3', question: 'Qual é a política de cancelamento?', answer: 'Cancelamentos gratuitos até 7 dias antes da data de check-in. Cancelamentos com menos de 7 dias são cobrados como 50% do valor da primeira diária.', sortOrder: 2 },
    { id: 'faq-4', question: 'A pousada oferece transfer do aeroporto?', answer: 'Oferecemos transfer privado e compartilhado dos aeroportos de São Paulo e Rio de Janeiro. Reserve com antecedência.', sortOrder: 3 },
    { id: 'faq-5', question: 'Possui internet Wi-Fi?', answer: 'Sim, oferecemos Wi-Fi gratuito em todas as áreas. Incentivamos a desconexão digital durante a estadia para uma experiência mais imersiva.', sortOrder: 4 },
    { id: 'faq-6', question: 'As trilhas são guiadas?', answer: 'Oferecemos trilhas autoguiadas com mapas detalhados e trilhas guiadas por nossos guias naturalistas. As trilhas guiadas saem diariamente às 8h e 15h.', sortOrder: 5 },
    { id: 'faq-7', question: 'Como funciona a gastronomia da pousada?', answer: 'O café da manhã buffet é incluso na diária. O jantar autoral é opcional e deve ser reservado no dia. Também oferecemos almoço e lanches ao longo do dia.', sortOrder: 6 },
  ]
  for (const f of faqData) {
    const { id, ...data } = f
    await prisma.faq.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ FAQ: ${faqData.length} items created`)

  // ─── ABOUT AMENITIES ───
  const aboutAmenitiesData = [
    { id: 'aa-1', icon: 'Coffee', label: 'Café da manhã incluso', desc: 'Buffet com frutas orgânicas, pães artesanais e sucos naturais da horta', sortOrder: 0 },
    { id: 'aa-2', icon: 'Waves', label: 'Piscina natural', desc: 'Piscina aquecida com vista panorâmica do vale e deck de madeira', sortOrder: 1 },
    { id: 'aa-3', icon: 'Wifi', label: 'Wi-Fi gratuito', desc: 'Conexão em todas as áreas — incentive a desconexão digital', sortOrder: 2 },
    { id: 'aa-4', icon: 'Dog', label: 'Pet friendly', desc: 'Aceitamos pequenos e médios portes com kit de bem-vinda', sortOrder: 3 },
    { id: 'aa-5', icon: 'Car', label: 'Estacionamento', desc: 'Gratuito e privativo com cobertura para até 20 veículos', sortOrder: 4 },
    { id: 'aa-6', icon: 'TreePine', label: 'Trilhas privativas', desc: '15km de trilhas sinalizadas dentro da propriedade com guias', sortOrder: 5 },
    { id: 'aa-7', icon: 'Spa', label: 'Spa natural', desc: 'Massagens, banhos de imersão e meditação guiada na floresta', sortOrder: 6 },
    { id: 'aa-8', icon: 'Flame', label: 'Lareira', desc: 'Chalés com lareira a lenha para noites frescas de serra', sortOrder: 7 },
    { id: 'aa-9', icon: 'Wine', label: 'Jantar autoral', desc: 'Menu com ingredientes locais, harmonização e aula de culinária', sortOrder: 8 },
    { id: 'aa-10', icon: 'Shield', label: 'Segurança 24h', desc: 'Monitoramento por câmeras e portaria com funcionários 24 horas', sortOrder: 9 },
    { id: 'aa-11', icon: 'Baby', label: 'Adequado para crianças', desc: 'Cadeirão, berço e espaço kids disponíveis mediante reserva', sortOrder: 10 },
    { id: 'aa-12', icon: 'Recycle', label: 'Sustentável', desc: 'Compostagem, energia solar, captação de água da chuva', sortOrder: 11 },
  ]
  for (const a of aboutAmenitiesData) {
    const { id, ...data } = a
    await prisma.aboutAmenity.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ AboutAmenities: ${aboutAmenitiesData.length} created`)

  // ─── DISTANCES ───
  const distancesData = [
    { id: 'dist-1', place: 'Centro de Cunha', distance: '12 km', time: '20 min', sortOrder: 0 },
    { id: 'dist-2', place: 'Parque Estadual da Serra do Mar', distance: '18 km', time: '25 min', sortOrder: 1 },
    { id: 'dist-3', place: 'Cachoeira do Véu da Noiva', distance: '8 km', time: '15 min', sortOrder: 2 },
    { id: 'dist-4', place: 'Vinhedo AABB', distance: '30 km', time: '35 min', sortOrder: 3 },
    { id: 'dist-5', place: 'Aeroporto de São José dos Campos', distance: '120 km', time: '2h', sortOrder: 4 },
    { id: 'dist-6', place: 'São Paulo (capital)', distance: '230 km', time: '3h', sortOrder: 5 },
    { id: 'dist-7', place: 'Rio de Janeiro', distance: '280 km', time: '3h30', sortOrder: 6 },
  ]
  for (const d of distancesData) {
    const { id, ...data } = d
    await prisma.distance.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ Distances: ${distancesData.length} created`)

  // ─── DIRECTIONS ───
  const directionsData = [
    { id: 'dir-1', city: 'São Paulo', route: 'Rod. Presidente Dutra até Taubaté → Rod. SP-125 até Cunha → Estrada da Serra Km 12', type: 'carro', sortOrder: 0 },
    { id: 'dir-2', city: 'Rio de Janeiro', route: 'Rod. Presidente Dutra até Volta Redonda → Rod. RJ-151 → Estrada da Serra Km 12', type: 'carro', sortOrder: 1 },
    { id: 'dir-3', city: 'São Paulo (ônibus)', route: 'Terminal Tietê → Cunha (3x/dia). Transfer da rodoviária até a pousada sob encomenda.', type: 'ônibus', sortOrder: 2 },
    { id: 'dir-4', city: 'Aeroportos (GRU/CGH/GIG)', route: 'Transfer privado disponível. Reserve com 48h de antecedência via WhatsApp ou e-mail.', type: 'transfer', sortOrder: 3 },
  ]
  for (const d of directionsData) {
    const { id, ...data } = d
    await prisma.direction.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ Directions: ${directionsData.length} created`)

  // ─── SENSORY CONFIG ───
  const sensoryParagraphs = [
    'Ao cruzar o portão do Refúgio, o primeiro que se nota é o silêncio — não aquele silêncio vazio, mas o que está cheio de sons da floresta: o canto dos sanhaços, o murmúrio do rio, o farfalhar das folhas ao vento.',
    'Aqui, não há horários marcados. O café da manhã é servido quando você acordar. As trilhas estão lá para quando o corpo pedir movimento. E o spa atende ao ritmo que sua pele e sua respiração exigirem. Cada detalhe foi pensado para que, pela primeira vez em muito tempo, você sinta que não precisa estar em lugar nenhum — exceto ali.',
    'Nossos hóspedes costumam dizer que o Refúgio é onde eles voltam a dormir como crianças, comer com fome de verdade e olhar para o céu sem pressa de pegar o celular.',
  ]
  await prisma.sensoryConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      title: 'O silêncio que você procurava',
      paragraphs: JSON.stringify(sensoryParagraphs),
    },
  })
  console.log('  ✅ SensoryConfig: created')

  // ─── STATS ───
  const statsData = [
    { id: 'stat-1', value: 99, suffix: '%', label: 'Taxa de satisfação', sortOrder: 0 },
    { id: 'stat-2', value: 15, suffix: 'km', label: 'Trilhas na floresta', sortOrder: 1 },
    { id: 'stat-3', value: 12, suffix: '', label: 'Anos de história', sortOrder: 2 },
    { id: 'stat-4', value: 4, suffix: 'k+', label: 'Hóspedes acolhidos', sortOrder: 3 },
  ]
  for (const s of statsData) {
    const { id, ...data } = s
    await prisma.stat.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    })
  }
  console.log(`  ✅ Stats: ${statsData.length} created`)

  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
