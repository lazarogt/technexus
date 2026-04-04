import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { orderCategories } from "@/components/store/storefront-data";
import { listCategories } from "@/features/api/catalog-api";

export function CategoryNav() {
  const { data } = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: listCategories
  });

  const categories = useMemo(() => orderCategories(data?.categories ?? []), [data?.categories]);

  return (
    <nav className="category-nav" aria-label="Browse categories">
      <div className="category-nav-scroll">
        <Link className="category-nav-item is-all" to="/products">
          All departments
        </Link>
        {categories.map((category) => (
          <Link key={category.id} className="category-nav-item" to={`/category/${category.id}`}>
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
