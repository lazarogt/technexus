const CATEGORY_NAMES = [
  "Laptops",
  "PC Components",
  "Monitors",
  "Accessories",
  "Gaming",
  "Networking"
];

async function seedCategories(tx) {
  const baseDate = new Date("2026-01-10T09:00:00.000Z");

  await tx.category.createMany({
    data: CATEGORY_NAMES.map((name, index) => {
      const createdAt = new Date(baseDate.getTime() + index * 60 * 60 * 1000);

      return {
        name,
        createdAt,
        updatedAt: createdAt
      };
    })
  });

  const categories = await tx.category.findMany({
    where: {
      name: {
        in: CATEGORY_NAMES
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  return {
    categories,
    categoryByName: new Map(categories.map((category) => [category.name, category]))
  };
}

module.exports = {
  CATEGORY_NAMES,
  seedCategories
};
