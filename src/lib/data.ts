import { db } from '@/lib/db'

// ─── TypeScript Interfaces ───

export interface SiteSettings {
  id: string
  name: string
  tagline: string
  description: string
  phone: string
  whatsapp: string
  email: string
  address: string
  lat: number
  lng: number
  instagram: string
  facebook: string
  tripadvisor: string
  logo: string
  heroImage: string
  ogImage: string
  metaTitle: string
  metaDescription: string
  googleAnalyticsId: string
  googleMapsApiKey: string
  updatedAt: Date
}

export interface NavLink {
  id: string
  label: string
  href: string
  sortOrder: number
}

export interface Stat {
  id: string
  value: number
  suffix: string
  label: string
  sortOrder: number
}

export interface RoomImage {
  id: string
  src: string
  alt: string
  sortOrder: number
  roomId: string
}

export interface RoomAmenity {
  id: string
  name: string
  icon: string
  sortOrder: number
  roomId: string
}

export interface Room {
  id: string
  name: string
  slug: string
  price: number
  capacity: number
  size: number
  bedType: string
  description: string
  descriptionLong: string
  policy: string
  sortOrder: number
  published: boolean
  createdAt: Date
  updatedAt: Date
  images: RoomImage[]
  amenities: RoomAmenity[]
}

export interface Experience {
  id: string
  title: string
  description: string
  image: string
  duration: string
  difficulty: string
  sortOrder: number
  published: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GalleryImage {
  id: string
  src: string
  alt: string
  span: string
  sortOrder: number
  published: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Testimonial {
  id: string
  name: string
  location: string
  avatar: string
  text: string
  rating: number
  sortOrder: number
  published: boolean
  createdAt: Date
  updatedAt: Date
}

export interface FAQ {
  id: string
  question: string
  answer: string
  sortOrder: number
  published: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AboutAmenity {
  id: string
  icon: string
  label: string
  desc: string
  sortOrder: number
}

export interface Distance {
  id: string
  place: string
  distance: string
  time: string
  sortOrder: number
}

export interface Direction {
  id: string
  city: string
  route: string
  type: string
  sortOrder: number
}

export interface SensoryConfig {
  id: string
  title: string
  paragraphs: string
  updatedAt: Date
}

// ─── Fallback defaults (used when DB is unreachable) ───

const FALLBACK_SETTINGS: SiteSettings = {
  id: 'main',
  name: 'Refúgio Mata Atlântica',
  tagline: 'Onde a natureza abraça o descanso',
  description: 'Pousada premium na Mata Atlântica',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  lat: -23.18,
  lng: -44.92,
  instagram: '',
  facebook: '',
  tripadvisor: '',
  logo: '/logo.svg',
  heroImage: '/images/hero.jpg',
  ogImage: '/logo.svg',
  metaTitle: '',
  metaDescription: '',
  googleAnalyticsId: '',
  googleMapsApiKey: '',
  updatedAt: new Date(),
}

const FALLBACK_LINKS: NavLink[] = [
  { id: 'nav-sobre', label: 'Sobre', href: '/sobre', sortOrder: 0 },
  { id: 'nav-rooms', label: 'Acomodações', href: '#rooms', sortOrder: 1 },
  { id: 'nav-experiences', label: 'Experiências', href: '#experiences', sortOrder: 2 },
  { id: 'nav-gallery', label: 'Galeria', href: '#gallery', sortOrder: 3 },
  { id: 'nav-location', label: 'Localização', href: '#location', sortOrder: 4 },
  { id: 'nav-testimonials', label: 'Depoimentos', href: '#testimonials', sortOrder: 5 },
  { id: 'nav-faq', label: 'FAQ', href: '#faq', sortOrder: 6 },
]

// ─── Data Fetching Functions (with error handling) ───

export async function getSiteConfig() {
  try {
    const settings = await db.siteSetting.findUnique({ where: { id: 'main' } })
    const links = await db.navLink.findMany({ orderBy: { sortOrder: 'asc' } })
    const stats = await db.stat.findMany({ orderBy: { sortOrder: 'asc' } })
    return { settings: settings || FALLBACK_SETTINGS, links: links.length > 0 ? links : FALLBACK_LINKS, stats }
  } catch {
    return { settings: FALLBACK_SETTINGS, links: FALLBACK_LINKS, stats: [] }
  }
}

export async function getRooms(publishedOnly = true) {
  try {
    return await db.room.findMany({
      where: publishedOnly ? { published: true } : undefined,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getRoomBySlug(slug: string) {
  try {
    return await db.room.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
      },
    })
  } catch {
    return null
  }
}

export async function getExperiences(publishedOnly = true) {
  try {
    return await db.experience.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getGalleryImages(publishedOnly = true) {
  try {
    return await db.galleryImage.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getTestimonials(publishedOnly = true) {
  try {
    return await db.testimonial.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getFAQs(publishedOnly = true) {
  try {
    return await db.faq.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getAboutData() {
  try {
    const [amenities, distances, directions, sensory, stats] = await Promise.all([
      db.aboutAmenity.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.distance.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.direction.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.sensoryConfig.findUnique({ where: { id: 'main' } }),
      db.stat.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])
    return { amenities, distances, directions, sensory, stats }
  } catch {
    return { amenities: [], distances: [], directions: [], sensory: null, stats: [] }
  }
}
