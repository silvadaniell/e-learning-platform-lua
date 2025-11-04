"""
Google Gemini API integration client.
Infrastructure Layer - Integration Package
"""

import google.generativeai as genai
import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
import asyncio
import httpx

load_dotenv()

class GeminiClient:
    """
    Google Gemini API client for AI-powered features.
    Implements external AI service integration.
    """
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
    
    async def generate_content(self, prompt: str) -> str:
        """
        Generate content using Gemini AI with a custom prompt.
        
        Args:
            prompt: The prompt to send to the AI
            
        Returns:
            AI-generated content as text
        """
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return response.text
        except Exception as e:
            print(f"Error generating content: {e}")
            return ""
    
    async def generate_learning_recommendations(self, user_profile: Dict, learning_history: List[Dict]) -> str:
        """
        Generate personalized learning recommendations using Gemini AI.
        
        Args:
            user_profile: User's learning profile and preferences
            learning_history: User's past learning activities and performance
            
        Returns:
            AI-generated recommendations as text
        """
        prompt = self._build_recommendation_prompt(user_profile, learning_history)
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            print("Response: ", response.text)
            return response.text
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return "Unable to generate recommendations at this time. Please try again later."
    
    async def generate_chatbot_response(self, user_question: str, context: Dict) -> str:
        """
        Generate chatbot response using Gemini AI.
        
        Args:
            user_question: User's question or message
            context: Conversation context and user information
            
        Returns:
            AI-generated response
        """
        prompt = self._build_chatbot_prompt(user_question, context)
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return response.text
        except Exception as e:
            print(f"Error generating chatbot response: {e}")
            return "I'm sorry, I'm having trouble understanding right now. Could you please rephrase your question?"
    
    async def generate_quiz_questions(self, topic: str, difficulty: str, module_title: str, count: int = 10) -> Dict:
        """
        Generate quiz questions for a learning module using Gemini AI.
        
        Args:
            topic: Main learning topic
            difficulty: Difficulty level (iniciante, intermediario, avancado)
            module_title: Title of the specific module
            count: Number of questions to generate
            
        Returns:
            Generated questions in structured format
        """
        difficulty_descriptions = {
            "iniciante": "nível iniciante (conceitos básicos, exemplos simples)",
            "intermediario": "nível intermediário (conceitos mais complexos, aplicações práticas)",
            "avancado": "nível avançado (conceitos especializados, cenários complexos)"
        }
        
        difficulty_desc = difficulty_descriptions.get(difficulty, difficulty_descriptions["iniciante"])
        
        prompt = f"""
Crie {count} questões de múltipla escolha sobre "{topic}" com foco em "{module_title}" para {difficulty_desc}.

Cada questão deve ter:
- Uma pergunta clara e objetiva
- 5 alternativas (a, b, c, d, e)
- Apenas uma resposta correta
- Explicação detalhada da resposta correta

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato:
[
  {{
    "pergunta": "Texto da pergunta aqui",
    "alternativas": {{
      "a": "Primeira opção",
      "b": "Segunda opção", 
      "c": "Terceira opção",
      "d": "Quarta opção",
      "e": "Quinta opção"
    }},
    "resposta_correta": "a",
    "explicacao": "Explicação detalhada da resposta correta"
  }}
]

Não inclua texto adicional, apenas o JSON válido com {count} questões.
"""
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return {"questions": response.text, "status": "success"}
        except Exception as e:
            print(f"Error generating quiz questions: {e}")
            return {"questions": None, "status": "error", "error": str(e)}
    
    async def analyze_learning_content(self, content: str, content_type: str) -> Dict:
        """
        Analyze learning content to extract key information and difficulty level.
        
        Args:
            content: The learning content to analyze
            content_type: Type of content (video, text, quiz, etc.)
            
        Returns:
            Analysis results including difficulty, topics, and recommendations
        """
        prompt = f"""
        Analyze the following {content_type} learning content and provide:
        1. Difficulty level (beginner, intermediate, advanced)
        2. Main topics covered
        3. Estimated study time
        4. Prerequisites
        5. Learning objectives
        
        Content: {content[:1000]}...  # Limit content length
        
        Provide the analysis in JSON format.
        """
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return {"analysis": response.text, "status": "success"}
        except Exception as e:
            print(f"Error analyzing content: {e}")
            return {"analysis": "Content analysis unavailable", "status": "error"}
    
    def _build_recommendation_prompt(self, user_profile: Dict, learning_history: List[Dict]) -> str:
        profile_text = f"""
        Perfil do Usuário:
        - Nome: {user_profile.get('nome', 'Desconhecido')}
        - Perfil de Aprendizado: {user_profile.get('perfil_aprend', 'Não especificado')}
        - Email: {user_profile.get('email', 'Não fornecido')}
        - Trilhas Inscritas: {user_profile.get('enrolled_trilhas_count', 0)}
        """
        
        history_text = "Histórico de Aprendizado:\n"
        for item in learning_history[-5:]:
            history_text += f"- {item.get('titulo', 'Desconhecido')}: Progresso {item.get('progresso', 0)}%\n"
        
        analytics = user_profile.get('learning_analytics', {})
        analytics_text = f"""
        Analytics de Aprendizado:
        - Taxa de Conclusão: {analytics.get('completion_rate', 0)}%
        - Sequência de Dias: {analytics.get('learning_streak', 0)} dias
        - Tempo Médio de Estudo: {analytics.get('daily_average_study_time', 0)} horas/dia
        """
        
        prompt = f"""
        Você é um assistente de aprendizado IA para uma plataforma de e-learning. Com base no perfil e histórico do usuário,
        recomende materiais de aprendizado EXTERNOS (recursos gratuitos, vídeos do YouTube, cursos online, artigos, etc.)
        que o usuário possa procurar e estudar.
        
        {profile_text}
        
        {history_text}
        
        {analytics_text}
        
        IMPORTANTE: Retorne um objeto JSON com a seguinte estrutura:
        {{
            "material_recommendations": [
                {{
                    "title": "Título/Nome do material recomendado",
                    "type": "youtube|course|article|documentation|video|ebook|tutorial",
                    "description": "Breve descrição do que este material cobre",
                    "reason": "Por que isso é recomendado para este usuário baseado no perfil e histórico",
                    "url": "APENAS se você tiver uma URL específica e verificada que existe. Caso contrário, deixe vazio ou omita este campo.",
                    "search_terms": "OBRIGATÓRIO: Termos de busca específicos para encontrar este material (ex: 'tutorial Python programação', 'documentação React', 'curso JavaScript gratuito'). Sempre forneça este campo.",
                    "difficulty": "iniciante|intermediario|avancado",
                    "estimated_time": "Tempo estimado para completar (ex: '2 horas', '1 curso completo', '30 minutos')",
                    "free": true,
                    "confidence": 0.85
                }}
            ],
            "learning_path_suggestions": "Texto breve sobre sugestões de caminhos de aprendizado",
            "study_schedule": "Texto breve sobre recomendações de cronograma de estudos",
            "improvement_areas": "Texto breve sobre áreas de melhoria",
            "general_insights": "Insights gerais personalizados sobre o aprendizado do usuário"
        }}
        
        Forneça 4-6 recomendações específicas de materiais externos baseadas em:
        1. Nível atual de aprendizado do usuário ({user_profile.get('perfil_aprend', 'beginner')})
        2. Seu histórico de aprendizado e progresso
        3. Seus padrões de conclusão e hábitos de estudo
        4. Seus analytics de aprendizado
        
        Foque em:
        - Recursos gratuitos disponíveis na internet (YouTube, cursos gratuitos, artigos, documentação)
        - Materiais que complementam o que eles já estão aprendendo
        - Recursos apropriados para seu nível de habilidade
        - Mix de diferentes tipos: vídeos, cursos, artigos, tutoriais
        
        REGRAS IMPORTANTES:
        - SEMPRE forneça o campo "search_terms" com termos específicos e pesquisáveis
        - Inclua o campo "url" apenas se tiver 100% de certeza de que a URL existe e é acessível
        - Se não tiver certeza sobre uma URL, deixe vazio e confie em search_terms
        - Para YouTube: Forneça termos de busca como "tutorial Python para iniciantes", "curso React", etc.
        - Para cursos: Forneça termos de busca como "curso JavaScript gratuito", "curso programação Python", etc.
        - Para artigos/documentação: Forneça termos de busca como "documentação oficial React", "documentação Python", etc.
        - Torne os termos de busca específicos e acionáveis (2-5 palavras, tópico claro)
        
        Faça recomendações específicas e personalizadas. Prefira search_terms em vez de URLs para garantir que os usuários sempre possam encontrar o material.
        Retorne APENAS JSON válido, sem texto adicional.
        """
        
        return prompt
    
    def _build_chatbot_prompt(self, user_question: str, context: Dict) -> str:
        """Build prompt for chatbot responses."""
        context_text = f"""
        Context:
        - User: {context.get('user_name', 'Student')}
        - Current Course: {context.get('current_course', 'None')}
        - Learning Level: {context.get('level', 'Beginner')}
        """
        
        prompt = f"""
        You are a helpful AI assistant for an e-learning platform. Answer the user's question in a friendly, 
        educational manner. Provide clear, concise, and helpful responses.
        
        {context_text}
        
        User Question: {user_question}
        
        Provide a helpful response that encourages learning and provides actionable advice when possible.
        """
        
        return prompt

