import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { SocialProof } from "@/components/sections/SocialProof";
import { About } from "@/components/sections/About";
import { Rooms } from "@/components/sections/Rooms";
import { Experiences } from "@/components/sections/Experiences";
import { Gallery } from "@/components/sections/Gallery";
import { Location } from "@/components/sections/Location";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { LeadForm } from "@/components/sections/LeadForm";
import { getPublicTenant, getSiteConfig, getRooms, getExperiences, getGalleryImages, getTestimonials, getFAQs, getAboutData } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Dynamic rendering — pages are server-rendered on each request (external DB)
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  if (!tenant) return { title: 'Hospedagem' };
  const { settings } = await getSiteConfig(tenant.id, tenant.name);
  const title = settings.metaTitle || settings.name;
  const description = settings.metaDescription || settings.description;
  return { title, description, openGraph: { title, description, type: 'website' } };
}

export default async function Home() {
  const tenant = await getPublicTenant();
  if (!tenant) notFound();
  const { settings, links, stats } = await getSiteConfig(tenant.id, tenant.name);

  const heroSrc = settings.heroImage || "/images/hero.jpg";

  const [rooms, experiences, galleryImages, testimonials, faqItems, aboutData] = await Promise.all([
    getRooms(tenant.id),
    getExperiences(tenant.id),
    getGalleryImages(tenant.id),
    getTestimonials(tenant.id),
    getFAQs(tenant.id),
    getAboutData(tenant.id),
  ]);

  return (
    <>
      <link rel="preload" as="image" href={heroSrc} />
      <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col">
        <Header siteSettings={settings} navLinks={links} />

        <main className="flex-1">
          <Hero siteSettings={settings} />
          <SocialProof stats={stats} />
          <About siteSettings={settings} />
          <Rooms rooms={rooms} />
          <Experiences experiences={experiences} />
          <Gallery galleryImages={galleryImages} />
          <Location siteSettings={settings} distances={aboutData.distances} directions={aboutData.directions} />
          <Testimonials testimonials={testimonials} />
          <FAQ faqItems={faqItems} />
          <LeadForm siteSettings={settings} rooms={rooms} />
          <BookingCTA siteSettings={settings} />
        </main>

        <Footer siteSettings={settings} stats={stats} />
      </div>
      </SmoothScrollProvider>
    </>
  );
}
