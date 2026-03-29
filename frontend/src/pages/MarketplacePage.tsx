import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import useSWR from "swr";
import { AdminOpsPanel } from "../components/admin/AdminOpsPanel";
import { CatalogSection } from "../components/catalog/CatalogSection";
import { PaginationControls } from "../components/ui/PaginationControls";
import { apiRequest, buildQuerySuffix, currencyFormatter, dateFormatter, toAssetUrl } from "../lib/api";
import { catalogKeys } from "../lib/cacheKeys";
import {
  adminTabLabelMap,
  defaultCategoryForm,
  defaultLoginForm,
  defaultMessageForm,
  defaultProductForm,
  defaultRegisterForm,
  emptyCart,
  emptyPagination,
  statusLabelMap,
  tokenStorageKey,
  type AdminTab,
  type AuthResponse,
  type CatalogSort,
  type CartSummary,
  type Category,
  type CategoryListResponse,
  type ManagedUser,
  type ManagedUserDraft,
  type MessageContact,
  type MessageListResponse,
  type MessageRecord,
  type Order,
  type OrderListResponse,
  type OrderStatus,
  type Product,
  type ProductListResponse,
  type UserProfile,
  type UserRole
} from "../lib/types";
import { useCatalogPrefetch } from "../hooks/useCatalogPrefetch";

const toUserDraftMap = (
  users: ManagedUser[]
): Record<string, ManagedUserDraft> => {
  return Object.fromEntries(
    users.map((managedUser) => [
      managedUser.id,
      {
        name: managedUser.name,
        email: managedUser.email,
        role: managedUser.role,
        isBlocked: managedUser.isBlocked
      }
    ])
  );
};

const getOrderSellerSummary = (order: Order): string => {
  return Array.from(new Set(order.items.map((item) => item.sellerName))).join(", ");
};

const toOrderStatusDraftMap = (orders: Order[]): Record<string, OrderStatus> => {
  return Object.fromEntries(orders.map((order) => [order.id, order.status]));
};

const buildMessageContacts = (input: {
  currentUser: UserProfile;
  messages: MessageRecord[];
  customerOrders: Order[];
  sellerOrders: Order[];
  adminUsers: ManagedUser[];
}): MessageContact[] => {
  const contacts = new Map<string, MessageContact>();

  input.messages.forEach((message) => {
    const otherParticipant =
      message.senderId === input.currentUser.id
        ? {
            id: message.recipientId,
            name: message.recipientName,
            role: message.recipientRole,
            email: message.recipientEmail
          }
        : {
            id: message.senderId,
            name: message.senderName,
            role: message.senderRole,
            email: message.senderEmail
          };

    contacts.set(otherParticipant.id, otherParticipant);
  });

  if (input.currentUser.role === "customer") {
    input.customerOrders.forEach((order) => {
      order.items.forEach((item) => {
        contacts.set(item.sellerId, {
          id: item.sellerId,
          name: item.sellerName,
          role: "seller",
          email: item.sellerEmail
        });
      });
    });
  }

  if (input.currentUser.role === "seller") {
    input.sellerOrders.forEach((order) => {
      contacts.set(order.userId, {
        id: order.userId,
        name: order.userName,
        role: "customer",
        email: order.userEmail
      });
    });
  }

  if (input.currentUser.role === "admin") {
    input.adminUsers.forEach((managedUser) => {
      if (managedUser.id !== input.currentUser.id) {
        contacts.set(managedUser.id, {
          id: managedUser.id,
          name: managedUser.name,
          role: managedUser.role,
          email: managedUser.email
        });
      }
    });
  }

  return Array.from(contacts.values());
};

const buildRelatedOrdersForContact = (input: {
  currentUser: UserProfile;
  contactId: string;
  customerOrders: Order[];
  sellerOrders: Order[];
  adminOrders: Order[];
}): Order[] => {
  if (!input.contactId) {
    return [];
  }

  if (input.currentUser.role === "customer") {
    return input.customerOrders.filter((order) =>
      order.items.some((item) => item.sellerId === input.contactId)
    );
  }

  if (input.currentUser.role === "seller") {
    return input.sellerOrders.filter((order) => order.userId === input.contactId);
  }

  return input.adminOrders.filter(
    (order) =>
      order.userId === input.contactId ||
      order.items.some((item) => item.sellerId === input.contactId)
  );
};

