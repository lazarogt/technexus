import { clsx } from "clsx";
import { Search } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type SearchBarProps = {
  initialValue?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  onSubmit?: (value: string) => void;
};

export function SearchBar({
  initialValue = "",
  placeholder = "Search laptops, components, monitors and more",
  className,
  compact = false,
  onSubmit
}: SearchBarProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = value.trim();

    if (onSubmit) {
      onSubmit(nextValue);
      return;
    }

    startTransition(() => {
      navigate(nextValue ? `/products?search=${encodeURIComponent(nextValue)}` : "/products");
    });
  };

  return (
    <form className={clsx("store-search-bar", compact && "is-compact", className)} onSubmit={handleSubmit}>
      <label className="store-search-input-shell">
        <Search size={18} />
        <input
          aria-label="Buscar productos"
          data-testid="store-search-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      <button type="submit">Search</button>
    </form>
  );
}
