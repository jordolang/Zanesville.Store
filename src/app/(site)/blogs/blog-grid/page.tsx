import React from "react";
import BlogGrid from "@/components/BlogGrid";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blog | Zanesville Store - Shopping Tips & Updates",
  description: "Stay updated with the latest tips, product guides, and news from Zanesville Store.",
};

const BlogGridPage = () => {
  return (
    <main>
      <BlogGrid />
    </main>
  );
};

export default BlogGridPage;
