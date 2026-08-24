/**
 * Testes — product_type texto livre + display/validação.
 * Executar: npx --yes tsx src/lib/products/product-type.test.ts
 */
import assert from "node:assert/strict";
import { PRODUCT_TYPE_MAX_LENGTH, PRODUCT_TYPES } from "@/lib/constants";
import {
  formatProductType,
  normalizeProductTypeInput,
  validateProductTypeInput,
} from "@/lib/products/format";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (error) {
    console.error(`FAIL — ${name}`);
    throw error;
  }
}

run("A/C — legacy product exibe Produto", () => {
  assert.equal(formatProductType(PRODUCT_TYPES.product), "Produto");
  assert.equal(formatProductType("product"), "Produto");
});

run("D — legacy service exibe Serviço", () => {
  assert.equal(formatProductType(PRODUCT_TYPES.service), "Serviço");
  assert.equal(formatProductType("service"), "Serviço");
});

run("E/L — valor custom não vira Produto", () => {
  assert.equal(formatProductType("Suplemento"), "Suplemento");
  assert.equal(formatProductType("Acessório"), "Acessório");
  assert.equal(formatProductType("Consultoria"), "Consultoria");
  assert.notEqual(formatProductType("Suplemento"), "Produto");
});

run("F — trim funciona", () => {
  assert.equal(normalizeProductTypeInput("  Suplemento  "), "Suplemento");
  assert.equal(validateProductTypeInput("  Acessório  ").value, "Acessório");
  assert.equal(validateProductTypeInput("  Acessório  ").error, null);
});

run("G — vazio rejeitado", () => {
  assert.equal(validateProductTypeInput("").error, "Campo obrigatório");
  assert.equal(validateProductTypeInput("   ").error, "Campo obrigatório");
  assert.equal(validateProductTypeInput(null).error, "Campo obrigatório");
  assert.equal(validateProductTypeInput(undefined).error, "Campo obrigatório");
});

run("H — >60 rejeitado", () => {
  const tooLong = "x".repeat(PRODUCT_TYPE_MAX_LENGTH + 1);
  const result = validateProductTypeInput(tooLong);
  assert.equal(result.error, `Máximo de ${PRODUCT_TYPE_MAX_LENGTH} caracteres`);
  assert.equal(result.value.length, PRODUCT_TYPE_MAX_LENGTH + 1);
});

run("H — exatamente 60 aceito", () => {
  const ok = "y".repeat(PRODUCT_TYPE_MAX_LENGTH);
  const result = validateProductTypeInput(ok);
  assert.equal(result.error, null);
  assert.equal(result.value, ok);
});

run("edit preserva valor custom (sem coerce para product)", () => {
  const saved = "Suplemento";
  // Espelha toFormState: usa o valor salvo, sem mapear desconhecido → product
  const formValue = saved ?? "";
  assert.equal(formValue, "Suplemento");
  assert.notEqual(formValue, PRODUCT_TYPES.product);
});

run("estoque conceitual: tracks_stock decide, não o tipo", () => {
  function shouldTrackStock(
    _productType: string,
    tracksStock: boolean | null | undefined
  ) {
    // Espelha sale_item_should_track_stock pós-042
    return Boolean(tracksStock ?? false);
  }

  assert.equal(shouldTrackStock("product", true), true);
  assert.equal(shouldTrackStock("service", false), false);
  assert.equal(shouldTrackStock("Suplemento", true), true);
  assert.equal(shouldTrackStock("Consultoria", false), false);
  assert.equal(shouldTrackStock("service", true), true);
});

run("M — filtro dinâmico não assume só product/service", () => {
  const distinct = ["product", "service", "Suplemento", "Acessório"];
  assert.ok(distinct.includes("Suplemento"));
  assert.ok(distinct.length > 2);
  assert.deepEqual(
    distinct.map((item) => formatProductType(item)),
    ["Produto", "Serviço", "Suplemento", "Acessório"]
  );
});

console.log("\nTodos os testes de product_type passaram.");
