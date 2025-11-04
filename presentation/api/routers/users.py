"""
User management API endpoints.
Presentation Layer - API Package
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from presentation.api.schemas.user_schemas import (
    UserCreate, UserUpdate, UserResponse, UserProfileResponse, 
    UserSearchResponse, UserRecommendationsResponse, APIResponse, UserLogin
)
from infrastructure.security.auth import get_current_user_token
from business.core.usuario_manager import UsuarioManager

router = APIRouter()

usuario_manager = UsuarioManager()

@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """
    Register a new user.
    
    - **nome**: User's full name (required)
    - **email**: User's email address (required, must be unique)
    - **senha**: User's password (required, minimum 6 characters)
    - **perfil_aprend**: Learning profile (optional, defaults to 'beginner')
    """
    result = await usuario_manager.create_user(user_data.model_dump())
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        message="User registered successfully",
        data=result["user"]
    )

@router.post("/login", response_model=APIResponse)
async def login_user(login_data: UserLogin):
    """
    Login user and return access token.
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns access token for authentication.
    """
    result = await usuario_manager.authenticate_user(login_data.email, login_data.password)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        message="Login successful",
        data={
            "user": result["user"],
            "access_token": result["token"],
            "token_type": "bearer"
        }
    )

@router.post("/", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    """
    Create a new user.
    
    - **nome**: User's full name (required)
    - **email**: User's email address (required, must be unique)
    - **perfil_aprend**: Learning profile (optional, defaults to 'beginner')
    """
    result = await usuario_manager.create_user(user_data.model_dump())
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        message="User created successfully",
        data=result["user"]
    )

@router.get("/{user_id}", response_model=APIResponse)
async def get_user_profile(user_id: int):
    """
    Get detailed user profile with learning data.
    
    - **user_id**: User ID to retrieve
    
    Returns comprehensive user information including:
    - Basic profile information
    - Enrolled learning paths (trilhas)
    - Progress summary
    - Learning analytics
    """
    result = await usuario_manager.get_user_profile(user_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        data=result["profile"]
    )

@router.put("/{user_id}", response_model=APIResponse)
async def update_user_profile(user_id: int, user_data: UserUpdate):
    """
    Update user profile information.
    
    - **user_id**: User ID to update
    - **nome**: New name (optional)
    - **email**: New email (optional, must be unique)
    - **perfil_aprend**: New learning profile (optional)
    """
    # Filter out None values
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    result = await usuario_manager.update_user_profile(user_id, update_data)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
    
    return APIResponse(
        success=True,
        message="User profile updated successfully",
        data=result["user"]
    )

@router.delete("/{user_id}", response_model=APIResponse)
async def delete_user(user_id: int):
    """
    Delete a user account.
    
    - **user_id**: User ID to delete
    
    **Warning**: This action cannot be undone!
    """
    result = await usuario_manager.delete_user(user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
    
    return APIResponse(
        success=True,
        message=result["message"]
    )

@router.get("/", response_model=APIResponse)
async def search_users(
    q: str = Query(..., min_length=2, description="Search term for name or email"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results")
):
    """
    Search users by name or email.
    
    - **q**: Search term (minimum 2 characters)
    - **limit**: Maximum number of results (1-100)
    """
    result = await usuario_manager.search_users(q, limit)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        data={
            "users": result["users"],
            "count": result["count"],
            "search_term": q
        }
    )

@router.get("/{user_id}/recommendations", response_model=APIResponse)
async def get_user_recommendations(user_id: int):
    """
    Get personalized learning recommendations for a user.
    
    - **user_id**: User ID to get recommendations for
    
    Returns personalized recommendations based on:
    - User's learning profile
    - Learning history and progress
    - Current skill level
    - Learning patterns
    """
    result = await usuario_manager.get_user_learning_recommendations(user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
    
    return APIResponse(
        success=True,
        data=result
    )

@router.get("/{user_id}/analytics", response_model=APIResponse)
async def get_user_analytics(
    user_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """
    Get detailed learning analytics for a user.
    
    - **user_id**: User ID to analyze
    - **days**: Number of days to include in analysis (1-365)
    
    Returns comprehensive analytics including:
    - Learning activity metrics
    - Progress statistics
    - Study time analysis
    - Performance trends
    - Learning streak information
    """
    from data_access.repositories.desempenho_repository import DesempenhoRepository
    desempenho_repo = DesempenhoRepository()
    
    analytics = await desempenho_repo.get_learning_analytics(user_id, days)
    
    # If no analytics data, return default values instead of error
    if not analytics or "message" in analytics:
        analytics = {
            "user_id": user_id,
            "analysis_period_days": days,
            "total_activities": 0,
            "recent_activities": 0,
            "completed_activities": 0,
            "recent_completed": 0,
            "completion_rate": 0,
            "average_progress_all_time": 0,
            "average_progress_recent": 0,
            "average_grade_all_time": 0,
            "average_grade_recent": 0,
            "total_study_time_hours": 0,
            "recent_study_time_hours": 0,
            "daily_average_study_time": 0,
            "learning_streak": 0
        }
    
    return APIResponse(
        success=True,
        data=analytics
    )

@router.get("/{user_id}/learning-path", response_model=APIResponse)
async def get_user_learning_path(user_id: int):
    """
    Get user's complete learning path with progress.
    
    - **user_id**: User ID to get learning path for
    
    Returns information about all enrolled learning paths (trilhas) 
    with detailed progress information.
    """
    from business.learning.content_delivery import ContentDelivery
    content_delivery = ContentDelivery()
    
    result = await content_delivery.get_user_learning_path(user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
    
    return APIResponse(
        success=True,
        data=result
    )

@router.get("/profile/me", response_model=APIResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user_token)):
    """
    Get current user's profile (requires authentication).
    
    Returns the authenticated user's profile information.
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    
    result = await usuario_manager.get_user_profile(user_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        data=result["profile"]
    )
