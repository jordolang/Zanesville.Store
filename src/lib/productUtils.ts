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
export const getFirstImage = (thumbnailUrls: string[] | null): string => {
  // Check if thumbnailUrls is an array and has elements
  if (Array.isArray(thumbnailUrls) && thumbnailUrls.length > 0) {
    const firstUrl = thumbnailUrls[0];
    // Explicit type check to ensure it's a string
    if (typeof firstUrl === 'string' && firstUrl.trim() !== '') {
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
