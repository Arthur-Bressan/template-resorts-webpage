export const siteConfig = {
  name: "Refúgio Mata Atlântica",
  tagline: "Onde a natureza abraça o descanso",
  description:
    "Aninhada no coração da Mata Atlântica, nossa pousada oferece um santuário de tranquilidade onde cada detalhe é pensado para reconectar você com o ritmo da natureza.",
  phone: "(11) 99999-0000",
  whatsapp: "5511999990000",
  email: "reservas@refugiomataatlantica.com.br",
  address: "Estrada da Serra, Km 12 — Cunha, SP, 23980-000",
  coordinates: { lat: -23.18, lng: -44.92 },
  socials: {
    instagram: "https://instagram.com/refugiomataatlantica",
    facebook: "https://facebook.com/refugiomataatlantica",
    tripadvisor: "https://tripadvisor.com/refugiomataatlantica",
  },
  logo: "/logo.svg",
};

export const navLinks = [
  { label: "Sobre", href: "/sobre" },
  { label: "Acomodações", href: "#rooms" },
  { label: "Experiências", href: "#experiences" },
  { label: "Galeria", href: "#gallery" },
  { label: "Localização", href: "#location" },
  { label: "Depoimentos", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export const rooms = [
  {
    id: 1,
    name: "Suíte Master",
    slug: "suite-master",
    image: "/images/room-master.jpg",
    price: 680,
    capacity: 2,
    size: 45,
    bedType: "Cama King Size",
    description:
      "Suíte de luxo com cama king, terraço privado com rede, banheira de hidromassagem e vista panorâmica da floresta.",
    descriptionLong:
      "A Suíte Master é o nosso ápice de conforto e sofisticação. Com 45m² de área privativa, a suíte integra materiais rústicos nobres — madeira de demolição, pedra natural e fibras naturais — com o luxo discreto de um spa de selva. A cama king size com lençóis de algodão egípcio 500 fios é posicionada para que o primeiro que você veja ao acordar seja a copa das árvores pela janela panorâmica de piso a teto. O terraço privado, equipado com rede de descanso e poltronas, é o lugar ideal para ler um livro ao som dos pássaros ou degustar um vinho ao pôr do sol. A banheira de hidromassagem ao ar livre, escondida entre trepadeiras, oferece uma experiência de imersão única na natureza. amenities Premium incluem tônicas botânicas, sais de banho artesanais e roupas de banho em algodão orgânico.",
    gallery: [
      { src: "/images/room-master.jpg", alt: "Vista geral da Suíte Master com cama king e janela panorâmica" },
      { src: "/images/room-master.jpg", alt: "Terraço privado com rede e vista da floresta" },
      { src: "/images/room-master.jpg", alt: "Banheira de hidromassagem ao ar livre" },
      { src: "/images/room-master.jpg", alt: "Detalhe da decoração rústica e janela panorâmica" },
    ],
    amenities: [
      { name: "Cama King Size", icon: "BedDouble" },
      { name: "Banheira de Hidromassagem", icon: "Bath" },
      { name: "Terraço com Rede", icon: "Trees" },
      { name: "Vista Panorâmica", icon: "Mountain" },
      { name: "Amenities Premium", icon: "Sparkles" },
      { name: "Wi-Fi", icon: "Wifi" },
      { name: "Ar-condicionado Split", icon: "AirVent" },
      { name: "Minibar", icon: "Wine" },
    ],
    policy: "Cancelamento gratuito até 7 dias antes do check-in. Café da manhã incluso. Late check-out às 14h mediante disponibilidade.",
  },
  {
    id: 2,
    name: "Chalé Família",
    slug: "chale-familia",
    image: "/images/room-chalet.jpg",
    price: 920,
    capacity: 4,
    size: 65,
    bedType: "1 King + 2 Camas Solteiras",
    description:
      "Chalé espaçoso em estilo mezanino, ideal para famílias. Duas suítes, sala de estar com lareira e varanda cercada pela natureza.",
    descriptionLong:
      "O Chalé Família é um refúgio completo para quem viaja com os que mais ama. Com 65m² distribuídos em dois andares, o espaço foi desenhado para que cada membro da família tenha seu canto favorito. No térreo, a sala de estar com lareira a lenha é o coração do chalé — perfeita para noites de conversas, jogos de tabuleiro ou simplesmente ficar em silêncio observando o fogo. A cozinha compacta totalmente equipada permite preparar refeições leves sem sair do ambiente. No mezanino, a suíte master com cama king oferece privacidade para os pais, enquanto o segundo quarto no térreo tem duas camas confortáveis — ideal para crianças ou adolescentes. A varanda cercada pela vegetação nativa, com churrasqueira e mesa ao ar livre, é convidativa para almoços em família. Pet friendly: fornecemos cama, comedouro e brinquedos para seu pet.",
    gallery: [
      { src: "/images/room-chalet.jpg", alt: "Vista externa do Chalé Família entre as árvores" },
      { src: "/images/room-chalet.jpg", alt: "Sala de estar com lareira a lenha" },
      { src: "/images/room-chalet.jpg", alt: "Mezanino com suíte master do casal" },
      { src: "/images/room-chalet.jpg", alt: "Varanda externa com churrasqueira e vista" },
    ],
    amenities: [
      { name: "2 Quartos", icon: "BedDouble" },
      { name: "Sala com Lareira", icon: "Flame" },
      { name: "Varanda Privativa", icon: "Trees" },
      { name: "Cozinha Compacta", icon: "CookingPot" },
      { name: "Vista da Montanha", icon: "Mountain" },
      { name: "Wi-Fi", icon: "Wifi" },
      { name: "Pet Friendly", icon: "Dog" },
      { name: "Churrasqueira", icon: "Flame" },
    ],
    policy: "Cancelamento gratuito até 10 dias antes (política familiar estendida). Café da manhã incluso para até 4 hóspedes. Berço e cadeirão disponíveis mediante reserva.",
  },
  {
    id: 3,
    name: "Suíte Garden",
    slug: "suite-garden",
    image: "/images/room-garden.jpg",
    price: 560,
    capacity: 2,
    size: 38,
    bedType: "Cama Queen Size",
    description:
      "Suíte em conexão direta com o jardim tropical. Portas de vidro corrediças, chuveiro ao ar livre e flores exóticas ao redor.",
    descriptionLong:
      "A Suíte Garden foi concebida para quem quer dormir literalmente dentro do jardim. Com 38m² de área interna mais o espaço externo, a suíte se abre para um canteiro de flores tropicais e plantas nativas por meio de portas de vidro corrediças que ficam de lado a lado, eliminando a fronteira entre dentro e fora. O chuveiro ao ar livre, com piso de pedra aquecido e cercado por helicônias e bromélias, é uma experiência sensorial única — banhar-se sob o dossel das árvores com o canto dos pássaros ao fundo. A cama queen size é posicionada para que o despertar seja um evento em si: a luz natural filtrada pelas folhas cria um jogo de sombras que muda a cada minuto. A privada tem 20m² de jardim exclusivo com espregadeira e mesinha de centro, perfeita para um café da manhã servido no quarto.",
    gallery: [
      { src: "/images/room-garden.jpg", alt: "Suíte Garden com portas de vidro abertas para o jardim" },
      { src: "/images/room-garden.jpg", alt: "Chuveiro ao ar livre cercado por plantas tropicais" },
      { src: "/images/room-garden.jpg", alt: "Área externa privada com espregadeira" },
      { src: "/images/room-garden.jpg", alt: "Vista interna com cama queen e decoração natural" },
    ],
    amenities: [
      { name: "Cama Queen Size", icon: "BedDouble" },
      { name: "Chuveiro ao Ar Livre", icon: "ShowerHead" },
      { name: "Jardim Privativo", icon: "Flower2" },
      { name: "Portas de Vidro", icon: "DoorOpen" },
      { name: "Espregadeira Externa", icon: "Sun" },
      { name: "Wi-Fi", icon: "Wifi" },
      { name: "Roupa de Banho", icon: "Shirt" },
    ],
    policy: "Cancelamento gratuito até 7 dias antes. Café da manhã incluso. Entrada tardia (até 22h) disponível sob consulta.",
  },
  {
    id: 4,
    name: "Quarto Standard",
    slug: "quarto-standard",
    image: "/images/room-standard.jpg",
    price: 380,
    capacity: 2,
    size: 28,
    bedType: "Cama Casal",
    description:
      "Conforto e simplicidade com toque rústico. Ideal para casais que buscam um refúgio acessível sem abrir mão do charme.",
    descriptionLong:
      "O Quarto Standard é a porta de entrada para a experiência Refúgio — com todo o cuidado e atenção aos detalhes que definem nossa filosofia, em um formato mais compacto e acessível. Com 28m² bem aproveitados, o quarto combina cama casal em madeira maciça com roupas de cama de algodão premium, mesa de cabeceira esculpida em tronco de eucalipto e ventilação natural cruzada que dispensa ar-condicionado na maioria dos dias. O banheiro privativo tem piso de pedra rústico e box com chuveiro de pressão. A janela generosa oferece vista parcial da floresta, suficiente para acompanhar o movimento dos macacos-prego e tucanos no alto das copas. É o quarto ideal para casais que priorizam a experiência de estar imersos na natureza a confortos superficiais, e também para viajantes solo que buscam um espaço acolhedor para descansar entre trilhas.",
    gallery: [
      { src: "/images/room-standard.jpg", alt: "Quarto Standard com cama casal e decoração rústica" },
      { src: "/images/room-standard.jpg", alt: "Banheiro com piso de pedra e chuveiro de pressão" },
      { src: "/images/room-standard.jpg", alt: "Vista parcial da floresta pela janela" },
    ],
    amenities: [
      { name: "Cama Casal", icon: "BedDouble" },
      { name: "Banheiro Privativo", icon: "Bath" },
      { name: "Vista da Floresta", icon: "TreePine" },
      { name: "Roupa de Cama Premium", icon: "Sparkles" },
      { name: "Ventilação Natural", icon: "AirVent" },
      { name: "Wi-Fi", icon: "Wifi" },
    ],
    policy: "Cancelamento gratuito até 3 dias antes. Café da manhã incluso. Tarifa reduzida para reservas de 3+ noites.",
  },
];

export const experiences = [
  {
    id: 1,
    title: "Trilhas & Natureza",
    description:
      "Explore mais de 15km de trilhas pela Mata Atlântica, com guias especializados que revelam a fauna e flora locais.",
    image: "/images/experience-trail.jpg",
    duration: "2-4 horas",
    difficulty: "Fácil a Moderado",
  },
  {
    id: 2,
    title: "Spa & Bem-estar",
    description:
      "Terapias inspiradas nas tradições da floresta: massagens com óleos essenciais locais e sessões de meditação guiada.",
    image: "/images/experience-spa.jpg",
    duration: "1-3 horas",
    difficulty: "Relaxante",
  },
  {
    id: 3,
    title: "Gastronomia Local",
    description:
      "Menu autoral com ingredientes orgânicos da horta da pousada e produtores locais. Jantar harmonizado disponível.",
    image: "/images/experience-gastronomy.jpg",
    duration: "1-2 horas",
    difficulty: "Para todos",
  },
  {
    id: 4,
    title: "Passeios de Barco",
    description:
      "Navegação serena pelo rio que banha a propriedade, com observação de aves, pirilampos ao entardecer e piquenique na margem.",
    image: "/images/experience-boat.jpg",
    duration: "3 horas",
    difficulty: "Fácil",
  },
];

export const galleryImages = [
  { src: "/images/gallery-1.jpg", alt: "Vista aérea da pousada entre as montanhas", span: "col-span-1 md:col-span-2 row-span-1 md:row-span-2" },
  { src: "/images/gallery-2.jpg", alt: "Detalhes da folhagem tropical com orvalho", span: "col-span-1 row-span-1" },
  { src: "/images/gallery-3.jpg", alt: "Pôr do sol visto da varanda", span: "col-span-1 row-span-1" },
  { src: "/images/gallery-4.jpg", alt: "Café da manhã com frutas tropicais", span: "col-span-1 row-span-1" },
  { src: "/images/gallery-5.jpg", alt: "Ponte suspensa na trilha da floresta", span: "col-span-1 row-span-1 md:row-span-2" },
  { src: "/images/gallery-6.jpg", alt: "Piscina infinita com vista do vale", span: "col-span-1 md:col-span-2 row-span-1" },
];

export const testimonials = [
  {
    id: 1,
    name: "Marina Albuquerque",
    location: "São Paulo, SP",
    avatar: "/images/avatar-1.jpg",
    text: "Foi a melhor experiência de viagem que já tivemos. Cada detalhe da pousada é pensado para proporcionar descanso genuíno. O spa com óleos da floresta é inesquecível.",
    rating: 5,
  },
  {
    id: 2,
    name: "Carlos Eduardo Lima",
    location: "Rio de Janeiro, RJ",
    avatar: "/images/avatar-2.jpg",
    text: "Levei minha família para o Chalé e foi perfeito. As trilhas são incríveis, o jantar é extraordinário e a equipe é extremamente atenciosa. Já reservei para o próximo feriado.",
    rating: 5,
  },
  {
    id: 3,
    name: "Helena Ribeiro",
    location: "Belo Horizonte, MG",
    avatar: "/images/avatar-3.jpg",
    text: "Um verdadeiro refúgio. Desliguei o celular nos 4 dias que fiquei e voltei renovada. O café da manhã com frutas colhidas na hora é um luxo simples que marca.",
    rating: 5,
  },
];

export const faqItems = [
  {
    question: "Qual é o horário de check-in e check-out?",
    answer:
      "O check-in é a partir das 15h e o check-out até às 12h. Oferecemos early check-in e late check-out sujeitos à disponibilidade.",
  },
  {
    question: "A pousada é pet friendly?",
    answer:
      "Sim! Aceitamos pequenos e médios portes. Possuímos áreas específicas para pets e fornecemos kit de bem-vinda completo.",
  },
  {
    question: "Qual é a política de cancelamento?",
    answer:
      "Cancelamentos gratuitos até 7 dias antes da data de check-in. Cancelamentos com menos de 7 dias são cobrados como 50% do valor da primeira diária.",
  },
  {
    question: "A pousada oferece transfer do aeroporto?",
    answer:
      "Oferecemos transfer privado e compartilhado dos aeroportos de São Paulo e Rio de Janeiro. Reserve com antecedência.",
  },
  {
    question: "Possui internet Wi-Fi?",
    answer:
      "Sim, oferecemos Wi-Fi gratuito em todas as áreas. Incentivamos a desconexão digital durante a estadia para uma experiência mais imersiva.",
  },
  {
    question: "As trilhas são guiadas?",
    answer:
      "Oferecemos trilhas autoguiadas com mapas detalhados e trilhas guiadas por nossos guias naturalistas. As trilhas guiadas saem diariamente às 8h e 15h.",
  },
  {
    question: "Como funciona a gastronomia da pousada?",
    answer:
      "O café da manhã buffet é incluso na diária. O jantar autoral é opcional e deve ser reservado no dia. Também oferecemos almoço e lanches ao longo do dia.",
  },
];

export const stats = [
  { value: 99, suffix: "%", label: "Taxa de satisfação" },
  { value: 15, suffix: "km", label: "Trilhas na floresta" },
  { value: 12, suffix: "", label: "Anos de história" },
  { value: 4, suffix: "k+", label: "Hóspedes acolhidos" },
];
