import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getPublicTenant, getRooms } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await getPublicTenant()
  if (!tenant) return []

  const host = (await headers()).get('host')
  if (!host) return []
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  const rooms = await getRooms(tenant.id)
  const now = new Date()
  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...rooms.map((room) => ({ url: `${baseUrl}/quartos/${room.slug}`, lastModified: room.updatedAt, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${baseUrl}/reservas`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/politica-de-privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/termos-de-uso`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
