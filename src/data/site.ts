/** Generic template content. Tenant-specific brand and property data lives in the database. */
export const siteConfig = {
  name: "Sua hospedagem",
  tagline: "Uma hospedagem feita para receber bem",
  description: "Conheça uma hospedagem acolhedora, preparada para receber você.",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  coordinates: { lat: 0, lng: 0 },
  socials: {
    instagram: "",
    facebook: "",
    tripadvisor: "",
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
