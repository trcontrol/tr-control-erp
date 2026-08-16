"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Building2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog";
import { EditCompanyCommercialForm } from "@/components/admin/edit-company-commercial-form";
import { NewCompanyForm } from "@/components/admin/new-company-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { resendInitialOwnerInviteAction } from "@/lib/admin/companies-admin-actions";
import {
  companyPlanLabel,
  companyStatusLabel,
  type AdminCompanyListItem,
} from "@/lib/admin/companies-admin-shared";
import { formatCnpj } from "@/lib/companies/format";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

type AdminCompaniesBoardProps = {
  companies: AdminCompanyListItem[];
  listError: string | null;
};

export function AdminCompaniesBoard({
  companies,
  listError,
}: AdminCompaniesBoardProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] =
    useState<AdminCompanyListItem | null>(null);
  const [deletingCompany, setDeletingCompany] =
    useState<AdminCompanyListItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"ok" | "warn">("ok");
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreated(result: {
    companyId: string;
    inviteId: string;
    emailSent: boolean;
    message: string;
    emailError: string | null;
  }) {
    setCreateOpen(false);
    setError(result.emailError);
    setFeedback(result.message);
    setFeedbackTone(result.emailSent ? "ok" : "warn");
    router.refresh();
  }

  function handleCommercialUpdated(message: string) {
    setEditingCompany(null);
    setError(null);
    setFeedback(message);
    setFeedbackTone("ok");
    router.refresh();
  }

  function handleDeleted(result: { message: string; storageWarning: boolean }) {
    setDeletingCompany(null);
    setError(null);
    setFeedback(result.message);
    setFeedbackTone(result.storageWarning ? "warn" : "ok");
    router.refresh();
  }

  function handleResend(companyId: string, inviteId: string) {
    setError(null);
    setFeedback(null);
    setResendingId(inviteId);

    startTransition(async () => {
      const result = await resendInitialOwnerInviteAction({
        companyId,
        inviteId,
      });
      setResendingId(null);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setFeedback(result.message);
      setFeedbackTone("ok");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-testid="admin-companies-board">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova empresa
        </Button>
      </div>

      {feedback ? (
        <div
          className={
            feedbackTone === "ok"
              ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900"
              : "rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950"
          }
        >
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {listError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {listError}
        </div>
      ) : null}

      <Card className="rounded-2xl border-[var(--brand-navy)]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-[var(--brand-navy)]" />
            Empresas cadastradas
          </CardTitle>
          <CardDescription>
            Listagem global para Super Admin. Crie um tenant e convide o Owner
            inicial. Plano e status comerciais são editáveis apenas aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 && !listError ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--brand-navy)]/10">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Slug</th>
                    <th className="px-4 py-3 font-semibold">CNPJ</th>
                    <th className="px-4 py-3 font-semibold">Plano</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Criada em</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-navy)]/8">
                  {companies.map((company) => (
                    <tr key={company.id} className="bg-background">
                      <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {company.slug}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {company.cnpj ? formatCnpj(company.cnpj) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {companyPlanLabel(company.plan)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {companyStatusLabel(company.status)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(company.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        {company.pendingInitialOwnerInviteId ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                              <Mail className="mr-1 inline h-3 w-3" />
                              {company.pendingInitialOwnerEmail ?? "Pendente"}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-fit"
                              disabled={
                                pending &&
                                resendingId ===
                                  company.pendingInitialOwnerInviteId
                              }
                              onClick={() =>
                                handleResend(
                                  company.id,
                                  company.pendingInitialOwnerInviteId!
                                )
                              }
                            >
                              {pending &&
                              resendingId ===
                                company.pendingInitialOwnerInviteId ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Reenviar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setError(null);
                              setEditingCompany(company);
                            }}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setError(null);
                              setFeedback(null);
                              setDeletingCompany(company);
                            }}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Excluir empresa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            A página{" "}
            <Link href={ROUTES.companies} className="text-primary underline">
              /companies
            </Link>{" "}
            continua sendo o cadastro da empresa ativa do tenant (não é este
            painel). Plano e status não são editáveis pelo tenant.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nova empresa"
        description="Cria o tenant e envia o convite ao Owner inicial (perfil Administrator)."
        className="max-w-2xl"
      >
        <NewCompanyForm
          onCancel={() => setCreateOpen(false)}
          onSuccess={handleCreated}
        />
      </Dialog>

      <Dialog
        open={Boolean(editingCompany)}
        onOpenChange={(open) => {
          if (!open) setEditingCompany(null);
        }}
        title="Editar plano e status"
        description="Alteração comercial exclusiva do Super Admin. Não remove dados nem permissões órfãs automaticamente."
        className="max-w-xl"
      >
        {editingCompany ? (
          <EditCompanyCommercialForm
            company={editingCompany}
            onCancel={() => setEditingCompany(null)}
            onSuccess={handleCommercialUpdated}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deletingCompany)}
        onOpenChange={(open) => {
          if (!open) setDeletingCompany(null);
        }}
        title="Excluir empresa"
        description="Exclusão definitiva exclusiva do Super Admin. Confirme digitando o nome da empresa."
        className="max-w-xl"
      >
        {deletingCompany ? (
          <DeleteCompanyDialog
            company={deletingCompany}
            onCancel={() => setDeletingCompany(null)}
            onSuccess={handleDeleted}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
