import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma, UserRole, OrderStatus } from "@prisma/client";
import { env } from "../src/utils/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl
    }
  }
});

const sellerPassword = "Seller1234!";
const customerPassword = "Customer1234!";

const demoSellers = [
  {
    name: "Lina Morales",
    email: "seller.one@technexus.local",
    locationName: "Centro Seller Norte"
  },
  {
    name: "Diego Salazar",
    email: "seller.two@technexus.local",
    locationName: "Centro Seller Sur"
  }
] as const;

const demoCustomers = [
  {
    name: "Paula Herrera",
    email: "customer.one@technexus.local"
  },
  {
    name: "Martin Vega",
    email: "customer.two@technexus.local"
  },
  {
    name: "Sofia Rojas",
    email: "customer.three@technexus.local"
  }
] as const;

const demoCategories = [
  "Electronica",
  "Oficina y hogar",
  "Herramientas"
] as const;

const demoProducts = [
  {
    sellerEmail: "seller.one@technexus.local",
    categoryName: "Electronica",
    name: "Auriculares Pro NX1",
    description: "Auriculares inalambricos con cancelacion de ruido y bateria extendida.",
    price: "129.90",
    initialStock: 20,
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    sellerEmail: "seller.one@technexus.local",
    categoryName: "Oficina y hogar",
    name: "Teclado Mecanico Forge K2",
    description: "Teclado mecanico compacto con switches tactiles y retroiluminacion.",
    price: "89.50",
    initialStock: 16,
    images: [
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    sellerEmail: "seller.one@technexus.local",
    categoryName: "Electronica",
    name: "Webcam Studio 4K",
    description: "Webcam 4K con autofocus y microfonos duales para streaming.",
    price: "149.00",
    initialStock: 14,
    images: [
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    sellerEmail: "seller.two@technexus.local",
    categoryName: "Herramientas",
    name: "Taladro Smart Drill X",
    description: "Taladro percutor con control inteligente de torque y bateria incluida.",
    price: "199.90",
    initialStock: 12,
    images: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    sellerEmail: "seller.two@technexus.local",
    categoryName: "Oficina y hogar",
    name: "Monitor UltraWide 34",
    description: "Monitor ultrapanoramico de 34 pulgadas para productividad y multitarea.",
    price: "429.00",
    initialStock: 10,
    images: [
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    sellerEmail: "seller.two@technexus.local",
    categoryName: "Electronica",
    name: "Router Mesh Atlas 6",
    description: "Router Wi-Fi 6 mesh con cobertura ampliada para hogar y oficina.",
    price: "159.00",
    initialStock: 18,
    images: [
      "https://images.unsplash.com/photo-1647427060118-4911c9821b82?auto=format&fit=crop&w=1200&q=80"
    ]
  }
] as const;

const demoOrders = [
  {
    customerEmail: "customer.one@technexus.local",
    buyerPhone: "+57 300 000 1001",
    shippingAddress: "Calle 100 #10-20, Bogota",
    shippingCost: 8.5,
    status: OrderStatus.pending,
    items: [
      { productName: "Auriculares Pro NX1", quantity: 1 },
      { productName: "Router Mesh Atlas 6", quantity: 1 }
    ]
  },
  {
    customerEmail: "customer.two@technexus.local",
    buyerPhone: "+57 300 000 1002",
    shippingAddress: "Cra 45 #82-11, Medellin",
    shippingCost: 10,
    status: OrderStatus.shipped,
    items: [
      { productName: "Teclado Mecanico Forge K2", quantity: 1 },
      { productName: "Monitor UltraWide 34", quantity: 1 }
    ]
  },
  {
    customerEmail: "customer.three@technexus.local",
    buyerPhone: "+57 300 000 1003",
    shippingAddress: "Av. 6N #28-33, Cali",
    shippingCost: 12.25,
    status: OrderStatus.delivered,
    items: [
      { productName: "Webcam Studio 4K", quantity: 1 },
      { productName: "Taladro Smart Drill X", quantity: 2 }
    ]
  }
] as const;

const findOrCreateProduct = async (
  tx: Prisma.TransactionClient,
  input: {
    sellerId: string;
    categoryId: string;
    name: string;
    description: string;
    price: string;
  }
) => {
  const existing = await tx.product.findFirst({
    where: {
      sellerId: input.sellerId,
      name: input.name
    }
  });

  if (existing) {
    return tx.product.update({
      where: { id: existing.id },
      data: {
        categoryId: input.categoryId,
        description: input.description,
        price: input.price,
        deletedAt: null
      }
    });
  }

  return tx.product.create({
    data: {
      sellerId: input.sellerId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      stock: 0
    }
  });
};

async function main() {
  const adminPasswordHash = await bcrypt.hash(
    env.TECHNEXUS_ADMIN_PASSWORD,
    env.PASSWORD_SALT_ROUNDS
  );
  const sellerPasswordHash = await bcrypt.hash(sellerPassword, env.PASSWORD_SALT_ROUNDS);
  const customerPasswordHash = await bcrypt.hash(customerPassword, env.PASSWORD_SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: env.TECHNEXUS_ADMIN_EMAIL.toLowerCase() },
    update: {
      name: "TechNexus Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.admin,
      deletedAt: null,
      isBlocked: false
    },
    create: {
      name: "TechNexus Admin",
      email: env.TECHNEXUS_ADMIN_EMAIL.toLowerCase(),
      passwordHash: adminPasswordHash,
      role: UserRole.admin,
      isBlocked: false
    }
  });

  const sellers = new Map<string, { id: string; name: string; email: string }>();
  for (const seller of demoSellers) {
    const record = await prisma.user.upsert({
      where: { email: seller.email },
      update: {
        name: seller.name,
        passwordHash: sellerPasswordHash,
        role: UserRole.seller,
        deletedAt: null,
        isBlocked: false
      },
      create: {
        name: seller.name,
        email: seller.email,
        passwordHash: sellerPasswordHash,
        role: UserRole.seller,
        isBlocked: false
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    sellers.set(seller.email, record);
  }

  const customers = new Map<string, { id: string; name: string; email: string }>();
  for (const customer of demoCustomers) {
    const record = await prisma.user.upsert({
      where: { email: customer.email },
      update: {
        name: customer.name,
        passwordHash: customerPasswordHash,
        role: UserRole.customer,
        deletedAt: null,
        isBlocked: false
      },
      create: {
        name: customer.name,
        email: customer.email,
        passwordHash: customerPasswordHash,
        role: UserRole.customer,
        isBlocked: false
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    customers.set(customer.email, record);
  }

  const categories = new Map<string, { id: string; name: string }>();
  for (const categoryName of demoCategories) {
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: {
        deletedAt: null
      },
      create: {
        name: categoryName
      },
      select: {
        id: true,
        name: true
      }
    });
    categories.set(categoryName, category);
  }

  const orderedUnitsByProduct = new Map<string, number>();
  for (const order of demoOrders) {
    for (const item of order.items) {
      orderedUnitsByProduct.set(
        item.productName,
        (orderedUnitsByProduct.get(item.productName) ?? 0) + item.quantity
      );
    }
  }

  const products = new Map<
    string,
    {
      id: string;
      name: string;
      description: string;
      price: string;
      sellerId: string;
      sellerName: string;
      sellerEmail: string;
      imageUrls: string[];
    }
  >();

  await prisma.$transaction(async (tx) => {
    for (const seller of demoSellers) {
      const sellerRecord = sellers.get(seller.email);
      if (!sellerRecord) {
        throw new Error(`Missing seller record for ${seller.email}`);
      }

      const existingLocation = await tx.location.findFirst({
        where: {
          sellerId: sellerRecord.id,
          name: seller.locationName
        }
      });

      const location = existingLocation
        ? await tx.location.update({
            where: { id: existingLocation.id },
            data: {
              deletedAt: null,
              address: `Bodega principal de ${sellerRecord.name}`
            }
          })
        : await tx.location.create({
            data: {
              sellerId: sellerRecord.id,
              name: seller.locationName,
              address: `Bodega principal de ${sellerRecord.name}`
            }
          });

      for (const product of demoProducts.filter((item) => item.sellerEmail === seller.email)) {
        const category = categories.get(product.categoryName);
        if (!category) {
          throw new Error(`Missing category ${product.categoryName}`);
        }

        const productRecord = await findOrCreateProduct(tx, {
          sellerId: sellerRecord.id,
          categoryId: category.id,
          name: product.name,
          description: product.description,
          price: product.price
        });

        await tx.productImage.deleteMany({
          where: { productId: productRecord.id }
        });

        await tx.productImage.createMany({
          data: product.images.map((url, index) => ({
            productId: productRecord.id,
            url,
            kind: "url",
            position: index
          }))
        });

        const remainingStock = Math.max(
          product.initialStock - (orderedUnitsByProduct.get(product.name) ?? 0),
          0
        );

        await tx.inventory.upsert({
          where: {
            productId_locationId: {
              productId: productRecord.id,
              locationId: location.id
            }
          },
          update: {
            quantity: remainingStock,
            lowStockThreshold: 5,
            deletedAt: null
          },
          create: {
            productId: productRecord.id,
            locationId: location.id,
            quantity: remainingStock,
            lowStockThreshold: 5
          }
        });

        await tx.product.update({
          where: { id: productRecord.id },
          data: {
            stock: remainingStock
          }
        });

        products.set(product.name, {
          id: productRecord.id,
          name: product.name,
          description: product.description,
          price: product.price,
          sellerId: sellerRecord.id,
          sellerName: sellerRecord.name,
          sellerEmail: sellerRecord.email,
          imageUrls: [...product.images]
        });
      }
    }

    await tx.order.deleteMany({
      where: {
        buyerEmail: {
          in: demoCustomers.map((customer) => customer.email)
        }
      }
    });

    for (const [index, order] of demoOrders.entries()) {
      const customer = customers.get(order.customerEmail);
      if (!customer) {
        throw new Error(`Missing customer record for ${order.customerEmail}`);
      }

      const orderItems = order.items.map((item) => {
        const product = products.get(item.productName);
        if (!product) {
          throw new Error(`Missing product record for ${item.productName}`);
        }

        const subtotal = Number(product.price) * item.quantity;
        return {
          productId: product.id,
          sellerId: product.sellerId,
          productName: product.name,
          productDescription: product.description,
          sellerName: product.sellerName,
          sellerEmail: product.sellerEmail,
          quantity: item.quantity,
          price: product.price,
          subtotal: subtotal.toFixed(2),
          images: product.imageUrls
        };
      });

      const itemsSubtotal = orderItems
        .reduce((sum, item) => sum + Number(item.subtotal), 0)
        .toFixed(2);
      const total = (Number(itemsSubtotal) + order.shippingCost).toFixed(2);

      await tx.order.create({
        data: {
          userId: customer.id,
          buyerName: customer.name,
          buyerEmail: customer.email,
          buyerPhone: order.buyerPhone,
          shippingAddress: { formatted: order.shippingAddress },
          shippingCost: order.shippingCost.toFixed(2),
          itemsSubtotal,
          total,
          status: order.status,
          items: {
            create: orderItems
          },
          createdAt: new Date(Date.now() - index * 86_400_000)
        }
      });
    }
  });
}

main()
  .catch((error) => {
    console.error("Seed error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
