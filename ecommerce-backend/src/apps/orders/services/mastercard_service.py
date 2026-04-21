import json
import hmac
import hashlib
import base64
import secrets
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from ..models import MastercardCard, MastercardPaymentTransaction, Order





class MastercardPaymentService:
    """
    Mastercard Payment Gateway Service
    Simulates real Mastercard payment processing
    """
    
    # Mastercard BIN ranges (first 6 digits)
    MASTERCARD_BINS = [
        '51', '52', '53', '54', '55',  # Standard Mastercard
        '2221', '2222', '2223', '2224', '2225', '2226', '2227', '2228', '2229',
        '223', '224', '225', '226', '227', '228', '229',
        '23', '24', '25', '26', '27',
        '2720'
    ]
    
    # Response codes (simulating real Mastercard codes)
    RESPONSE_CODES = {
        '00': 'Approved',
        '01': 'Refer to card issuer',
        '02': 'Refer to issuer special condition',
        '03': 'Invalid merchant',
        '04': 'Pick up card',
        '05': 'Do not honor',
        '06': 'Error',
        '07': 'Pick up card special condition',
        '12': 'Invalid transaction',
        '13': 'Invalid amount',
        '14': 'Invalid card number',
        '15': 'No such issuer',
        '19': 'Re-enter transaction',
        '30': 'Format error',
        '41': 'Lost card',
        '43': 'Stolen card',
        '51': 'Insufficient funds',
        '54': 'Expired card',
        '55': 'Incorrect PIN',
        '57': 'Transaction not permitted',
        '59': 'Suspected fraud',
        '61': 'Exceeds withdrawal limit',
        '62': 'Restricted card',
        '65': 'Exceeds withdrawal frequency',
        '75': 'PIN tries exceeded',
        '91': 'Issuer unavailable',
        '96': 'System malfunction',
    }
    
    def __init__(self):
        self.merchant_id = getattr(settings, 'MASTERCARD_MERCHANT_ID', 'TEST_MERCHANT_001')
        self.api_key = getattr(settings, 'MASTERCARD_API_KEY', 'test_api_key_123456')
        self.environment = getattr(settings, 'MASTERCARD_ENVIRONMENT', 'sandbox')
    
    def validate_card(self, card_number, expiry_month, expiry_year, cvv):
        """
        Validate card details without processing payment
        Returns: (is_valid, message, card_type)
        """
        # Check card length (Mastercard: 16 digits)
        if not card_number or len(card_number) < 16 or len(card_number) > 19:
            return False, "Invalid card number length", None
        
        # Check if it's a Mastercard
        is_mastercard, card_type = self._detect_mastercard_type(card_number)
        if not is_mastercard:
            return False, "Not a valid Mastercard", None
        
        # Luhn algorithm check
        if not self._luhn_check(card_number):
            return False, "Invalid card number (Luhn check failed)", None
        
        # Check expiry
        now = datetime.now()
        if expiry_year < now.year or (expiry_year == now.year and expiry_month < now.month):
            return False, "Card has expired", None
        
        # CVV check (Mastercard CVV is 3 digits)
        if not cvv or len(cvv) != 3 or not cvv.isdigit():
            return False, "Invalid CVV", None
        
        return True, "Card is valid", card_type
    
    def authorize_payment(self, card, amount, currency='USD', order=None, **kwargs):
        """
        Authorize a payment (hold funds)
        Returns: (success, transaction, message)
        """
        transaction = MastercardPaymentTransaction.objects.create(
            user=card.user,
            card=card,
            order=order,
            transaction_type='authorize',
            amount=amount,
            currency=currency,
            card_last_four=card.last_four,
            card_type=card.card_type,
            request_data={
                'card_last_four': card.last_four,
                'amount': str(amount),
                'currency': currency,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        try:
            # Simulate Mastercard authorization
            auth_result = self._process_mastercard_authorization(card, amount, currency)
            
            if auth_result['success']:
                transaction.status = 'authorized'
                transaction.mastercard_transaction_id = auth_result['transaction_id']
                transaction.mastercard_response_code = auth_result['response_code']
                transaction.mastercard_response_reason = auth_result['response_message']
                transaction.auth_code = auth_result['auth_code']
                transaction.retrieval_reference_number = auth_result['retrieval_ref']
                transaction.response_data = auth_result
                transaction.processed_at = timezone.now()
                transaction.save()
                
                # Update order if exists
                if order:
                    order.payment_status = 'authorized'
                    order.payment_transaction = transaction
                    order.save()
                
                return True, transaction, "Authorization successful"
            else:
                transaction.status = 'declined'
                transaction.mastercard_response_code = auth_result['response_code']
                transaction.mastercard_response_reason = auth_result['response_message']
                transaction.response_data = auth_result
                transaction.processed_at = timezone.now()
                transaction.save()
                
                return False, transaction, auth_result['response_message']
                
        except Exception as e:
            transaction.status = 'failed'
            transaction.response_message = str(e)
            transaction.save()
            return False, transaction, f"Authorization failed: {str(e)}"
    
    def capture_payment(self, authorization_transaction, amount=None, **kwargs):
        """
        Capture an authorized payment
        """
        if not amount:
            amount = authorization_transaction.amount
        
        transaction = MastercardPaymentTransaction.objects.create(
            user=authorization_transaction.user,
            card=authorization_transaction.card,
            order=authorization_transaction.order,
            transaction_type='capture',
            amount=amount,
            currency=authorization_transaction.currency,
            parent_transaction=authorization_transaction,
            card_last_four=authorization_transaction.card_last_four,
            card_type=authorization_transaction.card_type,
        )
        
        try:
            # Simulate Mastercard capture
            capture_result = self._process_mastercard_capture(
                authorization_transaction.mastercard_transaction_id,
                amount
            )
            
            if capture_result['success']:
                transaction.status = 'captured'
                transaction.mastercard_transaction_id = capture_result['transaction_id']
                transaction.mastercard_response_code = capture_result['response_code']
                transaction.mastercard_response_reason = capture_result['response_message']
                transaction.processed_at = timezone.now()
                transaction.save()
                
                # Update original transaction
                authorization_transaction.status = 'captured'
                authorization_transaction.save()
                
                # Update order
                order = authorization_transaction.order
                if order:
                    order.payment_status = 'captured'
                    order.paid_at = timezone.now()
                    order.status = 'confirmed'
                    order.save()
                
                return True, transaction, "Capture successful"
            else:
                transaction.status = 'failed'
                transaction.mastercard_response_code = capture_result['response_code']
                transaction.mastercard_response_reason = capture_result['response_message']
                transaction.save()
                
                return False, transaction, capture_result['response_message']
                
        except Exception as e:
            transaction.status = 'failed'
            transaction.response_message = str(e)
            transaction.save()
            return False, transaction, f"Capture failed: {str(e)}"
    
    def sale(self, card, amount, currency='USD', order=None, **kwargs):
        """
        Direct sale (authorize + capture in one step)
        """
        transaction = MastercardPaymentTransaction.objects.create(
            user=card.user,
            card=card,
            order=order,
            transaction_type='sale',
            amount=amount,
            currency=currency,
            card_last_four=card.last_four,
            card_type=card.card_type,
            request_data={
                'card_last_four': card.last_four,
                'amount': str(amount),
                'currency': currency,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        try:
            # Simulate Mastercard sale
            sale_result = self._process_mastercard_sale(card, amount, currency)
            
            if sale_result['success']:
                transaction.status = 'captured'
                transaction.mastercard_transaction_id = sale_result['transaction_id']
                transaction.mastercard_response_code = sale_result['response_code']
                transaction.mastercard_response_reason = sale_result['response_message']
                transaction.auth_code = sale_result['auth_code']
                transaction.retrieval_reference_number = sale_result['retrieval_ref']
                transaction.response_data = sale_result
                transaction.processed_at = timezone.now()
                transaction.settled_at = timezone.now() + timedelta(days=2)
                transaction.save()
                
                # Update order
                if order:
                    order.payment_status = 'paid'
                    order.payment_transaction = transaction
                    order.paid_at = timezone.now()
                    order.status = 'confirmed'
                    order.save()
                
                return True, transaction, "Payment successful"
            else:
                transaction.status = 'declined'
                transaction.mastercard_response_code = sale_result['response_code']
                transaction.mastercard_response_reason = sale_result['response_message']
                transaction.response_data = sale_result
                transaction.processed_at = timezone.now()
                transaction.save()
                
                return False, transaction, sale_result['response_message']
                
        except Exception as e:
            transaction.status = 'failed'
            transaction.response_message = str(e)
            transaction.save()
            return False, transaction, f"Payment failed: {str(e)}"
    
    def refund(self, original_transaction, amount=None, reason=None, **kwargs):
        """
        Process a refund
        """
        if not amount:
            amount = original_transaction.amount
        
        if amount > original_transaction.amount:
            return False, None, "Refund amount exceeds original transaction amount"
        
        transaction = MastercardPaymentTransaction.objects.create(
            user=original_transaction.user,
            card=original_transaction.card,
            order=original_transaction.order,
            transaction_type='refund',
            amount=amount,
            currency=original_transaction.currency,
            parent_transaction=original_transaction,
            card_last_four=original_transaction.card_last_four,
            card_type=original_transaction.card_type,
            refund_reason=reason or '',
        )
        
        try:
            # Simulate Mastercard refund
            refund_result = self._process_mastercard_refund(
                original_transaction.mastercard_transaction_id,
                amount
            )
            
            if refund_result['success']:
                transaction.status = 'refunded'
                transaction.mastercard_transaction_id = refund_result['transaction_id']
                transaction.mastercard_response_code = refund_result['response_code']
                transaction.mastercard_response_reason = refund_result['response_message']
                transaction.processed_at = timezone.now()
                transaction.save()
                
                # Update original transaction
                if amount == original_transaction.amount:
                    original_transaction.status = 'refunded'
                else:
                    original_transaction.status = 'partially_refunded'
                original_transaction.save()
                
                # Update order
                order = original_transaction.order
                if order:
                    if amount == original_transaction.amount:
                        order.payment_status = 'refunded'
                    else:
                        order.payment_status = 'partially_refunded'
                    order.save()
                
                return True, transaction, "Refund successful"
            else:
                transaction.status = 'failed'
                transaction.mastercard_response_code = refund_result['response_code']
                transaction.mastercard_response_reason = refund_result['response_message']
                transaction.save()
                
                return False, transaction, refund_result['response_message']
                
        except Exception as e:
            transaction.status = 'failed'
            transaction.response_message = str(e)
            transaction.save()
            return False, transaction, f"Refund failed: {str(e)}"
    
    def void(self, authorization_transaction, **kwargs):
        """
        Void an authorization that hasn't been captured yet
        """
        if authorization_transaction.status != 'authorized':
            return False, None, "Only authorized transactions can be voided"
        
        transaction = MastercardPaymentTransaction.objects.create(
            user=authorization_transaction.user,
            card=authorization_transaction.card,
            order=authorization_transaction.order,
            transaction_type='void',
            amount=authorization_transaction.amount,
            currency=authorization_transaction.currency,
            parent_transaction=authorization_transaction,
        )
        
        try:
            # Simulate Mastercard void
            void_result = self._process_mastercard_void(
                authorization_transaction.mastercard_transaction_id
            )
            
            if void_result['success']:
                transaction.status = 'settled'
                transaction.mastercard_transaction_id = void_result['transaction_id']
                transaction.mastercard_response_code = void_result['response_code']
                transaction.mastercard_response_reason = void_result['response_message']
                transaction.processed_at = timezone.now()
                transaction.save()
                
                # Update original transaction
                authorization_transaction.status = 'voided'
                authorization_transaction.save()
                
                # Update order
                order = authorization_transaction.order
                if order:
                    order.payment_status = 'pending'
                    order.save()
                
                return True, transaction, "Void successful"
            else:
                transaction.status = 'failed'
                transaction.mastercard_response_code = void_result['response_code']
                transaction.mastercard_response_reason = void_result['response_message']
                transaction.save()
                
                return False, transaction, void_result['response_message']
                
        except Exception as e:
            transaction.status = 'failed'
            transaction.response_message = str(e)
            transaction.save()
            return False, transaction, f"Void failed: {str(e)}"
    
    def _detect_mastercard_type(self, card_number):
        """Detect Mastercard type based on BIN"""
        card_prefix = card_number[:4]
        
        if any(card_prefix.startswith(bin) for bin in self.MASTERCARD_BINS):
            # Determine specific Mastercard type
            first_two = card_number[:2]
            first_four = card_number[:4]
            
            if first_four.startswith('2221'):
                return True, 'mastercard_standard'
            elif first_four in ['2222', '2223', '2224', '2225', '2226', '2227', '2228', '2229']:
                return True, 'mastercard_world'
            elif first_four.startswith('223') or first_four.startswith('224') or \
                 first_four.startswith('225') or first_four.startswith('226') or \
                 first_four.startswith('227') or first_four.startswith('228') or \
                 first_four.startswith('229'):
                return True, 'mastercard_world_elite'
            elif first_two in ['51', '52', '53', '54', '55']:
                return True, 'mastercard'
            else:
                return True, 'mastercard_standard'
        
        return False, None
    
    def _luhn_check(self, card_number):
        """Luhn algorithm to validate card number"""
        def digits_of(n):
            return [int(d) for d in str(n)]
        
        digits = digits_of(card_number)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        checksum = sum(odd_digits)
        
        for d in even_digits:
            checksum += sum(digits_of(d * 2))
        
        return checksum % 10 == 0
    
    def _process_mastercard_authorization(self, card, amount, currency):
        """Simulate Mastercard authorization"""
        
        # Simulate random failures (10% failure rate for testing)
        import random
        should_fail = random.random() < 0.1
        
        if should_fail:
            response_code = random.choice(['05', '14', '51', '54'])
            return {
                'success': False,
                'response_code': response_code,
                'response_message': self.RESPONSE_CODES.get(response_code, 'Declined'),
                'transaction_id': None,
                'auth_code': None,
                'retrieval_ref': None
            }
        
        # Success response
        auth_code = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
        retrieval_ref = ''.join(random.choices('0123456789', k=12))
        transaction_id = f"MCA{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        return {
            'success': True,
            'response_code': '00',
            'response_message': 'Approved',
            'transaction_id': transaction_id,
            'auth_code': auth_code,
            'retrieval_ref': retrieval_ref,
            'amount': str(amount),
            'currency': currency,
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_mastercard_capture(self, auth_transaction_id, amount):
        """Simulate Mastercard capture"""
        
        import random
        should_fail = random.random() < 0.05  # 5% failure rate
        
        if should_fail:
            response_code = random.choice(['57', '61', '96'])
            return {
                'success': False,
                'response_code': response_code,
                'response_message': self.RESPONSE_CODES.get(response_code, 'Capture failed'),
                'transaction_id': None
            }
        
        transaction_id = f"MCC{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        return {
            'success': True,
            'response_code': '00',
            'response_message': 'Capture successful',
            'transaction_id': transaction_id,
            'amount': str(amount),
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_mastercard_sale(self, card, amount, currency):
        """Simulate Mastercard direct sale"""
        
        import random
        should_fail = random.random() < 0.08  # 8% failure rate
        
        if should_fail:
            response_code = random.choice(['05', '14', '51', '54', '55', '59'])
            return {
                'success': False,
                'response_code': response_code,
                'response_message': self.RESPONSE_CODES.get(response_code, 'Transaction declined'),
                'transaction_id': None,
                'auth_code': None,
                'retrieval_ref': None
            }
        
        auth_code = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
        retrieval_ref = ''.join(random.choices('0123456789', k=12))
        transaction_id = f"MCS{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        return {
            'success': True,
            'response_code': '00',
            'response_message': 'Approved',
            'transaction_id': transaction_id,
            'auth_code': auth_code,
            'retrieval_ref': retrieval_ref,
            'amount': str(amount),
            'currency': currency,
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_mastercard_refund(self, original_transaction_id, amount):
        """Simulate Mastercard refund"""
        
        import random
        should_fail = random.random() < 0.03  # 3% failure rate
        
        if should_fail:
            response_code = random.choice(['57', '61', '96'])
            return {
                'success': False,
                'response_code': response_code,
                'response_message': self.RESPONSE_CODES.get(response_code, 'Refund failed'),
                'transaction_id': None
            }
        
        transaction_id = f"MCR{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        return {
            'success': True,
            'response_code': '00',
            'response_message': 'Refund successful',
            'transaction_id': transaction_id,
            'amount': str(amount),
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_mastercard_void(self, original_transaction_id):
        """Simulate Mastercard void"""
        
        import random
        should_fail = random.random() < 0.02  # 2% failure rate
        
        if should_fail:
            response_code = random.choice(['57', '61', '96'])
            return {
                'success': False,
                'response_code': response_code,
                'response_message': self.RESPONSE_CODES.get(response_code, 'Void failed'),
                'transaction_id': None
            }
        
        transaction_id = f"MCV{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        return {
            'success': True,
            'response_code': '00',
            'response_message': 'Void successful',
            'transaction_id': transaction_id,
            'timestamp': datetime.now().isoformat()
        }