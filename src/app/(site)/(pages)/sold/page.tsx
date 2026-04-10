import type { Metadata } from "next";
import { getProducts } from "@/lib/productCatalog";
import SoldItems from "@/components/Sold/SoldItems";

export const metadata: Metadata = {
  title: "Recently Sold | Zanesville Store",
  description:
    "Items that have recently sold from Jordan's personal inventory.",
};

const SoldPage = async () => {
  const { data } = await getProducts({
    filter: "sold",
    take: 200,
    sort: "latest",
  });

  return (
    <main>
      <SoldItems products={data} />
    </main>
  );
};

export default SoldPage;
