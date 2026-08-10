import Link from "next/link";
import { siteConfig } from "@/data/site";
import { Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="blob w-[600px] h-[600px] bg-[var(--color-primary-light)] -top-40 -left-40"
        aria-hidden="true"
      />
      <div
        className="blob w-[400px] h-[400px] bg-[var(--color-secondary)] -bottom-32 -right-32"
        aria-hidden="true"
      />

      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* 404 number with gradient mask */}
        <div className="relative mb-8">
          <span
            className="block text-[8rem] sm:text-[10rem] font-bold leading-none select-none"
            style={{
              fontFamily: "var(--font-serif)",
              backgroundImage:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 40%, var(--color-accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              opacity: 0.9,
            }}
            aria-hidden="true"
          >
            404
          </span>
          {/* Subtle leaf decoration */}
          <div
            className="absolute -top-4 -right-2 text-[var(--color-primary-light)] opacity-20"
            aria-hidden="true"
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" />
            </svg>
          </div>
        </div>

        <h1
          className="text-2xl sm:text-3xl mb-4"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--color-text)",
          }}
        >
          Página não encontrada
        </h1>

        <p className="text-base mb-10 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          A página que você procura pode ter sido removida ou está temporariamente indisponível.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            className="rounded-full px-6"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              Voltar ao início
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-full px-6"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <a href={`mailto:${siteConfig.email}`}>
              <Mail className="w-4 h-4" />
              Entrar em contato
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
