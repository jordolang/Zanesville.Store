/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/products": ["./prisma/zanesville-store.db"],
    "/api/categories": ["./prisma/zanesville-store.db"],
    "/api/auth/register": ["./prisma/zanesville-store.db"],
    "/": ["./prisma/zanesville-store.db"],
    "/shop-with-sidebar": ["./prisma/zanesville-store.db"],
    "/shop-without-sidebar": ["./prisma/zanesville-store.db"],
    "/blogs/blog-grid-with-sidebar": ["./prisma/zanesville-store.db"],
    "/blogs/blog-details-with-sidebar": ["./prisma/zanesville-store.db"],
  },
};

module.exports = nextConfig;
