import type { Metadata } from "next";
import { getPublicTenant, getSiteConfig, getRoomBySlug } from "@/lib/data";


type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const tenant = await getPublicTenant();
    if (!tenant) return { title: "Acomodação" };
    const [{ settings }, room] = await Promise.all([
      getSiteConfig(tenant.id, tenant.name),
      getRoomBySlug(tenant.id, slug),
    ]);
    if (!room) return { title: `Acomodação não encontrada | ${settings.name}` };

    return {
      title: `${room.name} — ${room.bedType} | ${settings.name}`,
      description: room.description,
      openGraph: {
        title: `${room.name} — ${settings.name}`,
        description: room.description,
        type: "website",
      },
    };
  } catch {
    return { title: "Acomodação" };
  }
}

export default async function QuartoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
