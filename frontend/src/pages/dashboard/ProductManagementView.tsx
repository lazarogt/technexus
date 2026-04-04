import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { TextField } from "@/components/shared/TextField";
import { listUsers } from "@/features/api/admin-api";
import { createProduct, deleteProduct, listCategories, listProducts, listSellerProducts, updateProduct } from "@/features/api/catalog-api";
import type { Product, ProductPayload } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { formatCurrency } from "@/lib/format";

type ProductManagementViewProps = {
  mode: "seller" | "admin";
};

type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  sellerId: string;
  imageUrls: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
  sellerId: "",
  imageUrls: ""
};

export function ProductManagementView({ mode }: ProductManagementViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const categoriesQuery = useQuery({
    queryKey: ["dashboard", "categories"],
    queryFn: listCategories
  });

  const sellersQuery = useQuery({
    queryKey: ["dashboard", "sellers"],
    enabled: Boolean(token) && mode === "admin",
    queryFn: () => listUsers(token!, { role: "seller", limit: 100 })
  });

  const productsQuery = useQuery({
    queryKey: ["dashboard", "products", mode],
    enabled: Boolean(token),
    queryFn: () => (mode === "admin" ? listProducts({ limit: 50, includeDeleted: true }) : listSellerProducts(token!))
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error(t("dashboard.productManagement.authRequired"));
      }

      const payload: ProductPayload = {
        name: form.name,
        description: form.description,
        price: form.price,
        stock: form.stock,
        categoryId: form.categoryId,
        sellerId: mode === "admin" ? form.sellerId || undefined : undefined,
        imageUrls: form.imageUrls
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        files
      };

      if (selectedProduct) {
        return updateProduct(token, selectedProduct.id, payload);
      }

      return createProduct(token, payload);
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setSelectedProduct(null);
      setFiles([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] })
      ]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!token) {
        throw new Error(t("dashboard.productManagement.authRequired"));
      }

      return deleteProduct(token, productId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] })
      ]);
    }
  });

  const sellerOptions = useMemo(
    () =>
      (sellersQuery.data?.users ?? []).map((seller) => ({
        value: seller.id,
        label: `${seller.name} (${seller.email})`
      })),
    [sellersQuery.data?.users]
  );

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data]
  );

  const onEdit = (product: Product) => {
    setSelectedProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId,
      sellerId: product.sellerId,
      imageUrls: product.images.join("\n")
    });
    setFiles([]);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await saveMutation.mutateAsync();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("dashboard.productManagement.saveError"));
    }
  };

  return (
    <div className="dashboard-grid">
      <SurfaceCard
        title={selectedProduct ? t("dashboard.productManagement.editTitle") : t("dashboard.productManagement.newTitle")}
        description={t("dashboard.productManagement.formDescription")}
      >
        <form className="stack-md" data-testid="product-form" onSubmit={onSubmit}>
          <TextField label={t("labels.name")} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <TextField
            label={t("labels.description")}
            multiline
            rows={4}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            required
          />
          <div className="dashboard-form-grid">
            <TextField label={t("labels.price")} type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required />
            <TextField label={t("labels.stock")} type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} required />
          </div>
          <SelectField
            label={t("labels.category")}
            value={form.categoryId}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            options={[
              { value: "", label: t("dashboard.productManagement.selectCategory") },
              ...(categoriesQuery.data?.categories ?? []).map((category) => ({ value: category.id, label: category.name }))
            ]}
          />
          {mode === "admin" ? (
            <SelectField
              label={t("labels.seller")}
              value={form.sellerId}
              onChange={(event) => setForm((current) => ({ ...current, sellerId: event.target.value }))}
              options={[{ value: "", label: t("dashboard.productManagement.assignCurrentAdmin") }, ...sellerOptions]}
            />
          ) : null}
          <TextField
            label={t("labels.productUrls")}
            multiline
            rows={3}
            data-testid="product-image-urls"
            value={form.imageUrls}
            onChange={(event) => setForm((current) => ({ ...current, imageUrls: event.target.value }))}
            hint={t("dashboard.productManagement.imageHint")}
          />
          <label className="field">
            <span className="field-label">{t("labels.uploadImages")}</span>
            <input
              className="field-input"
              data-testid="product-image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </label>
          {error ? <p className="field-error">{error}</p> : null}
          <div className="button-row">
            <Button data-testid="product-save-button" type="submit" disabled={saveMutation.isPending}>
              {selectedProduct ? t("buttons.saveChanges") : t("buttons.createProduct")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedProduct(null);
                setFiles([]);
                setForm(emptyForm);
              }}
            >
              {t("buttons.clear")}
            </Button>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard
        title={mode === "admin" ? t("dashboard.productManagement.globalCatalogTitle") : t("dashboard.productManagement.myProductsTitle")}
        description={t("dashboard.productManagement.catalogDescription")}
      >
        <SectionHeading title={t("dashboard.productManagement.productCountTitle", { count: products.length })} description={t("dashboard.productManagement.productCountDescription")} />
        {products.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("labels.product")}</th>
                  <th>{t("labels.category")}</th>
                  <th>{t("labels.price")}</th>
                  <th>{t("labels.stock")}</th>
                  <th>{t("labels.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <p>{product.sellerName}</p>
                    </td>
                    <td>{product.categoryName}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <div className="button-row">
                        <Button variant="secondary" onClick={() => onEdit(product)}>
                          {t("buttons.edit")}
                        </Button>
                        <Button variant="danger" onClick={() => deleteMutation.mutate(product.id)}>
                          {t("buttons.delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t("dashboard.productManagement.emptyTitle")} description={t("dashboard.productManagement.emptyDescription")} />
        )}
      </SurfaceCard>
    </div>
  );
}
