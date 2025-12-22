"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import type { Product as PrismaProduct, Category } from "@prisma/client";

// Import Swiper styles
import "swiper/css/pagination";
import "swiper/css";

import Image from "next/image";
import Link from "next/link";

type ProductWithCategory = PrismaProduct & {
  category: Category | null;
};

type HeroCarouselProps = {
  products: ProductWithCategory[];
};

const HeroCarousel = ({ products }: HeroCarouselProps) => {
  if (!products || products.length === 0) {
    return null;
  }

  const getFirstImage = (thumbnailUrls: unknown): string => {
    if (Array.isArray(thumbnailUrls) && thumbnailUrls.length > 0) {
      return thumbnailUrls[0];
    }
    return "/images/products/placeholder.png";
  };

  const calculateDiscount = (price: number, discountedPrice: number): number => {
    if (price === 0 || !discountedPrice) return 0;
    return Math.round(((price - discountedPrice) / price) * 100);
  };

  return (
    <Swiper
      spaceBetween={30}
      centeredSlides={true}
      autoplay={{
        delay: 4000,
        disableOnInteraction: false,
      }}
      pagination={{
        clickable: true,
      }}
      modules={[Autoplay, Pagination]}
      className="hero-carousel"
    >
      {products.map((product) => {
        const price = Number(product.price);
        const discountedPrice = Number(product.discountedPrice || product.price);
        const discount = calculateDiscount(price, discountedPrice);
        const imageUrl = getFirstImage(product.thumbnailUrls);
        const shortDescription = product.description
          ? product.description.substring(0, 120) + "..."
          : `Quality ${product.category?.name || "product"} available now at Zanesville Store.`;

        return (
          <SwiperSlide key={product.id}>
            <div className="flex items-center pt-6 sm:pt-0 flex-col-reverse sm:flex-row">
              <div className="max-w-[394px] py-10 sm:py-15 lg:py-24.5 pl-4 sm:pl-7.5 lg:pl-12.5">
                {discount > 0 && (
                  <div className="flex items-center gap-4 mb-7.5 sm:mb-10">
                    <span className="block font-semibold text-heading-3 sm:text-heading-1 text-blue">
                      {discount}%
                    </span>
                    <span className="block text-dark text-sm sm:text-custom-1 sm:leading-[24px]">
                      Sale
                      <br />
                      Off
                    </span>
                  </div>
                )}

                <h1 className="font-semibold text-dark text-xl sm:text-3xl mb-3">
                  <Link href={`/shop-details?slug=${product.slug}`}>
                    {product.title}
                  </Link>
                </h1>

                <p className="text-sm sm:text-base line-clamp-3">
                  {shortDescription}
                </p>

                <div className="mt-4 mb-6">
                  {discount > 0 ? (
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-2xl text-blue">
                        ${discountedPrice.toFixed(2)}
                      </span>
                      <span className="font-medium text-lg text-gray-500 line-through">
                        ${price.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold text-2xl text-blue">
                      ${price.toFixed(2)}
                    </span>
                  )}
                </div>

                <Link
                  href={`/shop-details?slug=${product.slug}`}
                  className="inline-flex font-medium text-white text-custom-sm rounded-md bg-dark py-3 px-9 ease-out duration-200 hover:bg-blue mt-6"
                >
                  Shop Now
                </Link>
              </div>

              <div className="relative w-full max-w-[351px] h-[358px]">
                <Image
                  src={imageUrl}
                  alt={product.title}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};

export default HeroCarousel;
