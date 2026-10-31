import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import RoomDetailPage from "@/components/sections/RoomDetailPage";
import { getPublicTenant, getSiteConfig, getRoomBySlug, getRooms } from "@/lib/data";
import { notFound } from "next/navigation";

// Dynamic rendering — pages are server-rendered on each request (external DB)
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function QuartoPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getPublicTenant();
  if (!tenant) return notFound();
  const { settings, links, stats } = await getSiteConfig(tenant.id, tenant.name);

  const [room, allRooms] = await Promise.all([
    getRoomBySlug(tenant.id, slug),
    getRooms(tenant.id),
  ]);

  if (!room) return notFound();

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col">
        <Header siteSettings={settings} navLinks={links} />
        <main className="flex-1">
          <RoomDetailPage room={room} allRooms={allRooms} siteSettings={settings} />
        </main>
        <Footer siteSettings={settings} stats={stats} />
      </div>
    </SmoothScrollProvider>
  );
}
