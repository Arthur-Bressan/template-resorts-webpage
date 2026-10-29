import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ConsentAnalytics } from "@/components/layout/ConsentAnalytics";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { getPublicBaseUrl, getSiteConfig, getSocialImageUrl } from "@/lib/data";
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
    const { settings } = await getSiteConfig();
    const title = settings.metaTitle || settings.name || "Refúgio Mata Atlântica";
    const description = settings.metaDescription || settings.description || "Pousada na Mata Atlântica";
    const baseUrl = getPublicBaseUrl();
    const image = getSocialImageUrl(settings);

    return {
      metadataBase: new URL(baseUrl),
      referrer: 'same-origin',
      title: `${title} — Pousada & Spa`,
      description,
      icons: {
        icon: '/favicon.png',
      },
      keywords: [
        "pousada",
        "hospedagem",
        "Mata Atlântica",
        "natureza",
        "spa",
        "eco-hotel",
        "refúgio",
        "férias",
        "trilhas",
        "gastronomia",
      ],
      authors: [{ name: settings?.name || "Refúgio Mata Atlântica" }],
      openGraph: {
        title: `${title} — Pousada & Spa`,
        description,
        type: "website",
        locale: "pt_BR",
        images: [{ url: image, alt: settings.name }],
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings } = await getSiteConfig();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${nunitoSans.variable} antialiased`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-5 focus:py-3 focus:text-[var(--color-primary-dark)]">
          Pular para o conteúdo
        </a>
        <CustomCursor />
        {children}
        <CookieConsent />
        {/^\d{10,15}$/.test(settings.whatsapp.replace(/\D/g, '')) && <WhatsAppFloat siteSettings={{ ...settings, whatsapp: settings.whatsapp.replace(/\D/g, '') }} />}
        <ConsentAnalytics googleAnalyticsId={settings.googleAnalyticsId} />
      </body>
    </html>
  );
}
