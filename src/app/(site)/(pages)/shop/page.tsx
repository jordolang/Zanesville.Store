import React from "react";
import ShopWithSidebar from "@/components/ShopWithSidebar";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Shop | Zanesville Store - Interactive Inventory",
  description:
    "Browse Jordan's personal inventory of furniture, home decor, electronics, and more. This is a showcase — orders are not fulfilled.",
};

const ShopPage = () => {
  return (
    <main>
      <ShopWithSidebar />
    </main>
  );
};

export default ShopPage;
