import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SobrePage from "@/components/sections/SobrePage";
import { getPublicTenant, getSiteConfig, getAboutData } from "@/lib/data";
import { notFound } from "next/navigation";

// Dynamic rendering — pages are server-rendered on each request (external DB)
export const dynamic = 'force-dynamic';

export default async function Sobre() {
  const tenant = await getPublicTenant();
  if (!tenant) notFound();
  const { settings, links, stats } = await getSiteConfig(tenant.id, tenant.name);

  const { amenities, distances, directions, sensory } = await getAboutData(tenant.id);

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col">
        <Header siteSettings={settings} navLinks={links} />

        <main className="flex-1">
          <SobrePage
            siteSettings={settings}
            amenities={amenities}
            distances={distances}
            directions={directions}
            sensory={sensory}
          />
        </main>

        <Footer siteSettings={settings} stats={stats} />
      </div>
    </SmoothScrollProvider>
  );
}
