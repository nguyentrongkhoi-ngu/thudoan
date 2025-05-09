import { ImageLoaderProps } from "next/image";

/**
 * Custom image loader for Next.js Image component
 * This handles direct URLs without transformation
 */
export function customImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Kiểm tra URL hợp lệ
  if (!isValidURL(src)) {
    // Trả về URL placeholder nếu URL không hợp lệ
    return `https://via.placeholder.com/${width}x${width}?text=No+Image`;
  }
  
  // Trả về URL gốc với các tham số width và quality nếu cần
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}&q=${quality || 75}`;
}

/**
 * Check if a string is a valid URL
 * @param str - String to check
 * @returns Boolean indicating if string is a valid URL
 */
export function isValidURL(str: string): boolean {
  try {
    new URL(str);
    return str.startsWith('http://') || str.startsWith('https://');
  } catch (e) {
    return false;
  }
}

/**
 * Get a fallback image URL if the main one is not available
 * @param imageUrl - Primary image URL
 * @param fallbackUrl - Fallback image URL
 * @returns Either the primary URL if valid or the fallback
 */
export function getImageWithFallback(
  imageUrl: string | null | undefined,
  fallbackUrl: string = '/images/placeholder.jpg'
): string {
  if (!imageUrl) return fallbackUrl;
  if (!isValidURL(imageUrl)) return fallbackUrl;
  return imageUrl;
} 