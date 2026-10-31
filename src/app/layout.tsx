import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { getPublicTenant, getSiteConfig } from "@/lib/data";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  const settings = tenant ? (await getSiteConfig(tenant.id, tenant.name)).settings : null;
  const title = settings?.metaTitle || settings?.name || "Hospedagem";
  const description = settings?.metaDescription || settings?.description || "Conheça esta hospedagem e suas acomodações.";

  return {
    title,
    description,
    icons: { icon: '/favicon.png' },
    keywords: ["hospedagem", "acomodações", "viagem", "descanso"],
    ...(settings ? { authors: [{ name: settings.name }] } : {}),
    openGraph: { title, description, type: "website" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getPublicTenant();
  const settings = tenant ? (await getSiteConfig(tenant.id, tenant.name)).settings : null;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${nunitoSans.variable} antialiased`}
      >
        <CustomCursor />
        {children}
        <CookieConsent />
        {settings?.whatsapp && <WhatsAppFloat siteSettings={settings} />}
        <Analytics />
      </body>
    </html>
  );
}
