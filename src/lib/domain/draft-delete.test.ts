/**
 * Testes — exclusão de rascunho (zero-row + mensagens).
 * Executar: npx --yes tsx src/lib/domain/draft-delete.test.ts
 *
 * Cenários A–L (CASCADE/triggers/RLS) exigem banco com migration 043 aplicada.
 */
import assert from "node:assert/strict";
import {
  DRAFT_DELETE_NOT_FOUND,
  resolveDraftDeleteResult,
} from "@/lib/domain/draft-delete";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (error) {
    console.error(`FAIL — ${name}`);
    throw error;
  }
}

run("K — zero rows sale retorna erro explícito", () => {
  const result = resolveDraftDeleteResult(null, "sale");
  assert.equal(result.data, null);
  assert.equal(result.error?.message, DRAFT_DELETE_NOT_FOUND.sale);
});

run("K — zero rows purchase retorna erro explícito", () => {
  const result = resolveDraftDeleteResult(undefined, "purchase");
  assert.equal(result.data, null);
  assert.equal(result.error?.message, DRAFT_DELETE_NOT_FOUND.purchase);
});

run("K — row deletada retorna sucesso", () => {
  const result = resolveDraftDeleteResult("uuid-123", "sale");
  assert.equal(result.data, true);
  assert.equal(result.error, null);
});

run("K — erro do banco é repassado", () => {
  const result = resolveDraftDeleteResult(null, "sale", "RLS violation");
  assert.equal(result.error?.message, "RLS violation");
});

run("mensagens distintas para venda e compra", () => {
  assert.notEqual(DRAFT_DELETE_NOT_FOUND.sale, DRAFT_DELETE_NOT_FOUND.purchase);
  assert.match(DRAFT_DELETE_NOT_FOUND.sale, /venda/i);
  assert.match(DRAFT_DELETE_NOT_FOUND.purchase, /compra/i);
});

console.log("\nTodos os testes de draft-delete passaram.");
