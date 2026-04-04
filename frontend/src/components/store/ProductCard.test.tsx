import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/features/api/types";

const product: Product = {
  id: "product-1",
  name: "Dell XPS 13",
  description: "Thin and light laptop",
  price: 1299,
  stock: 7,
  categoryId: "cat-laptops",
  categoryName: "Laptops",
  sellerId: "seller-1",
  sellerName: "TechZone",
  averageRating: 4.8,
  reviewCount: 54,
  images: ["/uploads/xps.jpg"]
};

describe("ProductCard", () => {
  it("renders key commerce details and triggers add to cart", async () => {
    const onAddToCart = vi.fn();

    render(
      <MemoryRouter>
        <ProductCard product={product} badges={["bestSeller", "limitedStock"]} onAddToCart={onAddToCart} />
      </MemoryRouter>
    );

    expect(screen.getByText("Dell XPS 13")).toBeInTheDocument();
    expect(screen.getByText("TechZone", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Más vendido")).toBeInTheDocument();
    expect(screen.getByText("Stock limitado")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Añadir al carrito" }));

    expect(onAddToCart).toHaveBeenCalledWith("product-1");
  });
});
