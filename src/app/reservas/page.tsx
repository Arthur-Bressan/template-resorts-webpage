"use client";

import { useState, useEffect, useMemo, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Honeypot } from "@/components/ui/Honeypot";
import { ConsentCheckbox } from "@/components/ui/ConsentCheckbox";
import {
  CalendarDays,
  Users,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  BedDouble,
} from "lucide-react";

interface RoomOption {
  id: string;
  name: string;
  slug: string;
  price: number;
  capacity: number;
  size: number;
  bedType: string;
  description: string;
  activeUnitCount: number;
}

interface PublicRoomsResponse {
  rooms: RoomOption[];
  checkoutEnabled: boolean;
  checkoutMode: "mercado_pago" | "development_mock";
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getTodayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function ReservasPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <ReservasPage />
    </Suspense>
  );
}

function ReservasPage() {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [quantityByRoom, setQuantityByRoom] = useState<Record<string, number>>({});
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<PublicRoomsResponse["checkoutMode"]>("mercado_pago");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [consent, setConsent] = useState(false);

  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get("room");

  useEffect(() => {
    fetch("/api/rooms/public")
      .then(async (response) => {
        if (!response.ok) throw new Error("Rooms unavailable");
        return response.json() as Promise<PublicRoomsResponse>;
      })
      .then((data) => {
        setRooms(data.rooms);
        setCheckoutEnabled(data.checkoutEnabled);
        setCheckoutMode(data.checkoutMode);
        // Pre-select room from URL query param
        if (preselectedSlug) {
          const match = data.rooms.find((r) => r.slug === preselectedSlug && r.activeUnitCount > 0);
          if (match) {
            setQuantityByRoom({ [match.id]: 1 });
          }
        } else {
          const firstAvailable = data.rooms.find((r) => r.activeUnitCount > 0);
          if (firstAvailable) setQuantityByRoom({ [firstAvailable.id]: 1 });
        }
      })
      .catch(() => setError("Erro ao carregar quartos."))
      .finally(() => setLoading(false));
  }, []);

  // Auto-set min check-out when check-in changes
  const minCheckOut = useMemo(() => {
    if (!checkIn) return getTodayString();
    return checkIn;
  }, [checkIn]);

  // Reset check-out if it's before check-in (derived, not via effect)

  const selectedCategories = useMemo(
    () => rooms.flatMap((room) => {
      const quantity = quantityByRoom[room.id] || 0;
      return quantity > 0 ? [{ room, quantity }] : [];
    }),
    [rooms, quantityByRoom],
  );

  const selectedCapacity = useMemo(
    () => selectedCategories.reduce((total, item) => total + item.room.capacity * item.quantity, 0),
    [selectedCategories],
  );

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff =
      new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const totalPrice = useMemo(() => {
    if (nights === 0) return 0;
    return selectedCategories.reduce((total, item) => total + item.room.price * nights * item.quantity, 0);
  }, [selectedCategories, nights]);

  const guestOptions = useMemo(() => {
    const count = Math.max(1, Math.min(10, selectedCapacity));
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedCapacity]);

  function setRoomQuantity(roomId: string, quantity: number) {
    setQuantityByRoom((current) => ({ ...current, [roomId]: quantity }));
    const nextCapacity = rooms.reduce((total, room) => {
      const selectedQuantity = room.id === roomId ? quantity : currentQuantity(room.id);
      return total + room.capacity * selectedQuantity;
    }, 0);
    setGuests((current) => Math.min(current, Math.max(1, Math.min(10, nextCapacity))));

    function currentQuantity(id: string) {
      return quantityByRoom[id] || 0;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/reservations/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedCategories: selectedCategories.map(({ room, quantity }) => ({
            categoryId: room.id,
            quantity,
          })),
          checkIn,
          checkOut,
          guests,
          guestName,
          guestEmail,
          guestPhone,
          consent,
          website: "", // honeypot — should be empty
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar reserva.");
        setSubmitting(false);
        return;
      }

      // Redirect to MP or mock page
      const url = data.init_point || data.sandbox_init_point;
      if (url) {
        window.location.href = url;
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  }

  const isFormValid =
    checkoutEnabled &&
    selectedCategories.length > 0 &&
    checkIn &&
    checkOut &&
    nights > 0 &&
    guestName.trim() &&
    guestEmail.trim() &&
    guestPhone.trim() &&
    guests >= 1 &&
    consent;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Top bar */}
      <div className="bg-[var(--color-primary-dark)] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="bg-[var(--color-primary)] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <CalendarDays className="w-10 h-10 text-[var(--color-accent)] mx-auto mb-4" />
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-medium mb-3">
            Reserve sua Estadia
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Escolha o quarto perfeito e garanta sua escapada para a Mata
            Atlântica.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="relative">
            <Honeypot />

            {/* Room & Dates */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--color-text)] flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-[var(--color-primary)]" />
                  Acomodação e Datas
                </CardTitle>
                <CardDescription>
                  Selecione o quarto e o período da sua estadia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Quartos e unidades</Label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Escolha uma ou mais categorias e a quantidade de unidades de cada uma.
                  </p>
                  {rooms.length === 0 ? (
                    <p className="rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
                      Não há acomodações publicadas disponíveis para reserva.
                    </p>
                  ) : rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text)]">{room.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatBRL(room.price)}/noite · capacidade para {room.capacity} hóspedes por unidade
                          {room.activeUnitCount > 0 ? ` · ${room.activeUnitCount} unidades ativas` : " · sem unidades ativas"}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 space-y-1">
                        <Label htmlFor={`quantity-${room.id}`} className="text-xs">Unidades</Label>
                        <Input
                          id={`quantity-${room.id}`}
                          type="number"
                          min={0}
                          max={room.activeUnitCount}
                          step={1}
                          value={quantityByRoom[room.id] || 0}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            const quantity = Number.isSafeInteger(value)
                              ? Math.max(0, Math.min(room.activeUnitCount, value))
                              : 0;
                            setRoomQuantity(room.id, quantity);
                          }}
                          disabled={room.activeUnitCount === 0}
                          aria-label={`Quantidade de unidades de ${room.name}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dates row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn">Check-in</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      min={getTodayString()}
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut">Check-out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      min={minCheckOut}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Guests */}
                <div className="space-y-2">
                  <Label htmlFor="guests">Número de Hóspedes</Label>
                  <Select
                    value={String(guests)}
                    onValueChange={(v) => setGuests(Number(v))}
                    disabled={selectedCapacity === 0}
                  >
                    <SelectTrigger id="guests" className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {guestOptions.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? "hóspede" : "hóspedes"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--color-text)] flex items-center gap-2">
                  <User className="w-5 h-5 text-[var(--color-primary)]" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Informações do hóspede responsável pela reserva.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Nome completo</Label>
                  <Input
                    id="guestName"
                    type="text"
                    placeholder="Maria Silva"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guestEmail">
                      <Mail className="w-3.5 h-3.5 inline mr-1" />
                      E-mail
                    </Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="maria@email.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone">
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Telefone / WhatsApp
                    </Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      placeholder="(11) 99999-0000"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card className="mb-6 bg-[var(--color-surface)]/50 border-[var(--color-primary)]/20">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--color-text)]">
                  Resumo da Reserva
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCategories.length > 0 && nights > 0 ? (
                  <div className="space-y-3">
                    {selectedCategories.map(({ room, quantity }) => (
                      <div key={room.id} className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-[var(--color-text-muted)]">
                          {room.name} · {quantity} {quantity === 1 ? "unidade" : "unidades"}
                          <span className="block text-xs">
                            {formatBRL(room.price)} × {nights} {nights === 1 ? "noite" : "noites"} × {quantity}
                          </span>
                        </span>
                        <span className="font-medium">{formatBRL(room.price * nights * quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-text)]">
                        Total
                      </span>
                      <span className="text-xl font-bold text-[var(--color-primary)]">
                        {formatBRL(totalPrice)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-2">
                    Selecione as unidades e as datas para ver o total.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Consent & Submit */}
            <div className="space-y-6">
              <ConsentCheckbox
                checked={consent}
                onCheckedChange={setConsent}
              />

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!checkoutEnabled && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  O checkout está indisponível até que esta hospedagem conecte sua conta Mercado Pago.
                </div>
              )}
              {checkoutEnabled && checkoutMode === "development_mock" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Modo simulado de desenvolvimento: nenhuma reserva será confirmada sem um pagamento aprovado.
                </div>
              )}

              <Button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full h-14 text-base font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    {checkoutMode === "development_mock" ? "Criar reserva de teste" : "Reservar via Mercado Pago"}
                  </>
                )}
              </Button>

              <p className="text-xs text-[var(--color-text-muted)] text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Pagamento seguro processado pelo Mercado Pago
              </p>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
