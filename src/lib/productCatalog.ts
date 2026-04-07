import type { Category, Product as PrismaProduct } from "@prisma/client";
import type { Product } from "@/types/product";
import prisma from "@/lib/prisma";

const FALLBACK_IMAGE = "/images/products/placeholder.png";

type DbProduct = PrismaProduct & {
  category?: Category | null;
};

type SortOption = "latest" | "best-selling" | "oldest";

type ProductQueryOptions = {
  take?: number;
  skip?: number;
  sort?: SortOption;
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
  return arr.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
};

export const mapDbProductToProduct = (product: DbProduct): Product => {
  const thumbnails = toStringArray(product.thumbnailUrls);
  const previews = toStringArray(product.previewUrls);
  const fallbackPreviews = previews.length > 0 ? previews : thumbnails;
  const resolvedThumbnails = thumbnails.length > 0 ? thumbnails : [FALLBACK_IMAGE];
  const resolvedPreviews =
    fallbackPreviews.length > 0 ? fallbackPreviews : resolvedThumbnails;

  return {
    id: product.id,
    title: product.title,
    reviews: product.reviews,
    price: Number(product.price),
    discountedPrice: Number(product.discountedPrice ?? product.price),
    description: product.description ?? "",
    category: product.category?.name ?? null,
    slug: product.slug,
    imgs: {
      thumbnails: resolvedThumbnails,
      previews: resolvedPreviews,
    },
  };
};

export async function getProducts(options?: ProductQueryOptions): Promise<PaginatedProducts> {
  const sort = options?.sort ?? "latest";
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.latest;
  const take = typeof options?.take === "number" ? options.take : 48;
  const skip = typeof options?.skip === "number" ? options.skip : 0;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy,
      take,
      skip,
    }),
    prisma.product.count(),
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
