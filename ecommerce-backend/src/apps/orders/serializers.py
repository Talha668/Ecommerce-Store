import base64
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .models import (
    MastercardCard, MastercardPaymentTransaction,
    Cart, CartItem, Order
)
from apps.products.serializers import ProductListSerializer, ProductVariantSerializer
from apps.users.serializers import UserAddressSerializer
from .services.mastercard_service import MastercardPaymentService
from .services import CheckoutService







class MastercardCardSerializer(serializers.ModelSerializer):
    """Serializer for Mastercard cards (masked)"""
    masked_number = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = MastercardCard
        fields = [
            'id', 'cardholder_name', 'last_four', 'masked_number',
            'card_type', 'expiry_month', 'expiry_year', 'is_expired',
            'is_default', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'last_four', 'created_at', 'updated_at']


class MastercardCardCreateSerializer(serializers.Serializer):
    """Serializer for creating/adding a Mastercard"""
    card_number = serializers.CharField(write_only=True, max_length=19, min_length=16)
    cardholder_name = serializers.CharField(max_length=255)
    expiry_month = serializers.IntegerField(min_value=1, max_value=12)
    expiry_year = serializers.IntegerField(min_value=2024, max_value=2050)
    cvv = serializers.CharField(write_only=True, max_length=4, min_length=3)
    card_type = serializers.ChoiceField(choices=MastercardCard.CARD_TYPES, default='mastercard')
    is_default = serializers.BooleanField(default=False)
    billing_address_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, data):
        # Validate card using Mastercard service
        service = MastercardPaymentService()
        is_valid, message, card_type = service.validate_card(
            data['card_number'],
            data['expiry_month'],
            data['expiry_year'],
            data['cvv']
        )
        
        if not is_valid:
            raise serializers.ValidationError({"card_number": message})
        
        # Set detected card type
        data['detected_card_type'] = card_type
        return data
    
    def create(self, validated_data):
        # Extract sensitive data
        card_number = validated_data.pop('card_number')
        cvv = validated_data.pop('cvv')
        card_type = validated_data.pop('detected_card_type')
        
        # Get last 4 digits
        last_four = card_number[-4:]
        
        # TODO: Encrypt card number and CVV before storing
        # For now, store a simple "encrypted" version (use proper encryption in production)
        encrypted_number = base64.b64encode(f"enc_{card_number[-8:]}".encode()).decode()
        encrypted_cvv = base64.b64encode(f"enc_{cvv}".encode()).decode()
        
        # Create card
        card = MastercardCard.objects.create(
            user=self.context['request'].user,
            card_number_encrypted=encrypted_number,
            cardholder_name=validated_data['cardholder_name'],
            expiry_month=validated_data['expiry_month'],
            expiry_year=validated_data['expiry_year'],
            last_four=last_four,
            card_type=validated_data.get('card_type', card_type),
            verification_value=encrypted_cvv,
            is_default=validated_data.get('is_default', False),
            billing_address_id=validated_data.get('billing_address_id')
        )
        
        return card


class MastercardPaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for Mastercard transactions"""
    card_masked = serializers.SerializerMethodField()
    
    class Meta:
        model = MastercardPaymentTransaction
        fields = [
            'id', 'transaction_id', 'mastercard_transaction_id',
            'transaction_type', 'status', 'amount', 'currency',
            'total_amount', 'processing_fee', 'card_last_four',
            'card_type', 'card_masked', 'auth_code',
            'response_code', 'response_message',
            'initiated_at', 'processed_at', 'settled_at'
        ]
        read_only_fields = fields
    
    def get_card_masked(self, obj):
        if obj.card:
            return obj.card.masked_number
        return None


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for cart items"""
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_id', 'variant', 'variant_id',
            'quantity', 'unit_price', 'total', 'added_at'
        ]
        read_only_fields = ['id', 'added_at']
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value
    
    def validate(self, data):
        product_id = data.get('product_id')
        variant_id = data.get('variant_id')
        quantity = data.get('quantity', 1)
        
        from apps.products.models import Product, ProductVariant
        
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product_id": "Product not found"})
        
        # Check stock
        if variant_id:
            try:
                variant = ProductVariant.objects.get(id=variant_id, product=product, is_active=True)
                if variant.stock < quantity:
                    raise serializers.ValidationError(
                        f"Only {variant.stock} items available in stock"
                    )
            except ProductVariant.DoesNotExist:
                raise serializers.ValidationError({"variant_id": "Variant not found"})
        else:
            if product.stock < quantity and product.track_inventory:
                raise serializers.ValidationError(
                    f"Only {product.stock} items available in stock"
                )
        
        data['product'] = product
        if variant_id:
            data['variant'] = variant
        
        return data


