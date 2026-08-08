import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Refúgio Mata Atlântica — Pousada & Spa",
  description:
    "Descubra o Refúgio Mata Atlântica: uma pousada premium entre a floresta. Suítes com vista panorâmica, spa natural, trilhas e gastronomia local. Desconecte-se da rotina e reconecte-se com a natureza.",
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
  authors: [{ name: "Refúgio Mata Atlântica" }],
  openGraph: {
    title: "Refúgio Mata Atlântica — Pousada & Spa",
    description:
      "Descubra o Refúgio Mata Atlântica: uma pousada premium entre a floresta. Desconecte-se da rotina e reconecte-se com a natureza.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${nunitoSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
