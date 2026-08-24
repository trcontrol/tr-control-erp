"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUS_OPTIONS,
  ROUTES,
  productDetailPath,
  productEditPath,
} from "@/lib/constants";
import {
  listProductFilterOptions,
  listProducts,
} from "@/lib/products/actions";
import {
  calculateProfitMargin,
  formatCurrency,
  formatPercent,
  formatProductType,
  formatStockQuantity,
  isLowStock,
  toNumberAmount,
} from "@/lib/products/format";
import { useTenant } from "@/providers/tenant-provider";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

function statusLabel(status: string) {
  return (
    PRODUCT_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function ProductsList() {
  const { company } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [productType, setProductType] = useState("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!company?.id) {
      setProducts([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar produtos.");
      return;
    }

    setLoading(true);
    setError(null);

    const [productsResult, filtersResult] = await Promise.all([
      listProducts({
        companyId: company.id,
        search,
        status,
        productType,
        category,
        brand,
      }),
      listProductFilterOptions(company.id),
    ]);

    if (filtersResult.data) {
      setCategories(
        Array.from(
          new Set([...PRODUCT_CATEGORIES, ...filtersResult.data.categories])
        )
      );
      setBrands(filtersResult.data.brands);
      setProductTypes(filtersResult.data.productTypes);
    }

    if (productsResult.error) {
      setProducts([]);
      setError(productsResult.error.message);
      setLoading(false);
      return;
    }

    setProducts(productsResult.data);
    setLoading(false);
  }, [company?.id, search, status, productType, category, brand]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadProducts();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadProducts]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar produtos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, código, SKU ou barras"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href={ROUTES.productsNew}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          {productTypes.map((item) => (
            <option key={item} value={item}>
              {formatProductType(item)}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {PRODUCT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">Todas as marcas</option>
          {brands.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando produtos...
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum produto encontrado</CardTitle>
            <CardDescription>
              Cadastre o primeiro produto da empresa {company.name} ou ajuste
              os filtros de busca.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button asChild>
              <Link href={ROUTES.productsNew}>
                <Plus className="h-4 w-4" />
                Novo produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Código / SKU</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Margem</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const lowStock = isLowStock(product);
                  const margin = calculateProfitMargin(
                    product.cost_price,
                    product.sale_price
                  );

                  return (
                    <tr key={product.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.category || "Sem categoria"}
                          {product.brand ? ` · ${product.brand}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {formatProductType(product.product_type)}
                      </td>
                      <td className="px-4 py-3">
                        <div>{product.internal_code || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.sku || product.barcode || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(product.sale_price)}
                      </td>
                      <td className="px-4 py-3">{formatPercent(margin)}</td>
                      <td className="px-4 py-3">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            lowStock && "text-destructive"
                          )}
                        >
                          {lowStock ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : null}
                          {formatStockQuantity(
                            product.current_stock,
                            product.unit
                          )}
                        </div>
                        {lowStock ? (
                          <div className="text-xs text-destructive">
                            Abaixo do mínimo (
                            {toNumberAmount(product.min_stock)})
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {statusLabel(product.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={productDetailPath(product.id)}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon">
                            <Link href={productEditPath(product.id)}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {products.map((product) => {
              const lowStock = isLowStock(product);

              return (
                <Card
                  key={product.id}
                  className={cn(lowStock && "border-destructive/40")}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <CardDescription>
                      {formatProductType(product.product_type)} ·{" "}
                      {statusLabel(product.status)} ·{" "}
                      {formatCurrency(product.sale_price)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estoque</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium",
                          lowStock && "text-destructive"
                        )}
                      >
                        {lowStock ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : null}
                        {formatStockQuantity(
                          product.current_stock,
                          product.unit
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={productDetailPath(product.id)}>Ver</Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link href={productEditPath(product.id)}>Editar</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
