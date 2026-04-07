/**
 * Utility functions for product data processing
 */

/**
 * Extracts the first image URL from product thumbnail URLs.
 * Provides defensive checks to ensure type safety and prevent rendering errors.
 *
 * @param thumbnailUrls - Array of thumbnail URLs from the database
 * @returns First valid image URL or placeholder
 */
export const getFirstImage = (thumbnailUrls: string[] | string | null): string => {
  let urls = thumbnailUrls;
  if (typeof urls === "string") {
    try {
      urls = JSON.parse(urls);
    } catch {
      return "/images/products/placeholder.png";
    }
  }
  if (Array.isArray(urls) && urls.length > 0) {
    const firstUrl = urls[0];
    if (typeof firstUrl === "string" && firstUrl.trim() !== "") {
      return firstUrl;
    }
  }
  return "/images/products/placeholder.png";
};

/**
 * Calculates the discount percentage between original and discounted price.
 * Guards against negative discounts and division by zero.
 *
 * @param price - Original price
 * @param discountedPrice - Discounted price
 * @returns Discount percentage (0-100), clamped to non-negative values
 */
export const calculateDiscount = (price: number, discountedPrice: number): number => {
  if (price === 0 || !discountedPrice) return 0;
  const discount = ((price - discountedPrice) / price) * 100;
  // Clamp to 0 to prevent negative discounts when discountedPrice > price
  return Math.round(Math.max(0, discount));
};
