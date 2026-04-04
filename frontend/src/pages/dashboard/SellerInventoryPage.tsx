import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listSellerProducts } from "@/features/api/catalog-api";
import { getInventoryByProduct, listInventoryAlerts, updateInventory } from "@/features/api/inventory-api";
import { useAuth } from "@/features/auth/auth-context";
import { formatDate } from "@/lib/format";

export function SellerInventoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [overrides, setOverrides] = useState<Record<string, { quantity: string; lowStockThreshold: string }>>({});

  const productsQuery = useQuery({
    queryKey: ["seller", "products", "inventory"],
    enabled: Boolean(token),
    queryFn: () => listSellerProducts(token!)
  });

  const productOptions = useMemo(
    () => (productsQuery.data?.products ?? []).map((product) => ({ value: product.id, label: product.name })),
    [productsQuery.data?.products]
  );
  const activeProductId = selectedProductId || productOptions[0]?.value || "";

  const inventoryQuery = useQuery({
    queryKey: ["seller", "inventory", activeProductId],
    enabled: Boolean(token) && Boolean(activeProductId),
    queryFn: () => getInventoryByProduct(token!, activeProductId)
  });

  const alertsQuery = useQuery({
    queryKey: ["seller", "alerts", "inventory"],
    enabled: Boolean(token),
    queryFn: () => listInventoryAlerts(token!)
  });

  const baseQuantities = useMemo(
    () =>
      Object.fromEntries(
      (inventoryQuery.data?.inventories ?? []).map((inventory) => [
        inventory.id,
        {
          quantity: String(inventory.quantity),
          lowStockThreshold: String(inventory.lowStockThreshold)
        }
      ])
      ),
    [inventoryQuery.data?.inventories]
  );

  const saveMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      if (!token) {
        throw new Error(t("dashboard.sellerInventory.authRequired"));
      }

      const current = overrides[inventoryId] ?? baseQuantities[inventoryId];
      return updateInventory(token, inventoryId, {
        quantity: Number(current.quantity),
        lowStockThreshold: Number(current.lowStockThreshold)
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seller", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["seller", "products"] })
      ]);
      setOverrides({});
    }
  });

  return (
    <div className="stack-lg">
      <SurfaceCard title={t("dashboard.sellerInventory.inventoryTitle")} description={t("dashboard.sellerInventory.inventoryDescription")}>
        {productOptions.length ? (
          <>
            <SelectField
              label={t("labels.product")}
              data-testid="inventory-product-select"
              value={activeProductId}
              onChange={(event) => {
                setSelectedProductId(event.target.value);
                setOverrides({});
              }}
              options={productOptions}
            />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("labels.location")}</th>
                    <th>{t("labels.quantity")}</th>
                    <th>{t("labels.threshold")}</th>
                    <th>{t("labels.updatedAt")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryQuery.data?.inventories ?? []).map((inventory) => (
                    <tr key={inventory.id}>
                      <td>{inventory.locationName}</td>
                      <td>
                        <input
                          type="number"
                          value={(overrides[inventory.id] ?? baseQuantities[inventory.id])?.quantity ?? inventory.quantity}
                          onChange={(event) =>
                            setOverrides((current) => ({
                              ...current,
                              [inventory.id]: {
                                ...(current[inventory.id] ?? baseQuantities[inventory.id] ?? {
                                  quantity: String(inventory.quantity),
                                  lowStockThreshold: String(inventory.lowStockThreshold)
                                }),
                                quantity: event.target.value
                              }
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={(overrides[inventory.id] ?? baseQuantities[inventory.id])?.lowStockThreshold ?? inventory.lowStockThreshold}
                          onChange={(event) =>
                            setOverrides((current) => ({
                              ...current,
                              [inventory.id]: {
                                ...(current[inventory.id] ?? baseQuantities[inventory.id] ?? {
                                  quantity: String(inventory.quantity),
                                  lowStockThreshold: String(inventory.lowStockThreshold)
                                }),
                                lowStockThreshold: event.target.value
                              }
                            }))
                          }
                        />
                      </td>
                      <td>{formatDate(inventory.updatedAt)}</td>
                      <td>
                        <Button variant="secondary" onClick={() => saveMutation.mutate(inventory.id)}>
                          {t("buttons.save")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title={t("dashboard.sellerInventory.emptyTitle")} description={t("dashboard.sellerInventory.emptyDescription")} />
        )}
      </SurfaceCard>

      <SurfaceCard title={t("dashboard.sellerInventory.activeAlertsTitle")} description={t("dashboard.sellerInventory.activeAlertsDescription")}>
        <ul className="compact-list">
          {(alertsQuery.data?.alerts ?? []).map((alert) => (
            <li key={alert.id}>
              {t("dashboard.sellerInventory.alertRow", {
                productName: alert.productName,
                locationName: alert.locationName,
                triggeredQty: alert.triggeredQty,
                date: formatDate(alert.createdAt)
              })}
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  );
}
