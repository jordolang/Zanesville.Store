import React from "react";
import Image from "next/image";
import Breadcrumb from "../Common/Breadcrumb";
import type { Product } from "@/types/product";

interface SoldItemsProps {
  products: Product[];
}

const FALLBACK_IMAGE = "/images/products/placeholder.png";

const SoldItems: React.FC<SoldItemsProps> = ({ products }) => {
  return (
    <>
      <Breadcrumb title={"Recently Sold"} pages={["recently sold"]} />

      <section className="py-14 xl:py-20 bg-gray-2">
        <div className="max-w-[1170px] mx-auto px-4 sm:px-8 xl:px-0">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold text-dark mb-2">
              Items that have found a new home
            </h2>
            <p className="text-dark-4">
              These products have sold recently and are no longer available.
              Looking for something similar? Reach out on the{" "}
              <a href="/contact" className="text-blue hover:underline">
                contact page
              </a>{" "}
              — Jordan may be able to source it.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-xl shadow-1 p-10 text-center text-dark-4">
              Nothing marked sold yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const thumbnail =
                  product.imgs?.thumbnails?.[0] ?? FALLBACK_IMAGE;
                return (
                  <article
                    key={product.id}
                    className="bg-white rounded-xl shadow-1 overflow-hidden opacity-80"
                  >
                    <div className="relative aspect-square bg-gray-1">
                      <Image
                        src={thumbnail}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 300px"
                        className="object-cover"
                      />
                      <span className="absolute top-3 left-3 bg-dark text-white text-xs uppercase tracking-wide px-2 py-1 rounded">
                        Sold
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-dark line-clamp-2 min-h-[3rem]">
                        {product.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-dark-4 line-through">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default SoldItems;
