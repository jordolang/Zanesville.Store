import { NextResponse } from "next/server";
import { getProducts } from "@/lib/productCatalog";

const MAX_PRODUCTS = 200;
const VALID_SORTS = ["latest", "best-selling", "oldest"] as const;
type SortOption = (typeof VALID_SORTS)[number];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const takeParam = searchParams.get("take");
  const take = takeParam ? Number.parseInt(takeParam, 10) : 48;
  const safeTake =
    typeof take === "number" && Number.isFinite(take)
      ? Math.min(Math.max(take, 1), MAX_PRODUCTS)
      : 48;

  const pageParam = searchParams.get("page");
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const safePage =
    typeof page === "number" && Number.isFinite(page) && page >= 1 ? page : 1;

  const sortParam = searchParams.get("sort");
  const sort: SortOption = VALID_SORTS.includes(sortParam as SortOption)
    ? (sortParam as SortOption)
    : "latest";

  const skip = (safePage - 1) * safeTake;

  const result = await getProducts({ take: safeTake, skip, sort });

  return NextResponse.json(result);
}
