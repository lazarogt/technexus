import type {
  CartItem,
  Category,
  Product,
  ProductImage,
  User
} from "@prisma/client";

type CartItemRecord = CartItem & {
  product: Product & {
    category: Category;
    seller: User;
    images: ProductImage[];
  };
};

export const toCartSummaryDto = (items: CartItemRecord[]) => {
  const mapped = items.map((item) => {
    const subtotal = Number(item.product.price) * item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      productName: item.product.name,
      productDescription: item.product.description,
      productPrice: Number(item.product.price),
      productStock: item.product.stock,
      productImages: item.product.images
        .sort((left, right) => left.position - right.position)
        .map((image) => image.url),
      categoryId: item.product.categoryId,
      categoryName: item.product.category.name,
      sellerId: item.product.sellerId,
      sellerName: item.product.seller.name,
      subtotal: Math.round(subtotal * 100) / 100
    };
  });

  return {
    items: mapped,
    total: Math.round(mapped.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100
  };
};

