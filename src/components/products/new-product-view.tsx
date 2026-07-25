"use client";

import { ProductForm } from "@/components/products/product-form";
import { ProductPageShell } from "@/components/products/product-page-shell";

export function NewProductView() {
  return (
    <ProductPageShell
      title="Novo produto"
      description="Cadastre um produto vinculado à empresa ativa"
    >
      <ProductForm mode="create" />
    </ProductPageShell>
  );
}
