"""
Desempenho (Performance) repository implementation.
Data Access Layer - Repository Package
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from data_access.repositories.base_repository import BaseRepository
from infrastructure.database.models import Desempenho, Usuario, Conteudo, Trilha

class DesempenhoRepository(BaseRepository[Desempenho]):
    """
    Repository for Desempenho (Performance) entity operations.
    Implements specific performance tracking database operations.
    """
    
    def __init__(self, db_session: Session = None):
        super().__init__(Desempenho, db_session)
    
    async def get_user_performance(self, user_id: int, limit: int = 100) -> List[Desempenho]:
        """
        Get all performance records for a user.
        
        Args:
            user_id: User ID
            limit: Maximum number of records
            
        Returns:
            List of performance records
        """
        try:
            db = self.get_db()
            return db.query(Desempenho).options(
                joinedload(Desempenho.conteudo)
            ).filter(
                Desempenho.usuario_id == user_id
            ).order_by(
                desc(Desempenho.updated_at)
            ).limit(limit).all()
        except Exception as e:
            print(f"Error getting user performance for user {user_id}: {e}")
            return []
    
    async def get_content_performance(self, conteudo_id: int) -> List[Desempenho]:
        """
        Get all performance records for a specific content.
        
        Args:
            conteudo_id: Content ID
            
        Returns:
            List of performance records
        """
        try:
            db = self.get_db()
            return db.query(Desempenho).options(
                joinedload(Desempenho.usuario)
            ).filter(
                Desempenho.conteudo_id == conteudo_id
            ).order_by(
                desc(Desempenho.updated_at)
            ).all()
        except Exception as e:
            print(f"Error getting content performance for content {conteudo_id}: {e}")
            return []
    
    async def get_user_content_performance(self, user_id: int, conteudo_id: int) -> Optional[Desempenho]:
        """
        Get specific user's performance on specific content.
        
        Args:
            user_id: User ID
            conteudo_id: Content ID
            
        Returns:
            Performance record or None if not found
        """
        try:
            db = self.get_db()
            return db.query(Desempenho).filter(
                and_(
                    Desempenho.usuario_id == user_id,
                    Desempenho.conteudo_id == conteudo_id
                )
            ).first()
        except Exception as e:
            print(f"Error getting user content performance for user {user_id}, content {conteudo_id}: {e}")
            return None
    
    async def update_progress(self, user_id: int, conteudo_id: int, progresso: int, 
                             nota: Optional[float] = None, tempo_estudo: Optional[int] = None) -> Optional[Desempenho]:
        """
        Update or create user's performance record.
        
        Args:
            user_id: User ID
            conteudo_id: Content ID
            progresso: Progress percentage (0-100)
            nota: Grade/score (optional)
            tempo_estudo: Study time in minutes (optional)
            
        Returns:
            Updated or created performance record
        """
        try:
            db = self.get_db()
            
            # Try to get existing record
            desempenho = db.query(Desempenho).filter(
                and_(
                    Desempenho.usuario_id == user_id,
                    Desempenho.conteudo_id == conteudo_id
                )
            ).first()
            
            if desempenho:
                # Update existing record
                desempenho.progresso = max(desempenho.progresso, progresso)  # Don't decrease progress
                if nota is not None:
                    desempenho.nota = nota
                if tempo_estudo is not None:
                    desempenho.tempo_estudo += tempo_estudo
                desempenho.updated_at = datetime.utcnow()
            else:
                # Create new record
                desempenho = Desempenho(
                    usuario_id=user_id,
                    conteudo_id=conteudo_id,
                    progresso=progresso,
                    nota=nota,
                    tempo_estudo=tempo_estudo or 0
                )
                db.add(desempenho)
            
            db.commit()
            db.refresh(desempenho)
            return desempenho
        except Exception as e:
            db.rollback()
            print(f"Error updating progress for user {user_id}, content {conteudo_id}: {e}")
            return None
    
    async def get_user_trilha_progress(self, user_id: int, trilha_id: int) -> Dict[str, Any]:
        """
        Get user's progress summary for a specific trilha.
        
        Args:
            user_id: User ID
            trilha_id: Trilha ID
            
        Returns:
            Dictionary with progress summary
        """
        try:
            db = self.get_db()
            
            # Get all content in the trilha
            conteudos = db.query(Conteudo).filter(Conteudo.trilha_id == trilha_id).all()
            conteudo_ids = [c.id for c in conteudos]
            
            # Get performance records for user on these contents
            desempenhos = db.query(Desempenho).filter(
                and_(
                    Desempenho.usuario_id == user_id,
                    Desempenho.conteudo_id.in_(conteudo_ids)
                )
            ).all()
            
            total_content = len(conteudos)
            
            desempenho_dict = {}
            for d in desempenhos:
                if d.conteudo_id not in desempenho_dict or d.updated_at > desempenho_dict[d.conteudo_id].updated_at:
                    desempenho_dict[d.conteudo_id] = d
            
            completed_content = len([c.id for c in conteudos if desempenho_dict.get(c.id) and desempenho_dict[c.id].progresso >= 100])
            
            desempenhos_unicos = list(desempenho_dict.values())
            
            if desempenhos_unicos:
                avg_progress = sum(d.progresso for d in desempenhos_unicos) / len(desempenhos_unicos)
                graded = [d for d in desempenhos_unicos if d.nota is not None]
                avg_grade = sum(d.nota for d in graded) / len(graded) if graded else 0
                total_study_time = sum(d.tempo_estudo for d in desempenhos_unicos)
            else:
                avg_progress = 0
                avg_grade = 0
                total_study_time = 0
            
            content_progress = []
            
            for conteudo in conteudos:
                desempenho = desempenho_dict.get(conteudo.id)
                progresso = desempenho.progresso if desempenho else 0
                content_progress.append({
                    "conteudo_id": conteudo.id,
                    "progresso": progresso,
                    "nota": desempenho.nota if desempenho else None,
                    "tempo_estudo": desempenho.tempo_estudo if desempenho else 0,
                    "updated_at": desempenho.updated_at.isoformat() if desempenho and desempenho.updated_at else None
                })
            
            overall_progress = round((completed_content / total_content * 100), 2) if total_content > 0 else 0
            
            return {
                "user_id": user_id,
                "trilha_id": trilha_id,
                "total_content": total_content,
                "completed_content": completed_content,
                "completion_rate": overall_progress,
                "overall_progress": overall_progress,
                "average_progress": round(avg_progress, 2),
                "average_grade": round(avg_grade, 2),
                "total_study_time_minutes": total_study_time,
                "total_study_time_hours": round(total_study_time / 60, 2),
                "content_progress": content_progress
            }
        except Exception as e:
            print(f"Error getting user trilha progress for user {user_id}, trilha {trilha_id}: {e}")
            return {}
    
    async def get_learning_analytics(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """
        Get comprehensive learning analytics for a user.
        
        Args:
            user_id: User ID
            days: Number of days to analyze
            
        Returns:
            Dictionary with learning analytics
        """
        try:
            db = self.get_db()
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Get recent performance records
            recent_desempenhos = db.query(Desempenho).filter(
                and_(
                    Desempenho.usuario_id == user_id,
                    Desempenho.updated_at >= cutoff_date
                )
            ).all()
            
            # Get all performance records for comparison
            all_desempenhos = db.query(Desempenho).filter(
                Desempenho.usuario_id == user_id
            ).all()
            
            if not all_desempenhos:
                return {"user_id": user_id, "message": "No learning data available"}
            
            # Calculate metrics
            total_activities = len(all_desempenhos)
            recent_activities = len(recent_desempenhos)
            
            avg_progress_all = sum(d.progresso for d in all_desempenhos) / len(all_desempenhos)
            avg_progress_recent = sum(d.progresso for d in recent_desempenhos) / len(recent_desempenhos) if recent_desempenhos else 0
            
            completed_activities = len([d for d in all_desempenhos if d.progresso >= 100])
            recent_completed = len([d for d in recent_desempenhos if d.progresso >= 100])
            
            total_study_time = sum(d.tempo_estudo for d in all_desempenhos)
            recent_study_time = sum(d.tempo_estudo for d in recent_desempenhos)
            
            # Calculate grades
            graded_activities = [d for d in all_desempenhos if d.nota is not None]
            avg_grade = sum(d.nota for d in graded_activities) / len(graded_activities) if graded_activities else 0
            
            recent_graded = [d for d in recent_desempenhos if d.nota is not None]
            recent_avg_grade = sum(d.nota for d in recent_graded) / len(recent_graded) if recent_graded else 0
            
            return {
                "user_id": user_id,
                "analysis_period_days": days,
                "total_activities": total_activities,
                "recent_activities": recent_activities,
                "completed_activities": completed_activities,
                "recent_completed": recent_completed,
                "completion_rate": round(completed_activities / total_activities * 100, 2),
                "average_progress_all_time": round(avg_progress_all, 2),
                "average_progress_recent": round(avg_progress_recent, 2),
                "average_grade_all_time": round(avg_grade, 2),
                "average_grade_recent": round(recent_avg_grade, 2),
                "total_study_time_hours": round(total_study_time / 60, 2),
                "recent_study_time_hours": round(recent_study_time / 60, 2),
                "daily_average_study_time": round(recent_study_time / days / 60, 2) if days > 0 else 0,
                "learning_streak": await self._calculate_learning_streak(user_id)
            }
        except Exception as e:
            print(f"Error getting learning analytics for user {user_id}: {e}")
            return {}
    
    async def _calculate_learning_streak(self, user_id: int) -> int:
        """
        Calculate user's current learning streak (consecutive days with activity).
        
        Args:
            user_id: User ID
            
        Returns:
            Number of consecutive days with learning activity (minimum 1 if any activity exists)
        """
        try:
            db = self.get_db()
            
            # Get distinct dates with activity, ordered by date descending
            activity_dates = db.query(
                func.date(Desempenho.created_at).label('activity_date')
            ).filter(
                Desempenho.usuario_id == user_id
            ).distinct().order_by(
                desc(func.date(Desempenho.created_at))
            ).all()
            
            if not activity_dates:
                return 0
            
            # Convert to list of dates for easier manipulation
            dates_list = [activity_date_tuple[0] for activity_date_tuple in activity_dates if activity_date_tuple[0] is not None]
            
            if not dates_list:
                return 0
            
            today = datetime.utcnow().date()
            streak = 1  # Começar com 1 se há atividade
            
            # Check if there's activity today or yesterday (streak is still valid)
            most_recent_date = datetime.strptime(str(dates_list[0]), "%Y-%m-%d").date()
            
            # Calculate days since last activity
            days_since_last_activity = (today - most_recent_date).days
            
            if days_since_last_activity > 1:
                # Last activity was more than 1 day ago, but return 1 (início de nova sequência)
                return 1
            
            # Count consecutive days starting from today or yesterday
            expected_date = today if most_recent_date == today else today - timedelta(days=1)
            
            for activity_date in dates_list:
                activity_date_obj = datetime.strptime(str(activity_date), "%Y-%m-%d").date()
                
                if activity_date_obj == expected_date:
                    streak += 1
                    expected_date = expected_date - timedelta(days=1)
                else:
                    # There's a gap in the streak
                    break
            
            return streak
        except Exception as e:
            print(f"Error calculating learning streak for user {user_id}: {e}")
            return 0
    
    async def get_top_performers(self, metric: str = "progress", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get top performing users based on specified metric.
        
        Args:
            metric: Metric to rank by ("progress", "grade", or "study_time")
            limit: Maximum number of results
            
        Returns:
            List of top performers with their data
        """
        try:
            db = self.get_db()
            
            if metric == "progress":
                query = db.query(
                    Desempenho.usuario_id,
                    func.avg(Desempenho.progresso).label('avg_progress'),
                    func.count(Desempenho.id).label('total_activities')
                ).group_by(
                    Desempenho.usuario_id
                ).order_by(
                    desc(func.avg(Desempenho.progresso))
                )
            elif metric == "grade":
                query = db.query(
                    Desempenho.usuario_id,
                    func.avg(Desempenho.nota).label('avg_grade'),
                    func.count(Desempenho.id).label('total_activities')
                ).filter(
                    Desempenho.nota.isnot(None)
                ).group_by(
                    Desempenho.usuario_id
                ).order_by(
                    desc(func.avg(Desempenho.nota))
                )
            elif metric == "study_time":
                query = db.query(
                    Desempenho.usuario_id,
                    func.sum(Desempenho.tempo_estudo).label('total_study_time'),
                    func.count(Desempenho.id).label('total_activities')
                ).group_by(
                    Desempenho.usuario_id
                ).order_by(
                    desc(func.sum(Desempenho.tempo_estudo))
                )
            else:
                return []
            
            results = query.limit(limit).all()
            
            # Enrich with user information
            performers = []
            for result in results:
                user = db.query(Usuario).filter(Usuario.id == result.usuario_id).first()
                if user:
                    performer_data = {
                        "user_id": result.usuario_id,
                        "nome": user.nome,
                        "email": user.email,
                        "total_activities": result.total_activities
                    }
                    
                    if metric == "progress":
                        performer_data["average_progress"] = round(result.avg_progress, 2)
                    elif metric == "grade":
                        performer_data["average_grade"] = round(result.avg_grade, 2)
                    elif metric == "study_time":
                        performer_data["total_study_time_hours"] = round(result.total_study_time / 60, 2)
                    
                    performers.append(performer_data)
            
            return performers
        except Exception as e:
            print(f"Error getting top performers by {metric}: {e}")
            return []
