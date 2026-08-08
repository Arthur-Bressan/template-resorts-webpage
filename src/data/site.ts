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
  { label: "A Pousada", href: "#about" },
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
    description:
      "Suíte de luxo com cama king, terraço privado com rede, banheira de hidromassagem e vista panorâmica da floresta.",
    amenities: [
      "Cama King Size",
      "Banheira de Hidromassagem",
      "Terraço com Rede",
      "Vista Panorâmica",
      "Amenities Premium",
      "Wi-Fi",
    ],
  },
  {
    id: 2,
    name: "Chalé Família",
    slug: "chale-familia",
    image: "/images/room-chalet.jpg",
    price: 920,
    capacity: 4,
    size: 65,
    description:
      "Chalé espaçoso em estilo mezanino, ideal para famílias. Duas suítes, sala de estar com lareira e varanda cercada pela natureza.",
    amenities: [
      "2 Quartos",
      "Sala com Lareira",
      "Varanda Privativa",
      "Cozinha Compacta",
      "Vista da Montanha",
      "Wi-Fi",
    ],
  },
  {
    id: 3,
    name: "Suíte Garden",
    slug: "suite-garden",
    image: "/images/room-garden.jpg",
    price: 560,
    capacity: 2,
    size: 38,
    description:
      "Suíte em conexão direta com o jardim tropical. Portas de vidro corrediças, chuveiro ao ar livre e flores exóticas ao redor.",
    amenities: [
      "Cama Queen Size",
      "Chuveiro ao Ar Livre",
      "Acesso ao Jardim",
      "Portas de Vidro",
      "Roupa de Banho",
      "Wi-Fi",
    ],
  },
  {
    id: 4,
    name: "Quarto Standard",
    slug: "quarto-standard",
    image: "/images/room-standard.jpg",
    price: 380,
    capacity: 2,
    size: 28,
    description:
      "Conforto e simplicidade com toque rústico. Ideal para casais que buscam um refúgio acessível sem abrir mão do charme.",
    amenities: [
      "Cama Casal",
      "Banheiro Privativo",
      "Vista Parcial da Floresta",
      "Roupa de Cama Premium",
      "Ventilador de Teto",
      "Wi-Fi",
    ],
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
