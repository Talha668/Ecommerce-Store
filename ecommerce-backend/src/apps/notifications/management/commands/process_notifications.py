from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.notifications.models import Notification
from apps.notifications.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)



class Command(BaseCommand):
    help = 'Process pending notifications'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Number of notifications to process (default: 50)'
        )
    
    def handle(self, *args, **options):
        limit = options['limit']
        
        # Get pending notifications
        pending = Notification.objects.filter(
            status='pending',
            scheduled_at__lte=timezone.now()
        )[:limit]
        
        count = pending.count()
        self.stdout.write(f"Processing {count} notifications...")
        
        success = 0
        failed = 0
        
        for notification in pending:
            try:
                NotificationService.process_notification(notification)
                success += 1
                self.stdout.write(f"✓ Processed: {notification.notification_id}")
            except Exception as e:
                failed += 1
                self.stdout.write(self.style.ERROR(f"✗ Failed: {notification.notification_id} - {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f"\nDone! {success} succeeded, {failed} failed"))