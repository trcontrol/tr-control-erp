"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Package, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatStockQuantity } from "@/lib/stock/format";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

type ProductSearchComboboxProps = {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  id?: string;
};

function matchesProduct(product: Product, term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;

  return [
    product.name,
    product.internal_code,
    product.sku,
    product.barcode,
    product.brand,
  ]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(normalized));
}

export function ProductSearchCombobox({
  products,
  value,
  onChange,
  disabled,
  loading,
  placeholder = "Pesquisar produto...",
  id,
}: ProductSearchComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === value) ?? null,
    [products, value]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => matchesProduct(product, query));
  }, [products, query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function selectProduct(product: Product) {
    onChange(product.id);
    setOpen(false);
    setQuery("");
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div ref={rootRef} className="relative">
      {selectedProduct && !open ? (
        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 shadow-sm">
          <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            id={id}
            disabled={disabled || loading}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left text-sm disabled:opacity-50"
            onClick={() => {
              setOpen(true);
              setQuery("");
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <span className="truncate font-medium">{selectedProduct.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              Saldo{" "}
              {formatStockQuantity(
                selectedProduct.current_stock,
                selectedProduct.unit
              )}
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            disabled={disabled || loading}
            onClick={clearSelection}
            aria-label="Limpar produto selecionado"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id={id}
            value={query}
            disabled={disabled || loading}
            placeholder={loading ? "Carregando produtos..." : placeholder}
            className="pr-9 pl-9"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
          />
          <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      {open && !disabled && !loading ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-md"
        >
          {filteredProducts.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              Nenhum produto encontrado para “{query || "sua busca"}”.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const selected = product.id === value;
              return (
                <button
                  key={product.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    selected && "bg-accent/70"
                  )}
                  onClick={() => selectProduct(product)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {selected ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : null}
                      <span className="truncate">{product.name}</span>
                    </div>
                    {(product.internal_code || product.sku) && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {product.internal_code || product.sku}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>Saldo atual</div>
                    <div className="font-medium text-foreground">
                      {formatStockQuantity(
                        product.current_stock,
                        product.unit
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
