import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return NextResponse.json(
    products.map((product) => ({
      id: product.id,
      title: product.title,
      reviews: product.reviews,
      price: product.price,
      discountedPrice: product.discountedPrice,
      category: product.category?.name ?? null,
      thumbnailUrls: product.thumbnailUrls,
      previewUrls: product.previewUrls,
      createdAt: product.createdAt,
    }))
  );
}