export default function MarketplacePage() {
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(tokenStorageKey)
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartSummary>(emptyCart);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [allMessages, setAllMessages] = useState<MessageRecord[]>([]);
  const [conversationMessages, setConversationMessages] = useState<MessageRecord[]>([]);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [adminUsers, setAdminUsers] = useState<ManagedUser[]>([]);
  const [adminSellers, setAdminSellers] = useState<ManagedUser[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminUserDrafts, setAdminUserDrafts] = useState<
    Record<string, ManagedUserDraft>
  >({});
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<
    Record<string, OrderStatus>
  >({});
  const [catalogPagination, setCatalogPagination] = useState(emptyPagination);
  const [customerOrdersPagination, setCustomerOrdersPagination] = useState(emptyPagination);
  const [sellerOrdersPagination, setSellerOrdersPagination] = useState(emptyPagination);
  const [adminProductsPagination, setAdminProductsPagination] = useState(emptyPagination);
  const [adminOrdersPagination, setAdminOrdersPagination] = useState(emptyPagination);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [catalogSort, setCatalogSort] = useState<CatalogSort>("latest");
  const deferredSearch = useDeferredValue(searchInput);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [selectedMessageContactId, setSelectedMessageContactId] = useState("");
  const [customerOrdersPage, setCustomerOrdersPage] = useState(1);
  const [sellerOrdersPage, setSellerOrdersPage] = useState(1);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminProductsLoading, setAdminProductsLoading] = useState(false);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageForm, setMessageForm] = useState(defaultMessageForm);
  const [authMessage, setAuthMessage] = useState(
    "Inicia sesion para guardar carrito, pagar contra entrega y ver tu historial."
  );
  const [authError, setAuthError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [sellerMessage, setSellerMessage] = useState(
    "Crea categorias y publica productos con hasta 5 imagenes por item."
  );
  const [sellerError, setSellerError] = useState("");
  const [shoppingMessage, setShoppingMessage] = useState(
    "Agrega productos al carrito y confirma el pedido con pago en efectivo a la entrega."
  );
  const [shoppingError, setShoppingError] = useState("");
  const [messagePanelMessage, setMessagePanelMessage] = useState(
    "Mantente en contacto con compradores y vendedores desde una sola bandeja."
  );
  const [messagePanelError, setMessagePanelError] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("users");
  const [adminMessage, setAdminMessage] = useState(
    "Centro de control global para usuarios, vendedores, productos y pedidos."
  );
  const [adminError, setAdminError] = useState("");
  const [adminProductSearchInput, setAdminProductSearchInput] = useState("");
  const deferredAdminProductSearch = useDeferredValue(adminProductSearchInput);
  const [adminProductCategoryId, setAdminProductCategoryId] = useState("");
  const [adminProductSellerId, setAdminProductSellerId] = useState("");
  const [adminProductsPage, setAdminProductsPage] = useState(1);
  const [adminEditingProductId, setAdminEditingProductId] = useState<string | null>(null);
  const [adminProductForm, setAdminProductForm] = useState(defaultProductForm);
  const [adminProductFiles, setAdminProductFiles] = useState<File[]>([]);
  const [adminOrderStatus, setAdminOrderStatus] = useState<"" | OrderStatus>("");
  const [adminOrderSellerId, setAdminOrderSellerId] = useState("");
  const [adminOrderDateFrom, setAdminOrderDateFrom] = useState("");
  const [adminOrderDateTo, setAdminOrderDateTo] = useState("");
  const [adminOrdersPage, setAdminOrdersPage] = useState(1);

  const isAuthenticated = Boolean(token);
  const isSellerWorkspaceEnabled = user?.role === "seller" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const categoriesKey = catalogKeys.categories();
  const catalogKey = catalogKeys.products({
    page: catalogPage,
    limit: 8,
    categoryId: selectedCategoryId,
    search: deferredSearch,
    sort: catalogSort
  });
  const {
    data: categoriesResponse,
    error: categoriesResponseError,
    isLoading: categoriesResponseLoading,
    mutate: mutateCategories
  } = useSWR<CategoryListResponse>(categoriesKey, (path: string) =>
    apiRequest<CategoryListResponse>(path, { method: "GET" })
  );
  const {
    data: catalogResponse,
    error: catalogResponseError,
    isLoading: catalogResponseLoading,
    mutate: mutateCatalog
  } = useSWR<ProductListResponse>(catalogKey, (path: string) =>
    apiRequest<ProductListResponse>(path, { method: "GET" })
  );
  const catalogLoading = categoriesResponseLoading || catalogResponseLoading;
  useCatalogPrefetch({
    enabled: !catalogLoading,
    pagination: catalogPagination,
    categoryId: selectedCategoryId,
    search: deferredSearch,
    sort: catalogSort,
    limit: 8
  });
  const messageContacts = user
    ? buildMessageContacts({
        currentUser: user,
        messages: allMessages,
        customerOrders,
        sellerOrders,
        adminUsers
      })
    : [];
  const messageContactIds = messageContacts.map((contact) => contact.id).join("|");
  const relatedOrdersForContact =
    user && selectedMessageContactId
      ? buildRelatedOrdersForContact({
          currentUser: user,
          contactId: selectedMessageContactId,
          customerOrders,
          sellerOrders,
          adminOrders
        })
      : [];
  const customerActiveOrders = customerOrders.filter(
    (order) => order.status !== "delivered"
  ).length;
  const sellerPendingOrders = sellerOrders.filter(
    (order) => order.status === "pending"
  ).length;
  const adminPendingOrders = adminOrders.filter(
    (order) => order.status === "pending"
  ).length;

  const loadCategories = async () => {
    const response = await mutateCategories();

    if (response) {
      setCategories(response.categories);
    }
  };

  const loadCatalogProducts = async () => {
    const response = await mutateCatalog();

    if (response) {
      setCatalogProducts(response.products);
      setCatalogPagination(response.pagination);
    }
  };

  const loadMineProducts = async (authToken: string) => {
    const response = await apiRequest<{ products: Product[] }>("/products/mine", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setMyProducts(response.products);
  };

  const loadCart = async (authToken: string) => {
    const response = await apiRequest<CartSummary>("/cart", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setCart(response);
  };

  const loadCustomerOrders = async (authToken: string, page = customerOrdersPage) => {
    const response = await apiRequest<OrderListResponse>(
      `/orders${buildQuerySuffix({
        page: String(page),
        pageSize: "6"
      })}`,
      {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setCustomerOrders(response.orders);
    setCustomerOrdersPagination(response.pagination);
  };

  const loadSellerOrders = async (authToken: string, page = sellerOrdersPage) => {
    const response = await apiRequest<OrderListResponse>(
      `/orders/seller${buildQuerySuffix({
        page: String(page),
        pageSize: "6"
      })}`,
      {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setSellerOrders(response.orders);
    setSellerOrdersPagination(response.pagination);
    setOrderStatusDrafts((current) => ({
      ...current,
      ...toOrderStatusDraftMap(response.orders)
    }));
  };

  const loadMessages = async (authToken: string) => {
    const response = await apiRequest<MessageListResponse>("/messages", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setAllMessages(response.messages);
    setMessageUnreadCount(response.unreadCount);
  };

  const loadConversation = async (authToken: string, contactId: string) => {
    const suffix = buildQuerySuffix({
      contactId,
      markAsRead: "true"
    });

    const response = await apiRequest<MessageListResponse>(`/messages${suffix}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setConversationMessages(response.messages);
    setMessageUnreadCount(response.unreadCount);
  };

  const loadAdminUsers = async (authToken: string) => {
    const response = await apiRequest<{ users: ManagedUser[] }>("/admin/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setAdminUsers(response.users);
    setAdminUserDrafts(toUserDraftMap(response.users));
  };

  const loadAdminSellers = async (authToken: string) => {
    const response = await apiRequest<{ sellers: ManagedUser[] }>("/admin/sellers", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setAdminSellers(response.sellers);
  };

  const loadAdminProducts = async (
    authToken: string,
    filters: {
      search: string;
      categoryId: string;
      sellerId: string;
    },
    page = adminProductsPage
  ) => {
    const suffix = buildQuerySuffix({
      search: filters.search,
      categoryId: filters.categoryId,
      sellerId: filters.sellerId,
      page: String(page),
      pageSize: "8"
    });

    const response = await apiRequest<ProductListResponse>(
      `/admin/products${suffix}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    setAdminProducts(response.products);
    setAdminProductsPagination(response.pagination);
  };

  const loadAdminOrders = async (
    authToken: string,
    filters: {
      status: string;
      sellerId: string;
      dateFrom: string;
      dateTo: string;
    },
    page = adminOrdersPage
  ) => {
    const suffix = buildQuerySuffix({
      status: filters.status,
      sellerId: filters.sellerId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: String(page),
      pageSize: "8"
    });

    const response = await apiRequest<OrderListResponse>(`/admin/orders${suffix}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    setAdminOrders(response.orders);
    setAdminOrdersPagination(response.pagination);
    setOrderStatusDrafts((current) => ({
      ...current,
      ...toOrderStatusDraftMap(response.orders)
    }));
  };

  const refreshCatalog = async () => {
    await loadCatalogProducts();
  };

  const refreshShopperData = async (authToken: string) => {
    await Promise.all([
      loadCart(authToken),
      loadCustomerOrders(authToken, customerOrdersPage),
      refreshCatalog()
    ]);
  };

  const refreshSellerData = async (authToken: string) => {
    await Promise.all([
      loadMineProducts(authToken),
      loadSellerOrders(authToken, sellerOrdersPage)
    ]);
  };

  const refreshMessages = async (authToken: string) => {
    await loadMessages(authToken);
  };

  const refreshAdminUsersAndSellers = async (authToken: string) => {
    await Promise.all([loadAdminUsers(authToken), loadAdminSellers(authToken)]);
  };

  const refreshAdminProducts = async (authToken: string) => {
    await loadAdminProducts(authToken, {
      search: deferredAdminProductSearch,
      categoryId: adminProductCategoryId,
      sellerId: adminProductSellerId
    }, adminProductsPage);
  };

  const refreshAdminOrders = async (authToken: string) => {
    await loadAdminOrders(authToken, {
      status: adminOrderStatus,
      sellerId: adminOrderSellerId,
      dateFrom: adminOrderDateFrom,
      dateTo: adminOrderDateTo
    }, adminOrdersPage);
  };

  useEffect(() => {
    if (categoriesResponse) {
      setCategories(categoriesResponse.categories);
    }
  }, [categoriesResponse]);

  useEffect(() => {
    if (catalogResponse) {
      setCatalogProducts(catalogResponse.products);
      setCatalogPagination(catalogResponse.pagination);
    }
  }, [catalogResponse]);

  useEffect(() => {
    if (categoriesResponseError || catalogResponseError) {
      setCatalogError(
        categoriesResponseError instanceof Error
          ? categoriesResponseError.message
          : catalogResponseError instanceof Error
            ? catalogResponseError.message
            : "No se pudo cargar el catalogo."
      );
      return;
    }

    setCatalogError("");
  }, [categoriesResponseError, catalogResponseError]);

  useEffect(() => {
    setCatalogPage(1);
  }, [selectedCategoryId, deferredSearch, catalogSort]);

  useEffect(() => {
    setAdminProductsPage(1);
  }, [deferredAdminProductSearch, adminProductCategoryId, adminProductSellerId]);

  useEffect(() => {
    setAdminOrdersPage(1);
  }, [adminOrderStatus, adminOrderSellerId, adminOrderDateFrom, adminOrderDateTo]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setMyProducts([]);
      setCart(emptyCart);
      setCustomerOrders([]);
      setSellerOrders([]);
      setAllMessages([]);
      setConversationMessages([]);
      setMessageUnreadCount(0);
      setSelectedMessageContactId("");
      setMessageForm(defaultMessageForm);
      setOrderStatusDrafts({});
      setAdminUsers([]);
      setAdminSellers([]);
      setAdminProducts([]);
      setAdminOrders([]);
      setAdminUserDrafts({});
      setAdminProductFiles([]);
      setAdminEditingProductId(null);
      return;
    }

    const hydrateSession = async () => {
      setSessionLoading(true);
      setAuthError("");
      setShoppingError("");

      try {
        const response = await apiRequest<{ user: UserProfile }>("/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUser(response.user);
        setAuthMessage(`Sesion activa como ${response.user.role}.`);

        const sharedPromises = [
          loadCart(token),
          loadCustomerOrders(token),
          loadMessages(token)
        ];

        if (response.user.role === "seller" || response.user.role === "admin") {
          await Promise.all([
            ...sharedPromises,
            loadMineProducts(token),
            loadSellerOrders(token)
          ]);
        } else {
          setMyProducts([]);
          setSellerOrders([]);
          await Promise.all(sharedPromises);
        }
      } catch (error) {
        localStorage.removeItem(tokenStorageKey);
        setToken(null);
        setUser(null);
        setMyProducts([]);
        setCart(emptyCart);
        setCustomerOrders([]);
        setSellerOrders([]);
        setAllMessages([]);
        setConversationMessages([]);
        setMessageUnreadCount(0);
        setSelectedMessageContactId("");
        setMessageForm(defaultMessageForm);
        setOrderStatusDrafts({});
        setAdminUsers([]);
        setAdminSellers([]);
        setAdminProducts([]);
        setAdminOrders([]);
        setAdminUserDrafts({});
        setAuthError(
          error instanceof Error ? error.message : "No se pudo cargar la sesion."
        );
      } finally {
        setSessionLoading(false);
      }
    };

    void hydrateSession();
  }, [token]);

  useEffect(() => {
    if (!token || !isAdmin) {
      setAdminUsers([]);
      setAdminSellers([]);
      setAdminUserDrafts({});
      setAdminError("");
      return;
    }

    const loadControlUsers = async () => {
      setAdminUsersLoading(true);
      setAdminError("");

      try {
        await refreshAdminUsersAndSellers(token);
      } catch (error) {
        setAdminError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el modulo global de usuarios."
        );
      } finally {
        setAdminUsersLoading(false);
      }
    };

    void loadControlUsers();
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) {
      setAdminProducts([]);
      return;
    }

    const loadGlobalProducts = async () => {
      setAdminProductsLoading(true);
      setAdminError("");

      try {
        await refreshAdminProducts(token);
      } catch (error) {
        setAdminError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el inventario global."
        );
      } finally {
        setAdminProductsLoading(false);
      }
    };

    void loadGlobalProducts();
  }, [
    token,
    isAdmin,
    deferredAdminProductSearch,
    adminProductCategoryId,
    adminProductSellerId,
    adminProductsPage
  ]);

  useEffect(() => {
    if (!token || !isAdmin) {
      setAdminOrders([]);
      return;
    }

    const loadGlobalOrders = async () => {
      setAdminOrdersLoading(true);
      setAdminError("");

      try {
        await refreshAdminOrders(token);
      } catch (error) {
        setAdminError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el tablero de pedidos."
        );
      } finally {
        setAdminOrdersLoading(false);
      }
    };

    void loadGlobalOrders();
  }, [
    token,
    isAdmin,
    adminOrderStatus,
    adminOrderSellerId,
    adminOrderDateFrom,
    adminOrderDateTo,
    adminOrdersPage
  ]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const refreshCustomerOrders = async () => {
      try {
        await loadCustomerOrders(token, customerOrdersPage);
      } catch (error) {
        setShoppingError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar tus pedidos paginados."
        );
      }
    };

    void refreshCustomerOrders();
  }, [token, customerOrdersPage]);

  useEffect(() => {
    if (!token || !isSellerWorkspaceEnabled) {
      return;
    }

    const refreshSellerOrdersPage = async () => {
      try {
        await loadSellerOrders(token, sellerOrdersPage);
      } catch (error) {
        setSellerError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los pedidos seller."
        );
      }
    };

    void refreshSellerOrdersPage();
  }, [token, isSellerWorkspaceEnabled, sellerOrdersPage]);

  useEffect(() => {
    if (!user) {
      setSelectedMessageContactId("");
      setConversationMessages([]);
      return;
    }

    if (messageContacts.length === 0) {
      setSelectedMessageContactId("");
      setConversationMessages([]);
      return;
    }

    const hasSelectedContact = messageContacts.some(
      (contact) => contact.id === selectedMessageContactId
    );

    if (!hasSelectedContact) {
      const nextContactId = messageContacts[0].id;
      setSelectedMessageContactId(nextContactId);
      setMessageForm((current) => ({
        ...current,
        recipientId: nextContactId,
        orderId: ""
      }));
    }
  }, [user, messageContactIds, selectedMessageContactId]);

  useEffect(() => {
    if (!token || !selectedMessageContactId) {
      setConversationMessages([]);
      return;
    }

    const loadSelectedConversation = async () => {
      setMessagesLoading(true);
      setMessagePanelError("");

      try {
        await loadConversation(token, selectedMessageContactId);
        await refreshMessages(token);
      } catch (error) {
        setMessagePanelError(
          error instanceof Error ? error.message : "No se pudo cargar la conversacion."
        );
      } finally {
        setMessagesLoading(false);
      }
    };

    void loadSelectedConversation();
  }, [token, selectedMessageContactId]);

  const handleAuthSuccess = (response: AuthResponse, message: string) => {
    localStorage.setItem(tokenStorageKey, response.token);
    setToken(response.token);
    setUser(response.user);
    setAuthMessage(message);
    setAuthError("");
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("register");
    setAuthError("");

    try {
      const response = await apiRequest<AuthResponse>("/register", {
        method: "POST",
        body: JSON.stringify(registerForm)
      });

      handleAuthSuccess(response, "Cuenta creada y sesion iniciada.");
      setRegisterForm(defaultRegisterForm);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "No se pudo registrar la cuenta."
      );
    } finally {
      setBusyAction((current) => (current === "register" ? null : current));
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("login");
    setAuthError("");

    try {
      const response = await apiRequest<AuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify(loginForm)
      });

      handleAuthSuccess(response, "Sesion iniciada correctamente.");
      setLoginForm(defaultLoginForm);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "No se pudo iniciar sesion."
      );
    } finally {
      setBusyAction((current) => (current === "login" ? null : current));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setMyProducts([]);
    setCart(emptyCart);
    setCustomerOrders([]);
    setSellerOrders([]);
    setAllMessages([]);
    setConversationMessages([]);
    setMessageUnreadCount(0);
    setSelectedMessageContactId("");
    setMessageForm(defaultMessageForm);
    setOrderStatusDrafts({});
    setAdminUsers([]);
    setAdminSellers([]);
    setAdminProducts([]);
    setAdminOrders([]);
    setAdminUserDrafts({});
    setAuthMessage("Sesion cerrada. Puedes volver a entrar cuando quieras.");
    setAuthError("");
    setAdminMessage("Centro de control global para usuarios, vendedores, productos y pedidos.");
    setAdminError("");
  };

  const requireSessionForShopping = (): boolean => {
    if (token) {
      return true;
    }

    setAuthMode("login");
    setAuthError("Inicia sesion para usar el carrito y completar compras.");
    return false;
  };

  const handleAddToCart = async (productId: string) => {
    if (!requireSessionForShopping()) {
      return;
    }

    setBusyAction(`add-cart-${productId}`);
    setShoppingError("");

    try {
      const response = await apiRequest<CartSummary>("/cart/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity: 1 })
      });

      setCart(response);
      setShoppingMessage("Producto agregado al carrito.");
    } catch (error) {
      setShoppingError(
        error instanceof Error ? error.message : "No se pudo agregar el producto."
      );
    } finally {
      setBusyAction((current) => (current === `add-cart-${productId}` ? null : current));
    }
  };

  const handleRemoveFromCart = async (productId: string) => {
    if (!token) {
      return;
    }

    setBusyAction(`remove-cart-${productId}`);
    setShoppingError("");

    try {
      const response = await apiRequest<CartSummary>("/cart/remove", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });

      setCart(response);
      setShoppingMessage("Producto retirado del carrito.");
    } catch (error) {
      setShoppingError(
        error instanceof Error ? error.message : "No se pudo quitar el producto."
      );
    } finally {
      setBusyAction((current) =>
        current === `remove-cart-${productId}` ? null : current
      );
    }
  };

  const handleCheckout = async () => {
    if (!token) {
      return;
    }

    setBusyAction("checkout");
    setShoppingError("");

    try {
      await apiRequest<{ message: string; order: Order }>("/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await refreshShopperData(token);

      if (isSellerWorkspaceEnabled) {
        await refreshSellerData(token);
      }

      if (isAdmin) {
        await refreshAdminOrders(token);
      }

      setShoppingMessage(
        "Pedido generado correctamente. El pago quedo configurado para efectivo a la entrega."
      );
    } catch (error) {
      setShoppingError(
        error instanceof Error ? error.message : "No se pudo completar el checkout."
      );
    } finally {
      setBusyAction((current) => (current === "checkout" ? null : current));
    }
  };

  const handleOrderStatusUpdate = async (
    orderId: string,
    scope: "seller" | "admin"
  ) => {
    if (!token) {
      return;
    }

    const nextStatus = orderStatusDrafts[orderId];

    if (!nextStatus) {
      return;
    }

    setBusyAction(`order-status-${scope}-${orderId}`);

    if (scope === "admin") {
      setAdminError("");
    } else {
      setSellerError("");
    }

    try {
      await apiRequest<{ order: Order }>(`/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      await loadSellerOrders(token);

      if (isAdmin) {
        await refreshAdminOrders(token);
      }

      const message = `Estado del pedido actualizado a ${statusLabelMap[nextStatus]}.`;

      if (scope === "admin") {
        setAdminMessage(message);
      } else {
        setSellerMessage(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del pedido.";

      if (scope === "admin") {
        setAdminError(message);
      } else {
        setSellerError(message);
      }
    } finally {
      setBusyAction((current) =>
        current === `order-status-${scope}-${orderId}` ? null : current
      );
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setMessagePanelError("Necesitas iniciar sesion para enviar mensajes.");
      return;
    }

    if (!messageForm.recipientId) {
      setMessagePanelError("Selecciona un destinatario antes de enviar.");
      return;
    }

    setBusyAction("message-send");
    setMessagePanelError("");

    try {
      await apiRequest<{ message: MessageRecord }>("/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: messageForm.recipientId,
          orderId: messageForm.orderId || undefined,
          subject: messageForm.subject,
          body: messageForm.body
        })
      });

      await refreshMessages(token);
      setSelectedMessageContactId(messageForm.recipientId);
      await loadConversation(token, messageForm.recipientId);
      setMessageForm((current) => ({
        ...current,
        orderId: "",
        subject: "",
        body: ""
      }));
      setMessagePanelMessage("Mensaje enviado correctamente.");
    } catch (error) {
      setMessagePanelError(
        error instanceof Error ? error.message : "No se pudo enviar el mensaje."
      );
    } finally {
      setBusyAction((current) => (current === "message-send" ? null : current));
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setSellerError("Necesitas iniciar sesion para gestionar categorias.");
      return;
    }

    setBusyAction("category");
    setSellerError("");

    try {
      const endpoint = editingCategoryId
        ? `/categories/${editingCategoryId}`
        : "/categories";
      const method = editingCategoryId ? "PUT" : "POST";

      await apiRequest<{ category: Category }>(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(categoryForm)
      });

      await loadCategories();
      setCategoryForm(defaultCategoryForm);
      setEditingCategoryId(null);
      setSellerMessage(
        editingCategoryId
          ? "Categoria actualizada correctamente."
          : "Categoria creada correctamente."
      );
    } catch (error) {
      setSellerError(
        error instanceof Error ? error.message : "No se pudo guardar la categoria."
      );
    } finally {
      setBusyAction((current) => (current === "category" ? null : current));
    }
  };

  const handleCategoryEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name });
    setSellerMessage("Editando categoria.");
    setSellerError("");
  };

  const handleCategoryDelete = async (categoryId: string) => {
    if (!token) {
      setSellerError("Necesitas iniciar sesion para eliminar categorias.");
      return;
    }

    setBusyAction(`delete-category-${categoryId}`);
    setSellerError("");

    try {
      await apiRequest<{ message: string }>(`/categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await Promise.all([loadCategories(), refreshCatalog()]);

      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setCategoryForm(defaultCategoryForm);
      }

      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId("");
      }

      if (adminProductCategoryId === categoryId) {
        setAdminProductCategoryId("");
      }

      setSellerMessage("Categoria eliminada correctamente.");
    } catch (error) {
      setSellerError(
        error instanceof Error ? error.message : "No se pudo eliminar la categoria."
      );
    } finally {
      setBusyAction((current) =>
        current === `delete-category-${categoryId}` ? null : current
      );
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(defaultProductForm);
    setProductFiles([]);
  };

  const resetAdminProductForm = () => {
    setAdminEditingProductId(null);
    setAdminProductForm(defaultProductForm);
    setAdminProductFiles([]);
  };

  const handleProductFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProductFiles(Array.from(event.target.files ?? []));
  };

  const handleAdminProductFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAdminProductFiles(Array.from(event.target.files ?? []));
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setSellerError("Necesitas iniciar sesion para publicar productos.");
      return;
    }

    setBusyAction("product");
    setSellerError("");

    try {
      const formData = new FormData();
      formData.append("name", productForm.name);
      formData.append("description", productForm.description);
      formData.append("price", productForm.price);
      formData.append("stock", productForm.stock);
      formData.append("categoryId", productForm.categoryId);

      productFiles.forEach((file) => {
        formData.append("images", file);
      });

      const endpoint = editingProductId ? `/products/${editingProductId}` : "/products";
      const method = editingProductId ? "PUT" : "POST";

      await apiRequest<{ product: Product }>(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      await Promise.all([refreshCatalog(), loadMineProducts(token)]);
      resetProductForm();
      setSellerMessage(
        editingProductId
          ? "Producto actualizado correctamente."
          : "Producto publicado correctamente."
      );
    } catch (error) {
      setSellerError(
        error instanceof Error ? error.message : "No se pudo guardar el producto."
      );
    } finally {
      setBusyAction((current) => (current === "product" ? null : current));
    }
  };

  const handleProductEdit = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId
    });
    setProductFiles([]);
    setSellerMessage(
      "Editando producto. Si subes nuevas imagenes, reemplazaran las actuales."
    );
    setSellerError("");
  };

  const handleProductDelete = async (productId: string) => {
    if (!token) {
      setSellerError("Necesitas iniciar sesion para eliminar productos.");
      return;
    }

    setBusyAction(`delete-product-${productId}`);
    setSellerError("");

    try {
      await apiRequest<{ message: string }>(`/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await Promise.all([refreshCatalog(), loadMineProducts(token)]);

      if (editingProductId === productId) {
        resetProductForm();
      }

      setSellerMessage("Producto eliminado correctamente.");
    } catch (error) {
      setSellerError(
        error instanceof Error ? error.message : "No se pudo eliminar el producto."
      );
    } finally {
      setBusyAction((current) =>
        current === `delete-product-${productId}` ? null : current
      );
    }
  };

  const handleAdminUserDraftChange = (
    userId: string,
    field: keyof ManagedUserDraft,
    value: string | boolean
  ) => {
    setAdminUserDrafts((current) => {
      const fallbackUser = adminUsers.find((managedUser) => managedUser.id === userId);

      if (!fallbackUser) {
        return current;
      }

      const existingDraft = current[userId] ?? {
        name: fallbackUser.name,
        email: fallbackUser.email,
        role: fallbackUser.role,
        isBlocked: fallbackUser.isBlocked
      };

      return {
        ...current,
        [userId]: {
          ...existingDraft,
          [field]: value
        }
      };
    });
  };

  const handleAdminUserSave = async (userId: string) => {
    if (!token) {
      return;
    }

    const draft = adminUserDrafts[userId];

    if (!draft) {
      return;
    }

    setBusyAction(`admin-user-save-${userId}`);
    setAdminError("");

    try {
      const response = await apiRequest<{ user: ManagedUser }>(`/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(draft)
      });

      await refreshAdminUsersAndSellers(token);

      if (user?.id === response.user.id) {
        setUser((current) =>
          current
            ? {
                ...current,
                name: response.user.name,
                email: response.user.email,
                role: response.user.role
              }
            : current
        );
      }

      setAdminMessage(`Usuario ${response.user.name} actualizado correctamente.`);
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "No se pudo actualizar el usuario."
      );
    } finally {
      setBusyAction((current) =>
        current === `admin-user-save-${userId}` ? null : current
      );
    }
  };

  const handleAdminUserDelete = async (managedUser: ManagedUser) => {
    if (!token) {
      return;
    }

    const shouldDelete = window.confirm(
      `Se eliminara la cuenta ${managedUser.email}. Esta accion no se puede deshacer.`
    );

    if (!shouldDelete) {
      return;
    }

    setBusyAction(`admin-user-delete-${managedUser.id}`);
    setAdminError("");

    try {
      await apiRequest<{ message: string }>(`/admin/users/${managedUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await refreshAdminUsersAndSellers(token);
      setAdminMessage(`Usuario ${managedUser.name} eliminado del sistema.`);
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "No se pudo eliminar el usuario."
      );
    } finally {
      setBusyAction((current) =>
        current === `admin-user-delete-${managedUser.id}` ? null : current
      );
    }
  };

  const handleAdminOpenUserTab = () => {
    setAdminTab("users");
    setAdminMessage("Volviste a la gestion de usuarios para actuar sobre el vendedor.");
  };

  const handleAdminProductEdit = (product: Product) => {
    setAdminTab("products");
    setAdminEditingProductId(product.id);
    setAdminProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId
    });
    setAdminProductFiles([]);
    setAdminMessage(
      `Editando ${product.name}. Si subes nuevas imagenes, reemplazaran las actuales.`
    );
    setAdminError("");
  };

  const handleAdminProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !adminEditingProductId) {
      return;
    }

    setBusyAction("admin-product");
    setAdminError("");

    try {
      const formData = new FormData();
      formData.append("name", adminProductForm.name);
      formData.append("description", adminProductForm.description);
      formData.append("price", adminProductForm.price);
      formData.append("stock", adminProductForm.stock);
      formData.append("categoryId", adminProductForm.categoryId);

      adminProductFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await apiRequest<{ product: Product }>(
        `/products/${adminEditingProductId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      await Promise.all([
        refreshCatalog(),
        refreshAdminProducts(token),
        loadMineProducts(token)
      ]);

      setAdminMessage(`Producto ${response.product.name} actualizado globalmente.`);
      resetAdminProductForm();
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "No se pudo actualizar el producto."
      );
    } finally {
      setBusyAction((current) => (current === "admin-product" ? null : current));
    }
  };

  const handleAdminProductDelete = async (product: Product) => {
    if (!token) {
      return;
    }

    const shouldDelete = window.confirm(
      `Se eliminara el producto ${product.name}. Esta accion no se puede deshacer.`
    );

    if (!shouldDelete) {
      return;
    }

    setBusyAction(`admin-product-delete-${product.id}`);
    setAdminError("");

    try {
      await apiRequest<{ message: string }>(`/products/${product.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await Promise.all([
        refreshCatalog(),
        refreshAdminProducts(token),
        loadMineProducts(token)
      ]);

      if (adminEditingProductId === product.id) {
        resetAdminProductForm();
      }

      setAdminMessage(`Producto ${product.name} eliminado del inventario.`);
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "No se pudo eliminar el producto."
      );
    } finally {
      setBusyAction((current) =>
        current === `admin-product-delete-${product.id}` ? null : current
      );
    }
  };

  const handleSelectMessageContact = (contactId: string) => {
    setSelectedMessageContactId(contactId);
    setMessageForm((current) => ({
      ...current,
      recipientId: contactId,
      orderId: ""
    }));
    setMessagePanelError("");
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__copy">
          <span className="hero__eyebrow">TechNexus Marketplace</span>
          <h1>Catalogo, compras y control operativo dentro del mismo flujo.</h1>
          <p>
            Explora productos, administra inventario, confirma compras con pago en
            efectivo a la entrega y, si eres admin, coordina usuarios, vendedores,
            productos y pedidos desde una consola global.
          </p>
        </div>

        <div className="hero__metrics">
          <article>
            <strong>{catalogProducts.length}</strong>
            <span>Productos publicados</span>
          </article>
          <article>
            <strong>{cart.items.length}</strong>
            <span>Items en carrito</span>
          </article>
          <article>
            <strong>{customerOrders.length}</strong>
            <span>Pedidos del cliente</span>
          </article>
          <article>
            <strong>{isAdmin ? adminUsers.length : isSellerWorkspaceEnabled ? sellerOrders.length : 0}</strong>
            <span>{isAdmin ? "Usuarios en control" : "Pedidos del seller"}</span>
          </article>
        </div>
      </section>

      <section className="top-grid">
        <CatalogSection
          busyAction={busyAction}
          catalogError={catalogError}
          catalogLoading={catalogLoading}
          categories={categories}
          onAddToCart={handleAddToCart}
          onCategoryChange={setSelectedCategoryId}
          onNextPage={() => setCatalogPage((current) => current + 1)}
          onPreviousPage={() => setCatalogPage((current) => Math.max(1, current - 1))}
          onSearchChange={setSearchInput}
          onSortChange={setCatalogSort}
          pagination={catalogPagination}
          products={catalogProducts}
          searchInput={searchInput}
          selectedCategoryId={selectedCategoryId}
          sort={catalogSort}
        />

        <aside className="identity-panel">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Acceso</span>
              <h2>{authMode === "register" ? "Crear cuenta" : "Iniciar sesion"}</h2>
            </div>
          </div>

          <div className="mode-switch">
            <button
              className={authMode === "register" ? "is-active" : ""}
              onClick={() => setAuthMode("register")}
              type="button"
            >
              Registro
            </button>
            <button
              className={authMode === "login" ? "is-active" : ""}
              onClick={() => setAuthMode("login")}
              type="button"
            >
              Login
            </button>
          </div>

          {authMode === "register" ? (
            <form className="stack-form" onSubmit={handleRegister}>
              <label>
                Nombre
                <input
                  autoComplete="name"
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ada Lovelace"
                  required
                  value={registerForm.name}
                />
              </label>
              <label>
                Email
                <input
                  autoComplete="email"
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="ada@technexus.com"
                  required
                  type="email"
                  value={registerForm.email}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="Minimo 8 caracteres"
                  required
                  type="password"
                  value={registerForm.password}
                />
              </label>
              <label>
                Rol
                <select
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      role: event.target.value as Exclude<UserRole, "admin">
                    }))
                  }
                  value={registerForm.role}
                >
                  <option value="customer">Customer</option>
                  <option value="seller">Seller</option>
                </select>
              </label>
              <button disabled={busyAction === "register"} type="submit">
                {busyAction === "register" ? "Creando cuenta..." : "Registrarme"}
              </button>
            </form>
          ) : (
            <form className="stack-form" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  autoComplete="email"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="ada@technexus.com"
                  required
                  type="email"
                  value={loginForm.email}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete="current-password"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Tu password"
                  required
                  type="password"
                  value={loginForm.password}
                />
              </label>
              <button disabled={busyAction === "login"} type="submit">
                {busyAction === "login" ? "Validando..." : "Entrar"}
              </button>
            </form>
          )}

          <div className="profile-box">
            <div className="profile-box__header">
              <span className="section-heading__eyebrow">Perfil</span>
              {user ? (
                <button className="ghost-button" onClick={handleLogout} type="button">
                  Cerrar sesion
                </button>
              ) : null}
            </div>

            {sessionLoading ? (
              <p className="panel-note">Cargando sesion...</p>
            ) : user ? (
              <div className="profile-box__details">
                <div className="role-chip">{user.role}</div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <small>ID: {user.id}</small>
              </div>
            ) : (
              <p className="panel-note">
                Inicia sesion para guardar carrito, completar checkout y ver tus pedidos.
              </p>
            )}

            <p className="panel-note">{authMessage}</p>
            {authError ? <p className="panel-error">{authError}</p> : null}
          </div>
        </aside>
      </section>

      {isAuthenticated ? (
        <section className="alerts-panel">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Alertas</span>
              <h2>Pedidos y mensajes que necesitan atencion</h2>
            </div>
          </div>

          <div className="alerts-grid">
            <article className="alert-card">
              <span className="role-chip">Mensajes</span>
              <h3>{messageUnreadCount > 0 ? `${messageUnreadCount} pendientes` : "Todo al dia"}</h3>
              <p>
                {messageUnreadCount > 0
                  ? "Tienes mensajes nuevos en la bandeja interna."
                  : "No hay mensajes sin leer en este momento."}
              </p>
            </article>

            <article className="alert-card">
              <span className="role-chip">Cliente</span>
              <h3>{customerActiveOrders} pedidos activos</h3>
              <p>
                {customerActiveOrders > 0
                  ? "Tus pedidos siguen en seguimiento hasta la entrega."
                  : "No tienes pedidos en transito ahora mismo."}
              </p>
            </article>

            {isSellerWorkspaceEnabled ? (
              <article className="alert-card">
                <span className="role-chip">Seller</span>
                <h3>{sellerPendingOrders} pedidos pendientes</h3>
                <p>
                  {sellerPendingOrders > 0
                    ? "Revisa los pedidos seller para actualizar su estado."
                    : "No hay pedidos seller pendientes por atender."}
                </p>
              </article>
            ) : null}

            {isAdmin ? (
              <article className="alert-card">
                <span className="role-chip">Admin</span>
                <h3>{adminPendingOrders} pedidos globales pendientes</h3>
                <p>
                  {adminPendingOrders > 0
                    ? "El panel admin ya tiene pedidos que requieren seguimiento."
                    : "No hay pedidos globales pendientes en este momento."}
                </p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="commerce-grid">
        <section className="commerce-panel">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Carrito</span>
              <h2>Pedido listo para entrega y pago en efectivo</h2>
            </div>
            <span className="section-heading__status">
              Total: {currencyFormatter.format(cart.total)}
            </span>
          </div>

          {isAuthenticated ? (
            <>
              {cart.items.length > 0 ? (
                <div className="cart-list">
                  {cart.items.map((item) => (
                    <article className="cart-row" key={item.id}>
                      <div className="cart-row__media">
                        {item.productImages[0] ? (
                          <img
                            alt={item.productName}
                            loading="lazy"
                            src={toAssetUrl(item.productImages[0])}
                          />
                        ) : (
                          <div className="product-card__placeholder">Sin imagen</div>
                        )}
                      </div>
                      <div className="cart-row__content">
                        <h3>{item.productName}</h3>
                        <p>{item.productDescription}</p>
                        <div className="cart-row__meta">
                          <span>Cantidad: {item.quantity}</span>
                          <span>{currencyFormatter.format(item.productPrice)} c/u</span>
                          <span>{item.categoryName}</span>
                        </div>
                      </div>
                      <div className="cart-row__aside">
                        <strong>{currencyFormatter.format(item.subtotal)}</strong>
                        <button
                          className="ghost-button"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          type="button"
                        >
                          {busyAction === `remove-cart-${item.productId}`
                            ? "Quitando..."
                            : "Quitar"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Tu carrito esta vacio.</h3>
                  <p>Agrega productos desde el catalogo para preparar tu compra.</p>
                </div>
              )}

              <div className="checkout-box">
                <div>
                  <strong>Entrega con pago en efectivo</strong>
                  <p>
                    El pedido se registra como <code>pending</code> y el cobro se realiza al
                    momento de la entrega.
                  </p>
                </div>
                <button
                  disabled={cart.items.length === 0 || busyAction === "checkout"}
                  onClick={handleCheckout}
                  type="button"
                >
                  {busyAction === "checkout" ? "Procesando..." : "Confirmar checkout"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>El carrito se activa al iniciar sesion.</h3>
              <p>Accede con tu cuenta para guardar productos y generar pedidos.</p>
            </div>
          )}

          <p className="panel-note panel-note--commerce">{shoppingMessage}</p>
          {shoppingError ? <p className="panel-error">{shoppingError}</p> : null}
        </section>

        <section className="commerce-panel">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Mis pedidos</span>
              <h2>Historial del cliente</h2>
            </div>
          </div>

          {isAuthenticated ? (
            customerOrders.length > 0 ? (
              <div className="orders-list">
                {customerOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card__header">
                      <div>
                        <span className={`status-chip status-chip--${order.status}`}>
                          {statusLabelMap[order.status]}
                        </span>
                        <h3>Pedido {order.id.slice(0, 8)}</h3>
                      </div>
                      <div className="order-card__summary">
                        <strong>{currencyFormatter.format(order.total)}</strong>
                        <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                      </div>
                    </div>
                    <div className="order-items">
                      {order.items.map((item) => (
                        <div className="order-item" key={item.id}>
                          <div>
                            <strong>{item.productName}</strong>
                            <p>{item.productDescription}</p>
                          </div>
                          <div className="order-item__meta">
                            <span>
                              {item.quantity} x {currencyFormatter.format(item.price)}
                            </span>
                            <span>{item.sellerName}</span>
                            <strong>{currencyFormatter.format(item.subtotal)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Todavia no tienes pedidos.</h3>
                <p>Tu historial aparecera aqui despues del primer checkout.</p>
              </div>
            )
          ) : (
            <div className="empty-state">
              <h3>Tu historial se habilita con la sesion activa.</h3>
              <p>Inicia sesion para ver los pedidos asociados a tu cuenta.</p>
            </div>
          )}

          {isAuthenticated ? (
            <PaginationControls
              onNext={() => setCustomerOrdersPage((current) => current + 1)}
              onPrevious={() =>
                setCustomerOrdersPage((current) => Math.max(1, current - 1))
              }
              pagination={customerOrdersPagination}
            />
          ) : null}
        </section>
      </section>

      {isAuthenticated ? (
        <section className="messages-panel">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Mensajes</span>
              <h2>Bandeja interna entre cliente y vendedor</h2>
            </div>
            {messagesLoading ? (
              <span className="section-heading__status">Actualizando conversaciones...</span>
            ) : (
              <span className="section-heading__status">
                {messageUnreadCount} sin leer
              </span>
            )}
          </div>

          <p className="panel-note panel-note--admin">{messagePanelMessage}</p>
          {messagePanelError ? <p className="panel-error">{messagePanelError}</p> : null}

          <div className="messages-layout">
            <aside className="messages-contacts">
              {messageContacts.length > 0 ? (
                messageContacts.map((contact) => (
                  <button
                    className={
                      selectedMessageContactId === contact.id
                        ? "message-contact is-active"
                        : "message-contact"
                    }
                    key={contact.id}
                    onClick={() => handleSelectMessageContact(contact.id)}
                    type="button"
                  >
                    <span className="role-chip">{contact.role}</span>
                    <strong>{contact.name}</strong>
                    <small>{contact.email}</small>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <h3>No hay conversaciones todavia.</h3>
                  <p>Cuando hagas una compra o recibas un mensaje, aparecera aqui.</p>
                </div>
              )}
            </aside>

            <div className="messages-main">
              <form className="stack-form message-form" onSubmit={handleSendMessage}>
                <div className="two-columns">
                  <label>
                    Destinatario
                    <select
                      onChange={(event) => handleSelectMessageContact(event.target.value)}
                      required
                      value={messageForm.recipientId}
                    >
                      <option value="">Selecciona un contacto</option>
                      {messageContacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} ({contact.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Pedido relacionado
                    <select
                      onChange={(event) =>
                        setMessageForm((current) => ({
                          ...current,
                          orderId: event.target.value
                        }))
                      }
                      value={messageForm.orderId}
                    >
                      <option value="">Sin pedido</option>
                      {relatedOrdersForContact.map((order) => (
                        <option key={order.id} value={order.id}>
                          Pedido {order.id.slice(0, 8)} · {statusLabelMap[order.status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Asunto
                  <input
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        subject: event.target.value
                      }))
                    }
                    placeholder="Seguimiento del pedido"
                    required
                    value={messageForm.subject}
                  />
                </label>
                <label>
                  Mensaje
                  <textarea
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        body: event.target.value
                      }))
                    }
                    placeholder="Escribe un mensaje claro y directo..."
                    required
                    rows={4}
                    value={messageForm.body}
                  />
                </label>
                <button disabled={busyAction === "message-send"} type="submit">
                  {busyAction === "message-send" ? "Enviando..." : "Enviar mensaje"}
                </button>
              </form>

              <div className="messages-thread">
                {selectedMessageContactId ? (
                  conversationMessages.length > 0 ? (
                    [...conversationMessages]
                      .sort(
                        (left, right) =>
                          new Date(left.createdAt).getTime() -
                          new Date(right.createdAt).getTime()
                      )
                      .map((message) => {
                        const isOwnMessage = message.senderId === user?.id;

                        return (
                          <article
                            className={
                              isOwnMessage ? "message-bubble is-own" : "message-bubble"
                            }
                            key={message.id}
                          >
                            <div className="message-bubble__meta">
                              <strong>{isOwnMessage ? "Tu" : message.senderName}</strong>
                              <span>{dateFormatter.format(new Date(message.createdAt))}</span>
                            </div>
                            <h3>{message.subject}</h3>
                            {message.orderId ? (
                              <p className="panel-note">Pedido: {message.orderId.slice(0, 8)}</p>
                            ) : null}
                            <p>{message.body}</p>
                          </article>
                        );
                      })
                  ) : (
                    <div className="empty-state">
                      <h3>No hay mensajes en esta conversacion.</h3>
                      <p>Envía el primer mensaje para abrir el hilo.</p>
                    </div>
                  )
                ) : (
                  <div className="empty-state">
                    <h3>Selecciona un contacto.</h3>
                    <p>El historial aparecera aqui cuando elijas a un comprador o vendedor.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="admin-panel">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Admin Console</span>
              <h2>Panel global con acciones protegidas por rol admin</h2>
            </div>
            {(adminUsersLoading || adminProductsLoading || adminOrdersLoading) ? (
              <span className="section-heading__status">Sincronizando datos globales...</span>
            ) : null}
          </div>

          <div className="admin-tabs">
            {(Object.keys(adminTabLabelMap) as AdminTab[]).map((tab) => (
              <button
                className={adminTab === tab ? "is-active" : ""}
                key={tab}
                onClick={() => setAdminTab(tab)}
                type="button"
              >
                {adminTabLabelMap[tab]}
              </button>
            ))}
          </div>

          <p className="panel-note panel-note--admin">{adminMessage}</p>
          {adminError ? <p className="panel-error">{adminError}</p> : null}

          {adminTab === "users" ? (
            <div className="admin-panel__body">
              <div className="admin-grid">
                {adminUsers.length > 0 ? (
                  adminUsers.map((managedUser) => {
                    const draft = adminUserDrafts[managedUser.id] ?? {
                      name: managedUser.name,
                      email: managedUser.email,
                      role: managedUser.role,
                      isBlocked: managedUser.isBlocked
                    };

                    return (
                      <article className="admin-card" key={managedUser.id}>
                        <div className="admin-card__header">
                          <div>
                            <span className="role-chip">{managedUser.role}</span>
                            <h3>{managedUser.name}</h3>
                          </div>
                          <div className="admin-card__status">
                            <span
                              className={`status-chip ${
                                managedUser.isBlocked
                                  ? "status-chip--pending"
                                  : "status-chip--paid"
                              }`}
                            >
                              {managedUser.isBlocked ? "Bloqueado" : "Activo"}
                            </span>
                          </div>
                        </div>

                        <div className="admin-form-grid">
                          <label>
                            Nombre
                            <input
                              onChange={(event) =>
                                handleAdminUserDraftChange(
                                  managedUser.id,
                                  "name",
                                  event.target.value
                                )
                              }
                              value={draft.name}
                            />
                          </label>
                          <label>
                            Email
                            <input
                              onChange={(event) =>
                                handleAdminUserDraftChange(
                                  managedUser.id,
                                  "email",
                                  event.target.value
                                )
                              }
                              type="email"
                              value={draft.email}
                            />
                          </label>
                          <label>
                            Rol
                            <select
                              onChange={(event) =>
                                handleAdminUserDraftChange(
                                  managedUser.id,
                                  "role",
                                  event.target.value as UserRole
                                )
                              }
                              value={draft.role}
                            >
                              <option value="customer">Customer</option>
                              <option value="seller">Seller</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                          <label className="admin-toggle">
                            <span>Bloqueo</span>
                            <input
                              checked={draft.isBlocked}
                              onChange={(event) =>
                                handleAdminUserDraftChange(
                                  managedUser.id,
                                  "isBlocked",
                                  event.target.checked
                                )
                              }
                              type="checkbox"
                            />
                          </label>
                        </div>

                        <div className="admin-card__meta">
                          <span>{managedUser.email}</span>
                          <span>
                            Alta:{" "}
                            {managedUser.createdAt
                              ? dateFormatter.format(new Date(managedUser.createdAt))
                              : "sin fecha"}
                          </span>
                        </div>

                        <div className="admin-card__actions">
                          <button
                            disabled={busyAction === `admin-user-save-${managedUser.id}`}
                            onClick={() => handleAdminUserSave(managedUser.id)}
                            type="button"
                          >
                            {busyAction === `admin-user-save-${managedUser.id}`
                              ? "Guardando..."
                              : "Guardar cambios"}
                          </button>
                          <button
                            className="ghost-button"
                            disabled={busyAction === `admin-user-delete-${managedUser.id}`}
                            onClick={() => handleAdminUserDelete(managedUser)}
                            type="button"
                          >
                            {busyAction === `admin-user-delete-${managedUser.id}`
                              ? "Eliminando..."
                              : "Eliminar"}
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <h3>No hay usuarios para gestionar.</h3>
                    <p>Cuando existan cuentas registradas apareceran en este panel.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {adminTab === "sellers" ? (
            <div className="admin-panel__body">
              <div className="admin-grid admin-grid--compact">
                {adminSellers.length > 0 ? (
                  adminSellers.map((seller) => (
                    <article className="admin-card" key={seller.id}>
                      <div className="admin-card__header">
                        <div>
                          <span className="role-chip">seller</span>
                          <h3>{seller.name}</h3>
                        </div>
                        <span
                          className={`status-chip ${
                            seller.isBlocked ? "status-chip--pending" : "status-chip--paid"
                          }`}
                        >
                          {seller.isBlocked ? "Bloqueado" : "Operativo"}
                        </span>
                      </div>
                      <p className="panel-note">{seller.email}</p>
                      <div className="admin-card__meta">
                        <span>ID: {seller.id.slice(0, 8)}</span>
                        <span>
                          Alta:{" "}
                          {seller.createdAt
                            ? dateFormatter.format(new Date(seller.createdAt))
                            : "sin fecha"}
                        </span>
                      </div>
                      <div className="admin-card__actions">
                        <button onClick={handleAdminOpenUserTab} type="button">
                          Gestionar en Usuarios
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No hay vendedores registrados.</h3>
                    <p>Los sellers activos apareceran aqui para seguimiento rapido.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {adminTab === "products" ? (
            <div className="admin-panel__body">
              <div className="admin-toolbar">
                <label>
                  Buscar producto
                  <input
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      startTransition(() => {
                        setAdminProductSearchInput(nextValue);
                      });
                    }}
                    placeholder="Laptop, camara, docking..."
                    value={adminProductSearchInput}
                  />
                </label>
                <label>
                  Vendedor
                  <select
                    onChange={(event) => setAdminProductSellerId(event.target.value)}
                    value={adminProductSellerId}
                  >
                    <option value="">Todos</option>
                    {adminSellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Categoria
                  <select
                    onChange={(event) => setAdminProductCategoryId(event.target.value)}
                    value={adminProductCategoryId}
                  >
                    <option value="">Todas</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {adminEditingProductId ? (
                <section className="admin-editor">
                  <div className="studio-panel__header">
                    <h3>Editar producto global</h3>
                    <button className="ghost-button" onClick={resetAdminProductForm} type="button">
                      Cancelar
                    </button>
                  </div>

                  <form className="stack-form" onSubmit={handleAdminProductSubmit}>
                    <label>
                      Nombre
                      <input
                        onChange={(event) =>
                          setAdminProductForm((current) => ({
                            ...current,
                            name: event.target.value
                          }))
                        }
                        required
                        value={adminProductForm.name}
                      />
                    </label>
                    <label>
                      Descripcion
                      <textarea
                        onChange={(event) =>
                          setAdminProductForm((current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                        required
                        rows={4}
                        value={adminProductForm.description}
                      />
                    </label>
                    <div className="two-columns">
                      <label>
                        Precio
                        <input
                          min="0"
                          onChange={(event) =>
                            setAdminProductForm((current) => ({
                              ...current,
                              price: event.target.value
                            }))
                          }
                          required
                          step="0.01"
                          type="number"
                          value={adminProductForm.price}
                        />
                      </label>
                      <label>
                        Stock
                        <input
                          min="0"
                          onChange={(event) =>
                            setAdminProductForm((current) => ({
                              ...current,
                              stock: event.target.value
                            }))
                          }
                          required
                          step="1"
                          type="number"
                          value={adminProductForm.stock}
                        />
                      </label>
                    </div>
                    <label>
                      Categoria
                      <select
                        onChange={(event) =>
                          setAdminProductForm((current) => ({
                            ...current,
                            categoryId: event.target.value
                          }))
                        }
                        required
                        value={adminProductForm.categoryId}
                      >
                        <option value="">Selecciona una categoria</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Imagenes nuevas
                      <input
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        onChange={handleAdminProductFileChange}
                        type="file"
                      />
                    </label>
                    <p className="panel-note">
                      Si no subes nuevas imagenes, se conservaran las actuales del producto.
                    </p>
                    {adminProductFiles.length > 0 ? (
                      <ul className="file-list">
                        {adminProductFiles.map((file) => (
                          <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="inline-actions">
                      <button disabled={busyAction === "admin-product"} type="submit">
                        {busyAction === "admin-product"
                          ? "Guardando..."
                          : "Guardar producto"}
                      </button>
                      <button className="ghost-button" onClick={resetAdminProductForm} type="button">
                        Cancelar edicion
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              <div className="my-products admin-products-list">
                {adminProducts.length > 0 ? (
                  adminProducts.map((product) => (
                    <article className="my-product-row" key={product.id}>
                      <div className="my-product-row__media">
                        {product.images[0] ? (
                          <img
                            alt={product.name}
                            loading="lazy"
                            src={toAssetUrl(product.images[0])}
                          />
                        ) : (
                          <div className="product-card__placeholder">Sin imagen</div>
                        )}
                      </div>
                      <div className="my-product-row__content">
                        <h4>{product.name}</h4>
                        <p>{product.description}</p>
                        <div className="my-product-row__meta">
                          <span>{currencyFormatter.format(product.price)}</span>
                          <span>Stock {product.stock}</span>
                          <span>{product.categoryName}</span>
                          <span>Seller {product.sellerName}</span>
                        </div>
                      </div>
                      <div className="my-product-row__actions">
                        <button onClick={() => handleAdminProductEdit(product)} type="button">
                          Editar
                        </button>
                        <button onClick={() => handleAdminProductDelete(product)} type="button">
                          {busyAction === `admin-product-delete-${product.id}`
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No hay productos para ese filtro.</h3>
                    <p>Ajusta la busqueda, el vendedor o la categoria para ampliar resultados.</p>
                  </div>
                )}

                <PaginationControls
                  onNext={() => setAdminProductsPage((current) => current + 1)}
                  onPrevious={() =>
                    setAdminProductsPage((current) => Math.max(1, current - 1))
                  }
                  pagination={adminProductsPagination}
                />
              </div>
            </div>
          ) : null}

          {adminTab === "orders" ? (
            <div className="admin-panel__body">
              <div className="admin-toolbar admin-toolbar--orders">
                <label>
                  Estado
                  <select
                    onChange={(event) =>
                      setAdminOrderStatus(event.target.value as "" | OrderStatus)
                    }
                    value={adminOrderStatus}
                  >
                    <option value="">Todos</option>
                    {Object.entries(statusLabelMap).map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Vendedor
                  <select
                    onChange={(event) => setAdminOrderSellerId(event.target.value)}
                    value={adminOrderSellerId}
                  >
                    <option value="">Todos</option>
                    {adminSellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Desde
                  <input
                    onChange={(event) => setAdminOrderDateFrom(event.target.value)}
                    type="date"
                    value={adminOrderDateFrom}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    onChange={(event) => setAdminOrderDateTo(event.target.value)}
                    type="date"
                    value={adminOrderDateTo}
                  />
                </label>
              </div>

              {adminOrders.length > 0 ? (
                <div className="orders-list">
                  {adminOrders.map((order) => (
                    <article className="order-card" key={order.id}>
                      <div className="order-card__header">
                        <div>
                          <span className={`status-chip status-chip--${order.status}`}>
                            {statusLabelMap[order.status]}
                          </span>
                          <h3>Pedido {order.id.slice(0, 8)}</h3>
                        </div>
                        <div className="order-card__summary">
                          <strong>{currencyFormatter.format(order.total)}</strong>
                          <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                        </div>
                      </div>
                      <div className="order-card__customer">
                        <span>Cliente: {order.userName}</span>
                        <span>{order.userEmail}</span>
                        <span>Sellers: {getOrderSellerSummary(order)}</span>
                      </div>
                      <div className="order-status-editor">
                        <label>
                          Estado
                          <select
                            onChange={(event) =>
                              setOrderStatusDrafts((current) => ({
                                ...current,
                                [order.id]: event.target.value as OrderStatus
                              }))
                            }
                            value={orderStatusDrafts[order.id] ?? order.status}
                          >
                            {Object.entries(statusLabelMap).map(([status, label]) => (
                              <option key={status} value={status}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          disabled={busyAction === `order-status-admin-${order.id}`}
                          onClick={() => handleOrderStatusUpdate(order.id, "admin")}
                          type="button"
                        >
                          {busyAction === `order-status-admin-${order.id}`
                            ? "Guardando..."
                            : "Actualizar estado"}
                        </button>
                      </div>
                      <div className="order-items">
                        {order.items.map((item) => (
                          <div className="order-item" key={item.id}>
                            <div>
                              <strong>{item.productName}</strong>
                              <p>{item.productDescription}</p>
                            </div>
                            <div className="order-item__meta">
                              <span>{item.sellerName}</span>
                              <span>
                                {item.quantity} x {currencyFormatter.format(item.price)}
                              </span>
                              <strong>{currencyFormatter.format(item.subtotal)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No hay pedidos para ese filtro.</h3>
                  <p>Prueba otro estado, rango de fechas o vendedor.</p>
                </div>
              )}

              <PaginationControls
                onNext={() => setAdminOrdersPage((current) => current + 1)}
                onPrevious={() =>
                  setAdminOrdersPage((current) => Math.max(1, current - 1))
                }
                pagination={adminOrdersPagination}
              />
            </div>
          ) : null}

          {adminTab === "ops" && token ? <AdminOpsPanel token={token} /> : null}
        </section>
      ) : null}

      {isSellerWorkspaceEnabled ? (
        <section className="commerce-panel commerce-panel--seller-orders">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">Pedidos Seller</span>
              <h2>Ordenes que incluyen tus productos</h2>
            </div>
          </div>

          {sellerOrders.length > 0 ? (
            <div className="orders-list">
              {sellerOrders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card__header">
                    <div>
                      <span className={`status-chip status-chip--${order.status}`}>
                        {statusLabelMap[order.status]}
                      </span>
                      <h3>Pedido {order.id.slice(0, 8)}</h3>
                    </div>
                    <div className="order-card__summary">
                      <strong>{currencyFormatter.format(order.total)}</strong>
                      <span>{order.userName}</span>
                    </div>
                  </div>
                  <div className="order-card__customer">
                    <span>Cliente: {order.userName}</span>
                    <span>{order.userEmail}</span>
                    <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                  </div>
                  <div className="order-status-editor">
                    <label>
                      Estado
                      <select
                        onChange={(event) =>
                          setOrderStatusDrafts((current) => ({
                            ...current,
                            [order.id]: event.target.value as OrderStatus
                          }))
                        }
                        value={orderStatusDrafts[order.id] ?? order.status}
                      >
                        {Object.entries(statusLabelMap).map(([status, label]) => (
                          <option key={status} value={status}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={busyAction === `order-status-seller-${order.id}`}
                      onClick={() => handleOrderStatusUpdate(order.id, "seller")}
                      type="button"
                    >
                      {busyAction === `order-status-seller-${order.id}`
                        ? "Guardando..."
                        : "Actualizar estado"}
                    </button>
                  </div>
                  <div className="order-items">
                    {order.items.map((item) => (
                      <div className="order-item" key={item.id}>
                        <div>
                          <strong>{item.productName}</strong>
                          <p>{item.productDescription}</p>
                        </div>
                        <div className="order-item__meta">
                          <span>
                            {item.quantity} x {currencyFormatter.format(item.price)}
                          </span>
                          <strong>{currencyFormatter.format(item.subtotal)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Aun no hay pedidos asociados a tus productos.</h3>
              <p>Cuando un cliente compre algo de tu catalogo, aparecera aqui.</p>
            </div>
          )}

          <PaginationControls
            onNext={() => setSellerOrdersPage((current) => current + 1)}
            onPrevious={() => setSellerOrdersPage((current) => Math.max(1, current - 1))}
            pagination={sellerOrdersPagination}
          />
        </section>
      ) : null}

      <section className="studio">
        <div className="section-heading">
          <div>
            <span className="section-heading__eyebrow">Seller Studio</span>
            <h2>Gestion de categorias y productos con imagenes</h2>
          </div>
          {!isSellerWorkspaceEnabled ? (
            <span className="section-heading__status">Disponible para sellers y admins</span>
          ) : null}
        </div>

        {isSellerWorkspaceEnabled ? (
          <div className="studio-grid">
            <section className="studio-panel">
              <h3>Categorias</h3>
              <form className="stack-form" onSubmit={handleCategorySubmit}>
                <label>
                  Nombre de categoria
                  <input
                    onChange={(event) => setCategoryForm({ name: event.target.value })}
                    placeholder="Gaming, Audio, Monitores..."
                    required
                    value={categoryForm.name}
                  />
                </label>
                <div className="inline-actions">
                  <button disabled={busyAction === "category"} type="submit">
                    {busyAction === "category"
                      ? "Guardando..."
                      : editingCategoryId
                        ? "Actualizar categoria"
                        : "Crear categoria"}
                  </button>
                  {editingCategoryId ? (
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm(defaultCategoryForm);
                      }}
                      type="button"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="tag-list">
                {categories.map((category) => (
                  <div className="tag-item" key={category.id}>
                    <span>{category.name}</span>
                    <div>
                      <button onClick={() => handleCategoryEdit(category)} type="button">
                        Editar
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category.id)}
                        type="button"
                      >
                        {busyAction === `delete-category-${category.id}`
                          ? "Eliminando..."
                          : "Borrar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="studio-panel">
              <h3>{editingProductId ? "Editar producto" : "Publicar producto"}</h3>
              <form className="stack-form" onSubmit={handleProductSubmit}>
                <label>
                  Nombre
                  <input
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Laptop Pro 14"
                    required
                    value={productForm.name}
                  />
                </label>
                <label>
                  Descripcion
                  <textarea
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    placeholder="Detalles tecnicos, beneficios y estado del producto"
                    required
                    rows={4}
                    value={productForm.description}
                  />
                </label>
                <div className="two-columns">
                  <label>
                    Precio
                    <input
                      min="0"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          price: event.target.value
                        }))
                      }
                      placeholder="1299.99"
                      required
                      step="0.01"
                      type="number"
                      value={productForm.price}
                    />
                  </label>
                  <label>
                    Stock
                    <input
                      min="0"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          stock: event.target.value
                        }))
                      }
                      placeholder="10"
                      required
                      step="1"
                      type="number"
                      value={productForm.stock}
                    />
                  </label>
                </div>
                <label>
                  Categoria
                  <select
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        categoryId: event.target.value
                      }))
                    }
                    required
                    value={productForm.categoryId}
                  >
                    <option value="">Selecciona una categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Imagenes
                  <input
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    onChange={handleProductFileChange}
                    type="file"
                  />
                </label>
                <p className="panel-note">
                  {editingProductId
                    ? "Si no subes nuevas imagenes, se conservaran las actuales."
                    : "Sube entre 1 y 5 imagenes JPG, PNG, WEBP o GIF de hasta 5MB cada una."}
                </p>
                {productFiles.length > 0 ? (
                  <ul className="file-list">
                    {productFiles.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="inline-actions">
                  <button disabled={busyAction === "product"} type="submit">
                    {busyAction === "product"
                      ? "Guardando..."
                      : editingProductId
                        ? "Actualizar producto"
                        : "Publicar producto"}
                  </button>
                  {editingProductId ? (
                    <button className="ghost-button" onClick={resetProductForm} type="button">
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="studio-panel studio-panel--wide">
              <div className="studio-panel__header">
                <h3>Mis productos</h3>
                {sessionLoading ? <span>Cargando...</span> : null}
              </div>

              {myProducts.length > 0 ? (
                <div className="my-products">
                  {myProducts.map((product) => (
                    <article className="my-product-row" key={product.id}>
                      <div className="my-product-row__media">
                        {product.images[0] ? (
                          <img
                            alt={product.name}
                            loading="lazy"
                            src={toAssetUrl(product.images[0])}
                          />
                        ) : (
                          <div className="product-card__placeholder">Sin imagen</div>
                        )}
                      </div>
                      <div className="my-product-row__content">
                        <h4>{product.name}</h4>
                        <p>{product.description}</p>
                        <div className="my-product-row__meta">
                          <span>{currencyFormatter.format(product.price)}</span>
                          <span>Stock {product.stock}</span>
                          <span>{product.categoryName}</span>
                        </div>
                      </div>
                      <div className="my-product-row__actions">
                        <button onClick={() => handleProductEdit(product)} type="button">
                          Editar
                        </button>
                        <button onClick={() => handleProductDelete(product.id)} type="button">
                          {busyAction === `delete-product-${product.id}`
                            ? "Borrando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="panel-note">
                  Todavia no has publicado productos. Crea una categoria y sube tu primer item.
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="empty-state empty-state--studio">
            <h3>El seller studio espera una cuenta con rol seller.</h3>
            <p>
              Registra una cuenta seller o inicia sesion con una ya existente para gestionar
              categorias, productos y pedidos.
            </p>
          </div>
        )}

        <p className="panel-note panel-note--studio">{sellerMessage}</p>
        {sellerError ? <p className="panel-error">{sellerError}</p> : null}
      </section>
    </main>
  );
}
