import { startTransition, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OrderList } from "../components/dashboard/OrderList";
import { ProductList } from "../components/dashboard/ProductList";
import { SellerCard } from "../components/dashboard/SellerCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PanelSkeleton } from "../components/ui/PanelSkeleton";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { useCategories } from "../hooks/useCategories";
import { useOrders } from "../hooks/useOrders";
import { useSellerProducts, useCreateSellerProduct, useDeleteSellerProduct, useUpdateSellerOrderStatus, useUpdateSellerProduct } from "../hooks/useSellerDashboard";
import { useSellers } from "../hooks/useSellers";
import { useSession } from "../lib/auth-context";
import { currencyFormatter, toAssetUrl } from "../lib/api";
import type { OrderStatus, Product } from "../lib/types";

type SellerTab = "products" | "orders" | "stats";

type ProductDraft = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  images: FileList | null;
};

const defaultDraft: ProductDraft = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
  images: null
};

/**
 * Seller workspace page assembled from reusable dashboard and UI components.
 */
export default function SellerDashboardPage() {
  const { token, user } = useSession();
  const [activeTab, setActiveTab] = useState<SellerTab>("products");
  const [orderFilters, setOrderFilters] = useState({
    status: "" as OrderStatus | "",
    dateFrom: "",
    dateTo: ""
  });
  const [draft, setDraft] = useState<ProductDraft>(defaultDraft);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState("");

  const categoriesQuery = useCategories();
  const productsQuery = useSellerProducts(token);
  const { sellers } = useSellers(token);
  const ordersQuery = useOrders(token, orderFilters);
  const createProduct = useCreateSellerProduct(token);
  const updateProduct = useUpdateSellerProduct(token);
  const deleteProduct = useDeleteSellerProduct(token);
  const updateOrderStatus = useUpdateSellerOrderStatus(token);

  const products = productsQuery.data?.products ?? [];
  const orders = ordersQuery.orders;
  const seller = sellers[0] ?? null;
  const imagePreviews = useMemo(() => {
    if (draft.images && draft.images.length > 0) {
      return Array.from(draft.images).map((file) => URL.createObjectURL(file));
    }

    if (editingProduct) {
      return editingProduct.images.map((imagePath) => toAssetUrl(imagePath));
    }

    return [];
  }, [draft.images, editingProduct]);

  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; revenue: number; quantity: number }>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const current = totals.get(item.productId) ?? {
          name: item.productName,
          revenue: 0,
          quantity: 0
        };
        current.revenue += item.subtotal;
        current.quantity += item.quantity;
        totals.set(item.productId, current);
      });
    });

    return Array.from(totals.values()).sort((left, right) => right.revenue - left.revenue).slice(0, 5);
  }, [orders]);

  const resetDraft = () => {
    setEditingProduct(null);
    setDraft(defaultDraft);
  };

  const loadDemoDraft = () => {
    const preferredCategoryId =
      categoriesQuery.data?.[0]?.id ?? editingProduct?.categoryId ?? "";

    setEditingProduct(null);
    setDraft({
      name: "Aether Dock Station",
      description:
        "Demo seller product prepared for real CRUD testing with multi-port desktop connectivity.",
      price: "249",
      stock: "18",
      categoryId: preferredCategoryId,
      images: null
    });
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setDraft({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId,
      images: null
    });
  };

  const buildPayload = (currentDraft: ProductDraft, baseProduct?: Product | null) => {
    const payload = new FormData();

    payload.set("name", currentDraft.name || baseProduct?.name || "");
    payload.set("description", currentDraft.description || baseProduct?.description || "");
    payload.set("price", currentDraft.price || String(baseProduct?.price ?? ""));
    payload.set("stock", currentDraft.stock || String(baseProduct?.stock ?? ""));
    payload.set("categoryId", currentDraft.categoryId || baseProduct?.categoryId || "");

    Array.from(currentDraft.images ?? []).forEach((file) => payload.append("images", file));

    return payload;
  };

  const handleSaveProduct = async () => {
    setFeedback("");

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          productId: editingProduct.id,
          payload: buildPayload(draft, editingProduct)
        });
        setFeedback(`Updated ${editingProduct.name}.`);
      } else {
        await createProduct.mutateAsync(buildPayload(draft));
        setFeedback("Product created.");
      }

      resetDraft();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save product.");
    }
  };

  const handleInlineSave = async (product: Product, inlineDraft: { price: string; stock: string }) => {
    setFeedback("");

    try {
      const payload = new FormData();
      payload.set("name", product.name);
      payload.set("description", product.description);
      payload.set("categoryId", product.categoryId);
      payload.set("price", inlineDraft.price);
      payload.set("stock", inlineDraft.stock);
      await updateProduct.mutateAsync({ productId: product.id, payload });
      setFeedback(`Updated ${product.name}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save inline changes.");
    }
  };

  const handleDeleteProduct = async () => {
    if (!productPendingDelete) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(productPendingDelete.id);
      setFeedback(`Deleted ${productPendingDelete.name}.`);
      setProductPendingDelete(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete product.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setFeedback("");

    try {
      await updateOrderStatus.mutateAsync({ orderId, status });
      setFeedback(`Order ${orderId.slice(0, 8)} updated to ${status}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update order status.");
    }
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate">
        <Link className="font-semibold text-ink" to="/">
          Home
        </Link>
        <span>/</span>
        <span>Seller Dashboard</span>
      </nav>

      <section className="panel-surface overflow-hidden bg-ink px-6 py-8 text-white sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
          <div>
            <span className="inline-flex rounded-pill border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
              Seller Workspace
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-none sm:text-5xl">
              Manage products, orders and revenue with reusable dashboard components.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              This page keeps existing seller hooks and endpoints intact while shifting the UI to a
              shared design system.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/54">
              Active seller: {user?.name ?? "Seller"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Products</p>
              <p className="mt-2 text-2xl font-bold text-white">{products.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Orders</p>
              <p className="mt-2 text-2xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Revenue</p>
              <p className="mt-2 text-lg font-bold text-white">
                {currencyFormatter.format(seller?.revenue ?? 0)}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Active listings</p>
              <p className="mt-2 text-lg font-bold text-white">{seller?.activeListings ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <div aria-label="Seller dashboard sections" className="flex flex-wrap gap-3" role="tablist">
        {([
          ["products", "My Products"],
          ["orders", "Orders"],
          ["stats", "Stats"]
        ] as Array<[SellerTab, string]>).map(([tab, label]) => (
          <Button
            aria-controls={`seller-tabpanel-${tab}`}
            aria-selected={activeTab === tab}
            id={`seller-tab-${tab}`}
            key={tab}
            onClick={() => {
              startTransition(() => {
                setActiveTab(tab);
              });
            }}
            role="tab"
            variant={activeTab === tab ? "primary" : "secondary"}
          >
            {label}
          </Button>
        ))}
      </div>

      {feedback ? (
        <Card role="status" title="Update">
          {feedback}
        </Card>
      ) : null}

      {(productsQuery.isLoading || categoriesQuery.isLoading || ordersQuery.isLoading) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={6} />
        </div>
      )}

      {activeTab === "products" && !productsQuery.isLoading && !categoriesQuery.isLoading ? (
        <div
          aria-labelledby="seller-tab-products"
          className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]"
          id="seller-tabpanel-products"
          role="tabpanel"
        >
          <ProductList
            deletePendingId={deleteProduct.isPending ? productPendingDelete?.id ?? null : null}
            onDelete={setProductPendingDelete}
            onEdit={startEdit}
            onSaveInline={(product, inlineDraft) => void handleInlineSave(product, inlineDraft)}
            products={products}
            savePendingId={updateProduct.isPending ? updateProduct.variables?.productId ?? null : null}
          />

          <Card
            actions={
              <>
                <Button onClick={loadDemoDraft} variant="secondary">
                  Load demo draft
                </Button>
                <Button onClick={resetDraft} variant="secondary">
                  Clear
                </Button>
              </>
            }
            description="Create new products, load a demo draft for CRUD tests, or open a row in edit mode to revise the complete product record."
            title={editingProduct ? "Edit Product" : "New Product"}
          >
            <div className="grid gap-4">
              <Input
                label="Name"
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                value={draft.name}
              />
              <Textarea
                label="Description"
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                value={draft.description}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Price"
                  onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                  type="number"
                  value={draft.price}
                />
                <Input
                  label="Stock"
                  onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))}
                  type="number"
                  value={draft.stock}
                />
              </div>
              <Select
                label="Category"
                onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
                options={[
                  { label: "Select category", value: "" },
                  ...(categoriesQuery.data ?? []).map((category) => ({
                    label: category.name,
                    value: category.id
                  }))
                ]}
                value={draft.categoryId}
              />
              <Input
                accept="image/*"
                label={`Images ${editingProduct ? "(optional on edit)" : "(required on create)"}`}
                multiple
                onChange={(event) => setDraft((current) => ({ ...current, images: event.target.files }))}
                type="file"
              />
            </div>

            {imagePreviews.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagePreviews.map((preview) => (
                  <div className="overflow-hidden rounded-[18px] bg-mist" key={preview}>
                    <img alt="Product preview" className="aspect-video w-full object-cover" src={preview} />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                loading={createProduct.isPending || updateProduct.isPending}
                onClick={() => void handleSaveProduct()}
              >
                {editingProduct ? "Save changes" : "Create product"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "orders" && !ordersQuery.isLoading ? (
        <div
          aria-labelledby="seller-tab-orders"
          className="space-y-6"
          id="seller-tabpanel-orders"
          role="tabpanel"
        >
          <Card title="Order filters">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="Status"
                onChange={(event) =>
                  setOrderFilters((current) => ({
                    ...current,
                    status: event.target.value as OrderStatus | ""
                  }))
                }
                options={[
                  { label: "All statuses", value: "" },
                  { label: "pending", value: "pending" },
                  { label: "paid", value: "paid" },
                  { label: "shipped", value: "shipped" },
                  { label: "delivered", value: "delivered" }
                ]}
                value={orderFilters.status}
              />
              <Input
                label="From"
                onChange={(event) =>
                  setOrderFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
                type="date"
                value={orderFilters.dateFrom}
              />
              <Input
                label="To"
                onChange={(event) =>
                  setOrderFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
                type="date"
                value={orderFilters.dateTo}
              />
            </div>
          </Card>

          <OrderList
            onUpdateStatus={(orderId, status) => void handleUpdateOrderStatus(orderId, status)}
            orders={orders}
            pendingOrderId={updateOrderStatus.isPending ? updateOrderStatus.variables?.orderId ?? null : null}
          />
        </div>
      ) : null}

      {activeTab === "stats" && !ordersQuery.isLoading ? (
        <div
          aria-labelledby="seller-tab-stats"
          className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]"
          id="seller-tabpanel-stats"
          role="tabpanel"
        >
          {seller ? <SellerCard seller={seller} /> : null}
          <Card description="Best performing products across current seller orders." title="Top Products">
            <div className="space-y-3">
              {topProducts.map((product) => (
                <div className="surface-muted flex items-center justify-between gap-4 px-4 py-4" key={product.name}>
                  <div>
                    <p className="font-semibold text-ink">{product.name}</p>
                    <p className="mt-1 text-sm text-slate">{product.quantity} units sold</p>
                  </div>
                  <p className="font-semibold text-ember">{currencyFormatter.format(product.revenue)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card
            description="Order-status notifications continue to be handled by the backend when the seller updates fulfillment."
            title="Notifications"
          >
            <p className="text-sm leading-7 text-slate">
              Use the Orders tab to push status changes. The backend keeps the current email
              notification workflow and the admin ops panel exposes queue health.
            </p>
          </Card>
        </div>
      ) : null}

      <Modal
        confirmLabel="Delete product"
        confirmVariant="error"
        description={
          productPendingDelete
            ? `This removes ${productPendingDelete.name} from the seller catalog using the current delete endpoint.`
            : ""
        }
        isOpen={Boolean(productPendingDelete)}
        isPending={deleteProduct.isPending}
        onClose={() => setProductPendingDelete(null)}
        onConfirm={() => void handleDeleteProduct()}
        title={productPendingDelete ? `Delete ${productPendingDelete.name}?` : "Delete product"}
      />
    </div>
  );
}
