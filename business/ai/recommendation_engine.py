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
        Generate AI-powered personalized learning recommendations.
        
        Args:
            user_id: User ID
            
        Returns:
            AI-generated recommendations
        """
        try:
            # Gather user data
            user_data = await self._collect_user_data(user_id)
            if not user_data["success"]:
                return user_data
            
            # Generate AI recommendations
            ai_recommendations = await gemini_client.generate_learning_recommendations(
                user_data["profile"],
                user_data["learning_history"]
            )
            
            # Process and structure recommendations
            structured_recommendations = await self._process_ai_recommendations(
                user_id, ai_recommendations, user_data
            )
            
            # Track recommendation generation
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
        Collect comprehensive user data for AI analysis.
        
        Args:
            user_id: User ID
            
        Returns:
            User data dictionary
        """
        try:
            # Get user profile
            user = await self.usuario_repository.get_with_trilhas(user_id)
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Get learning analytics
            analytics = await self.desempenho_repository.get_learning_analytics(user_id, days=30)
            
            # Get recent performance data
            recent_performance = await self.desempenho_repository.get_user_performance(user_id, limit=20)
            
            # Structure user profile for AI
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
            
            # Structure learning history for AI
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
        Process AI-generated text into structured recommendations.
        
        Args:
            user_id: User ID
            ai_text: AI-generated recommendation text
            user_data: User data used for generation
            
        Returns:
            Structured recommendations
        """
        try:
            # Parse AI recommendations and match with available content
            available_trilhas = await self.trilha_repository.get_recommended_trilhas_for_user(user_id, limit=10)
            popular_trilhas = await self.trilha_repository.get_popular_trilhas(limit=5)
            
            # Create structured recommendations
            recommendations = []
            
            # Add trilha recommendations based on user profile
            user_profile = user_data["profile"]
            difficulty_level = user_profile.get("perfil_aprend", "beginner")
            
            for trilha in available_trilhas[:3]:  # Top 3 recommendations
                recommendations.append({
                    "type": "trilha",
                    "id": trilha.id,
                    "titulo": trilha.titulo,
                    "dificuldade": trilha.dificuldade,
                    "reason": f"Matches your {difficulty_level} learning profile",
                    "confidence": 0.85,
                    "source": "ai_analysis"
                })
            
            # Add popular content recommendations
            for popular in popular_trilhas[:2]:  # Top 2 popular
                if popular["trilha"].id not in [r["id"] for r in recommendations]:
                    recommendations.append({
                        "type": "trilha",
                        "id": popular["trilha"].id,
                        "titulo": popular["trilha"].titulo,
                        "dificuldade": popular["trilha"].dificuldade,
                        "reason": f"Popular choice with {popular['enrollment_count']} enrollments",
                        "confidence": 0.75,
                        "source": "popularity_based"
                    })
            
            # Add learning habit recommendations based on analytics
            analytics = user_data["profile"].get("learning_analytics", {})
            habit_recommendations = self._generate_habit_recommendations(analytics)
            
            return {
                "content_recommendations": recommendations,
                "habit_recommendations": habit_recommendations,
                "ai_insights": ai_text,
                "total_recommendations": len(recommendations) + len(habit_recommendations)
            }
        except Exception as e:
            print(f"Error processing AI recommendations: {e}")
            return {"content_recommendations": [], "habit_recommendations": [], "ai_insights": ai_text}
    
    def _generate_habit_recommendations(self, analytics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate learning habit recommendations based on analytics.
        
        Args:
            analytics: User learning analytics
            
        Returns:
            List of habit recommendations
        """
        recommendations = []
        
        # Study time recommendations
        daily_study_time = analytics.get("daily_average_study_time", 0)
        if daily_study_time < 0.5:  # Less than 30 minutes
            recommendations.append({
                "type": "study_habit",
                "title": "Increase Daily Study Time",
                "description": "Try to study for at least 30 minutes daily for better retention",
                "current_value": f"{daily_study_time:.1f} hours/day",
                "target_value": "0.5+ hours/day",
                "priority": "high"
            })
        
        # Consistency recommendations
        learning_streak = analytics.get("learning_streak", 0)
        if learning_streak < 3:
            recommendations.append({
                "type": "consistency",
                "title": "Build Learning Consistency",
                "description": "Try to learn something every day to build a strong habit",
                "current_value": f"{learning_streak} day streak",
                "target_value": "7+ day streak",
                "priority": "medium"
            })
        
        # Completion rate recommendations
        completion_rate = analytics.get("completion_rate", 0)
        if completion_rate < 70:
            recommendations.append({
                "type": "completion",
                "title": "Focus on Completing Content",
                "description": "Try to complete more content before starting new topics",
                "current_value": f"{completion_rate}% completion rate",
                "target_value": "80%+ completion rate",
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
