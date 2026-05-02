import type { OrderRecord, Product, PublicUser } from "@/features/api/types";

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "demo-product-1",
    name: "AetherBook Pro 14",
    description: "High-performance laptop configured for realistic demo checkout and seller flows.",
    price: 1499,
    stock: 27,
    categoryId: "demo-category-laptops",
    categoryName: "Laptops",
    sellerId: "demo-seller-1",
    sellerName: "Nova Devices",
    averageRating: 4.8,
    reviewCount: 126,
    images: ["https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80"]
  },
  {
    id: "demo-product-2",
    name: "Pulse Mechanical Keyboard",
    description: "Wireless mechanical keyboard popular in recent demo sessions.",
    price: 129,
    stock: 82,
    categoryId: "demo-category-accessories",
    categoryName: "Accessories",
    sellerId: "demo-seller-2",
    sellerName: "Orbit Peripherals",
    averageRating: 4.6,
    reviewCount: 89,
    images: ["https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80"]
  },
  {
    id: "demo-product-3",
    name: "Nimbus 27\" 4K Display",
    description: "Color-accurate monitor used to demonstrate multi-seller cart composition.",
    price: 499,
    stock: 31,
    categoryId: "demo-category-monitors",
    categoryName: "Monitors",
    sellerId: "demo-seller-1",
    sellerName: "Nova Devices",
    averageRating: 4.7,
    reviewCount: 54,
    images: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80"]
  }
];

export const DEMO_SELLERS: PublicUser[] = [
  { id: "demo-seller-1", name: "Sam Rivera", email: "demo.seller@example.com", role: "seller", isBlocked: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "demo-seller-2", name: "Jordan Kim", email: "demo.seller2@example.com", role: "seller", isBlocked: false, createdAt: "2026-01-01T00:00:00.000Z" }
];

export const DEMO_ORDERS: OrderRecord[] = [
  {
    id: "demo-order-1",
    userId: "demo-customer-1",
    userName: "Alex Johnson",
    userEmail: "demo.customer@example.com",
    userPhone: "+1-555-0100",
    shippingAddress: "500 Market St, San Francisco, CA",
    shippingCost: 0,
    paymentMethod: "cash_on_delivery",
    total: 1628,
    status: "paid",
    createdAt: "2026-04-20T14:22:00.000Z",
    items: [
      {
        id: "demo-item-1",
        productId: "demo-product-1",
        productName: "AetherBook Pro 14",
        productDescription: "High-performance laptop configured for realistic demo checkout and seller flows.",
        sellerId: "demo-seller-1",
        sellerName: "Nova Devices",
        sellerEmail: "demo.seller@example.com",
        quantity: 1,
        price: 1499,
        subtotal: 1499,
        images: ["https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80"]
      }
    ]
  }
];
