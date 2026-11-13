import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ordersApi } from '../../api/orders'
import type { Order } from '../../api/types'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, Spinner } from '../../components/ui/ui'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatDate,
  formatPrice,
} from '../../lib/format'

/**
 * My Orders — converted from templates/orders/my_orders.html.
 * The old template was a stub (plain <p> tags, "#" links); this version uses
 * the real GET /api/orders/orders/ endpoint with pagination and status pills.
 */
export function MyOrdersPage() {
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)

  const orders = useQuery({
    queryKey: ['orders', 'list', page],
    queryFn: () => ordersApi.list(),
    placeholderData: keepPreviousData,
  })

  // The endpoint may or may not be paginated depending on DRF settings.
  const data = orders.data
  const orderList: Order[] = Array.isArray(data) ? data : (data?.results ?? [])

  const totalPages =
    !Array.isArray(data) && data ? data.total_pages : 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      {orders.isLoading ? (
        <Spinner label="Loading your orders..." />
      ) : orderList.length === 0 ? (
        <EmptyState
          icon="fa-box"
          title="No orders yet"
          description="When you place an order it will show up here."
          action={
            <Link to="/products" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
              Start Shopping
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {orderList.map((order) => (
              <div key={order.id} className="bg-white border rounded-lg shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-semibold text-gray-800">
                        #{order.order_number}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ORDER_STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Placed on {formatDate(order.created_at)} · {order.item_count} item
                      {order.item_count !== 1 ? 's' : ''}
                      {order.items[0] && ` · ${order.items[0].product?.name}`}
                      {order.items.length > 1 && ` +${order.items.length - 1} more`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-6">
                    <span className="text-lg font-bold text-blue-600">
                      {formatPrice(order.total)}
                    </span>
                    <Link
                      to={`/order-confirmation/${order.order_number}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/my-orders?page=${p}`}
          />
        </>
      )}
    </div>
  )
}
