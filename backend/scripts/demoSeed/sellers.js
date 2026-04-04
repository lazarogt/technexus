const { assert } = require("./utils");

const MIN_DEMO_SELLERS = 5;
const SELLER_STORE_NAMES = [
  "TechZone",
  "EliteHardware",
  "PrimeLaptops",
  "NextGen Gaming",
  "NetCore Market",
  "Pixel Depot",
  "Summit Components"
];

function selectPromotableUsers(users) {
  return [...users]
    .filter((user) => !user.deletedAt && !user.isBlocked)
    .filter((user) => user.role !== "admin" && user.role !== "seller")
    .filter((user) => user._count.products === 0 && user._count.orders === 0 && user._count.carts === 0)
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

async function ensureSellerLocation(tx, sellerId) {
  const existingLocation = await tx.location.findFirst({
    where: {
      sellerId,
      deletedAt: null
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existingLocation) {
    return existingLocation;
  }

  return tx.location.create({
    data: {
      sellerId,
      name: "Default Warehouse"
    }
  });
}

async function prepareSellers(tx) {
  const users = await tx.user.findMany({
    where: {
      deletedAt: null,
      isBlocked: false
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBlocked: true,
      deletedAt: true,
      createdAt: true,
      _count: {
        select: {
          products: true,
          orders: true,
          carts: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const activeSellers = users.filter((user) => user.role === "seller");
  const promotableUsers = selectPromotableUsers(users);

  assert(
    activeSellers.length + promotableUsers.length >= MIN_DEMO_SELLERS,
    `Demo mode requires at least ${MIN_DEMO_SELLERS} active or safely promotable sellers.`
  );

  const promoted = [];
  const missingSellerCount = Math.max(0, MIN_DEMO_SELLERS - activeSellers.length);

  for (const user of promotableUsers.slice(0, missingSellerCount)) {
    const record = await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        role: "seller"
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });
    promoted.push(record);
  }

  const selectedSellers = [...activeSellers, ...promoted]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .slice(0, MIN_DEMO_SELLERS);

  const preparedSellers = [];

  for (const [index, seller] of selectedSellers.entries()) {
    const renamedSeller = await tx.user.update({
      where: {
        id: seller.id
      },
      data: {
        name: SELLER_STORE_NAMES[index]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    const location = await ensureSellerLocation(tx, renamedSeller.id);
    preparedSellers.push({
      ...renamedSeller,
      locationId: location.id
    });
  }

  return preparedSellers;
}

module.exports = {
  MIN_DEMO_SELLERS,
  SELLER_STORE_NAMES,
  prepareSellers,
  selectPromotableUsers
};
