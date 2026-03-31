import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
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
        throw new Error("Falta autenticación.");
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
        throw new Error("Falta autenticación.");
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
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el producto.");
    }
  };

  return (
    <div className="dashboard-grid">
      <SurfaceCard
        title={selectedProduct ? "Editar producto" : "Nuevo producto"}
        description="Carga imágenes por archivo y URLs. El backend mantiene el contrato de `multipart/form-data`."
      >
        <form className="stack-md" data-testid="product-form" onSubmit={onSubmit}>
          <TextField label="Nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <TextField
            label="Descripción"
            multiline
            rows={4}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            required
          />
          <div className="dashboard-form-grid">
            <TextField label="Precio" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required />
            <TextField label="Stock" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} required />
          </div>
          <SelectField
            label="Categoría"
            value={form.categoryId}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            options={[
              { value: "", label: "Selecciona una categoría" },
              ...(categoriesQuery.data?.categories ?? []).map((category) => ({ value: category.id, label: category.name }))
            ]}
          />
          {mode === "admin" ? (
            <SelectField
              label="Vendedor"
              value={form.sellerId}
              onChange={(event) => setForm((current) => ({ ...current, sellerId: event.target.value }))}
              options={[{ value: "", label: "Asignar al admin actual" }, ...sellerOptions]}
            />
          ) : null}
          <TextField
            label="URLs de imagen"
            multiline
            rows={3}
            data-testid="product-image-urls"
            value={form.imageUrls}
            onChange={(event) => setForm((current) => ({ ...current, imageUrls: event.target.value }))}
            hint="Una URL por línea. Si editas sin nuevas imágenes, se conservan las actuales."
          />
          <label className="field">
            <span className="field-label">Subir imágenes</span>
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
              {selectedProduct ? "Guardar cambios" : "Crear producto"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedProduct(null);
                setFiles([]);
                setForm(emptyForm);
              }}
            >
              Limpiar
            </Button>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard
        title={mode === "admin" ? "Catálogo global" : "Mis productos"}
        description="Edición modular sin tocar la lógica del backend."
      >
        <SectionHeading title={`${products.length} productos`} description="Soporte para CRUD y stock sincronizado." />
        {products.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Acciones</th>
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
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => deleteMutation.mutate(product.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No hay productos" description="Crea el primer producto para este panel." />
        )}
      </SurfaceCard>
    </div>
  );
}
