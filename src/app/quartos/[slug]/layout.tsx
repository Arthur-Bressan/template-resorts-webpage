import type { Metadata } from "next";
import { rooms } from "@/data/site";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = rooms.find((r) => r.slug === slug);
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
}

export async function generateStaticParams() {
  return rooms.map((room) => ({ slug: room.slug }));
}

export default async function QuartoLayout({ children }: { children: React.ReactNode }) {
  // Will be validated in the page component
  return <>{children}</>;
}
