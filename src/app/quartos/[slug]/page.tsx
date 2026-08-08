"use client";

import { use } from "react";
import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import RoomDetailPage from "@/components/sections/RoomDetailPage";

export default function QuartoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <RoomDetailPage slug={slug} />
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
