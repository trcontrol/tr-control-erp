import {
  formatCnpj,
  formatPhone,
  formatZipCode,
  isValidCnpj,
  isValidEmail,
  onlyDigits,
} from "@/lib/companies/format";

export {
  formatCnpj,
  formatPhone,
  formatZipCode,
  isValidCnpj,
  isValidEmail,
  onlyDigits,
};

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatDocument(value: string, personType: "individual" | "company") {
  return personType === "company" ? formatCnpj(value) : formatCpf(value);
}

export function isValidCpf(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (factor - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calc(digits.slice(0, 9), 10);
  const digit2 = calc(digits.slice(0, 10), 11);

  return digits.endsWith(`${digit1}${digit2}`);
}

export function isValidDocument(
  value: string,
  personType: "individual" | "company"
) {
  return personType === "company" ? isValidCnpj(value) : isValidCpf(value);
}
