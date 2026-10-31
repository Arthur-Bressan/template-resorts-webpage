import type { Metadata } from "next";
import { getPublicTenant, getSiteConfig } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  if (!tenant) return { title: "Sobre a hospedagem" };
  const { settings } = await getSiteConfig(tenant.id, tenant.name);
  const title = `Sobre ${settings.name}`;
  const description = settings.metaDescription || `Conheça ${settings.name} e as informações disponíveis sobre a hospedagem.`;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default function SobreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
