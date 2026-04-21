from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.conf import settings
from django.utils import timezone
import uuid
import hashlib
import hmac
import base64
import json
import secrets
from decimal import Decimal
from datetime import datetime, timedelta





class MastercardCard(models.Model):
    """Mastercard card information (encrypted storage)"""
    CARD_TYPES = (
        ('mastercard', 'Mastercard'),
        ('mastercard_standard', 'Mastercard Standard'),
        ('mastercard_gold', 'Mastercard Gold'),
        ('mastercard_platinum', 'Mastercard Platinum'),
        ('mastercard_world', 'Mastercard World'),
        ('mastercard_world_elite', 'Mastercard World Elite'),
        ('debit_mastercard', 'Debit Mastercard'),
        ('mastercard_prepaid', 'Mastercard Prepaid'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='saved_cards')
    
    # Card details (will be encrypted at application level)
    card_number_encrypted = models.TextField()
    cardholder_name = models.CharField(max_length=255)
    expiry_month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    expiry_year = models.IntegerField(validators=[MinValueValidator(2024), MaxValueValidator(2050)])
    
    # Last 4 digits for display
    last_four = models.CharField(max_length=4)
    card_type = models.CharField(max_length=30, choices=CARD_TYPES, default='mastercard')
    
    # Mastercard specific
    mastercard_transaction_id = models.CharField(max_length=100, blank=True)
    verification_value = models.CharField(max_length=100)  # CVV/CVC encrypted
    
    # Mastercard SecureCode / 3D Secure
    is_3d_secure_enrolled = models.BooleanField(default=False)
    secure_code_id = models.CharField(max_length=100, blank=True)
    
    # Billing address
    billing_address = models.ForeignKey('users.UserAddress', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name = 'Mastercard Card'
        verbose_name_plural = 'Mastercard Cards'
    
    def __str__(self):
        return f"{self.get_card_type_display()} •••• {self.last_four}"
    
    @property
    def masked_number(self):
        """Return masked card number for display"""
        return f"•••• •••• •••• {self.last_four}"
    
    @property
    def is_expired(self):
        """Check if card is expired"""
        now = timezone.now()
        if self.expiry_year < now.year:
            return True
        if self.expiry_year == now.year and self.expiry_month < now.month:
            return True
        return False
    
    def save(self, *args, **kwargs):
        if self.is_default:
            MastercardCard.objects.filter(
                user=self.user, 
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


class MastercardPaymentTransaction(models.Model):
    """Mastercard payment transaction records"""
    
    TRANSACTION_STATUS = (
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('authorized', 'Authorized'),
        ('captured', 'Captured'),
        ('settled', 'Settled'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
        ('declined', 'Declined'),
        ('chargeback', 'Chargeback'),
    )
    
    TRANSACTION_TYPE = (
        ('sale', 'Sale'),
        ('authorize', 'Authorize Only'),
        ('capture', 'Capture'),
        ('refund', 'Refund'),
        ('void', 'Void'),
        ('verify', 'Verification'),
    )
    
    CURRENCY = (
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('JPY', 'Japanese Yen'),
        ('CAD', 'Canadian Dollar'),
        ('AUD', 'Australian Dollar'),
        ('CHF', 'Swiss Franc'),
        ('CNY', 'Chinese Yuan'),
        ('INR', 'Indian Rupee'),
        ('SGD', 'Singapore Dollar'),
        ('AED', 'UAE Dirham'),
    )
    
    # Transaction identifiers
    transaction_id = models.CharField(max_length=100, unique=True, blank=True)
    mastercard_transaction_id = models.CharField(max_length=100, unique=True, blank=True)
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, related_name='mastercard_payments')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='mastercard_transactions')
    card = models.ForeignKey(MastercardCard, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Transaction details
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE, default='sale')
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS, default='initiated')
    
    # Amount details
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    currency = models.CharField(max_length=3, choices=CURRENCY, default='USD')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6, default=1.0)
    original_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    original_currency = models.CharField(max_length=3, blank=True)
    
    # Fee breakdown
    processing_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Card details (last 4 for reference)
    card_last_four = models.CharField(max_length=4, blank=True)
    card_type = models.CharField(max_length=30, blank=True)
    
    # Mastercard specific
    mastercard_request_id = models.CharField(max_length=100, blank=True)
    mastercard_response_code = models.CharField(max_length=10, blank=True)
    mastercard_response_reason = models.TextField(blank=True)
    auth_code = models.CharField(max_length=50, blank=True)
    retrieval_reference_number = models.CharField(max_length=50, blank=True)
    
    # 3D Secure
    is_3d_secure = models.BooleanField(default=False)
    three_d_secure_status = models.CharField(max_length=50, blank=True)
    three_d_secure_eci = models.CharField(max_length=2, blank=True)  # Electronic Commerce Indicator
    
    # Response data
    response_code = models.CharField(max_length=10, blank=True)
    response_message = models.TextField(blank=True)
    response_data = models.JSONField(default=dict, blank=True)
    
    # Request data
    request_data = models.JSONField(default=dict, blank=True)
    
    # Risk assessment
    risk_score = models.IntegerField(null=True, blank=True)
    fraud_check_passed = models.BooleanField(default=True)
    
    # Timestamps
    initiated_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Refund tracking
    parent_transaction = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds')
    refund_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-initiated_at']
        verbose_name = 'Mastercard Transaction'
        verbose_name_plural = 'Mastercard Transactions'
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['mastercard_transaction_id']),
            models.Index(fields=['order']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['-initiated_at']),
        ]
    
    def __str__(self):
        return f"{self.transaction_id} - {self.amount} {self.currency} - {self.status}"
    
    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = f"MCT-{uuid.uuid4().hex[:12].upper()}"
        if not self.mastercard_transaction_id:
            self.mastercard_transaction_id = f"MC{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:10].upper()}"
        if not self.total_amount:
            self.total_amount = self.amount + self.processing_fee + self.tax_amount
        super().save(*args, **kwargs)


