import type { Product, ProductImage, User, Category, Review } from "@prisma/client";

type ProductWithRelations = Product & {
  category: Category;
  seller: User;
  images: ProductImage[];
  reviews?: Array<
    Review & {
      user: Pick<User, "id" | "name">;
    }
  >;
};

type ProductReviewDto = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export const toProductDto = (
  product: ProductWithRelations,
  input?: {
    averageRating?: number;
    reviewCount?: number;
    reviews?: ProductReviewDto[];
  }
) => {
  const reviews =
    input?.reviews ??
    product.reviews?.map((review) => ({
      id: review.id,
      userName: review.user.name,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString()
    }));
  const reviewCount = input?.reviewCount ?? reviews?.length ?? 0;
  const averageRating =
    input?.averageRating ??
    (reviews && reviewCount > 0
      ? Number(
          (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)
        )
      : 0);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    sellerId: product.sellerId,
    sellerName: product.seller.name,
    averageRating,
    reviewCount,
    images: product.images
      .sort((left, right) => left.position - right.position)
      .map((image) => image.url),
    ...(reviews ? { reviews } : {})
  };
};
