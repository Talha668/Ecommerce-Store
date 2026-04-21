from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404, redirect
from django.views.generic import View
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.db.models import Q
from .models import Notification, NotificationPreference, NotificationEvent
from .serializers import (
    NotificationSerializer, NotificationPreferenceSerializer,
    NotificationDetailSerializer, NotificationMarkReadSerializer
)
from .services.notification_service import NotificationService
import logging






logger = logging.getLogger(__name__)






class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for user notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(
            Q(user=self.request.user) | Q(recipient_email=self.request.user.email)
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return NotificationDetailSerializer
        if self.action == 'mark_read':
            return NotificationMarkReadSerializer
        return NotificationSerializer
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(
            status__in=['sent', 'delivered'],
            opened_at__isnull=True
        ).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().filter(
            status__in=['sent', 'delivered'],
            opened_at__isnull=True
        ).update(
            status='opened',
            opened_at=timezone.now()
        )
        return Response({'message': 'All notifications marked as read'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.status = 'opened'
        notification.opened_at = timezone.now()
        notification.save()
        
        # Track event
        NotificationEvent.objects.create(
            notification=notification,
            event_type='opened',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=False, methods=['get'])
    def preferences(self, request):
        """Get notification preferences for current user"""
        pref, created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_preferences(self, request):
        """Update notification preferences"""
        pref, created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all notifications for user"""
        count = self.get_queryset().delete()[0]
        return Response({'message': f'{count} notifications deleted'})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification preferences"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        obj, created = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj


class UnsubscribeView(View):
    """Handle unsubscribe links in emails"""
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        # Simple token-based unsubscribe
        try:
            # In production, you'd validate the token properly
            user_id = token.split('-')[0]  # Very basic example - don't use in production!
            pref = NotificationPreference.objects.get(user_id=user_id)
            pref.promotional_email = False
            pref.newsletter_email = False
            pref.save()
            
            return HttpResponse("""
                <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h1>✓ Unsubscribed Successfully</h1>
                    <p>You will no longer receive marketing emails from us.</p>
                    <p>You can manage all your notification preferences in your account settings.</p>
                    <a href="/profile/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; 
                       background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                        Go to Profile
                    </a>
                </body>
                </html>
            """)
        except Exception as e:
            logger.error(f"Unsubscribe failed: {str(e)}")
            return HttpResponse("Invalid unsubscribe link", status=400)


class TrackOpenView(View):
    """Track email opens (1x1 pixel tracking)"""
    permission_classes = [AllowAny]
    
    def get(self, request, notification_id):
        try:
            notification = Notification.objects.get(notification_id=notification_id)
            
            # Only track first open
            if not notification.opened_at:
                notification.status = 'opened'
                notification.opened_at = timezone.now()
                notification.save()
                
                # Track event
                NotificationEvent.objects.create(
                    notification=notification,
                    event_type='opened',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                logger.info(f"Email opened: {notification_id}")
            
            # Return 1x1 transparent pixel
            pixel = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
            return HttpResponse(pixel, content_type='image/gif')
            
        except Notification.DoesNotExist:
            # Return pixel anyway to avoid exposing information
            pixel = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
            return HttpResponse(pixel, content_type='image/gif')


class TrackClickView(View):
    """Track link clicks in emails"""
    permission_classes = [AllowAny]
    
    def get(self, request, notification_id):
        try:
            notification = Notification.objects.get(notification_id=notification_id)
            
            # Track click
            notification.status = 'clicked'
            notification.clicked_at = timezone.now()
            notification.save()
            
            # Track event
            NotificationEvent.objects.create(
                notification=notification,
                event_type='clicked',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            logger.info(f"Link clicked: {notification_id}")
            
            # Redirect to the actual URL (you'd pass this as a parameter)
            redirect_url = request.GET.get('url', '/')
            return redirect(redirect_url)
            
        except Notification.DoesNotExist:
            return redirect('/')


class NotificationStatsView(generics.GenericAPIView):
    """Get notification statistics (admin only)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)
        
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        stats = {
            'total': Notification.objects.count(),
            'today': Notification.objects.filter(created_at__date=today.date()).count(),
            'this_week': Notification.objects.filter(created_at__gte=week_ago).count(),
            'this_month': Notification.objects.filter(created_at__gte=month_ago).count(),
            'by_status': Notification.objects.values('status').annotate(count=Count('status')),
            'by_channel': Notification.objects.values('channel').annotate(count=Count('channel')),
            'open_rate': self.calculate_open_rate(),
            'click_rate': self.calculate_click_rate(),
        }
        
        return Response(stats)
    
    def calculate_open_rate(self):
        total_sent = Notification.objects.filter(status__in=['sent', 'delivered', 'opened', 'clicked']).count()
        opened = Notification.objects.filter(opened_at__isnull=False).count()
        
        if total_sent == 0:
            return 0
        return round((opened / total_sent) * 100, 2)
    
    def calculate_click_rate(self):
        total_sent = Notification.objects.filter(status__in=['sent', 'delivered', 'opened', 'clicked']).count()
        clicked = Notification.objects.filter(clicked_at__isnull=False).count()
        
        if total_sent == 0:
            return 0
        return round((clicked / total_sent) * 100, 2)