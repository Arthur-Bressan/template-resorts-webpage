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

// ─── Data Fetching Functions ───

export async function getSiteConfig() {
  const settings = await db.siteSetting.findUnique({ where: { id: 'main' } })
  const links = await db.navLink.findMany({ orderBy: { sortOrder: 'asc' } })
  const stats = await db.stat.findMany({ orderBy: { sortOrder: 'asc' } })
  return { settings, links, stats }
}

export async function getRooms(publishedOnly = true) {
  return db.room.findMany({
    where: publishedOnly ? { published: true } : undefined,
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      amenities: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getRoomBySlug(slug: string) {
  return db.room.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      amenities: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

export async function getExperiences(publishedOnly = true) {
  return db.experience.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getGalleryImages(publishedOnly = true) {
  return db.galleryImage.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getTestimonials(publishedOnly = true) {
  return db.testimonial.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getFAQs(publishedOnly = true) {
  return db.faq.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getAboutData() {
  const [amenities, distances, directions, sensory, stats] = await Promise.all([
    db.aboutAmenity.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.distance.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.direction.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.sensoryConfig.findUnique({ where: { id: 'main' } }),
    db.stat.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  return { amenities, distances, directions, sensory, stats }
}
