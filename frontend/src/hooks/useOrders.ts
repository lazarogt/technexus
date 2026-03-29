import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, buildQuerySuffix } from "../lib/api";
import { useSellerOrders } from "./useSellerDashboard";
import type { Order, OrderListResponse, OrderStatus } from "../lib/types";

export type UseOrdersFilters = {
  status?: OrderStatus | "";
  dateFrom?: string;
  dateTo?: string;
};

/**
 * Seller-scoped orders hook that adds client-side filtering on top of the existing backend query.
 */
export function useOrders(token: string, filters: UseOrdersFilters = {}) {
  const query = useSellerOrders(token);

  const orders = useMemo(() => {
    const allOrders = query.data?.orders ?? [];

    return allOrders.filter((order: Order) => {
      const createdDate = order.createdAt.slice(0, 10);

      if (filters.status && order.status !== filters.status) {
        return false;
      }

      if (filters.dateFrom && createdDate < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && createdDate > filters.dateTo) {
        return false;
      }

      return true;
    });
  }, [filters.dateFrom, filters.dateTo, filters.status, query.data?.orders]);

  return {
    ...query,
    orders
  };
}

export function useCustomerOrders(token: string) {
  return useQuery({
    queryKey: ["customer-orders", token],
    queryFn: () =>
      apiRequest<OrderListResponse>(
        `/orders${buildQuerySuffix({
          page: "1",
          limit: "100"
        })}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      ),
    enabled: token.length > 0,
    staleTime: 15_000
  });
}