class CartSerializer(serializers.ModelSerializer):
    """Serializer for shopping cart"""
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    shipping_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Cart
        fields = [
            'id', 'items', 'subtotal', 'tax_amount', 'shipping_cost',
            'discount_amount', 'total', 'item_count', 'created_at', 'updated_at'
        ]


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for orders"""
    items = serializers.JSONField(read_only=True)
    shipping_address_detail = UserAddressSerializer(source='shipping_address', read_only=True)
    billing_address_detail = UserAddressSerializer(source='billing_address', read_only=True)
    payment_transaction = MastercardPaymentTransactionSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user_email', 'user_phone',
            'items', 'item_count',
            'shipping_address', 'shipping_address_detail',
            'billing_address', 'billing_address_detail',
            'subtotal', 'tax_amount', 'shipping_cost',
            'discount_amount', 'total',
            'shipping_method', 'tracking_number', 'status',
            'payment_status', 'payment_method', 'payment_transaction',
            'customer_notes', 'created_at', 'paid_at', 'estimated_delivery'
        ]
        read_only_fields = [
            'id', 'order_number', 'items', 'item_count',
            'status', 'payment_status', 'created_at', 'paid_at'
        ]


class CheckoutSerializer(serializers.Serializer):
    """Serializer for checkout process"""
    cart_id = serializers.IntegerField(required=False)
    shipping_address_id = serializers.IntegerField()
    billing_address_id = serializers.IntegerField(required=False, allow_null=True)
    shipping_method = serializers.ChoiceField(choices=Order.SHIPPING_METHOD, default='standard')
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_METHOD, default='mastercard')
    card_id = serializers.IntegerField(required=False)
    save_card = serializers.BooleanField(default=False)
    
    # New card details (if not using saved card)
    card_number = serializers.CharField(max_length=19, min_length=16, required=False, write_only=True)
    cardholder_name = serializers.CharField(max_length=255, required=False, write_only=True)
    expiry_month = serializers.IntegerField(min_value=1, max_value=12, required=False, write_only=True)
    expiry_year = serializers.IntegerField(min_value=2024, max_value=2050, required=False, write_only=True)
    cvv = serializers.CharField(max_length=4, min_length=3, required=False, write_only=True)
    
    customer_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        request = self.context['request']
        user = request.user
        
        # Get cart
        if data.get('cart_id'):
            try:
                cart = Cart.objects.get(id=data['cart_id'], user=user)
            except Cart.DoesNotExist:
                raise serializers.ValidationError({"cart_id": "Cart not found"})
        else:
            cart = Cart.objects.filter(user=user).first()
            if not cart:
                raise serializers.ValidationError("No active cart found")
        
        data['cart'] = cart
        
        # Validate cart has items
        if cart.item_count == 0:
            raise serializers.ValidationError("Cart is empty")
        
        # Validate addresses
        from apps.users.models import UserAddress
        
        try:
            shipping_address = UserAddress.objects.get(
                id=data['shipping_address_id'],
                user=user
            )
            data['shipping_address_obj'] = shipping_address
        except UserAddress.DoesNotExist:
            raise serializers.ValidationError(
                {"shipping_address_id": "Shipping address not found"}
            )
        
        if data.get('billing_address_id'):
            try:
                billing_address = UserAddress.objects.get(
                    id=data['billing_address_id'],
                    user=user
                )
                data['billing_address_obj'] = billing_address
            except UserAddress.DoesNotExist:
                raise serializers.ValidationError(
                    {"billing_address_id": "Billing address not found"}
                )
        else:
            data['billing_address_obj'] = data['shipping_address_obj']
        
        # Validate payment method
        if data['payment_method'] == 'mastercard':
            # Check if using saved card or new card
            if data.get('card_id'):
                try:
                    card = MastercardCard.objects.get(
                        id=data['card_id'],
                        user=user,
                        is_active=True
                    )
                    if card.is_expired:
                        raise serializers.ValidationError(
                            {"card_id": "Card has expired"}
                        )
                    data['card'] = card
                except MastercardCard.DoesNotExist:
                    raise serializers.ValidationError(
                        {"card_id": "Card not found"}
                    )
            else:
                # Validate new card details
                required_fields = ['card_number', 'cardholder_name', 
                                 'expiry_month', 'expiry_year', 'cvv']
                for field in required_fields:
                    if not data.get(field):
                        raise serializers.ValidationError(
                            {field: "This field is required for new card payment"}
                        )
                
                # Validate card
                service = MastercardPaymentService()
                is_valid, message, card_type = service.validate_card(
                    data['card_number'],
                    data['expiry_month'],
                    data['expiry_year'],
                    data['cvv']
                )
                
                if not is_valid:
                    raise serializers.ValidationError(
                        {"card_number": message}
                    )
                
                data['new_card_type'] = card_type
        
        return data