"""
Trilha (Learning Path) management API endpoints.
Presentation Layer - API Package
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from presentation.api.schemas.trilha_schemas import (
    TrilhaCreate, TrilhaUpdate, TrilhaResponse, TrilhaDetailResponse,
    TrilhaEnrollmentRequest, TrilhaEnrollmentResponse, TrilhaStatsResponse,
    PopularTrilhaResponse, TrilhaSearchResponse, ProgressUpdateRequest,
    ProgressResponse, UserTrilhaProgressResponse, ConteudoCreate, ConteudoResponse
)
from presentation.api.schemas.user_schemas import APIResponse
from data_access.repositories.trilha_repository import TrilhaRepository
from data_access.repositories.usuario_repository import UsuarioRepository
from data_access.repositories.desempenho_repository import DesempenhoRepository
from business.learning.content_delivery import ContentDelivery

router = APIRouter()
trilha_repository = TrilhaRepository()
usuario_repository = UsuarioRepository()
desempenho_repository = DesempenhoRepository()
content_delivery = ContentDelivery()

@router.post("/", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_trilha(trilha_data: TrilhaCreate):
    """
    Create a new learning path (trilha).
    
    - **titulo**: Trilha title (required)
    - **dificuldade**: Difficulty level - beginner, intermediate, or advanced (required)
    """
    # Validate difficulty level
    valid_difficulties = ["beginner", "intermediate", "advanced"]
    if trilha_data.dificuldade not in valid_difficulties:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid difficulty level. Must be one of: {valid_difficulties}"
        )
    
    trilha = await trilha_repository.create(trilha_data.dict())
    
    if not trilha:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create trilha"
        )
    
    return APIResponse(
        success=True,
        message="Trilha created successfully",
        data={
            "id": trilha.id,
            "titulo": trilha.titulo,
            "dificuldade": trilha.dificuldade,
            "created_at": trilha.created_at.isoformat() if trilha.created_at else None
        }
    )

@router.get("/{trilha_id}", response_model=APIResponse)
async def get_trilha_details(
    trilha_id: int,
    user_id: Optional[int] = Query(None, description="User ID to include progress information")
):
    """
    Get detailed trilha information with content.
    
    - **trilha_id**: Trilha ID to retrieve
    - **user_id**: Optional user ID to include progress information
    """
    result = await content_delivery.get_trilha_content(trilha_id, user_id)
    
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
        data=result["trilha"]
    )

@router.put("/{trilha_id}", response_model=APIResponse)
async def update_trilha(trilha_id: int, trilha_data: TrilhaUpdate):
    """
    Update trilha information.
    
    - **trilha_id**: Trilha ID to update
    - **titulo**: New title (optional)
    - **dificuldade**: New difficulty level (optional)
    """
    # Filter out None values
    update_data = {k: v for k, v in trilha_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    # Validate difficulty if provided
    if "dificuldade" in update_data:
        valid_difficulties = ["beginner", "intermediate", "advanced"]
        if update_data["dificuldade"] not in valid_difficulties:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid difficulty level. Must be one of: {valid_difficulties}"
            )
    
    updated_trilha = await trilha_repository.update(trilha_id, update_data)
    
    if not updated_trilha:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trilha not found"
        )
    
    return APIResponse(
        success=True,
        message="Trilha updated successfully",
        data={
            "id": updated_trilha.id,
            "titulo": updated_trilha.titulo,
            "dificuldade": updated_trilha.dificuldade,
            "updated_at": updated_trilha.updated_at.isoformat() if updated_trilha.updated_at else None
        }
    )

@router.delete("/{trilha_id}", response_model=APIResponse)
async def delete_trilha(trilha_id: int):
    """
    Delete a trilha.
    
    - **trilha_id**: Trilha ID to delete
    
    **Warning**: This will also remove all associated content and user progress!
    """
    deleted = await trilha_repository.delete(trilha_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trilha not found"
        )
    
    return APIResponse(
        success=True,
        message="Trilha deleted successfully"
    )

@router.get("/", response_model=APIResponse)
async def list_trilhas(
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    user_id: Optional[int] = Query(None, ge=1, description="Filter trilhas by enrolled user ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip")
):
    """
    List trilhas with optional filtering.
    
    - **difficulty**: Filter by difficulty level (optional)
    - **user_id**: Filter trilhas that belong to this user (optional)
    - **limit**: Maximum number of results (1-100)
    - **offset**: Number of results to skip for pagination
    """
    valid_difficulties = ["beginner", "intermediate", "advanced"]
    
    if difficulty and difficulty not in valid_difficulties:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid difficulty level. Must be one of: {valid_difficulties}"
        )

    if user_id is not None:
        usuario = await usuario_repository.get_by_id(user_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        trilhas = await trilha_repository.get_by_user(
            user_id,
            dificuldade=difficulty,
            limit=limit,
            offset=offset
        )
    elif difficulty:
        trilhas = await trilha_repository.get_by_difficulty(
            difficulty,
            limit=limit,
            offset=offset
        )
    else:
        trilhas = await trilha_repository.get_all(limit, offset)
    
    trilha_list = [
        {
            "id": trilha.id,
            "titulo": trilha.titulo,
            "dificuldade": trilha.dificuldade,
            "created_at": trilha.created_at.isoformat() if trilha.created_at else None
        }
        for trilha in trilhas
    ]
    
    return APIResponse(
        success=True,
        data={
            "trilhas": trilha_list,
            "count": len(trilha_list),
            "filtered_user_id": user_id,
            "limit": limit,
            "offset": offset
        }
    )

@router.get("/search/", response_model=APIResponse)
async def search_trilhas(
    q: str = Query(..., min_length=2, description="Search term for trilha title"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results")
):
    """
    Search trilhas by title.
    
    - **q**: Search term (minimum 2 characters)
    - **limit**: Maximum number of results (1-100)
    """
    trilhas = await trilha_repository.search_trilhas(q, limit)
    
    trilha_list = [
        {
            "id": trilha.id,
            "titulo": trilha.titulo,
            "dificuldade": trilha.dificuldade,
            "created_at": trilha.created_at.isoformat() if trilha.created_at else None
        }
        for trilha in trilhas
    ]
    
    return APIResponse(
        success=True,
        data={
            "trilhas": trilha_list,
            "count": len(trilha_list),
            "search_term": q
        }
    )

@router.get("/popular/", response_model=APIResponse)
async def get_popular_trilhas(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """
    Get most popular trilhas based on enrollment count.
    
    - **limit**: Maximum number of results (1-50)
    """
    popular_trilhas = await trilha_repository.get_popular_trilhas(limit)
    
    return APIResponse(
        success=True,
        data={
            "popular_trilhas": popular_trilhas,
            "count": len(popular_trilhas)
        }
    )

@router.post("/{trilha_id}/enroll", response_model=APIResponse)
async def enroll_user_in_trilha(trilha_id: int, enrollment_data: TrilhaEnrollmentRequest):
    """
    Enroll a user in a trilha.
    
    - **trilha_id**: Trilha ID to enroll in
    - **user_id**: User ID to enroll
    """
    result = await content_delivery.enroll_user_in_trilha(enrollment_data.user_id, trilha_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        elif "already enrolled" in result["error"].lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=result["error"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
    
    return APIResponse(
        success=True,
        message=result["message"],
        data=result["enrollment"]
    )

@router.post("/{trilha_id}/content", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def add_content_to_trilha(trilha_id: int, content_data: ConteudoCreate):
    """
    Add content to a trilha.
    
    - **trilha_id**: Trilha ID to add content to
    - **titulo**: Content title (required)
    - **tipo**: Content type - video, text, quiz, exercise (required)
    - **material**: Content material or path (optional)
    """
    # Validate content type
    valid_types = ["video", "text", "quiz", "exercise"]
    if content_data.tipo not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Must be one of: {valid_types}"
        )
    
    # Check if trilha exists
    trilha = await trilha_repository.get_by_id(trilha_id)
    if not trilha:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trilha not found"
        )
    
    conteudo = await trilha_repository.add_conteudo_to_trilha(trilha_id, content_data.dict())
    
    if not conteudo:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add content to trilha"
        )
    
    return APIResponse(
        success=True,
        message="Content added to trilha successfully",
        data={
            "id": conteudo.id,
            "titulo": conteudo.titulo,
            "tipo": conteudo.tipo,
            "trilha_id": conteudo.trilha_id,
            "created_at": conteudo.created_at.isoformat() if conteudo.created_at else None
        }
    )

@router.post("/progress/update", response_model=APIResponse)
async def update_content_progress(progress_data: ProgressUpdateRequest):
    """
    Update user's progress on content.
    
    - **user_id**: User ID
    - **conteudo_id**: Content ID
    - **progresso**: Progress percentage (0-100)
    - **nota**: Grade/score (0-100, optional)
    - **tempo_estudo**: Study time in minutes (optional)
    """
    result = await content_delivery.update_content_progress(
        progress_data.user_id,
        progress_data.conteudo_id,
        progress_data.progresso,
        progress_data.nota,
        progress_data.tempo_estudo
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return APIResponse(
        success=True,
        message="Progress updated successfully",
        data=result["progress"]
    )

@router.get("/{trilha_id}/progress/{user_id}", response_model=APIResponse)
async def get_user_trilha_progress(trilha_id: int, user_id: int):
    """
    Get user's progress on a specific trilha.
    
    - **trilha_id**: Trilha ID
    - **user_id**: User ID
    """
    progress = await desempenho_repository.get_user_trilha_progress(user_id, trilha_id)
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or trilha not found, or no progress data available"
        )
    
    return APIResponse(
        success=True,
        data=progress
    )

@router.get("/{trilha_id}/statistics", response_model=APIResponse)
async def get_trilha_statistics(trilha_id: int):
    """
    Get comprehensive statistics for a trilha.
    
    - **trilha_id**: Trilha ID to get statistics for
    
    Returns detailed statistics including enrollment, completion rates, and performance metrics.
    """
    stats = await trilha_repository.get_trilha_statistics(trilha_id)
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trilha not found"
        )
    
    return APIResponse(
        success=True,
        data=stats
    )

@router.get("/{trilha_id}/completion-stats", response_model=APIResponse)
async def get_trilha_completion_stats(trilha_id: int):
    """
    Get completion statistics for a trilha.
    
    - **trilha_id**: Trilha ID
    
    Returns statistics about user completion rates and engagement.
    """
    completion_stats = await trilha_repository.get_trilha_completion_stats(trilha_id)
    
    if not completion_stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trilha not found"
        )
    
    return APIResponse(
        success=True,
        data=completion_stats
    )
