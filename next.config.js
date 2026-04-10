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
    "/shop": ["./prisma/zanesville-store.db"],
  },
};

module.exports = nextConfig;
