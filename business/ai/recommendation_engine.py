"""
AI-powered Recommendation Engine using Gemini API.
Business Logic Layer - AI Package
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from data_access.repositories.usuario_repository import UsuarioRepository
from data_access.repositories.trilha_repository import TrilhaRepository
from data_access.repositories.desempenho_repository import DesempenhoRepository
from infrastructure.integration.gemini_client import gemini_client
from infrastructure.integration.message_queue import analytics_service

class RecommendationEngine:
    """
    AI-powered recommendation engine using Google Gemini.
    Implements intelligent recommendations from the AI Package.
    """
    
    def __init__(self):
        self.usuario_repository = UsuarioRepository()
        self.trilha_repository = TrilhaRepository()
        self.desempenho_repository = DesempenhoRepository()
    
    async def generate_personalized_recommendations(self, user_id: int) -> Dict[str, Any]:
        """
        Gera recomendações personalizadas de aprendizado usando IA.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Recomendações geradas pela IA
        """
        try:
            user_data = await self._collect_user_data(user_id)
            if not user_data["success"]:
                return user_data
            
            ai_recommendations = await gemini_client.generate_learning_recommendations(
                user_data["profile"],
                user_data["learning_history"]
            )
            
            structured_recommendations = await self._process_ai_recommendations(
                user_id, ai_recommendations, user_data
            )
            
            await analytics_service.track_event(
                "ai_recommendations_generated",
                user_id,
                {
                    "recommendation_count": len(structured_recommendations.get("recommendations", [])),
                    "ai_model": "gemini-pro"
                }
            )
            
            return {
                "success": True,
                "user_id": user_id,
                "ai_recommendations": ai_recommendations,
                "structured_recommendations": structured_recommendations,
                "generated_at": datetime.utcnow().isoformat(),
                "model_used": "gemini-pro"
            }
        except Exception as e:
            print(f"Error generating personalized recommendations: {e}")
            return {"success": False, "error": "Failed to generate recommendations"}
    
    async def _collect_user_data(self, user_id: int) -> Dict[str, Any]:
        """
        Coleta dados abrangentes do usuário para análise pela IA.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Dicionário com dados do usuário
        """
        try:
            user = await self.usuario_repository.get_with_trilhas(user_id)
            if not user:
                return {"success": False, "error": "Usuário não encontrado"}
            
            analytics = await self.desempenho_repository.get_learning_analytics(user_id, days=30)
            
            recent_performance = await self.desempenho_repository.get_user_performance(user_id, limit=20)
            
            user_profile = {
                "nome": user.nome,
                "email": user.email,
                "perfil_aprend": user.perfil_aprend,
                "enrolled_trilhas_count": len(user.trilhas),
                "enrolled_trilhas": [
                    {
                        "titulo": trilha.titulo,
                        "dificuldade": trilha.dificuldade
                    }
                    for trilha in user.trilhas
                ],
                "learning_analytics": analytics
            }
            
            learning_history = []
            for desempenho in recent_performance:
                if hasattr(desempenho, 'conteudo') and desempenho.conteudo:
                    learning_history.append({
                        "titulo": desempenho.conteudo.titulo,
                        "tipo": desempenho.conteudo.tipo,
                        "progresso": desempenho.progresso,
                        "nota": desempenho.nota,
                        "tempo_estudo": desempenho.tempo_estudo,
                        "updated_at": desempenho.updated_at.isoformat() if desempenho.updated_at else None
                    })
            
            return {
                "success": True,
                "profile": user_profile,
                "learning_history": learning_history
            }
        except Exception as e:
            print(f"Error collecting user data: {e}")
            return {"success": False, "error": "Failed to collect user data"}
    
    async def _process_ai_recommendations(self, user_id: int, ai_text: str, user_data: Dict) -> Dict[str, Any]:
        """
        Processa texto gerado pela IA em recomendações estruturadas de materiais.
        
        Args:
            user_id: ID do usuário
            ai_text: Texto de recomendação gerado pela IA (formato JSON)
            user_data: Dados do usuário usados para geração
            
        Returns:
            Recomendações estruturadas com materiais externos
        """
        try:
            import json
            import re
            import urllib.parse
            from urllib.parse import urlparse
            
            ai_recommendations_data = None
            try:
                json_match = re.search(r'\{.*\}', ai_text, re.DOTALL)
                if json_match:
                    ai_recommendations_data = json.loads(json_match.group())
                else:
                    ai_recommendations_data = json.loads(ai_text)
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"Erro ao processar resposta JSON da IA: {e}")
                print(f"Texto da resposta: {ai_text[:500]}")
                ai_recommendations_data = None
            
            recommendations = []
            
            if ai_recommendations_data and "material_recommendations" in ai_recommendations_data:
                ai_materials = ai_recommendations_data["material_recommendations"]
                
                for ai_material in ai_materials:
                    material_type = ai_material.get("type", "material").lower()
                    material_title = ai_material.get("title", "Material recomendado")
                    
                    search_terms = ai_material.get("search_terms", "").strip()
                    if not search_terms or len(search_terms) < 3:
                        search_terms = material_title
                        if material_type == "youtube":
                            search_terms = f"{material_title} tutorial"
                        elif material_type == "course":
                            search_terms = f"{material_title} curso gratuito"
                    
                    material_url = ai_material.get("url", "").strip()
                    
                    is_valid_url = False
                    if material_url:
                        if material_url.startswith(("http://", "https://")):
                            try:
                                parsed = urlparse(material_url)
                                if parsed.netloc:
                                    is_valid_url = True
                            except:
                                is_valid_url = False
                    
                    if not is_valid_url:
                        encoded_terms = urllib.parse.quote_plus(search_terms)
                        
                        if material_type == "youtube":
                            material_url = f"https://www.youtube.com/results?search_query={encoded_terms}"
                        elif material_type == "course":
                            material_url = f"https://www.google.com/search?q={encoded_terms}+curso+gratuito"
                        elif material_type in ["article", "documentation"]:
                            material_url = f"https://www.google.com/search?q={encoded_terms}"
                        else:
                            material_url = f"https://www.google.com/search?q={encoded_terms}"
                    
                    recommendation = {
                        "type": material_type,
                        "title": material_title,
                        "description": ai_material.get("description", ""),
                        "reason": ai_material.get("reason", "Recomendado com base no seu perfil de aprendizado"),
                        "url": material_url,
                        "search_terms": search_terms,
                        "difficulty": ai_material.get("difficulty", "intermediario"),
                        "estimated_time": ai_material.get("estimated_time", "N/A"),
                        "free": ai_material.get("free", True),
                        "confidence": ai_material.get("confidence", 0.8),
                        "source": "ai_personalized"
                    }
                    
                    recommendations.append(recommendation)
            
            if len(recommendations) < 3:
                user_profile = user_data["profile"]
                difficulty_level = user_profile.get("perfil_aprend", "beginner")
                
                difficulty_map = {
                    "beginner": "iniciante",
                    "intermediate": "intermediario",
                    "advanced": "avancado",
                    "iniciante": "iniciante",
                    "intermediario": "intermediario",
                    "avancado": "avancado"
                }
                difficulty_pt = difficulty_map.get(difficulty_level, "intermediario")
                
                generic_resources = [
                    {
                        "type": "youtube",
                        "title": f"Cursos gratuitos para nível {difficulty_pt}",
                        "description": "Explore cursos gratuitos no YouTube",
                        "reason": "Recursos gratuitos para complementar seus estudos",
                        "search_terms": f"cursos gratuitos {difficulty_pt}",
                        "difficulty": difficulty_pt,
                        "estimated_time": "Varia",
                        "free": True,
                        "confidence": 0.6,
                        "source": "generic_fallback"
                    },
                    {
                        "type": "course",
                        "title": f"Cursos online gratuitos - Nível {difficulty_pt}",
                        "description": "Encontre cursos gratuitos em plataformas como Coursera, edX, Khan Academy",
                        "reason": "Cursos estruturados para seu nível de aprendizado",
                        "search_terms": f"cursos online gratuitos {difficulty_pt}",
                        "difficulty": difficulty_pt,
                        "estimated_time": "Varia",
                        "free": True,
                        "confidence": 0.6,
                        "source": "generic_fallback"
                    }
                ]
                
                for generic in generic_resources:
                    if len(recommendations) >= 6:
                        break
                    encoded_terms = urllib.parse.quote_plus(generic["search_terms"])
                    if generic["type"] == "youtube":
                        generic["url"] = f"https://www.youtube.com/results?search_query={encoded_terms}"
                    else:
                        generic["url"] = f"https://www.google.com/search?q={encoded_terms}"
                    recommendations.append(generic)
            
            analytics = user_data["profile"].get("learning_analytics", {})
            habit_recommendations = self._generate_habit_recommendations(analytics)
            
            ai_insights = ""
            if ai_recommendations_data:
                ai_insights = ai_recommendations_data.get("general_insights", "") or ai_text
            else:
                ai_insights = ai_text
            
            return {
                "content_recommendations": recommendations[:6],
                "habit_recommendations": habit_recommendations,
                "ai_insights": ai_insights,
                "learning_path_suggestions": ai_recommendations_data.get("learning_path_suggestions", "") if ai_recommendations_data else "",
                "study_schedule": ai_recommendations_data.get("study_schedule", "") if ai_recommendations_data else "",
                "improvement_areas": ai_recommendations_data.get("improvement_areas", "") if ai_recommendations_data else "",
                "total_recommendations": len(recommendations) + len(habit_recommendations)
            }
        except Exception as e:
            print(f"Error processing AI recommendations: {e}")
            import traceback
            traceback.print_exc()
            return {"content_recommendations": [], "habit_recommendations": [], "ai_insights": ai_text}
    
    def _generate_habit_recommendations(self, analytics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Gera recomendações de hábitos de aprendizado baseadas em analytics.
        
        Args:
            analytics: Analytics de aprendizado do usuário
            
        Returns:
            Lista de recomendações de hábitos
        """
        recommendations = []
        
        daily_study_time = analytics.get("daily_average_study_time", 0)
        if daily_study_time < 0.5:
            recommendations.append({
                "type": "study_habit",
                "title": "Aumentar Tempo de Estudo Diário",
                "description": "Tente estudar pelo menos 30 minutos por dia para melhor retenção",
                "current_value": f"{daily_study_time:.1f} horas/dia",
                "target_value": "0.5+ horas/dia",
                "priority": "high"
            })
        
        learning_streak = analytics.get("learning_streak", 0)
        if learning_streak < 3:
            recommendations.append({
                "type": "consistency",
                "title": "Construir Consistência de Aprendizado",
                "description": "Tente aprender algo todos os dias para construir um hábito forte",
                "current_value": f"{learning_streak} dias de sequência",
                "target_value": "7+ dias de sequência",
                "priority": "medium"
            })
        
        completion_rate = analytics.get("completion_rate", 0)
        if completion_rate < 70:
            recommendations.append({
                "type": "completion",
                "title": "Focar em Completar Conteúdo",
                "description": "Tente completar mais conteúdo antes de começar novos tópicos",
                "current_value": f"{completion_rate}% taxa de conclusão",
                "target_value": "80%+ taxa de conclusão",
                "priority": "medium"
            })
        
        return recommendations
    
    async def generate_chatbot_response(self, user_id: int, user_message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate AI chatbot response using Gemini.
        
        Args:
            user_id: User ID
            user_message: User's message/question
            context: Additional context for the conversation
            
        Returns:
            AI-generated response
        """
        try:
            # Get user context
            user = await self.usuario_repository.get_by_id(user_id)
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Prepare context for AI
            conversation_context = {
                "user_name": user.nome,
                "learning_level": user.perfil_aprend,
                "current_course": context.get("current_course") if context else None,
                "conversation_history": context.get("history", []) if context else []
            }
            
            # Generate AI response
            ai_response = await gemini_client.generate_chatbot_response(user_message, conversation_context)
            
            # Track chatbot interaction
            await analytics_service.track_event(
                "chatbot_interaction",
                user_id,
                {
                    "message_length": len(user_message),
                    "response_length": len(ai_response),
                    "context_provided": context is not None
                }
            )
            
            return {
                "success": True,
                "user_id": user_id,
                "user_message": user_message,
                "ai_response": ai_response,
                "context": conversation_context,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Error generating chatbot response: {e}")
            return {"success": False, "error": "Failed to generate response"}
    
    async def analyze_learning_patterns(self, user_id: int) -> Dict[str, Any]:
        """
        Analyze user's learning patterns using AI.
        
        Args:
            user_id: User ID
            
        Returns:
            AI analysis of learning patterns
        """
        try:
            # Collect user data
            user_data = await self._collect_user_data(user_id)
            if not user_data["success"]:
                return user_data
            
            # Prepare analysis prompt
            analysis_prompt = self._build_pattern_analysis_prompt(user_data)
            
            # Get AI analysis
            ai_analysis = await gemini_client.model.generate_content(analysis_prompt)
            
            # Structure the analysis
            structured_analysis = {
                "user_id": user_id,
                "learning_style": self._determine_learning_style(user_data),
                "strengths": self._identify_strengths(user_data),
                "areas_for_improvement": self._identify_improvement_areas(user_data),
                "ai_insights": ai_analysis.text,
                "analysis_date": datetime.utcnow().isoformat()
            }
            
            return {"success": True, "analysis": structured_analysis}
        except Exception as e:
            print(f"Error analyzing learning patterns: {e}")
            return {"success": False, "error": "Failed to analyze learning patterns"}
    
    def _build_pattern_analysis_prompt(self, user_data: Dict) -> str:
        """Build prompt for learning pattern analysis."""
        profile = user_data["profile"]
        history = user_data["learning_history"]
        
        prompt = f"""
        Analyze the following learner's patterns and provide insights:
        
        Learner Profile:
        - Learning Level: {profile.get('perfil_aprend', 'Unknown')}
        - Enrolled Courses: {profile.get('enrolled_trilhas_count', 0)}
        - Analytics: {profile.get('learning_analytics', {})}
        
        Recent Learning History:
        {history[:5]}  # Last 5 activities
        
        Please analyze:
        1. Learning patterns and habits
        2. Preferred content types
        3. Study time patterns
        4. Completion behaviors
        5. Areas of strength and improvement
        
        Provide actionable insights and recommendations.
        """
        
        return prompt
    
    def _determine_learning_style(self, user_data: Dict) -> str:
        """Determine user's learning style based on data."""
        history = user_data["learning_history"]
        if not history:
            return "unknown"
        
        # Analyze content type preferences
        content_types = [item.get("tipo", "") for item in history]
        most_common = max(set(content_types), key=content_types.count) if content_types else "mixed"
        
        return f"{most_common}_oriented" if most_common else "mixed"
    
    def _identify_strengths(self, user_data: Dict) -> List[str]:
        """Identify user's learning strengths."""
        strengths = []
        analytics = user_data["profile"].get("learning_analytics", {})
        
        if analytics.get("completion_rate", 0) > 80:
            strengths.append("High completion rate")
        
        if analytics.get("learning_streak", 0) > 7:
            strengths.append("Consistent learning habit")
        
        if analytics.get("average_grade_all_time", 0) > 85:
            strengths.append("Strong academic performance")
        
        return strengths or ["Engaged learner"]
    
    def _identify_improvement_areas(self, user_data: Dict) -> List[str]:
        """Identify areas for improvement."""
        improvements = []
        analytics = user_data["profile"].get("learning_analytics", {})
        
        if analytics.get("daily_average_study_time", 0) < 0.5:
            improvements.append("Increase daily study time")
        
        if analytics.get("completion_rate", 0) < 60:
            improvements.append("Focus on completing started content")
        
        if analytics.get("learning_streak", 0) < 3:
            improvements.append("Build more consistent learning habits")
        
        return improvements or ["Continue current learning approach"]

