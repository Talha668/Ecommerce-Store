from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
import uuid
from .models import User, UserAddress, UserProfile, PasswordResetToken
from .serializers import (
    UserRegisterSerializer, UserLoginSerializer, UserSerializer,
    UserProfileSerializer, UserAddressSerializer, ChangePasswordSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer, AdminUserSerializer
)
from .permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from rest_framework.generics import CreateAPIView







class RegisterView(generics.CreateAPIView):
    """View for user registration"""
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens for automatic login
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """View for user login"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response({
                'user': UserSerializer(serializer.validated_data['user']).data,
                'refresh': serializer.validated_data['refresh'],
                'access': serializer.validated_data['access'],
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """View for user logout (token blacklist)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for user profile"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class UserDetailView(generics.RetrieveUpdateAPIView):
    """View for user details"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """View for changing password"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Password changed successfully',
            'user': UserSerializer(user, context=self.get_serializer_context()).data
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """View for forgot password"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if user exists
        user = serializer.validated_data.get('user')
        if not user:
            # Return success even if user doesn't exist (security)
            return Response({
                'message': 'If your email exists in our system, you will receive a password reset link.'
            }, status=status.HTTP_200_OK)
        
        # Generate reset token
        token = str(uuid.uuid4())
        expires_at = timezone.now() + timedelta(hours=24)
        
        # Delete old tokens for this user
        PasswordResetToken.objects.filter(user=user).delete()
        
        # Create new token
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # TODO: Send email with reset link
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        
        return Response({
            'message': 'Password reset email sent',
            'reset_link': reset_link  # Remove in production, only for development
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """View for resetting password"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Password reset successful',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class UserAddressListView(generics.ListCreateAPIView):
    """View for listing and creating user addresses"""
    serializer_class = UserAddressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting user addresses"""
    serializer_class = UserAddressSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)


class AddAdressview(CreateAPIView):
    """API view to add new address for the authenticated user"""
    serializer_class = UserAddressSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Pass the request context to the serializer to access the user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Save the address (the user is assingned to the serializer)
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "message": "Address added successfully",
                "data": serializer.data
            },
            status=staus.HTTP_201_CREATED,
            headers=headers
        )
    

# Admin Views
class AdminUserListView(generics.ListAPIView):
    """Admin view for listing all users"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()
    filterset_fields = ['role', 'is_active', 'email_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view for user details"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view"""
    permission_classes = [permissions.AllowAny]