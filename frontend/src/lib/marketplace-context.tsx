import {
  createContext,
  useContext,
  useDeferredValue,
  useState,
  type PropsWithChildren
} from "react";
import type { CatalogSort } from "./types";

export type PriceBucket = "all" | "under-50" | "50-250" | "250-1000" | "1000-plus";
export type RatingFilter = "all" | "4-up" | "3-up";

type MarketplaceContextValue = {
  searchInput: string;
  searchQuery: string;
  categoryId: string;
  priceBucket: PriceBucket;
  sellerId: string;
  ratingFilter: RatingFilter;
  inStockOnly: boolean;
  sort: CatalogSort;
  setSearchInput: (value: string) => void;
  setCategoryId: (value: string) => void;
  setPriceBucket: (value: PriceBucket) => void;
  setSellerId: (value: string) => void;
  setRatingFilter: (value: RatingFilter) => void;
  setInStockOnly: (value: boolean) => void;
  setSort: (value: CatalogSort) => void;
  resetFilters: () => void;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: PropsWithChildren) {
  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceBucket, setPriceBucket] = useState<PriceBucket>("all");
  const [sellerId, setSellerId] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<CatalogSort>("latest");
  const searchQuery = useDeferredValue(searchInput.trim());

  return (
    <MarketplaceContext.Provider
      value={{
        searchInput,
        searchQuery,
        categoryId,
        priceBucket,
        sellerId,
        ratingFilter,
        inStockOnly,
        sort,
        setSearchInput,
        setCategoryId,
        setPriceBucket,
        setSellerId,
        setRatingFilter,
        setInStockOnly,
        setSort,
        resetFilters: () => {
          setSearchInput("");
          setCategoryId("");
          setPriceBucket("all");
          setSellerId("");
          setRatingFilter("all");
          setInStockOnly(false);
          setSort("latest");
        }
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplaceFilters() {
  const context = useContext(MarketplaceContext);

  if (!context) {
    throw new Error("useMarketplaceFilters must be used within MarketplaceProvider");
  }

  return context;
}
