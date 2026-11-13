/**
 * Cart hooks — a thin TanStack Query layer over cartApi.
 * The cart requires authentication (CartViewSet has IsAuthenticated),
 * so all queries are enabled only when logged in.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartApi } from '../api/orders'
import { useAuth } from '../context/AuthContext'

export const CART_QUERY_KEY = ['cart'] as const

export function useCart() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => cartApi.get(),
    enabled: isAuthenticated,
    // Cart totals must always be fresh.
    staleTime: 0,
  })
}

/** Cart item count for the navbar badge. */
export function useCartItemCount(): number {
  const { data } = useCart()
  return data?.item_count ?? 0
}

function useInvalidateCart() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
}

export function useAddToCart() {
  const invalidate = useInvalidateCart()
  return useMutation({
    mutationFn: ({ productId, quantity = 1, variantId }: {
      productId: number
      quantity?: number
      variantId?: number
    }) => cartApi.addItem(productId, quantity, variantId),
    onSuccess: invalidate,
  })
}

export function useUpdateCartItem() {
  const invalidate = useInvalidateCart()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      cartApi.updateItem(itemId, quantity),
    onSuccess: invalidate,
  })
}

export function useRemoveCartItem() {
  const invalidate = useInvalidateCart()
  return useMutation({
    mutationFn: (itemId: number) => cartApi.removeItem(itemId),
    onSuccess: invalidate,
  })
}

export function useClearCart() {
  const invalidate = useInvalidateCart()
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: invalidate,
  })
}