class APIGateway:
    """
    API Gateway for external service integrations.
    Manages communication with external APIs and services.
    """
    
    def __init__(self):
        self.base_timeout = 30.0
        self.max_retries = 3
    
    async def make_external_request(self, url: str, method: str = "GET", data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict:
        """
        Make HTTP request to external APIs with retry logic.
        
        Args:
            url: Target URL
            method: HTTP method
            data: Request data
            headers: Request headers
            
        Returns:
            Response data
        """
        async with httpx.AsyncClient(timeout=self.base_timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    if method.upper() == "GET":
                        response = await client.get(url, headers=headers)
                    elif method.upper() == "POST":
                        response = await client.post(url, json=data, headers=headers)
                    elif method.upper() == "PUT":
                        response = await client.put(url, json=data, headers=headers)
                    else:
                        raise ValueError(f"Unsupported HTTP method: {method}")
                    
                    response.raise_for_status()
                    return {"data": response.json(), "status": "success"}
                    
                except httpx.RequestError as e:
                    if attempt == self.max_retries - 1:
                        return {"error": str(e), "status": "error"}
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    
                except httpx.HTTPStatusError as e:
                    return {"error": f"HTTP {e.response.status_code}: {e.response.text}", "status": "error"}

# Global instances
gemini_client = GeminiClient()
api_gateway = APIGateway()
