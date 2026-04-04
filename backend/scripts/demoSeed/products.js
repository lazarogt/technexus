const { assert, randomDateBetween, randomInt } = require("./utils");

const PRICE_RULES = {
  Laptops: { min: 600, max: 1800 },
  "PC Components": { min: 50, max: 900 },
  Monitors: { min: 150, max: 500 },
  Accessories: { min: 10, max: 200 },
  Gaming: { min: 50, max: 500 },
  Networking: { min: 20, max: 500 }
};

const PRODUCT_BLUEPRINTS = [
  {
    categoryName: "Laptops",
    name: "Dell XPS 13",
    description: "13.4-inch premium ultrabook with bright InfinityEdge display, Intel Core Ultra power, and long battery life.",
    price: 999,
    imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "MacBook Air M2",
    description: "Fanless Apple silicon laptop with strong everyday performance, premium build, and all-day portability.",
    price: 1099,
    imageUrl: "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "ASUS ROG Zephyrus G14",
    description: "Portable gaming laptop with RTX graphics, high-refresh display, and fast DDR5 memory.",
    price: 1599,
    imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "Lenovo ThinkPad X1 Carbon",
    description: "Business-focused premium notebook with legendary keyboard feel, lightweight carbon chassis, and modern connectivity.",
    price: 1449,
    imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "HP Spectre x360 14",
    description: "Convertible OLED laptop with pen-ready touchscreen, premium design, and productivity-first ergonomics.",
    price: 1299,
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "Acer Swift Go 14",
    description: "Slim everyday laptop with OLED panel, modern Intel platform, and strong value for hybrid work.",
    price: 849,
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "Microsoft Surface Laptop 5",
    description: "Clean, understated premium laptop with PixelSense touchscreen and dependable office performance.",
    price: 1199,
    imageUrl: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Laptops",
    name: "MSI Katana 15",
    description: "Gaming-ready 15-inch notebook with discrete graphics, efficient cooling, and upgrade-friendly internals.",
    price: 1299,
    imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "NVIDIA GeForce RTX 3060",
    description: "12GB graphics card built for smooth 1080p gameplay and strong content-creation acceleration.",
    price: 289,
    imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "NVIDIA GeForce RTX 4070",
    description: "High-efficiency GPU with ray tracing, DLSS support, and reliable 1440p gaming performance.",
    price: 599,
    imageUrl: "https://images.unsplash.com/photo-1624705002806-5d72df19c3dd?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "AMD Radeon RX 7800 XT",
    description: "Performance-oriented graphics card with strong raster output and generous VRAM for modern titles.",
    price: 499,
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "AMD Ryzen 5 5600X",
    description: "6-core AM4 processor that remains an excellent value for gaming and mixed workloads.",
    price: 159,
    imageUrl: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "Intel Core i7-12700K",
    description: "12th-gen desktop CPU with strong multi-core performance and headroom for productivity builds.",
    price: 279,
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "Corsair Vengeance 32GB DDR5",
    description: "High-speed memory kit for demanding multitasking, content creation, and newer gaming platforms.",
    price: 129,
    imageUrl: "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "Samsung 990 EVO 1TB SSD",
    description: "Fast NVMe storage upgrade that improves boot times, file transfers, and game loading speeds.",
    price: 99,
    imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "PC Components",
    name: "MSI MAG B650 Tomahawk WiFi",
    description: "AM5 motherboard with sturdy power delivery, fast I/O, and Wi-Fi for modern Ryzen builds.",
    price: 219,
    imageUrl: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "LG UltraGear 27GL83A",
    description: "27-inch QHD IPS gaming monitor with 144Hz refresh rate and dependable motion clarity.",
    price: 279,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "Samsung Odyssey G5",
    description: "Curved 32-inch QHD display with 144Hz refresh rate designed for immersive gameplay.",
    price: 299,
    imageUrl: "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "Dell S2722QC",
    description: "4K USB-C monitor that pairs sharp visuals with a clean, office-friendly feature set.",
    price: 349,
    imageUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "ASUS ProArt PA278CV",
    description: "Factory-calibrated QHD monitor tuned for editors, designers, and color-sensitive workflows.",
    price: 379,
    imageUrl: "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "AOC 24G2",
    description: "Budget-friendly 24-inch 144Hz monitor known for excellent motion performance and value.",
    price: 179,
    imageUrl: "https://images.unsplash.com/photo-1616763355548-1b606f439f86?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "Gigabyte M27Q",
    description: "27-inch gaming display with KVM support, 170Hz refresh rate, and strong overall versatility.",
    price: 289,
    imageUrl: "https://images.unsplash.com/photo-1563770660941-10a636076dc0?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "BenQ MOBIUZ EX2710Q",
    description: "Vibrant 27-inch gaming monitor with immersive sound tuning and balanced 1440p performance.",
    price: 329,
    imageUrl: "https://images.unsplash.com/photo-1593640495392-9e3f89b1f346?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Monitors",
    name: "ViewSonic VX2728J-2K",
    description: "Fast-refresh QHD display that targets competitive players who want strong value per dollar.",
    price: 249,
    imageUrl: "https://images.unsplash.com/photo-1619953942547-233eab5a70d6?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Logitech MX Master 3S",
    description: "Flagship productivity mouse with quiet clicks, MagSpeed scroll wheel, and ergonomic comfort.",
    price: 99,
    imageUrl: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Razer DeathAdder V2",
    description: "Trusted ergonomic gaming mouse with accurate tracking and fast optical switches.",
    price: 49,
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Keychron K2",
    description: "Wireless mechanical keyboard with compact layout, Mac support, and satisfying tactile feel.",
    price: 89,
    imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Anker 7-in-1 USB-C Hub",
    description: "Travel-friendly docking accessory that expands laptop I/O with HDMI, USB-A, and card slots.",
    price: 59,
    imageUrl: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Logitech C920 HD Pro Webcam",
    description: "Reliable 1080p webcam for streaming, video calls, and hybrid-work desk setups.",
    price: 69,
    imageUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "HyperX Cloud II",
    description: "Comfortable wired headset with clear voice capture and punchy sound for gaming sessions.",
    price: 79,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "SteelSeries QcK Mouse Pad",
    description: "Large cloth mouse pad with a controlled glide surface ideal for everyday gaming use.",
    price: 19,
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Accessories",
    name: "Elgato Stream Deck Mini",
    description: "Compact macro controller for streamers and creators who need one-touch workflow shortcuts.",
    price: 99,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "PlayStation 5 DualSense Controller",
    description: "Official PS5 controller with adaptive triggers, refined haptics, and ergonomic grip.",
    price: 69,
    imageUrl: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "Xbox Wireless Controller",
    description: "Versatile controller with comfortable fit, textured triggers, and broad PC compatibility.",
    price: 59,
    imageUrl: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "SteelSeries Arctis Nova 7",
    description: "Wireless gaming headset with balanced audio, multi-platform support, and marathon-session comfort.",
    price: 159,
    imageUrl: "https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "WD_BLACK SN850X 2TB",
    description: "Fast NVMe SSD for gaming libraries, direct storage workloads, and premium desktop builds.",
    price: 169,
    imageUrl: "https://images.unsplash.com/photo-1628556270448-4d4e4148e3f1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "Elgato Wave:3",
    description: "USB microphone with clean vocal reproduction and creator-friendly control software.",
    price: 129,
    imageUrl: "https://images.unsplash.com/photo-1581368087049-7034ed0d1e6d?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "Logitech G923 Racing Wheel",
    description: "Force-feedback racing wheel and pedals designed to elevate sim racing immersion.",
    price: 299,
    imageUrl: "https://images.unsplash.com/photo-1629429407756-95b95f3a5f5b?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "ASUS TUF Gaming VG27AQ",
    description: "27-inch gaming monitor with ELMB Sync, IPS panel, and competitive-grade refresh performance.",
    price: 319,
    imageUrl: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Gaming",
    name: "Razer Kiyo Pro",
    description: "Streaming webcam with adaptive light sensor and sharper image quality for creator setups.",
    price: 119,
    imageUrl: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "TP-Link Archer AX55",
    description: "Wi-Fi 6 router that balances coverage, straightforward setup, and stable multi-device performance.",
    price: 139,
    imageUrl: "https://images.unsplash.com/photo-1647427060118-4911c9821b82?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "ASUS RT-AX86U Pro",
    description: "Performance Wi-Fi 6 router suited for gaming households and heavy traffic loads.",
    price: 249,
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "Netgear Nighthawk CM1200",
    description: "DOCSIS 3.1 cable modem for high-speed home internet plans and low-latency connections.",
    price: 199,
    imageUrl: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "Ubiquiti UniFi 6 Lite",
    description: "Ceiling-mount access point for scalable Wi-Fi deployments with simple UniFi management.",
    price: 119,
    imageUrl: "https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "TP-Link TL-SG108",
    description: "Compact unmanaged gigabit switch for desktops, TVs, consoles, and small office networks.",
    price: 29,
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "Synology BeeStation",
    description: "Personal cloud storage appliance designed for simple backups, sync, and family file sharing.",
    price: 399,
    imageUrl: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "Google Nest Wifi Pro 2-Pack",
    description: "Mesh Wi-Fi kit for whole-home coverage with easy mobile management and stable roaming.",
    price: 299,
    imageUrl: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    categoryName: "Networking",
    name: "TRENDnet TEG-S750",
    description: "Five-port 2.5G unmanaged switch for modern desktops, NAS boxes, and fast local transfers.",
    price: 59,
    imageUrl: "https://images.unsplash.com/photo-1577375729152-4c8b5fcda381?auto=format&fit=crop&w=1200&q=80"
  }
];

