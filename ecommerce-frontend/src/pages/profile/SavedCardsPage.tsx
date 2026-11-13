import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cardsApi } from '../../api/orders'
import { EmptyState, Spinner } from '../../components/ui/ui'
import { ProfileSidebar } from './ProfileSidebar'

/**
 * Saved Cards — the base.html navbar links to "Saved Cards" but no template
 * existed for it. This page lists the user's masked Mastercard cards from
 * GET /api/orders/cards/ (MastercardCardViewSet) with set-default/deactivate.
 */
export function SavedCardsPage() {
  const queryClient = useQueryClient()
  const cards = useQuery({ queryKey: ['cards'], queryFn: () => cardsApi.list() })

  const setDefault = useMutation({
    mutationFn: (id: number) => cardsApi.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  })
  const deactivate = useMutation({
    mutationFn: (id: number) => cardsApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <ProfileSidebar />
        </div>

        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Methods</h2>

            {cards.isLoading ? (
              <Spinner label="Loading cards..." />
            ) : (cards.data ?? []).length === 0 ? (
              <EmptyState
                icon="fa-credit-card"
                title="No saved cards"
                description="Your saved cards will appear here. You can save a card during checkout."
                action={
                  <Link to="/products" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                    Start Shopping
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(cards.data ?? []).map((card) => (
                  <div
                    key={card.id}
                    className={`border rounded-lg p-4 ${
                      card.is_default ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <i className="fab fa-cc-mastercard text-3xl text-gray-700"></i>
                        <div>
                          <p className="font-semibold text-gray-800">{card.masked_number}</p>
                          <p className="text-xs text-gray-500">
                            {card.cardholder_name} · Expires {card.expiry_month}/
                            {card.expiry_year}
                          </p>
                        </div>
                      </div>
                      {card.is_default && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>

                    {card.is_expired && (
                      <p className="text-red-600 text-xs mt-2 font-semibold">
                        This card has expired
                      </p>
                    )}

                    <div className="flex space-x-3 mt-4 text-sm">
                      {!card.is_default && !card.is_expired && (
                        <button
                          onClick={() => setDefault.mutate(card.id)}
                          disabled={setDefault.isPending}
                          className="text-blue-600 hover:underline"
                        >
                          Set as default
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Remove this card?')) deactivate.mutate(card.id)
                        }}
                        disabled={deactivate.isPending}
                        className="text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
