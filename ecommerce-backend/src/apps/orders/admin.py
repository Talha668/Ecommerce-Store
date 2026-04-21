from datetime import timezone
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MastercardCard, MastercardPaymentTransaction,
    Cart, CartItem, Order
)



@admin.register(MastercardCard)
class MastercardCardAdmin(admin.ModelAdmin):
    list_display = ['user', 'cardholder_name', 'masked_display', 'card_type', 
                   'expiry', 'is_default', 'is_active']
    list_filter = ['card_type', 'is_default', 'is_active', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'last_four']
    readonly_fields = ['last_four', 'created_at', 'updated_at']
    
    def masked_display(self, obj):
        return obj.masked_number
    masked_display.short_description = 'Card Number'
    
    def expiry(self, obj):
        return f"{obj.expiry_month:02d}/{obj.expiry_year}"
    expiry.short_description = 'Expires'


@admin.register(MastercardPaymentTransaction)
class MastercardPaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'user', 'amount', 'currency', 'status', 
                   'transaction_type', 'initiated_at']
    list_filter = ['status', 'transaction_type', 'currency', 'initiated_at']
    search_fields = ['transaction_id', 'mastercard_transaction_id', 
                    'user__email', 'order__order_number']
    readonly_fields = ['transaction_id', 'mastercard_transaction_id', 'initiated_at',
                      'processed_at', 'settled_at', 'response_data', 'request_data']
    
    fieldsets = (
        ('Transaction Info', {
            'fields': ('transaction_id', 'mastercard_transaction_id', 'order', 'user', 'card')
        }),
        ('Transaction Details', {
            'fields': ('transaction_type', 'status', 'amount', 'currency', 'total_amount')
        }),
        ('Payment Details', {
            'fields': ('card_last_four', 'card_type', 'auth_code', 'retrieval_reference_number')
        }),
        ('Mastercard Response', {
            'fields': ('mastercard_response_code', 'mastercard_response_reason', 'response_code', 'response_message')
        }),
        ('Timestamps', {
            'fields': ('initiated_at', 'processed_at', 'settled_at', 'updated_at')
        }),
        ('Refund Info', {
            'fields': ('parent_transaction', 'refund_reason')
        }),
        ('Data', {
            'fields': ('request_data', 'response_data'),
            'classes': ('collapse',)
        })
    )


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['product', 'variant', 'quantity', 'unit_price', 'total']
    
    def unit_price(self, obj):
        return obj.unit_price
    
    def total(self, obj):
        return obj.total


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'item_count', 'subtotal', 'total', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__email', 'session_key']
    inlines = [CartItemInline]
    readonly_fields = ['subtotal', 'tax_amount', 'shipping_cost', 'discount_amount', 'total', 'item_count']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user_email', 'total', 'status', 
                   'payment_status', 'payment_method', 'created_at']
    list_filter = ['status', 'payment_status', 'payment_method', 'shipping_method', 'created_at']
    search_fields = ['order_number', 'user__email', 'user__first_name', 'user__last_name', 'tracking_number']
    readonly_fields = ['order_number', 'items', 'item_count', 'subtotal', 'tax_amount', 
                      'shipping_cost', 'discount_amount', 'total', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'user', 'user_email', 'user_phone', 'status', 'payment_status')
        }),
        ('Items', {
            'fields': ('items', 'item_count'),
            'classes': ('collapse',)
        }),
        ('Financial', {
            'fields': ('subtotal', 'tax_amount', 'shipping_cost', 'discount_amount', 'total')
        }),
        ('Payment', {
            'fields': ('payment_method', 'payment_transaction', 'paid_at')
        }),
        ('Shipping', {
            'fields': ('shipping_method', 'shipping_address', 'billing_address', 
                      'shipping_carrier', 'tracking_number', 'tracking_url', 
                      'estimated_delivery', 'delivered_at')
        }),
        ('Additional', {
            'fields': ('coupon_code', 'customer_notes', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'cancelled_at')
        })
    )
    
    actions = ['mark_as_processing', 'mark_as_shipped', 'mark_as_delivered', 'mark_as_cancelled']
    
    def mark_as_processing(self, request, queryset):
        queryset.update(status='processing')
    mark_as_processing.short_description = "Mark selected orders as processing"
    
    def mark_as_shipped(self, request, queryset):
        queryset.update(status='shipped')
    mark_as_shipped.short_description = "Mark selected orders as shipped"
    
    def mark_as_delivered(self, request, queryset):
        queryset.update(status='delivered', delivered_at=timezone.now())
    mark_as_delivered.short_description = "Mark selected orders as delivered"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled', cancelled_at=timezone.now())
    mark_as_cancelled.short_description = "Mark selected orders as cancelled"