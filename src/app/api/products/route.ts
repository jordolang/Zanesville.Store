import { NextResponse } from "next/server";
import { getProducts } from "@/lib/productCatalog";

const MAX_PRODUCTS = 200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const takeParam = searchParams.get("take");
  const take = takeParam ? Number.parseInt(takeParam, 10) : undefined;
  const safeTake =
    typeof take === "number" && Number.isFinite(take)
      ? Math.min(Math.max(take, 1), MAX_PRODUCTS)
      : undefined;

  const products = await getProducts({ take: safeTake });

  return NextResponse.json(products);
}
