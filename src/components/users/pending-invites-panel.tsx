"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  cancelCompanyInviteAction,
  listPendingInvitesAction,
  resendCompanyInviteAction,
  type PendingCompanyInvite,
} from "@/lib/users/invite-actions";
import { formatUserDate, userRoleLabel } from "@/lib/users/format";
import { accessProfileLabel } from "@/lib/users/permissions";

type PendingInvitesPanelProps = {
  companyId: string;
  refreshKey?: number;
  onInvitesChanged?: () => void;
};

export function PendingInvitesPanel({
  companyId,
  refreshKey = 0,
  onInvitesChanged,
}: PendingInvitesPanelProps) {
  const [invites, setInvites] = useState<PendingCompanyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!companyId) {
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listPendingInvitesAction(companyId);

    if (result.error) {
      setInvites([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setInvites(result.data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites, refreshKey]);

  async function handleResend(inviteId: string) {
    setFeedback(null);
    setError(null);
    setBusyId(inviteId);

    const result = await resendCompanyInviteAction({
      companyId,
      inviteId,
    });

    setBusyId(null);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setFeedback(result.data.message);
    void loadInvites();
    onInvitesChanged?.();
  }

  async function handleCancel(inviteId: string) {
    setFeedback(null);
    setError(null);
    setBusyId(inviteId);

    const result = await cancelCompanyInviteAction({
      companyId,
      inviteId,
    });

    setBusyId(null);
    setConfirmCancelId(null);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setFeedback(result.data.message);
    void loadInvites();
    onInvitesChanged?.();
  }

  if (loading && invites.length === 0) {
    return (
      <Card className="rounded-2xl border-[var(--brand-navy)]/10 shadow-sm">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-coral)]" />
          <div>
            <CardTitle className="text-base">Convites pendentes</CardTitle>
            <CardDescription>Carregando...</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!loading && invites.length === 0 && !error) {
    return null;
  }

  return (
    <Card
      className="rounded-2xl border-[var(--brand-navy)]/10 shadow-sm"
      data-testid="pending-invites-panel"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-[var(--brand-navy)]" />
          Convites pendentes
        </CardTitle>
        <CardDescription>
          Reenvie ou cancele sem duplicar vagas. Convites pendentes válidos
          reservam uma vaga do plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {feedback ? (
          <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
            {feedback}
          </div>
        ) : null}

        <ul className="divide-y divide-[var(--brand-navy)]/8 rounded-xl border border-[var(--brand-navy)]/10">
          {invites.map((invite) => {
            const expired = new Date(invite.expiresAt).getTime() < Date.now();
            const busy = busyId === invite.id;
            const confirming = confirmCancelId === invite.id;

            return (
              <li
                key={invite.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-[var(--brand-navy)]">
                    {invite.fullName || invite.email}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {invite.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userRoleLabel(invite.role)} ·{" "}
                    {accessProfileLabel(invite.accessProfile)} · expira em{" "}
                    {formatUserDate(invite.expiresAt)}
                    {expired ? " (expirado)" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleResend(invite.id)}
                  >
                    {busy && !confirming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Reenviar
                  </Button>
                  {!confirming ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirmCancelId(invite.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar convite
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleCancel(invite.id)}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Confirmar cancelamento
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirmCancelId(null)}
                      >
                        Voltar
                      </Button>
                    </>
                  )}
                </div>
                {confirming ? (
                  <p className="w-full text-xs text-muted-foreground sm:basis-full">
                    Cancelar este convite? O usuário não poderá mais utilizar o
                    link enviado anteriormente e a vaga será liberada no plano.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
