/**
 * QA helpers — validação de clientes (documento opcional).
 * Uso: npx --yes tsx scripts/qa-customer-validation.ts
 */
import { PERSON_TYPES } from "../src/lib/constants";
import {
  normalizeCustomerPayload,
  validateCustomerPayload,
} from "../src/lib/customers/validate";

function pass(name: string) {
  console.log(`PASS  ${name}`);
}

function fail(name: string, detail: string): never {
  console.error(`FAIL  ${name}: ${detail}`);
  process.exit(1);
}

const base = {
  company_id: "c1",
  person_type: PERSON_TYPES.individual,
  full_name: "Maicon Teste",
  status: "active",
};

// A — PF sem CPF
{
  const v = validateCustomerPayload({ ...base, document: "" });
  if (!v.ok) fail("A", v.message);
  const n = normalizeCustomerPayload({ ...base, document: "" });
  if (n.document !== null) fail("A", "document should be null");
  pass("A  PF sem CPF → ok");
}

// B — PJ sem CNPJ
{
  const v = validateCustomerPayload({
    ...base,
    person_type: PERSON_TYPES.company,
    full_name: "Empresa X",
    document: "",
  });
  if (!v.ok) fail("B", v.message);
  pass("B  PJ sem CNPJ → ok");
}

// C — PF CPF válido
{
  const v = validateCustomerPayload({
    ...base,
    document: "529.982.247-25",
  });
  if (!v.ok) fail("C", v.message);
  pass("C  PF CPF válido → ok");
}

// D — PF CPF inválido
{
  const v = validateCustomerPayload({
    ...base,
    document: "111.111.111-11",
  });
  if (v.ok) fail("D", "deveria bloquear");
  pass("D  PF CPF inválido → bloqueia");
}

// E — PJ CNPJ válido (public known valid format test)
{
  const v = validateCustomerPayload({
    ...base,
    person_type: PERSON_TYPES.company,
    full_name: "Empresa Y",
    document: "04.252.011/0001-10",
  });
  if (!v.ok) fail("E", v.message);
  pass("E  PJ CNPJ válido → ok");
}

// F — PJ CNPJ inválido
{
  const v = validateCustomerPayload({
    ...base,
    person_type: PERSON_TYPES.company,
    full_name: "Empresa Z",
    document: "11.111.111/1111-11",
  });
  if (v.ok) fail("F", "deveria bloquear");
  pass("F  PJ CNPJ inválido → bloqueia");
}

// Normalize clears PF/PJ exclusive fields
{
  const asCompany = normalizeCustomerPayload({
    ...base,
    person_type: PERSON_TYPES.company,
    full_name: "Empresa",
    trade_name: "Fantasia",
    birth_date: "1990-01-01",
    document: "",
  });
  if (asCompany.birth_date !== null) fail("H", "birth_date should clear for PJ");
  pass("H  normalize PJ limpa birth_date");

  const asPerson = normalizeCustomerPayload({
    ...base,
    person_type: PERSON_TYPES.individual,
    trade_name: "Fantasia",
    birth_date: "1990-01-01",
    document: "",
  });
  if (asPerson.trade_name !== null) fail("I", "trade_name should clear for PF");
  pass("I  normalize PF limpa trade_name");
}

console.log("\nQA customer validation: OK");
