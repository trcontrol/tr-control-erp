import { SettingsBoard } from "@/components/settings/settings-board";

export const metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)] sm:text-[2.125rem]">
          Configurações
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Conta pessoal e dados cadastrais da empresa ativa
        </p>
      </div>
      <SettingsBoard />
    </div>
  );
}
