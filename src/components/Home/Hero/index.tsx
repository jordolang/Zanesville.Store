import React from "react";
import HeroCarousel from "./HeroCarousel";
import HeroFeature from "./HeroFeature";
import Image from "next/image";

const Hero = () => {
  return (
    <section className="overflow-hidden pb-10 lg:pb-12.5 xl:pb-15 pt-57.5 sm:pt-45 lg:pt-30 xl:pt-51.5 bg-[#E5EAF4]">
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="flex flex-wrap gap-5">
          <div className="xl:max-w-[757px] w-full">
            <div className="relative z-1 rounded-[10px] bg-white overflow-hidden">
              {/* <!-- bg shapes --> */}
              <Image
                src="/images/hero/hero-bg.png"
                alt="hero bg shapes"
                className="absolute right-0 bottom-0 -z-1"
                width={534}
                height={520}
              />

              <HeroCarousel />
            </div>
          </div>

          <div className="xl:max-w-[393px] w-full">
            <div className="flex flex-col sm:flex-row xl:flex-col gap-5">
              <div className="w-full relative rounded-[10px] bg-white p-4 sm:p-7.5">
                <div className="flex flex-col justify-center h-full">
                  <div>
                    <h2 className="font-semibold text-dark text-xl mb-4">
                      <a href="/shop-with-sidebar"> New Arrivals Daily </a>
                    </h2>

                    <div>
                      <p className="font-medium text-dark-4 text-custom-sm mb-1.5">
                        Fresh inventory from furniture to electronics
                      </p>
                      <span className="flex items-center gap-3 mt-4">
                        <span className="font-medium text-lg text-blue">
                          Shop Now →
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full relative rounded-[10px] bg-white p-4 sm:p-7.5">
                <div className="flex flex-col justify-center h-full">
                  <div>
                    <h2 className="font-semibold text-dark text-xl mb-4">
                      <a href="/shop-with-sidebar"> Quality Merchandise </a>
                    </h2>

                    <div>
                      <p className="font-medium text-dark-4 text-custom-sm mb-1.5">
                        Home goods, decor, and more at great prices
                      </p>
                      <span className="flex items-center gap-3 mt-4">
                        <span className="font-medium text-lg text-blue">
                          Browse Catalog →
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              
            </div>
          </div>
        </div>
      </div>

      {/* <!-- Hero features --> */}
      <HeroFeature />
    </section>
  );
};

export default Hero;
