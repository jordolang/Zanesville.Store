import type { Category, Product as PrismaProduct } from "@prisma/client";
import type { Product } from "@/types/product";
import prisma from "@/lib/prisma";

const FALLBACK_IMAGE = "/images/products/placeholder.png";

type DbProduct = PrismaProduct & {
  category?: Category | null;
};

type ProductQueryOptions = {
  take?: number;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
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

export async function getProducts(options?: ProductQueryOptions): Promise<Product[]> {
  const query: Parameters<typeof prisma.product.findMany>[0] = {
    include: { category: true },
    orderBy: { createdAt: "desc" },
  };

  if (typeof options?.take === "number") {
    query.take = options.take;
  }

  const products = await prisma.product.findMany(query);
  return products.map(mapDbProductToProduct);
}