class Cart(models.Model):
    """Shopping cart model"""
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, null=True, blank=True, related_name='carts')
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'session_key']
    
    @property
    def subtotal(self):
        return sum(item.total for item in self.items.all())
    
    @property
    def tax_amount(self):
        # Default tax rate - 10% (adjust based on your region)
        return self.subtotal * Decimal('0.10')
    
    @property
    def shipping_cost(self):
        # Free shipping over $100, else $10
        return Decimal('0.00') if self.subtotal >= Decimal('100.00') else Decimal('10.00')
    
    @property
    def discount_amount(self):
        # Can be enhanced with coupon system
        return Decimal('0.00')
    
    @property
    def total(self):
        return self.subtotal + self.tax_amount + self.shipping_cost - self.discount_amount
    
    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())
    
    def clear_cart(self):
        self.items.all().delete()


class CartItem(models.Model):
    """Individual items in cart"""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    variant = models.ForeignKey('products.ProductVariant', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['cart', 'product', 'variant']
        ordering = ['-added_at']
    
    @property
    def unit_price(self):
        if self.variant:
            return self.variant.current_price
        return self.product.price
    
    @property
    def total(self):
        return self.unit_price * self.quantity


class Order(models.Model):
    """Main order model"""
    
    ORDER_STATUS = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('payment_processing', 'Payment Processing'),
        ('payment_received', 'Payment Received'),
        ('payment_failed', 'Payment Failed'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('disputed', 'Disputed'),
    )
    
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('authorized', 'Authorized'),
        ('captured', 'Captured'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
        ('chargeback', 'Chargeback'),
    )
    
    PAYMENT_METHOD = (
        ('mastercard', 'Mastercard'),
        ('visa', 'Visa'),
        ('amex', 'American Express'),
        ('paypal', 'PayPal'),
        ('cod', 'Cash on Delivery'),
        ('bank_transfer', 'Bank Transfer'),
    )
    
    SHIPPING_METHOD = (
        ('standard', 'Standard Shipping (3-5 days)'),
        ('express', 'Express Shipping (1-2 days)'),
        ('overnight', 'Overnight Shipping'),
        ('pickup', 'Store Pickup'),
    )
    
    # Order identifiers
    order_number = models.CharField(max_length=50, unique=True, blank=True, db_index=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='orders')
    user_email = models.EmailField()
    user_phone = models.CharField(max_length=20, blank=True)
    
    # Items
    items = models.JSONField(default=list)  # Snapshot of ordered items
    item_count = models.IntegerField(default=0)
    
    # Addresses
    shipping_address = models.JSONField()
    billing_address = models.JSONField(null=True, blank=True)
    
    # Totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Shipping
    shipping_method = models.CharField(max_length=20, choices=SHIPPING_METHOD, default='standard')
    shipping_carrier = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    tracking_url = models.URLField(blank=True)
    estimated_delivery = models.DateField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=30, choices=ORDER_STATUS, default='pending')
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD, blank=True)
    
    # Payment info
    payment_transaction = models.ForeignKey(
        MastercardPaymentTransaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='orders'
    )
    
    # Coupons and notes
    coupon_code = models.CharField(max_length=50, blank=True)
    customer_notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return self.order_number
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        if not self.billing_address:
            self.billing_address = self.shipping_address
        super().save(*args, **kwargs)
    
    def generate_order_number(self):
        """Generate unique order number"""
        timestamp = datetime.now().strftime('%Y%m%d')
        random_part = uuid.uuid4().hex[:6].upper()
        return f"ORD-{timestamp}-{random_part}"
    
    @property
    def is_paid(self):
        return self.payment_status in ['paid', 'captured', 'authorized']
    
    @property
    def can_cancel(self):
        return self.status in ['pending', 'processing', 'payment_processing']
    
    @property
    def can_refund(self):
        return self.status in ['delivered', 'shipped'] and self.is_paid