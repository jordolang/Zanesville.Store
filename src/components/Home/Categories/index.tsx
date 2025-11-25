import React from "react";
import prisma from "@/lib/prisma";
import CategoriesCarousel from "./CategoriesCarousel";

const Categories = async () => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const formattedCategories = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: cat._count.products,
  }));

  return <CategoriesCarousel categories={formattedCategories} />;
};

export default Categories;
