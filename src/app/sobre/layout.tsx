import type { Metadata } from "next";
import { getSiteConfig, getSocialImageUrl } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteConfig();
  const title = `Sobre a pousada — ${settings.name}`;
  const description = settings.metaDescription || settings.description || `Conheça ${settings.name} e planeje sua estadia.`;
  const image = getSocialImageUrl(settings);
  return {
    title, description,
    openGraph: { title, description, type: "website", images: [{ url: image, alt: settings.name }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function SobreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
