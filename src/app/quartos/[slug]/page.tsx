import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import RoomDetailPage from "@/components/sections/RoomDetailPage";
import { getSiteConfig, getRoomBySlug, getRooms } from "@/lib/data";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function QuartoPage({ params }: Props) {
  const { slug } = await params;
  const { settings, links, stats } = await getSiteConfig();
  if (!settings) return notFound();

  const [room, allRooms] = await Promise.all([
    getRoomBySlug(slug),
    getRooms(),
  ]);

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
