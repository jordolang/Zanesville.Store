import type { Category, Product as PrismaProduct } from "@prisma/client";
import type { Product } from "@/types/product";
import prisma from "@/lib/prisma";

const FALLBACK_IMAGE = "/images/products/placeholder.png";

type DbProduct = PrismaProduct & {
  category?: Category | null;
};

type SortOption = "latest" | "best-selling" | "oldest";

export type InventoryFilter = "active" | "sold" | "all";

type ProductQueryOptions = {
  take?: number;
  skip?: number;
  sort?: SortOption;
  filter?: InventoryFilter;
  categorySlug?: string;
};

type PaginatedProducts = {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

const SORT_MAP: Record<SortOption, Record<string, string>> = {
  latest: { createdAt: "desc" },
  "best-selling": { reviews: "desc" },
  oldest: { createdAt: "asc" },
};

const toStringArray = (value: unknown): string[] => {
  let arr: unknown = value;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    )
    .map((item) => item.trim());
};

export const mapDbProductToProduct = (product: DbProduct): Product => {
  const thumbnails = toStringArray(product.thumbnailUrls);
  const previews = toStringArray(product.previewUrls);
  const fallbackPreviews = previews.length > 0 ? previews : thumbnails;
  const resolvedThumbnails =
    thumbnails.length > 0 ? thumbnails : [FALLBACK_IMAGE];
  const resolvedPreviews =
    fallbackPreviews.length > 0 ? fallbackPreviews : resolvedThumbnails;

  return {
    id: product.id,
    title: product.title,
    reviews: product.reviews,
    price: Number(product.price),
    discountedPrice: Number(product.discountedPrice ?? product.price),
    description: product.description ?? "",
    features: toStringArray(product.features),
    brand: product.brand ?? null,
    category: product.category?.name ?? null,
    slug: product.slug,
    imgs: {
      thumbnails: resolvedThumbnails,
      previews: resolvedPreviews,
    },
  };
};

function buildWhere(
  filter: InventoryFilter,
  categorySlug?: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filter === "active") where.active = true;
  if (filter === "sold") where.active = false;
  if (categorySlug) where.category = { slug: categorySlug };
  return where;
}

export async function getProducts(
  options?: ProductQueryOptions,
): Promise<PaginatedProducts> {
  const sort = options?.sort ?? "latest";
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.latest;
  const take = typeof options?.take === "number" ? options.take : 48;
  const skip = typeof options?.skip === "number" ? options.skip : 0;
  const filter = options?.filter ?? "active";

  const where = buildWhere(filter, options?.categorySlug);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy,
      take,
      skip,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(mapDbProductToProduct),
    meta: {
      total,
      page: Math.floor(skip / take) + 1,
      limit: take,
    },
  };
}

export type AdminProduct = {
  id: number;
  title: string;
  slug: string;
  description: string;
  brand: string | null;
  features: string[];
  price: number;
  msrp: number | null;
  discountedPrice: number | null;
  active: boolean;
  soldAt: string | null;
  category: string | null;
  thumbnail: string;
  thumbnailUrls: string[];
  previewUrls: string[];
};

export async function getAdminProducts(
  filter: InventoryFilter = "all",
): Promise<AdminProduct[]> {
  const where = buildWhere(filter);
  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return products.map((product) => {
    const thumbnails = toStringArray(product.thumbnailUrls);
    const previews = toStringArray(product.previewUrls);
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description ?? "",
      brand: product.brand ?? null,
      features: toStringArray(product.features),
      price: Number(product.price),
      msrp: product.msrp !== null ? Number(product.msrp) : null,
      discountedPrice:
        product.discountedPrice !== null
          ? Number(product.discountedPrice)
          : null,
      active: product.active,
      soldAt: product.soldAt ? product.soldAt.toISOString() : null,
      category: product.category?.name ?? null,
      thumbnail: thumbnails[0] ?? FALLBACK_IMAGE,
      thumbnailUrls: thumbnails,
      previewUrls: previews,
    };
  });
}
