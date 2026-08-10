"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
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
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getTodayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function ReservasPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    fetch("/api/rooms/public")
      .then((r) => r.json())
      .then((data: RoomOption[]) => {
        setRooms(data);
        if (data.length > 0) setRoomId(data[0].id);
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

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff =
      new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const totalPrice = useMemo(() => {
    if (!selectedRoom || nights === 0) return 0;
    return selectedRoom.price * nights;
  }, [selectedRoom, nights]);

  const guestOptions = useMemo(() => {
    const count = selectedRoom?.capacity || 2;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedRoom]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/reservations/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
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
    roomId &&
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
                {/* Room select */}
                <div className="space-y-2">
                  <Label htmlFor="room">Quarto</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger id="room" className="w-full">
                      <SelectValue placeholder="Selecione um quarto" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} — {formatBRL(room.price)}/noite
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRoom && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Capacidade: {selectedRoom.capacity} hóspedes ·{" "}
                      {selectedRoom.size}m² · {selectedRoom.bedType}
                    </p>
                  )}
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
                {selectedRoom && nights > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-text-muted)]">
                        {selectedRoom.name}
                      </span>
                      <span className="font-medium">
                        {formatBRL(selectedRoom.price)}/noite
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-text-muted)]">
                        {nights} {nights === 1 ? "noite" : "noites"}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        {formatBRL(totalPrice)}
                      </span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-text)]">
                        Total
                      </span>
                      <span className="text-xl font-bold text-[var(--color-primary)]">
                        {formatBRL(totalPrice)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] text-center pt-1">
                      {formatBRL(selectedRoom.price)} × {nights}{" "}
                      {nights === 1 ? "noite" : "noites"} ={" "}
                      {formatBRL(totalPrice)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-2">
                    Selecione um quarto e as datas para ver o total.
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
                    Reservar via Mercado Pago
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