function validateProductBlueprints() {
  for (const product of PRODUCT_BLUEPRINTS) {
    const rule = PRICE_RULES[product.categoryName];
    assert(rule, `Missing price rule for ${product.categoryName}.`);
    assert(
      product.price >= rule.min && product.price <= rule.max,
      `${product.name} price ${product.price} is outside the configured ${product.categoryName} range.`
    );
    assert(product.description.trim().length >= 20, `${product.name} must have a realistic description.`);
    assert(product.imageUrl.startsWith("http"), `${product.name} requires a placeholder image URL.`);
  }
}

function buildDemoProducts(sellers, categoryByName, rng) {
  validateProductBlueprints();

  return PRODUCT_BLUEPRINTS.map((product, index) => {
    const seller = sellers[index % sellers.length];
    const category = categoryByName.get(product.categoryName);

    assert(category, `Missing category ${product.categoryName} for ${product.name}.`);

    const createdAt = randomDateBetween(
      rng,
      new Date("2026-02-01T09:00:00.000Z"),
      new Date("2026-03-15T18:00:00.000Z")
    );
    const updatedAt = new Date(createdAt.getTime() + randomInt(rng, 2, 72) * 60 * 60 * 1000);

    return {
      name: product.name,
      description: product.description,
      price: product.price.toFixed(2),
      stock: randomInt(rng, 5, 100),
      lowStockThreshold: randomInt(rng, 4, 10),
      categoryId: category.id,
      categoryName: category.name,
      sellerId: seller.id,
      sellerName: seller.name,
      sellerEmail: seller.email,
      locationId: seller.locationId,
      imageUrl: product.imageUrl,
      createdAt,
      updatedAt
    };
  });
}

