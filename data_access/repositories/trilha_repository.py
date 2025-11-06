"""
Trilha (Learning Path) repository implementation.
Data Access Layer - Repository Package
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from data_access.repositories.base_repository import BaseRepository
from infrastructure.database.models import (
    Trilha,
    Conteudo,
    Usuario,
    Desempenho,
    Questao,
    SessaoQuiz,
    RespostaUsuario,
    user_trilha_association,
)

class TrilhaRepository(BaseRepository[Trilha]):
    """
    Repository for Trilha (Learning Path) entity operations.
    Implements specific trilha-related database operations.
    """
    
    def __init__(self, db_session: Session = None):
        super().__init__(Trilha, db_session)

    # =========================
    # GET Methods
    # =========================
    
    async def get_with_conteudos(self, trilha_id: int) -> Optional[Trilha]:
        try:
            db = self.get_db()
            return db.query(Trilha).options(joinedload(Trilha.conteudos)).filter(Trilha.id == trilha_id).first()
        except Exception as e:
            print(f"Error getting trilha with conteudos {trilha_id}: {e}")
            return None

    async def get_with_usuarios(self, trilha_id: int) -> Optional[Trilha]:
        try:
            db = self.get_db()
            return db.query(Trilha).options(joinedload(Trilha.usuarios)).filter(Trilha.id == trilha_id).first()
        except Exception as e:
            print(f"Error getting trilha with usuarios {trilha_id}: {e}")
            return None
    
    async def get_all_trilhas(self, limit: int = 100) -> List[Trilha]:
        """
        Get all trilhas from database.
        
        Args:
            limit: Maximum number of trilhas to return
            
        Returns:
            List of all trilhas
        """
        try:
            db = self.get_db()
            return db.query(Trilha).limit(limit).all()
        except Exception as e:
            print(f"Error getting all trilhas: {e}")
            return []
    
    async def get_by_difficulty(
        self,
        dificuldade: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Trilha]:
        """
        Get trilhas by difficulty level.
        
        Args:
            dificuldade: Difficulty level (beginner, intermediate, advanced)
            
        Returns:
            List of trilhas with matching difficulty
        """
        try:
            db = self.get_db()
            return (
                db.query(Trilha)
                .filter(Trilha.dificuldade == dificuldade)
                .offset(offset)
                .limit(limit)
                .all()
            )
        except Exception as e:
            print(f"Error getting trilhas by difficulty '{dificuldade}': {e}")
            return []

    async def get_by_user(
        self,
        user_id: int,
        dificuldade: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Trilha]:
        """
        Get trilhas in which a specific user is enrolled.

        Args:
            user_id: User ID whose trilhas should be returned
            dificuldade: Optional difficulty filter
            limit: Maximum number of results
            offset: Results offset for pagination

        Returns:
            List of trilhas associated with the user
        """
        try:
            db = self.get_db()

            query = (
                db.query(Trilha)
                .join(
                    user_trilha_association,
                    Trilha.id == user_trilha_association.c.trilha_id
                )
                .filter(user_trilha_association.c.user_id == user_id)
                .order_by(Trilha.created_at.desc(), Trilha.id.desc())
            )

            if dificuldade:
                query = query.filter(Trilha.dificuldade == dificuldade)

            return query.offset(offset).limit(limit).all()
        except Exception as e:
            print(f"Error getting trilhas for user {user_id}: {e}")
            return []
    
    async def search_trilhas(self, search_term: str, limit: int = 50) -> List[Trilha]:
        try:
            db = self.get_db()
            search_pattern = f"%{search_term}%"
            return db.query(Trilha).filter(Trilha.titulo.ilike(search_pattern)).limit(limit).all()
        except Exception as e:
            print(f"Error searching trilhas with term '{search_term}': {e}")
            return []

    # =========================
    # DELETE Method
    # =========================

    async def delete(self, trilha_id: int) -> bool:
        db = self.get_db()
        try:
            # Busca a trilha com todos os relacionamentos
            trilha = db.query(Trilha).filter(Trilha.id == trilha_id).first()
            if not trilha:
                print(f"Trilha {trilha_id} not found.")
                return False

            # 1. Remove associações com usuários (tabela de relacionamento many-to-many)
            trilha.usuarios.clear()
            db.flush()

            # 2. Busca todos os conteúdos da trilha
            conteudos = db.query(Conteudo).filter(Conteudo.trilha_id == trilha_id).all()
            conteudo_ids = [c.id for c in conteudos]
            
            # 3. Busca todas as sessões de quiz relacionadas à trilha
            sessoes_quiz_trilha = db.query(SessaoQuiz).filter(SessaoQuiz.trilha_id == trilha_id).all()
            
            # 3.1. Busca sessões de quiz relacionadas aos conteúdos
            sessoes_quiz_conteudo = []
            if conteudo_ids:
                sessoes_quiz_conteudo = db.query(SessaoQuiz).filter(SessaoQuiz.conteudo_id.in_(conteudo_ids)).all()
            
            # 3.2. Combina todas as sessões, removendo duplicatas
            sessao_ids_set = set()
            sessoes_quiz = []
            for sessao in sessoes_quiz_trilha + sessoes_quiz_conteudo:
                if sessao.id not in sessao_ids_set:
                    sessao_ids_set.add(sessao.id)
                    sessoes_quiz.append(sessao)
            
            # 4. Para cada sessão de quiz, deleta as respostas do usuário primeiro
            sessao_ids = list(sessao_ids_set)
            for sessao in sessoes_quiz:
                respostas = db.query(RespostaUsuario).filter(RespostaUsuario.sessao_id == sessao.id).all()
                for resposta in respostas:
                    db.delete(resposta)
            db.flush()
            
            # 5. Deleta todas as sessões de quiz
            for sessao in sessoes_quiz:
                db.delete(sessao)
            db.flush()

            # 6. Para cada conteúdo, deleta em cascata
            for conteudo in conteudos:
                conteudo_id = conteudo.id
                
                # 6.1. Busca todas as questões deste conteúdo
                questoes = db.query(Questao).filter(Questao.conteudo_id == conteudo_id).all()
                
                # 6.2. Para cada questão, deleta as respostas do usuário relacionadas
                # (todas as respostas relacionadas a sessões já foram deletadas acima,
                # mas deletamos todas aqui para garantir que não há respostas órfãs)
                for questao in questoes:
                    respostas_questao = db.query(RespostaUsuario).filter(
                        RespostaUsuario.questao_id == questao.id
                    ).all()
                    for resposta in respostas_questao:
                        db.delete(resposta)
                    db.flush()
                    # Deleta a questão
                    db.delete(questao)
                db.flush()
                
                # 6.3. Deleta desempenhos relacionados a este conteúdo
                desempenhos = db.query(Desempenho).filter(Desempenho.conteudo_id == conteudo_id).all()
                for desempenho in desempenhos:
                    db.delete(desempenho)
                db.flush()
                
                # 6.4. Deleta o conteúdo
                db.delete(conteudo)
            db.flush()
            
            # 7. Deleta a trilha
            db.delete(trilha)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error deleting trilha {trilha_id}: {e}")
            import traceback
            traceback.print_exc()
            return False

    # =========================
    # Other Methods (existing)
    # =========================

    async def get_popular_trilhas(self, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            db = self.get_db()
            result = db.query(
                Trilha,
                func.count(Usuario.id).label('enrollment_count')
            ).outerjoin(Trilha.usuarios).group_by(Trilha.id).order_by(func.count(Usuario.id).desc()).limit(limit).all()

            return [
                {
                    "trilha": trilha,
                    "enrollment_count": count,
                    "id": trilha.id,
                    "titulo": trilha.titulo,
                    "dificuldade": trilha.dificuldade
                }
                for trilha, count in result
            ]
        except Exception as e:
            print(f"Error getting popular trilhas: {e}")
            return []

    async def get_trilha_statistics(self, trilha_id: int) -> Dict[str, Any]:
        try:
            db = self.get_db()
            trilha = db.query(Trilha).options(joinedload(Trilha.conteudos), joinedload(Trilha.usuarios)).filter(Trilha.id == trilha_id).first()
            if not trilha:
                return {}

            desempenhos = db.query(Desempenho).join(Conteudo).filter(Conteudo.trilha_id == trilha_id).all()

            total_enrollments = len(trilha.usuarios)
            total_content = len(trilha.conteudos)

            if desempenhos:
                avg_progress = sum(d.progresso for d in desempenhos) / len(desempenhos)
                notas = [d.nota for d in desempenhos if d.nota is not None]
                avg_grade = sum(notas) / len(notas) if notas else 0
                total_study_time = sum(d.tempo_estudo for d in desempenhos)
                completion_rate = len([d for d in desempenhos if d.progresso >= 100]) / len(desempenhos) * 100
            else:
                avg_progress = avg_grade = total_study_time = completion_rate = 0

            return {
                "trilha_id": trilha_id,
                "titulo": trilha.titulo,
                "dificuldade": trilha.dificuldade,
                "total_enrollments": total_enrollments,
                "total_content_items": total_content,
                "average_progress": round(avg_progress, 2),
                "average_grade": round(avg_grade, 2),
                "completion_rate": round(completion_rate, 2),
                "total_study_time_minutes": total_study_time,
                "total_study_time_hours": round(total_study_time / 60, 2)
            }
        except Exception as e:
            print(f"Error getting trilha statistics for {trilha_id}: {e}")
            return {}
    async def get_recommended_trilhas_for_user(self, user_id: int, limit: int = 5) -> List[Trilha]:
        """
        Get recommended trilhas for a user based on their profile and progress.
        
        Args:
            user_id: User ID
            limit: Maximum number of recommendations
            
        Returns:
            List of recommended trilhas
        """
        try:
            db = self.get_db()
            
            # Get user's current trilhas to exclude them
            user = db.query(Usuario).options(joinedload(Usuario.trilhas)).filter(Usuario.id == user_id).first()
            if not user:
                return []
            
            enrolled_trilha_ids = [t.id for t in user.trilhas]
            
            # Get trilhas user is not enrolled in
            query = db.query(Trilha)
            if enrolled_trilha_ids:
                query = query.filter(~Trilha.id.in_(enrolled_trilha_ids))
            
            # For now, recommend based on difficulty progression
            # In a real system, this would use ML algorithms
            if user.perfil_aprend:
                if user.perfil_aprend == "beginner":
                    query = query.filter(Trilha.dificuldade.in_(["beginner", "intermediate"]))
                elif user.perfil_aprend == "intermediate":
                    query = query.filter(Trilha.dificuldade.in_(["intermediate", "advanced"]))
                else:  # advanced
                    query = query.filter(Trilha.dificuldade == "advanced")
            
            return query.limit(limit).all()
        except Exception as e:
            print(f"Error getting recommended trilhas for user {user_id}: {e}")
            return []
    
    async def add_conteudo_to_trilha(self, trilha_id: int, conteudo_data: Dict[str, Any]) -> Optional[Conteudo]:
        """
        Add content to a trilha.
        
        Args:
            trilha_id: Trilha ID
            conteudo_data: Content data
            
        Returns:
            Created Conteudo or None if failed
        """
        try:
            db = self.get_db()
            conteudo_data["trilha_id"] = trilha_id
            conteudo = Conteudo(**conteudo_data)
            db.add(conteudo)
            db.commit()
            db.refresh(conteudo)
            return conteudo
        except Exception as e:
            db.rollback()
            print(f"Error adding conteudo to trilha {trilha_id}: {e}")
            return None
    
    async def get_trilhas_by_content_type(self, content_type: str) -> List[Trilha]:
        """
        Get trilhas that contain specific type of content.
        
        Args:
            content_type: Type of content (video, text, quiz, etc.)
            
        Returns:
            List of trilhas containing the specified content type
        """
        try:
            db = self.get_db()
            return db.query(Trilha).join(Conteudo).filter(
                Conteudo.tipo == content_type
            ).distinct().all()
        except Exception as e:
            print(f"Error getting trilhas by content type '{content_type}': {e}")
            return []
    
    async def get_trilha_completion_stats(self, trilha_id: int) -> Dict[str, Any]:
        """
        Get completion statistics for a trilha.
        
        Args:
            trilha_id: Trilha ID
            
        Returns:
            Dictionary with completion statistics
        """
        try:
            db = self.get_db()
            
            # Get all users enrolled in this trilha
            trilha = db.query(Trilha).options(joinedload(Trilha.usuarios)).filter(Trilha.id == trilha_id).first()
            if not trilha:
                return {}
            
            total_users = len(trilha.usuarios)
            if total_users == 0:
                return {"trilha_id": trilha_id, "total_users": 0, "completion_stats": {}}
            
            # Get performance data for all content in this trilha
            desempenhos = db.query(Desempenho).join(Conteudo).filter(
                Conteudo.trilha_id == trilha_id
            ).all()
            
            # Calculate completion statistics
            completed_users = set()
            in_progress_users = set()
            not_started_users = set(user.id for user in trilha.usuarios)
            
            for desempenho in desempenhos:
                user_id = desempenho.usuario_id
                if desempenho.progresso >= 100:
                    completed_users.add(user_id)
                elif desempenho.progresso > 0:
                    in_progress_users.add(user_id)
                
                # Remove from not started if user has any progress
                if desempenho.progresso > 0:
                    not_started_users.discard(user_id)
            
            return {
                "trilha_id": trilha_id,
                "titulo": trilha.titulo,
                "total_users": total_users,
                "completion_stats": {
                    "completed": len(completed_users),
                    "in_progress": len(in_progress_users),
                    "not_started": len(not_started_users),
                    "completion_rate": round(len(completed_users) / total_users * 100, 2),
                    "engagement_rate": round((len(completed_users) + len(in_progress_users)) / total_users * 100, 2)
                }
            }
        except Exception as e:
            print(f"Error getting completion stats for trilha {trilha_id}: {e}")
            return {}
    
    async def get_by_criador(self, criador_id: int) -> List[Trilha]:
        """
        Get all trilhas created by a specific user.
        
        Args:
            criador_id: ID of the user who created the trilhas
            
        Returns:
            List of trilhas created by the user
        """
        try:
            db = self.get_db()
            return db.query(Trilha).filter(
                and_(
                    Trilha.criador_id == criador_id,
                    Trilha.criador_id.isnot(None)
                )
            ).order_by(Trilha.created_at.desc()).all()
        except Exception as e:
            print(f"Error getting trilhas by creator {criador_id}: {e}")
            return []
