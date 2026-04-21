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
    
    # Checkout for Browser
    path('checkout/', views.CheckoutPageView.as_view(), name='checkout-page'),

    # Checkout for API
    path('api/checkout/', views.CheckoutAPIView.as_view(), name='api-checkout'),
]