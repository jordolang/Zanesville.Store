import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import {
  getAdminProducts,
  type InventoryFilter,
} from "@/lib/productCatalog";

const VALID_FILTERS: InventoryFilter[] = ["active", "sold", "all"];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const filterParam = searchParams.get("filter") as InventoryFilter | null;
  const filter: InventoryFilter = VALID_FILTERS.includes(
    filterParam as InventoryFilter,
  )
    ? (filterParam as InventoryFilter)
    : "all";

  const products = await getAdminProducts(filter);
  return NextResponse.json({ success: true, data: products });
}
