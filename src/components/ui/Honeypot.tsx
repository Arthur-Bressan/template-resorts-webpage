"use client";

import { Input } from "@/components/ui/input";

interface HoneypotProps {
  id?: string;
  name?: string;
}

/**
 * Invisible honeypot field to trap bots.
 * If this field is filled, the submission is silently rejected.
 */
export function Honeypot({ id = "website", name = "website" }: HoneypotProps) {
  return (
    <div className="absolute opacity-0 h-0 w-0 overflow-hidden pointer-events-none" aria-hidden="true" tabIndex={-1}>
      <label htmlFor={id}>Não preencha este campo</label>
      <Input
        type="text"
        id={id}
        name={name}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );
}
