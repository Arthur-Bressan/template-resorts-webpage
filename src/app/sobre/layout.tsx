import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre a Pousada — Refúgio Mata Atlântica",
  description:
    "Conheça a história, diferenciais e localização do Refúgio Mata Atlântica. 50 hectares de Mata Atlântica preservada em Cunha, SP. Piscina natural, spa, trilhas privativas e café da manhã orgânico.",
  openGraph: {
    title: "Sobre a Pousada — Refúgio Mata Atlântica",
    description:
      "Conheça a história, diferenciais e localização do Refúgio Mata Atlântica em Cunha, SP.",
    type: "website",
  },
};

export default function SobreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
