import type { Category } from "@prisma/client";

export const toCategoryDto = (category: Category) => ({
  id: category.id,
  name: category.name
});

