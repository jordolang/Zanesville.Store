import Home from "@/components/Home";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zanesville Store - Quality Furniture, Home Decor & More",
  description: "Shop quality merchandise including furniture, home decor, electronics, bedding, pet supplies, and more at Zanesville Store in Zanesville, Ohio.",
};

export default function HomePage() {
  return (
    <>
      <Home />
    </>
  );
}
