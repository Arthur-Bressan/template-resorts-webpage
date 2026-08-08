/* ─── Dados específicos da página "Sobre a Pousada" ─── */

export const amenities = [
  { icon: "Coffee", label: "Café da manhã incluso", desc: "Buffet com frutas orgânicas, pães artesanais e sucos naturais da horta" },
  { icon: "Waves", label: "Piscina natural", desc: "Piscina aquecida com vista panorâmica do vale e deck de madeira" },
  { icon: "Wifi", label: "Wi-Fi gratuito", desc: "Conexão em todas as áreas — incentive a desconexão digital" },
  { icon: "Dog", label: "Pet friendly", desc: "Aceitamos pequenos e médios portes com kit de bem-vinda" },
  { icon: "Car", label: "Estacionamento", desc: "Gratuito e privativo com cobertura para até 20 veículos" },
  { icon: "TreePine", label: "Trilhas privativas", desc: "15km de trilhas sinalizadas dentro da propriedade com guias" },
  { icon: "Spa", label: "Spa natural", desc: "Massagens, banhos de imersão e meditação guiada na floresta" },
  { icon: "Flame", label: "Lareira", desc: "Chalés com lareira a lenha para noites frescas de serra" },
  { icon: "Wine", label: "Jantar autoral", desc: "Menu com ingredientes locais, harmonização e aula de culinária" },
  { icon: "Shield", label: "Segurança 24h", desc: "Monitoramento por câmeras e portaria com funcionários 24 horas" },
  { icon: "Baby", label: "Adequado para crianças", desc: "Cadeirão, berço e espaço kids disponíveis mediante reserva" },
  { icon: "Recycle", label: "Sustentável", desc: "Compostagem, energia solar, captação de água da chuva" },
];

export const distances = [
  { place: "Centro de Cunha", distance: "12 km", time: "20 min" },
  { place: "Parque Estadual da Serra do Mar", distance: "18 km", time: "25 min" },
  { place: "Cachoeira do Véu da Noiva", distance: "8 km", time: "15 min" },
  { place: "Vinhedo AABB", distance: "30 km", time: "35 min" },
  { place: "Aeroporto de São José dos Campos", distance: "120 km", time: "2h" },
  { place: "São Paulo (capital)", distance: "230 km", time: "3h" },
  { place: "Rio de Janeiro", distance: "280 km", time: "3h30" },
];

export const directions = [
  { city: "São Paulo", route: "Rod. Presidente Dutra até Taubaté → Rod. SP-125 até Cunha → Estrada da Serra Km 12", type: "carro" },
  { city: "Rio de Janeiro", route: "Rod. Presidente Dutra até Volta Redonda → Rod. RJ-151 → Estrada da Serra Km 12", type: "carro" },
  { city: "São Paulo (ônibus)", route: "Terminal Tietê → Cunha (3x/dia). Transfer da rodoviária até a pousada sob encomenda.", type: "ônibus" },
  { city: "Aeroportos (GRU/CGH/GIG)", route: "Transfer privado disponível. Reserve com 48h de antecedência via WhatsApp ou e-mail.", type: "transfer" },
];

export const sensoryExperience = {
  title: "O silêncio que você procurava",
  paragraphs: [
    "Ao cruzar o portão do Refúgio, o primeiro que se nota é o silêncio — não aquele silêncio vazio, mas o que está cheio de sons da floresta: o canto dos sanhaços, o murmúrio do rio, o farfalhar das folhas ao vento.",
    "Aqui, não há horários marcados. O café da manhã é servido quando você acordar. As trilhas estão lá para quando o corpo pedir movimento. E o spa atende ao ritmo que sua pele e sua respiração exigirem. Cada detalhe foi pensado para que, pela primeira vez em muito tempo, você sinta que não precisa estar em lugar nenhum — exceto ali.",
    "Nossos hóspedes costumam dizer que o Refúgio é onde eles voltam a dormir como crianças, comer com fome de verdade e olhar para o céu sem pressa de pegar o celular.",
  ],
};
