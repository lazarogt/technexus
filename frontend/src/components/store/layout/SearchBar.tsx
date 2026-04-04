import { clsx } from "clsx";
import { Search } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
  placeholder,
  className,
  compact = false,
  onSubmit
}: SearchBarProps) {
  const { t } = useTranslation();
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
          aria-label={t("search.ariaLabel")}
          data-testid="store-search-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder ?? t("search.placeholder")}
        />
      </label>
      <button type="submit">{t("buttons.search")}</button>
    </form>
  );
}
