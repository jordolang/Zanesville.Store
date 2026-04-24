"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { AdminProduct } from "@/lib/productCatalog";

type FilterTab = "active" | "sold" | "all";

type Draft = {
  title: string;
  price: string;
  msrp: string;
  discountedPrice: string;
  description: string;
  brand: string;
  thumbnails: string;
  previews: string;
};

type DraftMap = Record<number, Draft>;

type SaveState = Record<number, "idle" | "saving" | "saved" | "error">;

interface AdminProductsProps {
  initialProducts: AdminProduct[];
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "active", label: "Active Inventory" },
  { id: "sold", label: "Recently Sold" },
  { id: "all", label: "All" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 25;

function productToDraft(product: AdminProduct): Draft {
  return {
    title: product.title,
    price: product.price.toString(),
    msrp: product.msrp !== null ? product.msrp.toString() : "",
    discountedPrice:
      product.discountedPrice !== null
        ? product.discountedPrice.toString()
        : "",
    description: product.description ?? "",
    brand: product.brand ?? "",
    thumbnails: (product.thumbnailUrls ?? []).join("\n"),
    previews: (product.previewUrls ?? []).join("\n"),
  };
}

function toNumberOrNull(value: string): number | null | "invalid" {
  if (value.trim() === "") return null;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

function linesToArray(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const AdminProducts: React.FC<AdminProductsProps> = ({ initialProducts }) => {
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [tab, setTab] = useState<FilterTab>("active");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<DraftMap>(() => {
    const map: DraftMap = {};
    for (const p of initialProducts) {
      map[p.id] = productToDraft(p);
    }
    return map;
  });
  const [saveState, setSaveState] = useState<SaveState>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (tab === "active" && !product.active) return false;
      if (tab === "sold" && product.active) return false;
      if (query && !product.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, tab, search]);

  const counts = useMemo(() => {
    let active = 0;
    let sold = 0;
    for (const product of products) {
      if (product.active) active += 1;
      else sold += 1;
    }
    return { active, sold, all: products.length };
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [tab, search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pageItems = filtered.slice(pageStart, pageEnd);

  const updateDraft = (id: number, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const markState = (id: number, state: SaveState[number]) => {
    setSaveState((prev) => ({ ...prev, [id]: state }));
  };

  const patchProduct = async (
    id: number,
    payload: Record<string, unknown>,
  ): Promise<boolean> => {
    markState(id, "saving");
    setGlobalError(null);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        markState(id, "error");
        setGlobalError(data.error ?? "Failed to save changes");
        return false;
      }

      setProducts((prev) =>
        prev.map((product) =>
          product.id === id
            ? {
                ...product,
                title: data.data.title ?? product.title,
                description: data.data.description ?? product.description,
                brand: data.data.brand ?? product.brand,
                features: data.data.features ?? product.features,
                thumbnailUrls:
                  data.data.thumbnailUrls ?? product.thumbnailUrls,
                previewUrls: data.data.previewUrls ?? product.previewUrls,
                thumbnail:
                  (data.data.thumbnailUrls && data.data.thumbnailUrls[0]) ??
                  product.thumbnail,
                price: data.data.price ?? product.price,
                msrp: data.data.msrp,
                discountedPrice: data.data.discountedPrice,
                active: data.data.active ?? product.active,
                soldAt: data.data.soldAt ?? product.soldAt,
              }
            : product,
        ),
      );

      markState(id, "saved");
      setTimeout(() => markState(id, "idle"), 2000);
      return true;
    } catch (error: unknown) {
      markState(id, "error");
      setGlobalError(
        error instanceof Error ? error.message : "Network error",
      );
      return false;
    }
  };

  const handleSave = async (product: AdminProduct) => {
    const draft = drafts[product.id];
    if (!draft) return;

    const title = draft.title.trim();
    if (!title) {
      setGlobalError("Title cannot be empty");
      markState(product.id, "error");
      return;
    }

    const price = toNumberOrNull(draft.price);
    if (price === "invalid" || price === null) {
      setGlobalError("Price must be a positive number");
      markState(product.id, "error");
      return;
    }

    const msrp = toNumberOrNull(draft.msrp);
    if (msrp === "invalid") {
      setGlobalError("MSRP must be a positive number or blank");
      markState(product.id, "error");
      return;
    }

    const discountedPrice = toNumberOrNull(draft.discountedPrice);
    if (discountedPrice === "invalid") {
      setGlobalError("Sale price must be a positive number or blank");
      markState(product.id, "error");
      return;
    }

    await patchProduct(product.id, {
      title,
      price,
      msrp,
      discountedPrice,
      description: draft.description,
      brand: draft.brand.trim() || null,
      thumbnailUrls: linesToArray(draft.thumbnails),
      previewUrls: linesToArray(draft.previews),
    });
  };

  const handleToggleActive = async (product: AdminProduct) => {
    await patchProduct(product.id, { active: !product.active });
  };

  const handleReset = (product: AdminProduct) => {
    setDrafts((prev) => ({
      ...prev,
      [product.id]: productToDraft(product),
    }));
    markState(product.id, "idle");
  };

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            const count =
              t.id === "active"
                ? counts.active
                : t.id === "sold"
                  ? counts.sold
                  : counts.all;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-dark text-white"
                    : "bg-white text-dark border border-gray-3 hover:bg-gray-1"
                }`}
              >
                {t.label}{" "}
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="w-full lg:max-w-xs rounded-md border border-gray-3 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue/20"
        />
      </div>

      {globalError && (
        <div className="mb-4 p-3 rounded-md border border-red/30 bg-red/10 text-red text-sm">
          {globalError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-1 text-dark">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">
                  Price ($)
                </th>
                <th className="text-left px-4 py-3 font-medium">MSRP ($)</th>
                <th className="text-left px-4 py-3 font-medium">
                  Sale ($)
                </th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-dark-4"
                  >
                    No products match.
                  </td>
                </tr>
              )}
              {pageItems.map((product) => {
                const draft = drafts[product.id];
                const state = saveState[product.id] ?? "idle";
                const isOpen = !!expanded[product.id];
                const isDirty =
                  draft &&
                  (draft.title !== product.title ||
                    draft.price !== product.price.toString() ||
                    draft.msrp !==
                      (product.msrp !== null
                        ? product.msrp.toString()
                        : "") ||
                    draft.discountedPrice !==
                      (product.discountedPrice !== null
                        ? product.discountedPrice.toString()
                        : "") ||
                    draft.description !== (product.description ?? "") ||
                    draft.brand !== (product.brand ?? "") ||
                    draft.thumbnails !==
                      (product.thumbnailUrls ?? []).join("\n") ||
                    draft.previews !==
                      (product.previewUrls ?? []).join("\n"));

                return (
                  <React.Fragment key={product.id}>
                    <tr className="border-t border-gray-3 align-top">
                      <td className="px-4 py-3">
                        <div className="relative w-14 h-14 rounded-md bg-gray-1 overflow-hidden">
                          <Image
                            src={product.thumbnail}
                            alt={product.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="text-xs text-dark-4 mt-1">
                          #{product.id}
                        </div>
                        {product.category && (
                          <div className="text-xs text-dark-4">
                            {product.category}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <input
                          type="text"
                          value={draft?.title ?? ""}
                          onChange={(e) =>
                            updateDraft(product.id, "title", e.target.value)
                          }
                          className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 w-28">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={draft?.price ?? ""}
                          onChange={(e) =>
                            updateDraft(product.id, "price", e.target.value)
                          }
                          className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 w-28">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={draft?.msrp ?? ""}
                          onChange={(e) =>
                            updateDraft(product.id, "msrp", e.target.value)
                          }
                          placeholder="—"
                          className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 w-28">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={draft?.discountedPrice ?? ""}
                          onChange={(e) =>
                            updateDraft(
                              product.id,
                              "discountedPrice",
                              e.target.value,
                            )
                          }
                          placeholder="—"
                          className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            product.active
                              ? "bg-green/10 text-green"
                              : "bg-dark-4/10 text-dark-4"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.active ? "bg-green" : "bg-dark-4"
                            }`}
                          />
                          {product.active ? "Active" : "Sold"}
                        </span>
                        {!product.active && product.soldAt && (
                          <div className="text-xs text-dark-4 mt-1">
                            {new Date(product.soldAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => handleSave(product)}
                            disabled={!isDirty || state === "saving"}
                            className="px-3 py-1.5 rounded-md bg-blue text-white text-xs font-medium hover:bg-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {state === "saving"
                              ? "Saving..."
                              : state === "saved"
                                ? "Saved ✓"
                                : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(product)}
                            disabled={state === "saving"}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border disabled:opacity-50 ${
                              product.active
                                ? "border-dark-4 text-dark hover:bg-gray-1"
                                : "border-blue text-blue hover:bg-blue/5"
                            }`}
                          >
                            {product.active ? "Mark Sold" : "Restore"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(product.id)}
                            className="px-3 py-1.5 rounded-md text-xs text-blue hover:underline"
                          >
                            {isOpen ? "Hide details" : "Edit details"}
                          </button>
                          {isDirty && (
                            <button
                              type="button"
                              onClick={() => handleReset(product)}
                              className="px-3 py-1.5 rounded-md text-xs text-dark-4 hover:text-dark"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && draft && (
                      <tr className="border-t border-gray-3 bg-gray-1/40">
                        <td colSpan={7} className="px-4 py-5">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-medium text-dark-4 mb-1">
                                Description
                              </label>
                              <textarea
                                value={draft.description}
                                onChange={(e) =>
                                  updateDraft(
                                    product.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                rows={8}
                                className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none text-sm"
                                placeholder="Write an honest description of this item..."
                              />
                              <label className="block text-xs font-medium text-dark-4 mb-1 mt-4">
                                Brand
                              </label>
                              <input
                                type="text"
                                value={draft.brand}
                                onChange={(e) =>
                                  updateDraft(
                                    product.id,
                                    "brand",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none text-sm"
                                placeholder="Brand (optional)"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-dark-4 mb-1">
                                Thumbnail image URLs (one per line)
                              </label>
                              <textarea
                                value={draft.thumbnails}
                                onChange={(e) =>
                                  updateDraft(
                                    product.id,
                                    "thumbnails",
                                    e.target.value,
                                  )
                                }
                                rows={4}
                                className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none font-mono text-xs"
                                placeholder="https://..."
                              />
                              <label className="block text-xs font-medium text-dark-4 mb-1 mt-4">
                                Preview (large) image URLs (one per line)
                              </label>
                              <textarea
                                value={draft.previews}
                                onChange={(e) =>
                                  updateDraft(
                                    product.id,
                                    "previews",
                                    e.target.value,
                                  )
                                }
                                rows={4}
                                className="w-full rounded-md border border-gray-3 px-3 py-2 bg-white focus:ring-2 focus:ring-blue/20 outline-none font-mono text-xs"
                                placeholder="https://..."
                              />
                              {product.thumbnailUrls &&
                                product.thumbnailUrls.length > 0 && (
                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    {product.thumbnailUrls
                                      .slice(0, 6)
                                      .map((url, idx) => (
                                        <div
                                          key={idx}
                                          className="relative w-12 h-12 rounded overflow-hidden bg-gray-2 border border-gray-3"
                                        >
                                          <Image
                                            src={url}
                                            alt={`thumb-${idx}`}
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                          />
                                        </div>
                                      ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-3 bg-gray-1/40 text-sm">
          <div className="flex items-center gap-2">
            <label htmlFor="admin-page-size" className="text-dark-4">
              Rows per page
            </label>
            <select
              id="admin-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
              className="rounded-md border border-gray-3 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-blue/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-dark-4">
              {filtered.length === 0
                ? "0 of 0"
                : `${pageStart + 1}–${pageEnd} of ${filtered.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="px-2 py-1 rounded-md border border-gray-3 bg-white text-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-1"
              aria-label="First page"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md border border-gray-3 bg-white text-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-1"
            >
              Previous
            </button>
            <span className="text-dark-4" aria-live="polite">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md border border-gray-3 bg-white text-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-1"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded-md border border-gray-3 bg-white text-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-1"
              aria-label="Last page"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
