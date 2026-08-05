"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type UsersSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function UsersSearchField({ value, onChange }: UsersSearchFieldProps) {
  return (
    <div className="relative w-full lg:max-w-sm">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder="Pesquisar por nome, e-mail ou empresa"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Pesquisar usuários"
      />
    </div>
  );
}
