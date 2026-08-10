"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConsentCheckboxProps {
  id?: string;
  name?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function ConsentCheckbox({
  id = "consent",
  name = "consent",
  checked,
  onCheckedChange,
  className = "",
}: ConsentCheckboxProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Checkbox
        id={id}
        name={name}
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
      />
      <Label
        htmlFor={id}
        className="text-sm text-[var(--color-text-muted)] leading-relaxed cursor-pointer select-none"
      >
        Concordo com a{" "}
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="underline underline-offset-2 hover:text-[var(--color-primary)] transition-colors"
        >
          Política de Privacidade
        </a>{" "}
        e autorizo o uso dos meus dados para processamento desta reserva, conforme a LGPD.
      </Label>
    </div>
  );
}
