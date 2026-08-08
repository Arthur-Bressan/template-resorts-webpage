"use client";

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

export default function Home() {
  return (
    <SmoothScrollProvider>
      <FallingLeaves />
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <Hero />
          <SocialProof />
          <About />
          <Rooms />
          <Experiences />
          <Gallery />
          <Location />
          <Testimonials />
          <FAQ />
          <BookingCTA />
        </main>

        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
