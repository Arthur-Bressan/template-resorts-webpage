import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SobrePage from "@/components/sections/SobrePage";
import { getSiteConfig, getAboutData } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function Sobre() {
  const { settings, links, stats } = await getSiteConfig();
  if (!settings) return notFound();

  const { amenities, distances, directions, sensory } = await getAboutData();

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
