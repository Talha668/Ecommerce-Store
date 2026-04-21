from django.db import transaction
from django.utils import timezone
from ..models import Order
from .mastercard_service import MastercardPaymentService



class CheckoutService:
    """
    Service class to handle checkout logic
    """
    @staticmethod
    @transaction.atomic
    def process_checkout(user, validated_data, request=None):
        """
        Processes the order creation and payment.
        
        Args:
            user: The user making the purchase.
            validated_data: Validated_data from the CheckoutSerializer.
            request: The request object (needed for the card serialization context).

            Returns:
                tuple: (success: bool, response_data: dict, status_code: int)    
        """
        from ..serializers import (
            OrderSerializer,
            MastercardCardCreateSerializer,
            MastercardPaymentTransactionSerializer
        )
        cart = validated_data['cart']

        # Create Order
        order = Order.objects.create(
            user=user,
            user_email=user.email,
            user_phone=user.phone_number,
            items=list(cart.items.values()),
            item_count=cart.item_count,
            shipping_address={
                'id': validated_data['shipping_address_obj'].id,
                'full_name': validated_data['shipping_address_obj'].full_name,
                'street': validated_data['shipping_address_obj'].street,
                'city': validated_data['shipping_address_obj'].city,
                'state': validated_data['shipping_address_obj'].state,
                'country': validated_data['shipping_address_obj'].country,
                'zip_code': validated_data['shipping_address_obj'].zip_code,
                'phone_number': validated_data['shipping_address_obj'].phone_number
            },
            billing_address={
                'id': validated_data['billing_address_obj'].id,
                'full_name': validated_data['billing_address_obj'].full_name,
                'street': validated_data['billing_address_obj'].street,
                'city': validated_data['billing_address_obj'].city,
                'state': validated_data['billing_address_obj'].state,
                'country': validated_data['billing_address_obj'].country,
                'zip_code': validated_data['billing_address_obj'].zip_code,
                'phone_number': validated_data['billing_address_obj'].phone_number
            },
            subtotal=cart.subtotal,
            tax_amount=cart.tax_amount,
            shipping_cost=cart.shipping_cost,
            discount_amount=cart.discount_amount,
            total=cart.total,
            shipping_method=validated_data['shipping_method'],
            paymont_method=validated_data['payment_method'],
            customer_notes=validated_data.get('customer_notes', ''),
            estimated_delivery=timezone.now().date() + timezone.timedelta(days=5)
        )

        # Payment Process
        if validated_data['payment_method'] == 'mastercard':
            payment_service = MastercardPaymentService()
            card = None    

            # Check if using existed card
            if validated_data.get('card'):
                card = validated_data['card']
            else:
                # Create new card
                card_serializer = MastercardCardCreateSerializer(
                    validated_data={
                        'card_number': validated_data['card_number'],
                        'cardholder_name': validated_data['cardholder_name'],
                        'expiry_month': validated_data['expiry_month'],
                        'expiry_year': validated_data['expiry_year'],
                        'cvv': validated_data['cvv'],
                        'card_type': validated_data['new_card_type'],
                        'is_default': validated_data.get('save_card', False)
                    },
                    context={'request': request}
                )
                card_serializer.is_valid(raise_exception=True)
                card = card_serializer.save()
            
            # Process payment
            success, transaction, message = payment_service.sale(
                card=card,
                amount=order.total,
                currency='USD',
                order=order
            )
            
            if not success:
                order.status = 'payment_failed'
                order.save()

                response_data = {
                    'success': False,
                    'message': message,
                    'order': OrderSerializer(order).data,
                    'transaction': MastercardPaymentTransactionSerializer(transaction).data
                }
                return False, response_data, 400
            
            # Clear cart after successful payment
            cart.clear_cart()
            
            response_data = {
                'success': True,
                'message': 'Order placed successfully',
                'order': OrderSerializer(order).data,
                'transaction': MastercardPaymentTransactionSerializer(transaction).data
            }
            return True, response_data, 201
        
        # Cash on delivery method (COD)
        elif validated_data['payment_method'] == 'cod':

            cart.clear_Cart()

            response_data = {
                'seccess': True,
                'message': 'Order placed successfully. pay on delivery.',
                'order': OrderSerializer(order).data
            }
            return True, response_data, 201
        
        # fallback for other methods 
        else:
            # Clear cart
            cart.clear_cart()

        response_data = {
            'success': True,
            'message': 'Order created successfully',
            'order': OrderSerializer(order).data
        }
        return True, response_data, 201
        