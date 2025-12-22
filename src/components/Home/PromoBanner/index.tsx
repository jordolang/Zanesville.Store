import React from "react";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getFirstImage, calculateDiscount } from "@/lib/productUtils";

const PromoBanner = async () => {
  // Fetch products with good discounts for promo banners
  const promoProducts = await prisma.product.findMany({
    take: 3,
    where: {
      discountedPrice: { not: null },
      price: { gt: 0 },
    },
    orderBy: [
      { discountedPrice: "desc" },
      { rating: "desc" },
    ],
    include: {
      category: true,
    },
  });

  const [mainProduct, ...sideProducts] = promoProducts;

  if (!mainProduct) {
    return null;
  }

  const mainPrice = Number(mainProduct.price);
  const mainDiscountedPrice = Number(mainProduct.discountedPrice || mainProduct.price);
  const mainDiscount = calculateDiscount(mainPrice, mainDiscountedPrice);
  return (
    <section className="overflow-hidden py-20">
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        {/* <!-- promo banner big --> */}
        <div className="relative z-1 overflow-hidden rounded-lg bg-[#F5F5F7] py-12.5 lg:py-17.5 xl:py-22.5 px-4 sm:px-7.5 lg:px-14 xl:px-19 mb-7.5">
          <div className="max-w-[550px] w-full">
            <span className="block font-medium text-xl text-dark mb-3">
              {mainProduct.title}
            </span>

            <h2 className="font-bold text-xl lg:text-heading-4 xl:text-heading-3 text-dark mb-5">
              {mainDiscount > 0 ? `UP TO ${mainDiscount}% OFF` : "SPECIAL OFFER"}
            </h2>

            <p>
              {mainProduct.description
                ? mainProduct.description.substring(0, 150) + "..."
                : `Quality ${mainProduct.category?.name || "product"} available at great prices. Shop now and save!`}
            </p>

            <Link
              href={`/shop-details?slug=${mainProduct.slug}`}
              className="inline-flex font-medium text-custom-sm text-white bg-blue py-[11px] px-9.5 rounded-md ease-out duration-200 hover:bg-blue-dark mt-7.5"
            >
              Buy Now
            </Link>
          </div>

          <div className="absolute bottom-0 right-4 lg:right-26 -z-1 w-[274px] h-[350px]">
            <Image
              src={getFirstImage(mainProduct.thumbnailUrls as string[] | null)}
              alt={mainProduct.title}
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="grid gap-7.5 grid-cols-1 lg:grid-cols-2">
          {/* <!-- promo banner small --> */}
          {sideProducts.slice(0, 2).map((product, index) => {
            const price = Number(product.price);
            const discountedPrice = Number(product.discountedPrice || product.price);
            const discount = calculateDiscount(price, discountedPrice);
            const bgColor = index === 0 ? "bg-[#DBF4F3]" : "bg-[#FFECE1]";
            const btnColor = index === 0 ? "bg-teal hover:bg-teal-dark" : "bg-orange hover:bg-orange-dark";
            const textAlign = index === 0 ? "text-right" : "";
            const imagePosition = index === 0 ? "left-3 sm:left-10" : "right-3 sm:right-8.5";

            return (
              <div
                key={product.id}
                className={`relative z-1 overflow-hidden rounded-lg ${bgColor} py-10 xl:py-16 px-4 sm:px-7.5 xl:px-10`}
              >
                <div className={`absolute top-1/2 -translate-y-1/2 ${imagePosition} -z-1 w-[200px] h-[200px]`}>
                  <Image
                    src={getFirstImage(product.thumbnailUrls as string[] | null)}
                    alt={product.title}
                    fill
                    className="object-contain"
                  />
                </div>

                <div className={textAlign}>
                  <span className="block text-lg text-dark mb-1.5">
                    {product.title.length > 40 ? product.title.substring(0, 40) + "..." : product.title}
                  </span>

                  <h2 className="font-bold text-xl lg:text-heading-4 text-dark mb-2.5">
                    {discount > 0 ? (
                      <>
                        Up to <span className={index === 0 ? "text-teal" : "text-orange"}>{discount}%</span> off
                      </>
                    ) : (
                      "Special Deal"
                    )}
                  </h2>

                  <p className={`${index === 0 ? "" : "max-w-[285px]"} text-custom-sm`}>
                    {product.category?.name || "Quality product"} - ${discountedPrice.toFixed(2)}
                  </p>

                  <Link
                    href={`/shop-details?slug=${product.slug}`}
                    className={`inline-flex font-medium text-custom-sm text-white ${btnColor} py-2.5 px-8.5 rounded-md ease-out duration-200 mt-7.5`}
                  >
                    {index === 0 ? "Grab Now" : "Buy Now"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
