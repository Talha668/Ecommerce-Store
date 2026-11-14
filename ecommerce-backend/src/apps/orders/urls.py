from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'cards', views.MastercardCardViewSet, basename='mastercard-cards')
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'orders', views.OrderViewSet, basename='orders')
router.register(r'admin/orders', views.AdminOrderViewSet, basename='admin-orders')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),

    # Checkout API
    # FIX: removed path('checkout/', CheckoutPageView...) — that template view
    # was deleted. The React frontend calls POST /api/orders/api/checkout/.
    path('api/checkout/', views.CheckoutAPIView.as_view(), name='api-checkout'),
]
