import Link from "next/link";
import { XCircle, ArrowLeft, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicTenant, getSiteConfig } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function FalhaPage() {
  const tenant = await getPublicTenant();
  if (!tenant) notFound();
  const { settings } = await getSiteConfig(tenant.id, tenant.name);
  const propertyName = settings.name || tenant.name;
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--color-text)] font-medium mb-3">
          Falha no Pagamento
        </h1>

        <p className="text-[var(--color-text-muted)] text-lg mb-8">
          O pagamento de {propertyName} não foi concluído. Tente novamente ou entre em contato com a pousada.
        </p>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-12 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold"
          >
            <Link href="/reservas">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tentar novamente
            </Link>
          </Button>

          {settings.phone && (
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-xl border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            >
              <a href={`tel:${settings.phone}`}>
                <Phone className="w-4 h-4 mr-2" />
                Ligar: {settings.phone}
              </a>
            </Button>
          )}

          {settings.email && <Button
            asChild
            variant="ghost"
            className="w-full h-12 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          >
            <a href={`mailto:${settings.email}?subject=Problema%20no%20pagamento`}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar e-mail
            </a>
          </Button>}
        </div>
      </div>
    </div>
  );
}
