import type { CnpjLookupMeta } from "@/hooks/use-cnpj-lookup";

type CnpjLookupMetaProps = {
  meta: CnpjLookupMeta;
};

export function CnpjLookupMetaInfo({ meta }: CnpjLookupMetaProps) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground md:col-span-2">
      <p>
        Consulta: {meta.source} · {meta.consultedAtLabel}
      </p>
      {meta.registrationStatus ? (
        <p>Situação cadastral: {meta.registrationStatus}</p>
      ) : null}
      {meta.openingDateLabel ? (
        <p>Data de abertura: {meta.openingDateLabel}</p>
      ) : null}
      {meta.mainCnae ? <p>CNAE principal: {meta.mainCnae}</p> : null}
    </div>
  );
}
