"use client";

import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SobrePage from "@/components/sections/SobrePage";

export default function Sobre() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <SobrePage />
        </main>

        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
