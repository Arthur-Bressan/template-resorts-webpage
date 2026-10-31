import { db } from '@/lib/db'
import { headers } from 'next/headers'
import { getTenantFromHost } from '@/lib/tenant-context'

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

// ─── Generic template defaults ───

export function getDefaultSiteSettings(name: string, id = ''): SiteSettings {
  return {
    id,
    name,
    tagline: 'Uma hospedagem feita para receber bem',
    description: 'Conheça uma hospedagem acolhedora, preparada para receber você.',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    lat: 0,
    lng: 0,
    instagram: '',
    facebook: '',
    tripadvisor: '',
    logo: '/logo.svg',
    heroImage: '/images/hero.jpg',
    ogImage: '/logo.svg',
    metaTitle: name,
    metaDescription: 'Conheça as acomodações e serviços desta hospedagem.',
    googleAnalyticsId: '',
    googleMapsApiKey: '',
    updatedAt: new Date(),
  }
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

// ─── Public tenant context ───

export async function getPublicTenant() {
  try {
    const requestHeaders = await headers()
    return await getTenantFromHost(requestHeaders.get('host'))
  } catch {
    return null
  }
}

// ─── Tenant-scoped public reads ───

export async function getSiteConfig(tenantId: string, tenantName: string) {
  try {
    const [settings, links, stats] = await Promise.all([
      db.siteSetting.findFirst({ where: { tenantId } }),
      db.navLink.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.stat.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
    ])
    return {
      settings: settings || getDefaultSiteSettings(tenantName, tenantId),
      links: links.length > 0 ? links : FALLBACK_LINKS,
      stats,
    }
  } catch {
    return { settings: getDefaultSiteSettings(tenantName, tenantId), links: FALLBACK_LINKS, stats: [] }
  }
}

export async function getRooms(tenantId: string, publishedOnly = true) {
  try {
    return await db.room.findMany({
      where: { tenantId, ...(publishedOnly ? { published: true } : {}) },
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

export async function getRoomBySlug(tenantId: string, slug: string) {
  try {
    return await db.room.findFirst({
      where: { tenantId, slug, published: true },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { orderBy: { sortOrder: 'asc' } },
      },
    })
  } catch {
    return null
  }
}

export async function getExperiences(tenantId: string, publishedOnly = true) {
  try {
    return await db.experience.findMany({
      where: { tenantId, ...(publishedOnly ? { published: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getGalleryImages(tenantId: string, publishedOnly = true) {
  try {
    return await db.galleryImage.findMany({
      where: { tenantId, ...(publishedOnly ? { published: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getTestimonials(tenantId: string, publishedOnly = true) {
  try {
    return await db.testimonial.findMany({
      where: { tenantId, ...(publishedOnly ? { published: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getFAQs(tenantId: string, publishedOnly = true) {
  try {
    return await db.faq.findMany({
      where: { tenantId, ...(publishedOnly ? { published: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

export async function getAboutData(tenantId: string) {
  try {
    const [amenities, distances, directions, sensory, stats] = await Promise.all([
      db.aboutAmenity.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.distance.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.direction.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      db.sensoryConfig.findFirst({ where: { tenantId } }),
      db.stat.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
    ])
    return { amenities, distances, directions, sensory, stats }
  } catch {
    return { amenities: [], distances: [], directions: [], sensory: null, stats: [] }
  }
}
