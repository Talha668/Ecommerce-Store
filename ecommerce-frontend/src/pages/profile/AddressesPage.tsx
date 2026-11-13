import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersApi } from '../../api/auth'
import { EmptyState, Spinner } from '../../components/ui/ui'
import { ProfileSidebar } from './ProfileSidebar'

/**
 * Addresses — linked from the profile sidebar ("Addresses"). Lists saved
 * addresses from GET /api/auth/addresses/ and links to the add-address form.
 */
export function AddressesPage() {
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => usersApi.addresses() })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <ProfileSidebar />
        </div>

        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Addresses</h2>
              <Link
                to="/add-address"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <i className="fas fa-plus mr-2"></i>Add Address
              </Link>
            </div>

            {addresses.isLoading ? (
              <Spinner label="Loading addresses..." />
            ) : (addresses.data ?? []).length === 0 ? (
              <EmptyState
                icon="fa-map-marker-alt"
                title="No addresses saved"
                description="Add a shipping address to speed up checkout."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(addresses.data ?? []).map((address) => (
                  <div
                    key={address.id}
                    className={`border rounded-lg p-4 ${
                      address.is_default ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-800">{address.full_name}</p>
                      {address.is_default && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-0.5">
                      <p>{address.street}</p>
                      <p>
                        {address.city}, {address.state} {address.zip_code}
                      </p>
                      <p>{address.country}</p>
                      <p>
                        <i className="fas fa-phone-alt mr-1"></i> {address.phone_number}
                      </p>
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
