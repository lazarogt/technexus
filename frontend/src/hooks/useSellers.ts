import { useMemo } from "react";
import { useProfile } from "./useProfile";
import { useSellerOrders, useSellerProducts } from "./useSellerDashboard";
import type { SellerSummary } from "../lib/types";

/**
 * Builds a seller summary model for the signed-in seller from existing profile, product and order hooks.
 */
export function useSellers(token: string) {
  const profileQuery = useProfile(token);
  const productsQuery = useSellerProducts(token);
  const ordersQuery = useSellerOrders(token);

  const sellers = useMemo<SellerSummary[]>(() => {
    const user = profileQuery.data?.user;
    const products = productsQuery.data?.products ?? [];
    const orders = ordersQuery.data?.orders ?? [];

    if (!user) {
      return [];
    }

    const revenue = orders.reduce((total, order) => total + order.total, 0);

    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        productCount: products.length,
        activeListings: products.filter((product) => product.stock > 0).length,
        orderCount: orders.length,
        revenue
      }
    ];
  }, [ordersQuery.data?.orders, productsQuery.data?.products, profileQuery.data?.user]);

  return {
    profileQuery,
    productsQuery,
    ordersQuery,
    sellers
  };
}
