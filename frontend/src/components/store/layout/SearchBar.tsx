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
  suggestions?: string[];
};

export function SearchBar({
  initialValue = "",
  placeholder,
  className,
  compact = false,
  onSubmit,
  suggestions = []
}: SearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);

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
    <form
      className={clsx("store-search-bar", "search-bar", compact && "is-compact", className)}
      data-tour="search-bar"
      data-demo-lock="true"
      onSubmit={handleSubmit}
    >
      <label className={clsx("store-search-input-shell", focused && "is-focused")}> 
        <Search size={18} />
        <input
          aria-label={t("search.ariaLabel")}
          data-testid="store-search-input"
          data-demo-lock="true"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder ?? t("search.placeholder")}
          list={suggestions.length ? "store-search-suggestions" : undefined}
        />
      </label>
      <button type="submit" data-demo-lock="true">
        {t("buttons.search")}
      </button>
      {suggestions.length ? (
        <datalist id="store-search-suggestions">
          {suggestions.map((suggestion) => (
            <option value={suggestion} key={suggestion} />
          ))}
        </datalist>
      ) : null}
    </form>
  );
}
