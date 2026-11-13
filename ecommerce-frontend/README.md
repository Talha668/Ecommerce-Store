# MasterShop Frontend (React + TypeScript + Vite + Tailwind v4)

Conversion of the Django HTML templates in `ecommerce-backend/src/templates/`
into a React SPA that talks to your **existing DRF API**. Same design language
(Tailwind, blue-600 primary, Font Awesome, Inter) — just no more page reloads.

## Stack

| Concern      | Library                              |
|--------------|--------------------------------------|
| Build        | Vite + TypeScript (strict)           |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`)|
| Data fetching| TanStack Query v5                    |
| Routing      | React Router v7                      |
| Auth         | SimpleJWT (backend, already present) |

## Setup

```bash
# inside E-commerce\ecommerce-frontend  (replace the Vite scaffold if you wish)
npm install
npm run dev        # http://localhost:5173
```

Start Django as usual in another terminal (`python manage.py runserver`).
The Vite dev server proxies `/api`, `/media` and `/static` to
`http://127.0.0.1:8000` — **no CORS setup needed in development**.

For production, run `npm run build` and serve `dist/` behind nginx; then either
point `/api` at Django in nginx or set `VITE_API_BASE_URL` in `.env` (see
`.env.example`) and add your frontend origin to `CORS_ALLOWED_ORIGINS`.

## Route map (old Django URL → new React route)

| Django template                 | React route                       | Page component        |
|---------------------------------|-----------------------------------|-----------------------|
| `home.html`                     | `/`                               | `HomePage`            |
| `products/list.html`            | `/products` (+ `?search=&category=&sort=...`) | `ProductListPage` |
| `products/search_results.html`  | `/products?search=...`            | (reuses list page)    |
| `products/detail.html` ⚠        | `/products/:slug`                 | `ProductDetailPage`   |
| `cart/cart.html`                | `/cart` (auth)                    | `CartPage`            |
| `checkout/checkout.html`        | `/checkout` (auth)                | `CheckoutPage`        |
| `orders/confirmation.html`      | `/order-confirmation/:orderNumber` (auth) | `OrderConfirmationPage` |
| `orders/my_orders.html`         | `/my-orders` (auth)               | `MyOrdersPage`        |
| `auth/login.html`               | `/login`                          | `LoginPage`           |
| `auth/register.html`            | `/register`                       | `RegisterPage`        |
| `profile/profile.html` ⚠        | `/profile` (auth)                 | `ProfilePage`         |
| `profile/add_address.html`      | `/add-address` (auth)             | `AddAddressPage`      |
| *(no template — dead link)*     | `/saved-cards`, `/addresses`, `/wishlist` | new pages      |
| `emails/*`                      | **kept server-side** — do NOT convert | —                 |

⚠ `products/detail.html` in your repo accidentally contained a **copy of
cart.html**, and `profile.html` had its content pasted **three times**. Both
pages were rebuilt properly from the DRF serializers + site design.

## Project structure

```
src/
├── api/            # typed fetch layer (one module per backend app)
│   ├── client.ts   # JWT wrapper: access in memory, refresh in localStorage,
│   │               # automatic 401 → refresh → retry, DRF error parsing
│   ├── types.ts    # interfaces mirroring every DRF serializer
│   ├── products.ts # /api/products/...
│   ├── auth.ts     # /api/auth/...  (register, login, me, addresses, profile)
│   └── orders.ts   # /api/orders/... (cart, checkout, orders, cards)
├── context/AuthContext.tsx   # user state, login/register/logout
├── hooks/useCart.ts          # TanStack Query bindings for the cart
├── components/               # Navbar, Footer, Layout, ProductCard,
│                             # RatingStars, Pagination, ui primitives
└── pages/                    # one page per old template (see route map)
```

## Backend issues found while converting (fix these in the next phase)

1. **`settings/base.py`**: `REST_FRAMEQORK` is misspelled → *all* DRF settings
   (JWT default auth, pagination, permissions) are silently NOT applied. Also
   `rest_framework.permission.IsAuthenticatedOrReady` should be
   `permissions.IsAuthenticatedOrReadOnly`. `AUTH_USER_MODEL` is declared 3×
   with different values ('user.USER', 'users.user', 'users.User').
2. **CORS**: `CORS_ALLOWED_ORIGINS` only lists port **3000** — add
   `http://localhost:5173` (or use the dev proxy, which avoids CORS entirely).
3. **`products/views.py` `home()`**: broken and unused —
   `render(request, home.html, ...)` is a NameError (missing quotes),
   `order_by('-product-count')` should be `-product_count`,
   `cart_itrm_count` typo. The URLs use `core.views.HomeView` instead.
4. **`users/views.py` `AddAdressview`**: `status=staus.HTTP_201_CREATED` —
   NameError, so adding an address always crashes *after* saving.
5. **`orders/views.py` `CheckoutPageView.post`**: calls
   `CheckoutService(data=...)` as if it were a serializer (it's a service
   class) — the whole template-based checkout POST path is broken. The API
   path (`CheckoutAPIView`) is the good one, which is what this frontend uses.
6. **`config/urls.py`**: `path('api/checkout/', include('apps.orders.urls'))`
   double-includes the orders router (so `/api/checkout/cart/` etc. exist).
   The frontend calls `/api/orders/api/checkout/` — consider a cleaner URL.
7. **`products/detail.html`** = duplicate of `cart.html` (see above).
8. **`base.html`** links to url names that don't exist (`wishlist-list`,
   `saved-cards`, `change-password`, `addresses`) — replaced by real React routes.
9. **`OrderViewSet`** has no lookup by `order_number`, so the confirmation page
   falls back to fetching the order list. Add `lookup_field = 'order_number'`
   or a `?order_number=` filter next.
10. **`MastercardCardCreateSerializer`** stores card data with base64
    ("TODO: encrypt") — must be fixed before real payments.
11. `db.sqlite3` exists but settings point to PostgreSQL; `add_products.py` /
    `add_categories.py` sit in `src/` root — move to a management command.

## What to delete on the backend (after the frontend is live)

- The template-based views in `config/urls.py` (`path('', HomeView...)`,
  `login/`, `register/`, `cart/`, `checkout/`, `my-orders/`, `profile/`,
  `add-address/`) and the `ListView`/`TemplateView` classes in
  `products/views.py`, `orders/views.py`, `core/views.py`.
- `templates/auth|cart|checkout|orders|products|profile/` and `home.html`,
  `base.html`.
- **Keep** `templates/emails/` — those are rendered server-side by Celery/SES.
- Once removed, `django-compressor`, `django-debug-toolbar` (optional) and the
  cart `context_processors` can go too.
