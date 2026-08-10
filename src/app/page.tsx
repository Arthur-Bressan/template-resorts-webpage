import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { FallingLeaves } from "@/components/layout/FallingLeaves";
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
import { getSiteConfig, getRooms, getExperiences, getGalleryImages, getTestimonials, getFAQs } from "@/lib/data";

// Dynamic rendering — pages are server-rendered on each request (external DB)
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { settings, links, stats } = await getSiteConfig();

  const [rooms, experiences, galleryImages, testimonials, faqItems] = await Promise.all([
    getRooms(),
    getExperiences(),
    getGalleryImages(),
    getTestimonials(),
    getFAQs(),
  ]);

  return (
    <SmoothScrollProvider>
      <FallingLeaves />
      <div className="min-h-screen flex flex-col">
        <Header siteSettings={settings} navLinks={links} />

        <main className="flex-1">
          <Hero siteSettings={settings} />
          <SocialProof />
          <About />
          <Rooms rooms={rooms} />
          <Experiences experiences={experiences} />
          <Gallery galleryImages={galleryImages} />
          <Location siteSettings={settings} />
          <Testimonials testimonials={testimonials} />
          <FAQ faqItems={faqItems} />
          <BookingCTA siteSettings={settings} />
        </main>

        <Footer siteSettings={settings} stats={stats} />
      </div>
    </SmoothScrollProvider>
  );
}
