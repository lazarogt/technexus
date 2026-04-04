import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { addCartItem, getCart, removeCartItem } from "@/features/api/cart-api";
import { checkout as checkoutRequest } from "@/features/api/order-api";
import type { CartItem, CartSummary, OrderRecord } from "@/features/api/types";
import { track } from "@/features/analytics/analytics";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/features/toast/toast-context";
import { ES } from "@/i18n/es";
import { readStorage, removeStorage, writeStorage } from "@/lib/storage";

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
  lastAddedItem: CartItem | null;
  cartAttentionTick: number;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  checkout: (payload: CheckoutPayload) => Promise<OrderRecord>;
};

const EMPTY_CART: CartSummary = {
  items: [],
  total: 0
};

const CART_STORAGE_KEY = "cart-snapshot";

const CartContext = createContext<CartContextValue | null>(null);

type CartSnapshot = {
  scope: string;
  cart: CartSummary;
};

function getCartScope(
  session: ReturnType<typeof useAuth>["session"]
) {
  if (!session) {
    return null;
  }

  if (session.kind === "guest") {
    return `guest:${session.guestSessionId}`;
  }

  return `user:${session.user.id}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { session, token, ensureGuestSession } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);
  const [cartAttentionTick, setCartAttentionTick] = useState(0);
  const cartScope = getCartScope(session);

  useEffect(() => {
    if (!cartScope) {
      return;
    }

    const snapshot = readStorage<CartSnapshot>(CART_STORAGE_KEY);

    if (snapshot?.scope === cartScope) {
      setCart(snapshot.cart);
    }
  }, [cartScope]);

  useEffect(() => {
    async function syncCart() {
      if (!token) {
        setCart(EMPTY_CART);
        setLastAddedItem(null);
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

  useEffect(() => {
    if (!cartScope) {
      removeStorage(CART_STORAGE_KEY);
      return;
    }

    writeStorage(CART_STORAGE_KEY, {
      scope: cartScope,
      cart
    } satisfies CartSnapshot);
  }, [cart, cartScope]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      lastAddedItem,
      cartAttentionTick,
      async addItem(productId, quantity = 1) {
        const activeToken = token ?? (await ensureGuestSession()).token;
        setIsLoading(true);

        try {
          const nextCart = await addCartItem(activeToken, {
            productId,
            quantity
          });
          setCart(nextCart);
          const nextItem = nextCart.items.find((item) => item.productId === productId) ?? null;
          setLastAddedItem(nextItem);
          setCartAttentionTick((current) => current + 1);
          track("add_to_cart", {
            productId,
            quantity,
            cartItems: nextCart.items.length,
            cartTotal: nextCart.total
          });
          showToast({
            title: ES.cart.toastTitle,
            description: ES.cart.toastDescription(nextItem?.productName)
          });
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
          setLastAddedItem(null);
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
        setLastAddedItem(null);
        void queryClient.invalidateQueries();
        return response.order;
      }
    }),
    [cart, cartAttentionTick, ensureGuestSession, isLoading, lastAddedItem, queryClient, showToast, token]
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
