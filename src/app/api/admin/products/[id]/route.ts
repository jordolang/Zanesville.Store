import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";

type UpdatePayload = {
  title?: unknown;
  price?: unknown;
  msrp?: unknown;
  discountedPrice?: unknown;
  active?: unknown;
};

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
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
