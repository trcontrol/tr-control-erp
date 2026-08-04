"use client";

import { useRef, useState } from "react";
import {
  buildCnpjFormValues,
  formatCnpjConsultedAt,
  formatCnpjOpeningDate,
  getCnpjConflictKeys,
  mergeCnpjFormFields,
} from "@/lib/cnpj/apply";
import { CNPJ_MESSAGES } from "@/lib/cnpj/messages";
import type {
  CnpjCompanyData,
  CnpjFillableFormFields,
  CnpjLookupResult,
} from "@/lib/cnpj/types";
import { isValidCnpj, onlyDigits } from "@/lib/customers/format";

export type CnpjLookupMeta = {
  source: string;
  consultedAt: string;
  consultedAtLabel: string;
  registrationStatus: string | null;
  openingDateLabel: string | null;
  mainCnae: string | null;
  /** true quando a consulta concluiu sem IE — aviso discreto, sem erro. */
  missingStateRegistration: boolean;
};

type UseCnpjLookupOptions<T extends CnpjFillableFormFields> = {
  getForm: () => T;
  setForm: (updater: (current: T) => T) => void;
  onMessage: (message: string, tone: "success" | "error") => void;
};

export function useCnpjLookup<T extends CnpjFillableFormFields>({
  getForm,
  setForm,
  onMessage,
}: UseCnpjLookupOptions<T>) {
  const [lookingUp, setLookingUp] = useState(false);
  const [meta, setMeta] = useState<CnpjLookupMeta | null>(null);
  const lastLookedUpRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  function clearMeta() {
    setMeta(null);
    lastLookedUpRef.current = null;
  }

  function notifyDocumentChange(rawDocument: string) {
    const digits = onlyDigits(rawDocument);
    if (digits !== lastLookedUpRef.current) {
      setMeta(null);
    }
  }

  async function lookup(rawDocument: string, options?: { force?: boolean }) {
    const digits = onlyDigits(rawDocument);

    if (digits.length !== 14) {
      return;
    }

    if (!isValidCnpj(digits)) {
      onMessage(CNPJ_MESSAGES.invalid, "error");
      setMeta(null);
      return;
    }

    if (!options?.force && lastLookedUpRef.current === digits) {
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLookingUp(true);

    try {
      const response = await fetch(`/api/cnpj/${digits}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      let result: CnpjLookupResult;
      try {
        result = (await response.json()) as CnpjLookupResult;
      } catch {
        onMessage(CNPJ_MESSAGES.unavailable, "error");
        return;
      }

      if (!result.ok) {
        onMessage(result.message || CNPJ_MESSAGES.unavailable, "error");
        if (result.code === "not_found" || result.code === "invalid") {
          setMeta(null);
        }
        return;
      }

      applyLookupResult(result.data, result.source, result.consultedAt, result.partial);
      lastLookedUpRef.current = digits;
    } catch {
      onMessage(CNPJ_MESSAGES.unavailable, "error");
    } finally {
      inFlightRef.current = false;
      setLookingUp(false);
    }
  }

  function applyLookupResult(
    data: CnpjCompanyData,
    source: string,
    consultedAt: string,
    partial: boolean
  ) {
    const incoming = buildCnpjFormValues(data);
    const current = getForm();
    const conflicts = getCnpjConflictKeys(current, incoming);

    let overwrite = false;
    if (conflicts.length > 0) {
      overwrite = window.confirm(
        "Alguns campos já possuem dados. Deseja substituí-los pelos dados do CNPJ?"
      );
    }

    setForm((form) => mergeCnpjFormFields(form, incoming, overwrite));

    setMeta({
      source,
      consultedAt,
      consultedAtLabel: formatCnpjConsultedAt(consultedAt),
      registrationStatus: data.registrationStatus,
      openingDateLabel: formatCnpjOpeningDate(data.openingDate),
      mainCnae: data.mainCnae,
      missingStateRegistration: !data.stateRegistration?.trim(),
    });

    if (partial) {
      onMessage(
        `${CNPJ_MESSAGES.filled} ${CNPJ_MESSAGES.partial}`,
        "success"
      );
    } else {
      onMessage(CNPJ_MESSAGES.filled, "success");
    }
  }

  return {
    lookingUp,
    meta,
    clearMeta,
    notifyDocumentChange,
    lookup,
  };
}
