import type { Metadata } from "next";
import { getRoomBySlug, getRooms } from "@/lib/data";


type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const room = await getRoomBySlug(slug);
    if (!room) return { title: "Acomodação não encontrada" };

    return {
      title: `${room.name} — ${room.bedType} | ${room.size}m²`,
      description: room.description,
      openGraph: {
        title: `${room.name} — Refúgio Mata Atlântica`,
        description: room.description,
        type: "website",
      },
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
