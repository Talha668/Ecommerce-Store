from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404, redirect
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from .models import (
    MastercardCard, MastercardPaymentTransaction,
    Cart, CartItem, Order
)
from .serializers import (
    MastercardCardSerializer, MastercardCardCreateSerializer,
    MastercardPaymentTransactionSerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer, CheckoutSerializer
)
from .services.mastercard_service import MastercardPaymentService
from django.views.generic import ListView, DetailView, TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse
from rest_framework.test import APIRequestFactory
from .services import CheckoutService
from django.contrib import messages










class MastercardCardViewSet(viewsets.ModelViewSet):
    """ViewSet for Mastercard card management"""
    serializer_class = MastercardCardSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MastercardCard.objects.filter(
            user=self.request.user,
            is_active=True
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MastercardCardCreateSerializer
        return MastercardCardSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set card as default payment method"""
        card = self.get_object()
        card.is_default = True
        card.save()
        return Response({'status': 'default card updated'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate card"""
        card = self.get_object()
        card.is_active = False
        card.save()
        return Response({'status': 'card deactivated'})


class CartViewSet(viewsets.ViewSet):
    """ViewSet for shopping cart operations"""
    permission_classes = [IsAuthenticated]
    
    def get_cart(self, request):
        """Get or create cart for user"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        return cart
    
    def list(self, request):
        """Get current cart"""
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to cart"""
        cart = self.get_cart(request)
        
        # Create serializer with cart context
        serializer = CartItemSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        # Check if item already exists in cart
        product = serializer.validated_data['product']
        variant = serializer.validated_data.get('variant')
        quantity = serializer.validated_data['quantity']
        
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        return Response(
            CartSerializer(cart).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def update_item(self, request):
        """Update cart item quantity"""
        cart = self.get_cart(request)
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity')
        
        if not item_id or not quantity:
            return Response(
                {'error': 'item_id and quantity are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.quantity = quantity
            cart_item.save()
            
            return Response(CartSerializer(cart).data)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        """Remove item from cart"""
        cart = self.get_cart(request)
        item_id = request.data.get('item_id')
        
        if not item_id:
            return Response(
                {'error': 'item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.delete()
            
            return Response(CartSerializer(cart).data)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def clear(self, request):
        """Clear entire cart"""
        cart = self.get_cart(request)
        cart.items.all().delete()
        
        return Response(CartSerializer(cart).data)


class CheckoutAPIView(generics.GenericAPIView):
    """Checkout and payment processing"""
    permission_classes = [IsAuthenticated]
    serializer_class = CheckoutSerializer
    
    def post(self, request):
        # Validate input
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        # Call service to handle logic. We pass 'requst' because card serializer might need it.
        success, data, status_code = CheckoutService.process_checkout(
            user=request.user,
            validated_data=serializer.validated_data,
            request=request
        )
        # Return response
        return Response(data, status=status_code)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for orders (read-only for customers)"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order"""
        order = self.get_object()
        
        if not order.can_cancel:
            return Response(
                {'error': 'Order cannot be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'cancelled'
        order.cancelled_at = timezone.now()
        order.save()
        
        # Process refund if payment was made
        if order.is_paid and order.payment_transaction:
            payment_service = MastercardPaymentService()
            success, transaction, message = payment_service.refund(
                order.payment_transaction,
                reason='Order cancelled by customer'
            )
            
            return Response({
                'message': 'Order cancelled and refund initiated',
                'order': OrderSerializer(order).data,
                'refund': MastercardPaymentTransactionSerializer(transaction).data if success else None
            })
        
        return Response({
            'message': 'Order cancelled successfully',
            'order': OrderSerializer(order).data
        })
    
    @action(detail=True, methods=['get'])
    def track(self, request, pk=None):
        """Track order shipment"""
        order = self.get_object()
        
        if order.tracking_number:
            return Response({
                'order_number': order.order_number,
                'status': order.status,
                'shipping_method': order.shipping_method,
                'carrier': order.shipping_carrier,
                'tracking_number': order.tracking_number,
                'tracking_url': order.tracking_url,
                'estimated_delivery': order.estimated_delivery,
                'delivered_at': order.delivered_at
            })
        else:
            return Response({
                'order_number': order.order_number,
                'status': order.status,
                'message': 'Tracking information not available yet'
            })


class AdminOrderViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for orders"""
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]
    queryset = Order.objects.all().order_by('-created_at')
    filterset_fields = ['status', 'payment_status', 'payment_method']
    search_fields = ['order_number', 'user__email', 'user__first_name', 'user__last_name']
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status:
            order.status = new_status
            
            if new_status == 'delivered':
                order.delivered_at = timezone.now()
            
            order.save()
            
            return Response({
                'message': f'Order status updated to {new_status}',
                'order': OrderSerializer(order).data
            })
        
        return Response(
            {'error': 'Status is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def add_tracking(self, request, pk=None):
        """Add tracking information"""
        order = self.get_object()
        
        order.shipping_carrier = request.data.get('carrier', '')
        order.tracking_number = request.data.get('tracking_number', '')
        order.tracking_url = request.data.get('tracking_url', '')
        order.status = 'shipped'
        order.save()
        
        return Response({
            'message': 'Tracking information added',
            'order': OrderSerializer(order).data
        })
    
    @action(detail=True, methods=['post'])
    def process_refund(self, request, pk=None):
        """Process refund for an order"""
        order = self.get_object()
        
        if not order.is_paid:
            return Response(
                {'error': 'Order is not paid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = request.data.get('amount')
        if amount:
            amount = Decimal(amount)
        else:
            amount = order.total
        
        payment_service = MastercardPaymentService()
        success, transaction, message = payment_service.refund(
            order.payment_transaction,
            amount=amount,
            reason=request.data.get('reason', '')
        )
        
        if success:
            return Response({
                'success': True,
                'message': 'Refund processed successfully',
                'transaction': MastercardPaymentTransactionSerializer(transaction).data
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)


class CartView(LoginRequiredMixin, TemplateView):
    template_name = 'cart/cart.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        context['cart'] = cart
        return context


class CheckoutPageView(LoginRequiredMixin, TemplateView):
    """Renders the checkout page and handles the form submissions"""
    template_name = 'checkout/checkout.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        cart, created = Cart.objects.get_or_create(user=self.request.user)

        context['cart'] = cart
        context['addresses'] = self.request.user.addresses.all()
        context['saved_cards'] = self.request.user.saved_cards.filter(is_active=True)
        context['years'] = range(2024, 2035)
        return context
    
    def post(self, request, *args, **kwargs):
        # Prepare data for serializer
        serializer = CheckoutService(
            data=request.POST,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            # If validation fails, add errors to message and redirect back
            errors = serializer.errors
            for field, error_list in error.items():
                for error in error_list:
                    messages.error(request, f"{field}: {error}")
            return redirect('checkout-page')
        
        # Call service to process the order
        try:
            success, data, status_code = CheckoutService.process_checkout(
                user=request.user,
                validated_data=serializer.validated_data,
                request=request
            )

            if success:
                # Redirect to order confirmation page
                order_number = data.get('order', []).get('order_number')
                if order_number:
                    return redirect('order-confimation', order_number=order_number)
                else:
                    return redirect('order-success')
            else:
                # Handle failure
                message = data.get('message', 'something went wrong.')
                messages.error(request, message)
                return redirect('checkout-page')
            
        except Exception as e:
            messages.error(request, f"An unexpected error occured: {str(e)}")
            return redirect('checkout-page')    


class OrderConfirmationView(LoginRequiredMixin, DetailView):
    model = Order
    template_name = 'orders/confirmation.html'
    context_object_name = 'order'
    slug_field = 'order_number'
    slug_url_kwarg = 'order_number'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        order = self.get_object()
        context['transaction'] = order.mastercard_payments.first()
        return context


class MyOrdersView(LoginRequiredMixin, ListView):
    model = Order
    template_name = 'orders/my_orders.html'
    context_object_name = 'orders'
    paginate_by = 10
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')