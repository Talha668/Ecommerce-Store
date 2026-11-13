/** Shared formatting helpers. */

/** Format a decimal string from DRF (e.g. "999.99") as USD. */
export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '$0.00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '$0.00'
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

/** "2024-05-12T10:30:00Z" → "May 12, 2024" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Human-friendly order status labels (ORDER_STATUS_CHOICES in settings). */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  payment_processing: 'Payment Processing',
  payment_received: 'Payment Received',
  payment_failed: 'Payment Failed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
}

/** Tailwind classes per order status (used for status pills). */
export const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  payment_processing: 'bg-yellow-100 text-yellow-800',
  payment_received: 'bg-green-100 text-green-800',
  payment_failed: 'bg-red-100 text-red-800',
  confirmed: 'bg-green-100 text-green-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-600',
  disputed: 'bg-orange-100 text-orange-800',
}
