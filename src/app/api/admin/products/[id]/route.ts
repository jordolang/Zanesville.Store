import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";

type UpdatePayload = {
  title?: unknown;
  description?: unknown;
  brand?: unknown;
  features?: unknown;
  price?: unknown;
  msrp?: unknown;
  discountedPrice?: unknown;
  active?: unknown;
  thumbnailUrls?: unknown;
  previewUrls?: unknown;
};

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  return value.trim();
}

function toStringListJson(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return JSON.stringify(cleaned);
}

function toDecimalOrNull(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return null;
  }
  return session;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isFinite(productId)) {
    return NextResponse.json(
      { success: false, error: "Invalid product id" },
      { status: 400 },
    );
  }

  let body: UpdatePayload;
  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};

  const title = toNonEmptyString(body.title);
  if (title !== undefined) data.title = title;

  const description = toOptionalString(body.description);
  if (description !== undefined) data.description = description;

  const brand = toOptionalString(body.brand);
  if (brand !== undefined) data.brand = brand;

  const featuresJson = toStringListJson(body.features);
  if (featuresJson !== undefined) data.features = featuresJson;

  const thumbnailUrls = toStringListJson(body.thumbnailUrls);
  if (thumbnailUrls !== undefined) data.thumbnailUrls = thumbnailUrls;

  const previewUrls = toStringListJson(body.previewUrls);
  if (previewUrls !== undefined) data.previewUrls = previewUrls;

  const price = toDecimalOrNull(body.price);
  if (price !== undefined && price !== null) data.price = price;

  const msrp = toDecimalOrNull(body.msrp);
  if (msrp !== undefined) data.msrp = msrp;

  const discountedPrice = toDecimalOrNull(body.discountedPrice);
  if (discountedPrice !== undefined) data.discountedPrice = discountedPrice;

  if (typeof body.active === "boolean") {
    data.active = body.active;
    data.soldAt = body.active ? null : new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid fields to update" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data,
    });

    const toArray = (value: unknown): string[] => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed)
            ? parsed.filter((x): x is string => typeof x === "string")
            : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(value)
        ? value.filter((x): x is string => typeof x === "string")
        : [];
    };

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        brand: updated.brand,
        features: toArray(updated.features),
        thumbnailUrls: toArray(updated.thumbnailUrls),
        previewUrls: toArray(updated.previewUrls),
        price: Number(updated.price),
        msrp: updated.msrp !== null ? Number(updated.msrp) : null,
        discountedPrice:
          updated.discountedPrice !== null
            ? Number(updated.discountedPrice)
            : null,
        active: updated.active,
        soldAt: updated.soldAt ? updated.soldAt.toISOString() : null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