async function seedProducts(tx, { sellers, categoryByName, rng }) {
  const products = [];

  for (const product of buildDemoProducts(sellers, categoryByName, rng)) {
    const created = await tx.product.create({
      data: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        categoryId: product.categoryId,
        sellerId: product.sellerId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        images: {
          create: [
            {
              url: product.imageUrl,
              kind: "url",
              position: 0,
              createdAt: product.createdAt
            }
          ]
        },
        inventories: {
          create: [
            {
              locationId: product.locationId,
              quantity: product.stock,
              lowStockThreshold: product.lowStockThreshold,
              createdAt: product.createdAt,
              updatedAt: product.updatedAt
            }
          ]
        }
      },
      include: {
        images: {
          orderBy: {
            position: "asc"
          }
        },
        inventories: true
      }
    });

    products.push({
      id: created.id,
      name: created.name,
      description: created.description,
      price: Number(created.price),
      stock: created.stock,
      categoryId: created.categoryId,
      categoryName: product.categoryName,
      sellerId: created.sellerId,
      sellerName: product.sellerName,
      sellerEmail: product.sellerEmail,
      imageUrl: created.images[0]?.url ?? product.imageUrl,
      inventoryId: created.inventories[0].id,
      lowStockThreshold: created.inventories[0].lowStockThreshold,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  }

  return products;
}

module.exports = {
  PRICE_RULES,
  PRODUCT_BLUEPRINTS,
  buildDemoProducts,
  seedProducts,
  validateProductBlueprints
};
