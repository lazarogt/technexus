import type { Product, ProductImage, User, Category } from "@prisma/client";

type ProductWithRelations = Product & {
  category: Category;
  seller: User;
  images: ProductImage[];
};

export const toProductDto = (product: ProductWithRelations) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: Number(product.price),
  stock: product.stock,
  categoryId: product.categoryId,
  categoryName: product.category.name,
  sellerId: product.sellerId,
  sellerName: product.seller.name,
  images: product.images
    .sort((left, right) => left.position - right.position)
    .map((image) => image.url)
});

