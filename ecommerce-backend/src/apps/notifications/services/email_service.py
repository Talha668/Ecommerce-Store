from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import logging
from ..models import Notification, EmailTemplate, NotificationEvent

logger = logging.getLogger(__name__)



class EmailService:
    """Service for sending emails"""
    
    @staticmethod
    def send_email(recipient_email, subject, template_name, context=None, notification=None):
        """
        Send an email using a template
        """
        try:
            # Get template
            template = EmailTemplate.objects.filter(code=template_name, is_active=True).first()
            
            if template:
                # Render HTML content
                html_content = render_to_string(template.html_template, context or {})
                text_content = strip_tags(html_content)
                
                # If template has plain text, use it
                if template.plain_text:
                    text_content = render_to_string(template.plain_text, context or {})
            else:
                # Fallback to simple template
                html_content = render_to_string(f'emails/{template_name}.html', context or {})
                text_content = strip_tags(html_content)
            
            # Create email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email]
            )
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            result = email.send(fail_silently=False)
            
            # Update notification if provided
            if notification:
                notification.mark_as_sent()
            
            logger.info(f"Email sent to {recipient_email}: {subject}")
            return True, "Email sent successfully"
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            if notification:
                notification.mark_as_failed(str(e))
            return False, str(e)
    
    @staticmethod
    def send_order_confirmation(order, user):
        """Send order confirmation email"""
        subject = f"Order Confirmation #{order.order_number}"
        context = {
            'user': user,
            'order': order,
            'order_items': order.items,
            'order_total': order.total,
            'shipping_address': order.shipping_address,
        }
        
        return EmailService.send_email(
            recipient_email=user.email,
            subject=subject,
            template_name='order_confirmation',
            context=context
        )
    
    @staticmethod
    def send_password_reset(user, reset_link):
        """Send password reset email"""
        subject = "Password Reset Request"
        context = {
            'user': user,
            'reset_link': reset_link,
            'expiry_hours': 24,
        }
        
        return EmailService.send_email(
            recipient_email=user.email,
            subject=subject,
            template_name='password_reset',
            context=context
        )
    
    @staticmethod
    def send_shipping_update(order):
        """Send shipping update email"""
        subject = f"Shipping Update for Order #{order.order_number}"
        context = {
            'user': order.user,
            'order': order,
            'tracking_number': order.tracking_number,
            'tracking_url': order.tracking_url,
            'carrier': order.shipping_carrier,
            'estimated_delivery': order.estimated_delivery,
        }
        
        return EmailService.send_email(
            recipient_email=order.user.email,
            subject=subject,
            template_name='shipping_update',
            context=context
        )
    
    @staticmethod
    def send_welcome_email(user):
        """Send welcome email to new users"""
        subject = "Welcome to MasterShop!"
        context = {
            'user': user,
            'login_link': settings.SITE_URL + '/login/',
        }
        
        return EmailService.send_email(
            recipient_email=user.email,
            subject=subject,
            template_name='welcome_email',
            context=context
        )