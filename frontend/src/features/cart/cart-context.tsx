import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { addCartItem, getCart, removeCartItem } from "@/features/api/cart-api";
import { checkout as checkoutRequest } from "@/features/api/order-api";
import type { CartSummary, OrderRecord } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";

type CheckoutPayload = {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  shippingAddress?: string;
  shippingCost?: number;
};

type CartContextValue = {
  cart: CartSummary;
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  checkout: (payload: CheckoutPayload) => Promise<OrderRecord>;
};

const EMPTY_CART: CartSummary = {
  items: [],
  total: 0
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { session, token, ensureGuestSession } = useAuth();
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function syncCart() {
      if (!token) {
        setCart(EMPTY_CART);
        return;
      }

      setIsLoading(true);

      try {
        const nextCart = await getCart(token);
        setCart(nextCart);
      } catch {
        setCart(EMPTY_CART);
      } finally {
        setIsLoading(false);
      }
    }

    void syncCart();
  }, [session, token]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      async addItem(productId, quantity = 1) {
        const activeToken = token ?? (await ensureGuestSession()).token;
        setIsLoading(true);

        try {
          const nextCart = await addCartItem(activeToken, {
            productId,
            quantity
          });
          setCart(nextCart);
        } finally {
          setIsLoading(false);
        }
      },
      async removeItem(productId) {
        if (!token) {
          return;
        }

        setIsLoading(true);

        try {
          const nextCart = await removeCartItem(token, productId);
          setCart(nextCart);
        } finally {
          setIsLoading(false);
        }
      },
      async refreshCart() {
        if (!token) {
          setCart(EMPTY_CART);
          return;
        }

        const nextCart = await getCart(token);
        setCart(nextCart);
      },
      async checkout(payload) {
        const activeToken = token ?? (await ensureGuestSession()).token;
        const response = await checkoutRequest(activeToken, payload);
        setCart(EMPTY_CART);
        void queryClient.invalidateQueries();
        return response.order;
      }
    }),
    [cart, ensureGuestSession, isLoading, queryClient, token]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
