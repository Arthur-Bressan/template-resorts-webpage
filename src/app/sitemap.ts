import type { MetadataRoute } from 'next'
import { getPublicBaseUrl, getRooms } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl()
  const rooms = await getRooms()
  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/sobre`, changeFrequency: 'monthly', priority: 0.8 },
    ...rooms.map((room) => ({
      url: `${baseUrl}/quartos/${encodeURIComponent(room.slug)}`,
      lastModified: room.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/reservas`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/politica-de-privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/termos-de-uso`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
