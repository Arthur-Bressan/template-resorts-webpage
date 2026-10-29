import type { Metadata } from "next";
import { getRoomBySlug, getRooms, getSiteConfig, getSocialImageUrl } from "@/lib/data";


type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const [room, { settings }] = await Promise.all([getRoomBySlug(slug), getSiteConfig()]);
    if (!room) return { title: "Acomodação não encontrada" };
    const title = `${room.name} — ${settings.name}`;
    const image = getSocialImageUrl(settings);

    return {
      title: `${room.name} — ${room.bedType} | ${room.size}m²`,
      description: room.description,
      openGraph: {
        title,
        description: room.description,
        type: "website",
        images: [{ url: image, alt: settings.name }],
      },
      twitter: { card: "summary_large_image", title, description: room.description, images: [image] },
    };
  } catch {
    return { title: "Acomodação — Refúgio Mata Atlântica" };
  }
}

export async function generateStaticParams() {
  try {
    const rooms = await getRooms();
    return rooms.map((room) => ({ slug: room.slug }));
  } catch {
    // If DB is unreachable during build, return empty — pages will be generated on demand
    return [];
  }
}

export default async function QuartoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
