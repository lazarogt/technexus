import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listCategories } from "@/features/api/catalog-api";

export function CategoryNav() {
  const { data } = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: listCategories
  });

  return (
    <nav className="category-nav">
      <div className="category-nav-scroll">
        <Link to="/products">Todos</Link>
        {(data?.categories ?? []).map((category) => (
          <Link key={category.id} to={`/category/${category.id}`}>
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
