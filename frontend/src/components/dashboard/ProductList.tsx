import { useEffect, useMemo, useState } from "react";
import { toAssetUrl } from "../../lib/api";
import type { Product } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { DataTable, type DataTableColumn } from "./DataTable";

type DraftMap = Record<string, { price: string; stock: string }>;

/**
 * Seller product table with inline editable price and stock fields.
 */
export type ProductListProps = {
  products: Product[];
  savePendingId?: string | null;
  deletePendingId?: string | null;
  onEdit: (product: Product) => void;
  onSaveInline: (product: Product, draft: { price: string; stock: string }) => void;
  onDelete: (product: Product) => void;
};

export function ProductList({
  products,
  savePendingId = null,
  deletePendingId = null,
  onEdit,
  onSaveInline,
  onDelete
}: ProductListProps) {
  const [drafts, setDrafts] = useState<DraftMap>({});

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        products.map((product) => [
          product.id,
          { price: String(product.price), stock: String(product.stock) }
        ])
      )
    );
  }, [products]);

  const columns = useMemo<Array<DataTableColumn<Product>>>(
    () => [
      {
        id: "product",
        header: "Product",
        accessor: (product) => product.name,
        searchValue: (product) => `${product.name} ${product.description} ${product.sellerName}`,
        sortable: true,
        cell: (product) => {
          const image = product.images[0] ? toAssetUrl(product.images[0]) : null;

          return (
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-mist">
                {image ? (
                  <img alt={product.name} className="h-full w-full object-cover" src={image} />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate">No image</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{product.name}</p>
                <p className="mt-1 text-sm text-slate">{product.description}</p>
              </div>
            </div>
          );
        }
      },
      {
        id: "category",
        header: "Category",
        accessor: (product) => product.categoryName,
        sortable: true,
        cell: (product) => <Badge variant="info">{product.categoryName}</Badge>
      },
      {
        id: "price",
        header: "Price",
        accessor: (product) => product.price,
        sortable: true,
        cell: (product) => (
          <Input
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [product.id]: {
                  price: event.target.value,
                  stock: current[product.id]?.stock ?? String(product.stock)
                }
              }))
            }
            step="0.01"
            type="number"
            value={drafts[product.id]?.price ?? String(product.price)}
          />
        )
      },
      {
        id: "stock",
        header: "Stock",
        accessor: (product) => product.stock,
        sortable: true,
        cell: (product) => (
          <Input
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [product.id]: {
                  price: current[product.id]?.price ?? String(product.price),
                  stock: event.target.value
                }
              }))
            }
            type="number"
            value={drafts[product.id]?.stock ?? String(product.stock)}
          />
        )
      },
      {
        id: "actions",
        header: "Actions",
        cell: (product) => (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onEdit(product)} variant="secondary">
              Edit
            </Button>
            <Button
              aria-label={`Save inline updates for ${product.name}`}
              loading={savePendingId === product.id}
              onClick={() =>
                onSaveInline(product, drafts[product.id] ?? { price: String(product.price), stock: String(product.stock) })
              }
              variant="success"
            >
              Save
            </Button>
            <Button
              aria-label={`Delete ${product.name}`}
              loading={deletePendingId === product.id}
              onClick={() => onDelete(product)}
              variant="error"
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    [deletePendingId, drafts, onDelete, onEdit, onSaveInline, savePendingId]
  );

  return (
    <DataTable
      caption="Seller products"
      columns={columns}
      description="Inline updates reuse the current product update endpoint."
      emptyMessage="No seller products available."
      rowKey={(product) => product.id}
      rows={products}
      searchLabel="Search seller products"
      searchPlaceholder="Search products by name or seller"
      title="My Products"
    />
  );
}
