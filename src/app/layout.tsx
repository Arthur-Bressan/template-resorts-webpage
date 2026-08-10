import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { db } from "@/lib/db";
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
  const settings = await db.siteSetting.findUnique({ where: { id: 'main' } });
  const title = settings?.metaTitle || settings?.name || "Refúgio Mata Atlântica";
  const description = settings?.metaDescription || settings?.description || "Pousada premium na Mata Atlântica";

  return {
    title: `${title} — Pousada & Spa`,
    description,
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
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await db.siteSetting.findUnique({ where: { id: 'main' } });

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${nunitoSans.variable} antialiased`}
      >
        <CustomCursor />
        {children}
        <CookieConsent />
        {settings && <WhatsAppFloat siteSettings={settings} />}
      </body>
    </html>
  );
}
