export type Product = {
  title: string;
  reviews: number;
  price: number;
  discountedPrice: number;
  id: number;
  slug?: string;
  category?: string | null;
  description?: string;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};
