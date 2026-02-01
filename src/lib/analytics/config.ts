/**
 * Analytics configuration
 * Reads from environment variables with sensible defaults
 */

export const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || 'localhost';
export const PLAUSIBLE_API_HOST = import.meta.env.VITE_PLAUSIBLE_API_HOST; // undefined by default
