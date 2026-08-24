export const DRAFT_DELETE_NOT_FOUND = {
  sale: "A venda não está mais em rascunho ou não foi encontrada.",
  purchase: "A compra não está mais em rascunho ou não foi encontrada.",
} as const;

export type DraftDeleteEntity = keyof typeof DRAFT_DELETE_NOT_FOUND;

export type DraftDeleteResult =
  | { data: true; error: null }
  | { data: null; error: { message: string } };

export function resolveDraftDeleteResult(
  deletedId: string | null | undefined,
  entity: DraftDeleteEntity,
  errorMessage?: string | null
): DraftDeleteResult {
  if (errorMessage) {
    return { data: null, error: { message: errorMessage } };
  }

  if (!deletedId) {
    return {
      data: null,
      error: { message: DRAFT_DELETE_NOT_FOUND[entity] },
    };
  }

  return { data: true, error: null };
}
