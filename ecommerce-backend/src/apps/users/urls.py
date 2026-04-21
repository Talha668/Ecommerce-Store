from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views





router = DefaultRouter()

# User URLs
urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile
    path('me/', views.UserDetailView.as_view(), name='user-detail'),
    path('me/profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('me/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    
    # Password reset
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    
    # Addresses
    path('addresses/', views.UserAddressListView.as_view(), name='address-list'),
    path('addresses/<int:pk>/', views.UserAddressDetailView.as_view(), name='address-detail'),
    path('addresses/add/', views.AddAdressview.as_view(), name='add-address'),
    
    # Admin URLs
    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin-user-detail'),
]