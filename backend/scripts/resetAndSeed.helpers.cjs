const CATEGORY_NAMES = ["Laptops", "PC Components", "Monitors", "Accessories"];

const PRODUCT_BLUEPRINTS = [
  {
    categoryName: "Laptops",
    name: "Dell XPS 13",
    description: "13.4-inch premium ultrabook with Intel Core Ultra performance and all-day battery life.",
    price: "999.00",
    imageUrl:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "MacBook Air M2",
    description: "Lightweight 13-inch laptop with Apple M2 efficiency, silent cooling, and strong battery life.",
    price: "1099.00",
    imageUrl:
      "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "Lenovo ThinkPad X1 Carbon",
    description: "Business laptop with a durable chassis, excellent keyboard, and Intel Evo responsiveness.",
    price: "1399.00",
    imageUrl:
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "ASUS ROG Zephyrus G14",
    description: "14-inch gaming laptop with RTX graphics, fast refresh display, and portable design.",
    price: "1599.00",
    imageUrl:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "HP Spectre x360 14",
    description: "Convertible OLED laptop with pen support, premium build quality, and fast charging.",
    price: "1249.00",
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "NVIDIA GeForce RTX 3060",
    description: "12GB graphics card suited for 1080p and entry-level 1440p gaming builds.",
    price: "289.00",
    imageUrl:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "AMD Ryzen 5 5600X",
    description: "6-core desktop CPU with strong gaming performance and efficient power draw.",
    price: "159.00",
    imageUrl:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "Corsair Vengeance 16GB DDR4 RAM",
    description: "2x8GB DDR4 memory kit at 3200MHz for mainstream gaming and productivity PCs.",
    price: "54.00",
    imageUrl:
      "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "Samsung 970 EVO Plus 1TB SSD",
    description: "NVMe SSD with fast sequential speeds for boot drives, games, and project files.",
    price: "89.00",
    imageUrl:
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "MSI B550 Tomahawk Motherboard",
    description: "AM4 motherboard with solid power delivery, PCIe 4.0, and reliable thermal performance.",
    price: "169.00",
    imageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "Corsair RM750e Power Supply",
    description: "750W 80 Plus Gold modular PSU built for quiet operation and modern gaming rigs.",
    price: "109.00",
    imageUrl:
      "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "LG UltraGear 27\"",
    description: "27-inch 1440p gaming monitor with 144Hz refresh rate and responsive IPS panel.",
    price: "279.00",
    imageUrl:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "Samsung Odyssey G5",
    description: "32-inch curved QHD monitor with 144Hz refresh rate for immersive gaming sessions.",
    price: "299.00",
    imageUrl:
      "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "Dell S2722QC",
    description: "27-inch 4K USB-C monitor for office productivity, sharp text, and simple connectivity.",
    price: "349.00",
    imageUrl:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "ASUS ProArt Display PA278CV",
    description: "Color-accurate 27-inch QHD monitor aimed at creators, editors, and designers.",
    price: "379.00",
    imageUrl:
      "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "AOC 24G2",
    description: "24-inch 1080p gaming monitor with 144Hz refresh rate and strong budget value.",
    price: "179.00",
    imageUrl:
      "https://images.unsplash.com/photo-1616763355548-1b606f439f86?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Logitech MX Master 3S Mouse",
    description: "Ergonomic productivity mouse with quiet clicks, MagSpeed scrolling, and USB-C charging.",
    price: "99.00",
    imageUrl:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Redragon K552 Mechanical Keyboard",
    description: "Compact mechanical keyboard with tactile switches, metal frame, and RGB lighting.",
    price: "49.00",
    imageUrl:
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Anker 7-in-1 USB-C Hub",
    description: "Portable USB-C hub with HDMI, USB-A, SD card reader, and power pass-through.",
    price: "59.00",
    imageUrl:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "HyperX Cloud II Headset",
    description: "Wired gaming headset with clear microphone, memory foam ear cups, and virtual surround.",
    price: "79.00",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Logitech C920 HD Webcam",
    description: "Reliable 1080p webcam for meetings, streaming, and online classes.",
    price: "69.00",
    imageUrl:
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80"
  }
];

const RESETTABLE_TABLES = [
  "OrderItem",
  "Order",
  "EmailOutbox",
  "LowStockAlert",
  "Inventory",
  "ProductImage",
  "CartItem",
  "Product",
  "Category",
  "Review"
];

const STOCK_FLOOR = 5;
const STOCK_RANGE = 46;
const BASE_TIMESTAMP = new Date("2026-01-15T12:00:00.000Z").getTime();
const STOCK_STEP = 11;

const deterministicStockForIndex = (index) => {
  return STOCK_FLOOR + ((index * STOCK_STEP + 7) % STOCK_RANGE);
};

const buildSeedProducts = () => {
  return PRODUCT_BLUEPRINTS.map((product, index) => {
    const createdAt = new Date(BASE_TIMESTAMP - (PRODUCT_BLUEPRINTS.length - index) * 21_600_000);
    const updatedAt = new Date(createdAt.getTime() + 3_600_000);

    return {
      ...product,
      stock: deterministicStockForIndex(index),
      createdAt,
      updatedAt
    };
  });
};

const pickSeedSeller = (users, preferredAdminEmail) => {
  const activeUsers = users.filter((user) => !user.deletedAt && !user.isBlocked);
  const seller = activeUsers.find((user) => user.role === "seller");

  if (seller) {
    return seller;
  }

  const normalizedAdminEmail = preferredAdminEmail?.trim().toLowerCase();
  if (normalizedAdminEmail) {
    const preferredAdmin = activeUsers.find(
      (user) => user.role === "admin" && user.email.toLowerCase() === normalizedAdminEmail
    );

    if (preferredAdmin) {
      return preferredAdmin;
    }
  }

  const fallbackAdmin = activeUsers.find((user) => user.role === "admin");
  if (fallbackAdmin) {
    return fallbackAdmin;
  }

  throw new Error("Unable to find an active seller or admin user for marketplace seeding.");
};

const findResettableTables = (existingTables) => {
  const tableSet = new Set(existingTables);
  return RESETTABLE_TABLES.filter((tableName) => tableSet.has(tableName));
};

const quoteIdentifier = (value) => {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
};

module.exports = {
  CATEGORY_NAMES,
  PRODUCT_BLUEPRINTS,
  RESETTABLE_TABLES,
  buildSeedProducts,
  deterministicStockForIndex,
  findResettableTables,
  pickSeedSeller,
  quoteIdentifier
};
