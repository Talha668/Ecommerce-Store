from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views



router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'preferences', views.NotificationPreferenceViewSet, basename='preference')


urlpatterns = [
    path('', include(router.urls)),

    # Public tracking endpoints (no auth required)
    path('unsubscribe/<str:token>/', views.UnsubscribeView.as_view(), name='unsubscribe'),
    path('track/open/<str:notification_id>/', views.TrackOpenView.as_view(), name='track-open'),
    path('track/click/<str:notification_id>/', views.TrackClickView.as_view(), name='track-click'),
]