import { useEffect, useState, useCallback } from "react";
import type { Product } from "@/types/product";

type SortOption = "latest" | "best-selling" | "oldest";

interface ProductMeta {
  total: number;
  page: number;
  limit: number;
}

interface UseProductsResult {
  products: Product[];
  meta: ProductMeta;
  currentPage: number;
  sortBy: SortOption;
  totalPages: number;
  loading: boolean;
  setPage: (page: number) => void;
  setSortBy: (sort: SortOption) => void;
}

const SORT_VALUE_MAP: Record<string, SortOption> = {
  "0": "latest",
  "1": "best-selling",
  "2": "oldest",
};

const PER_PAGE = 48;

export function sortValueToOption(value: string): SortOption {
  return SORT_VALUE_MAP[value] ?? "latest";
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ProductMeta>({ total: 0, page: 1, limit: PER_PAGE });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(meta.total / PER_PAGE));

  const fetchProducts = useCallback(async (page: number, sort: SortOption) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        take: String(PER_PAGE),
        page: String(page),
        sort,
      });
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) return;
      const result = await response.json();
      setProducts(result.data);
      setMeta(result.meta);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Fetch failed -- products remain as previous state
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(currentPage, sortBy);
  }, [currentPage, sortBy, fetchProducts]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    products,
    meta,
    currentPage,
    sortBy,
    totalPages,
    loading,
    setPage,
    setSortBy,
  };
}
