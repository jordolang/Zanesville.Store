export type Product = {
  title: string;
  reviews: number;
  price: number;
  discountedPrice: number;
  id: number;
  slug?: string;
  category?: string | null;
  brand?: string | null;
  description?: string;
  features?: string[];
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};
