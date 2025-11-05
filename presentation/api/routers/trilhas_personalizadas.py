"""
Trilhas Personalizadas (Custom Learning Paths) API endpoints.
Presentation Layer - API Package
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
from presentation.api.schemas.user_schemas import APIResponse
from lua_bridge.lua_engine import get_lua_engine
from infrastructure.integration.gemini_client import gemini_client
import json
import asyncio
import sys

router = APIRouter()

@router.get("/module/{module_id}/questions", response_model=APIResponse)
async def get_module_questions(module_id: int):
    try:
        from data_access.repositories.questao_repository import QuestaoRepository
        import json
        
        questao_repo = QuestaoRepository()
        
        # Buscar questões salvas do módulo
        saved_questions = await questao_repo.get_by_conteudo_id(module_id)
        
        if saved_questions and len(saved_questions) > 0:
            # Converter questões do banco para o formato esperado pelo frontend
            questions = []
            for questao in saved_questions:
                # Parsear alternativas do JSON
                alternatives_dict = json.loads(questao.alternativas)
                alternatives = [
                    {"letter": letter, "text": text}
                    for letter, text in alternatives_dict.items()
                ]
                
                question = {
                    "id": questao.id,
                    "question": questao.pergunta,
                    "alternatives": alternatives,
                    "correct_answer": questao.resposta_correta,
                    "explanation": questao.explicacao or ""
                }
                questions.append(question)
            
            return APIResponse(
                success=True,
                message="Questões carregadas com sucesso",
                data={
                    "questions": questions,
                    "module_id": module_id,
                    "total_questions": len(questions),
                    "from_database": True
                }
            )
        else:
            # Nenhuma questão salva encontrada
            return APIResponse(
                success=True,
                message="Nenhuma questão encontrada para este módulo",
                data={
                    "questions": [],
                    "module_id": module_id,
                    "total_questions": 0,
                    "from_database": False
                }
            )
        
    except Exception as e:
        print(f"Error getting module questions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar questões: {str(e)}")

@router.post("/quiz/generate", response_model=APIResponse)
async def generate_quiz_questions(request: dict):
    """
    Generate quiz questions for a module using AI.
    NOTE: This endpoint is now deprecated in favor of using saved questions.
    It will be kept for fallback scenarios.
    """
    try:
        trilha_id = request.get('trilha_id')
        module_id = request.get('module_id')
        topic = request.get('topic', 'Programação')
        difficulty = request.get('difficulty', 'iniciante')
        count = request.get('count', 10)
        
        # Primeiro, tentar buscar questões salvas do banco
        if module_id:
            from data_access.repositories.questao_repository import QuestaoRepository
            import json
            
            questao_repo = QuestaoRepository()
            saved_questions = await questao_repo.get_by_conteudo_id(module_id)
            
            if saved_questions and len(saved_questions) > 0:
                print(f"Questões encontradas no banco para módulo {module_id}: {len(saved_questions)} questões")
                # Converter questões do banco para o formato esperado
                questions = []
                for questao in saved_questions:
                    alternatives_dict = json.loads(questao.alternativas)
                    alternatives = [
                        {"letter": letter, "text": text}
                        for letter, text in alternatives_dict.items()
                    ]
                    
                    question = {
                        "id": questao.id,
                        "question": questao.pergunta,
                        "alternatives": alternatives,
                        "correct_answer": questao.resposta_correta,
                        "explanation": questao.explicacao or ""
                    }
                    questions.append(question)
                
                return APIResponse(
                    success=True,
                    message="Questões carregadas do banco de dados",
                    data={
                        "questions": questions,
                        "module_id": module_id,
                        "trilha_id": trilha_id,
                        "topic": topic,
                        "difficulty": difficulty,
                        "total_questions": len(questions),
                        "from_database": True
                    }
                )
            else:
                print(f"Nenhuma questão encontrada no banco para módulo {module_id}, gerando novas...")
        
        # Se não encontrou questões salvas, gerar novas e salvar no banco
        print(f"Gerando {count} questões para módulo {module_id} com tópico '{topic}' e dificuldade '{difficulty}'")
        
        # Importar repositório antes de gerar questões
        from data_access.repositories.questao_repository import QuestaoRepository
        import json
        
        questao_repo = QuestaoRepository()
        
        # Verificar novamente se questões foram criadas entre a primeira verificação e agora (evitar race condition)
        if module_id:
            existing_count = await questao_repo.count_by_conteudo_id(module_id)
            if existing_count > 0:
                print(f"Questões foram criadas entre verificações para módulo {module_id}, carregando do banco...")
                saved_questions = await questao_repo.get_by_conteudo_id(module_id)
                if saved_questions and len(saved_questions) > 0:
                    questions = []
                    for questao in saved_questions:
                        alternatives_dict = json.loads(questao.alternativas)
                        alternatives = [
                            {"letter": letter, "text": text}
                            for letter, text in alternatives_dict.items()
                        ]
                        question = {
                            "id": questao.id,
                            "question": questao.pergunta,
                            "alternatives": alternatives,
                            "correct_answer": questao.resposta_correta,
                            "explanation": questao.explicacao or ""
                        }
                        questions.append(question)
                    
                    return APIResponse(
                        success=True,
                        message="Questões carregadas do banco de dados",
                        data={
                            "questions": questions,
                            "module_id": module_id,
                            "trilha_id": trilha_id,
                            "topic": topic,
                            "difficulty": difficulty,
                            "total_questions": len(questions),
                            "from_database": True
                        }
                    )
        
        # Gerar questões
        try:
            questions = await generate_questions_with_llm(topic, difficulty, count)
            print(f"Questões geradas pela IA: {len(questions)} questões")
        except Exception as e:
            print(f"Erro ao gerar questões com LLM: {e}")
            # Fallback para questões melhoradas
            questions = generate_improved_mock_questions(topic, difficulty, count)
            print(f"Usando questões mock como fallback: {len(questions)} questões")
        
        # Salvar questões geradas no banco de dados ANTES de retornar (se module_id foi fornecido)
        if module_id and questions:
            try:
                # Verificar uma última vez antes de salvar (evitar duplicação)
                existing_count = await questao_repo.count_by_conteudo_id(module_id)
                print(f"Verificando questões existentes antes de salvar para módulo {module_id}: {existing_count} questões encontradas")
                
                if existing_count == 0:
                    print(f"Salvando {len(questions)} questões no banco para módulo {module_id}...")
                    # Salvar questões no banco de dados
                    questions_to_save = []
                    for idx, question in enumerate(questions, 1):
                        # Converter alternativas para JSON string
                        alternatives_dict = {alt["letter"]: alt["text"] for alt in question["alternatives"]}
                        alternatives_json = json.dumps(alternatives_dict, ensure_ascii=False)
                        
                        question_data = {
                            "conteudo_id": module_id,
                            "pergunta": question["question"],
                            "alternativas": alternatives_json,
                            "resposta_correta": question["correct_answer"],
                            "explicacao": question.get("explanation", ""),
                            "ordem": idx
                        }
                        questions_to_save.append(question_data)
                    
                    # Salvar todas as questões do módulo
                    if questions_to_save:
                        saved_questions = await questao_repo.create_batch(questions_to_save)
                        print(f"✓ Salvas {len(saved_questions)} questões para módulo {module_id}")
                        
                        # Verificar se salvou corretamente
                        verify_count = await questao_repo.count_by_conteudo_id(module_id)
                        print(f"✓ Verificação: {verify_count} questões agora no banco para módulo {module_id}")
                else:
                    print(f"Questões já existem para módulo {module_id}, não salvando duplicatas")
            except Exception as e:
                print(f"Erro ao salvar questões no banco: {e}")
                import traceback
                traceback.print_exc()
                # Continuar mesmo se falhar ao salvar (mas logar o erro)
        
        return APIResponse(
            success=True,
            message="Questões geradas com sucesso",
            data={
                "questions": questions,
                "module_id": module_id,
                "trilha_id": trilha_id,
                "topic": topic,
                "difficulty": difficulty,
                "total_questions": len(questions),
                "from_database": False
            }
        )
        
    except Exception as e:
        print(f"Error generating quiz questions: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar questões do quiz")

# Generate questions using LLM
async def generate_questions_with_llm(topic: str, difficulty: str, count: int):
    """Generate high-quality questions using Gemini AI"""
    
    difficulty_map = {
        "iniciante": "básico",
        "intermediario": "intermediário", 
        "avancado": "avançado"
    }
    
    difficulty_pt = difficulty_map.get(difficulty, difficulty)
    
    prompt = f"""Crie {count} questões de múltipla escolha sobre "{topic}" para nível {difficulty_pt}.

FORMATO EXATO para cada questão:
QUESTÃO: [pergunta clara e específica]
A) [alternativa]
B) [alternativa] 
C) [alternativa]
D) [alternativa]
E) [alternativa]
RESPOSTA: [letra da resposta correta]
EXPLICAÇÃO: [explicação detalhada da resposta]

REGRAS:
- Questões práticas e específicas sobre {topic}
- Uma alternativa correta e quatro incorretas plausíveis
- Explicações educativas de 2-3 linhas
- Linguagem clara e objetiva
- Foque em conceitos importantes de {topic}

Exemplo para Python básico:
QUESTÃO: Qual é a forma correta de declarar uma variável em Python?
A) var nome = "João"
B) nome = "João"
C) string nome = "João"
D) let nome = "João"
E) declare nome = "João"
RESPOSTA: B
EXPLICAÇÃO: Em Python, variáveis são declaradas simplesmente atribuindo um valor, sem necessidade de palavras-chave como 'var' ou declaração de tipo.

Agora crie {count} questões sobre {topic}:"""

    try:
        llm_response = await gemini_client.generate_content(prompt)
        
        if llm_response and len(llm_response.strip()) > 0:
            questions = parse_llm_questions(llm_response, count)
            if len(questions) > 0:
                return questions
        
        # Se não conseguiu parsear, usar fallback
        raise Exception("Não foi possível parsear as questões da LLM")
        
    except Exception as e:
        print(f"Erro na LLM: {e}")
        raise e

# Parse LLM response into structured questions
def parse_llm_questions(llm_response: str, expected_count: int):
    """Parse the LLM response into structured question format"""
    questions = []
    
    try:
        # Split by QUESTÃO: to get individual questions
        parts = llm_response.split("QUESTÃO:")
        
        for i, part in enumerate(parts[1:], 1):  # Skip first empty part
            if i > expected_count:
                break
                
            lines = [line.strip() for line in part.strip().split('\n') if line.strip()]
            
            if len(lines) < 7:  # Need at least question + 5 alternatives + answer + explanation
                continue
                
            # Extract question
            question_text = lines[0]
            
            # Extract alternatives
            alternatives = []
            answer_line_idx = -1
            
            for j, line in enumerate(lines[1:], 1):
                if line.startswith(('A)', 'B)', 'C)', 'D)', 'E)')):
                    letter = line[0].lower()
                    text = line[3:].strip()  # Remove "A) "
                    alternatives.append({"letter": letter, "text": text})
                elif line.startswith('RESPOSTA:'):
                    answer_line_idx = j
                    break
            
            if len(alternatives) != 5 or answer_line_idx == -1:
                continue
                
            # Extract correct answer
            answer_line = lines[answer_line_idx]
            correct_answer = answer_line.replace('RESPOSTA:', '').strip().lower()
            
            # Extract explanation
            explanation = ""
            for k in range(answer_line_idx + 1, len(lines)):
                if lines[k].startswith('EXPLICAÇÃO:'):
                    explanation = lines[k].replace('EXPLICAÇÃO:', '').strip()
                    # Include next lines if they're part of explanation
                    for m in range(k + 1, len(lines)):
                        if not lines[m].startswith(('QUESTÃO:', 'A)', 'B)', 'C)', 'D)', 'E)', 'RESPOSTA:')):
                            explanation += " " + lines[m]
                        else:
                            break
                    break
            
            if explanation and correct_answer in ['a', 'b', 'c', 'd', 'e']:
                question = {
                    "id": i,
                    "question": question_text,
                    "alternatives": alternatives,
                    "correct_answer": correct_answer,
                    "explanation": explanation
                }
                questions.append(question)
    
    except Exception as e:
        print(f"Erro ao parsear questões: {e}")
        
    return questions

# Generate improved mock questions as fallback
def generate_improved_mock_questions(topic: str, difficulty: str, count: int):
    """Generate better mock questions based on topic and difficulty"""
    
    # Question templates based on topic
    templates = {
        "python": [
            {
                "question": "Qual é a forma correta de criar uma lista em Python?",
                "alternatives": [
                    {"letter": "a", "text": "lista = []"},
                    {"letter": "b", "text": "lista = {}"},
                    {"letter": "c", "text": "lista = ()"},
                    {"letter": "d", "text": "lista = new List()"},
                    {"letter": "e", "text": "lista = array()"}
                ],
                "correct": "a",
                "explanation": "Em Python, listas são criadas usando colchetes []. Chaves {} criam dicionários, parênteses () criam tuplas."
            },
            {
                "question": "Como você imprime 'Olá Mundo' em Python?",
                "alternatives": [
                    {"letter": "a", "text": "print('Olá Mundo')"},
                    {"letter": "b", "text": "console.log('Olá Mundo')"},
                    {"letter": "c", "text": "echo 'Olá Mundo'"},
                    {"letter": "d", "text": "System.out.println('Olá Mundo')"},
                    {"letter": "e", "text": "printf('Olá Mundo')"}
                ],
                "correct": "a",
                "explanation": "A função print() é usada em Python para exibir texto na tela. As outras opções são de linguagens diferentes."
            },
            {
                "question": "Qual é o resultado de len([1, 2, 3, 4, 5]) em Python?",
                "alternatives": [
                    {"letter": "a", "text": "5"},
                    {"letter": "b", "text": "4"},
                    {"letter": "c", "text": "15"},
                    {"letter": "d", "text": "Erro"},
                    {"letter": "e", "text": "[1, 2, 3, 4, 5]"}
                ],
                "correct": "a",
                "explanation": "A função len() retorna o número de elementos em uma sequência. A lista tem 5 elementos, então len() retorna 5."
            },
            {
                "question": "Como comentar uma linha em Python?",
                "alternatives": [
                    {"letter": "a", "text": "# Este é um comentário"},
                    {"letter": "b", "text": "// Este é um comentário"},
                    {"letter": "c", "text": "/* Este é um comentário */"},
                    {"letter": "d", "text": "<!-- Este é um comentário -->"},
                    {"letter": "e", "text": "-- Este é um comentário"}
                ],
                "correct": "a",
                "explanation": "Em Python, comentários de linha única começam com #. As outras sintaxes são de outras linguagens de programação."
            }
        ],
        "javascript": [
            {
                "question": "Como declarar uma variável em JavaScript ES6+?",
                "alternatives": [
                    {"letter": "a", "text": "let variavel = 'valor'"},
                    {"letter": "b", "text": "variable variavel = 'valor'"},
                    {"letter": "c", "text": "variavel = 'valor'"},
                    {"letter": "d", "text": "string variavel = 'valor'"},
                    {"letter": "e", "text": "declare variavel = 'valor'"}
                ],
                "correct": "a",
                "explanation": "Em JavaScript ES6+, usamos 'let' ou 'const' para declarar variáveis com escopo de bloco."
            },
            {
                "question": "Qual será o resultado de console.log(typeof null) em JavaScript?",
                "alternatives": [
                    {"letter": "a", "text": "'object'"},
                    {"letter": "b", "text": "'null'"},
                    {"letter": "c", "text": "'undefined'"},
                    {"letter": "d", "text": "'boolean'"},
                    {"letter": "e", "text": "'string'"}
                ],
                "correct": "a",
                "explanation": "Em JavaScript, typeof null retorna 'object'. Isso é considerado um bug histórico da linguagem que foi mantido por compatibilidade."
            },
            {
                "question": "Como criar um array em JavaScript?",
                "alternatives": [
                    {"letter": "a", "text": "let arr = []"},
                    {"letter": "b", "text": "let arr = {}"},
                    {"letter": "c", "text": "let arr = ()"},
                    {"letter": "d", "text": "let arr = new Array"},
                    {"letter": "e", "text": "let arr = list()"}
                ],
                "correct": "a",
                "explanation": "Arrays em JavaScript são criados usando colchetes [] ou o construtor new Array(). A forma mais comum e recomendada é usar []."
            }
        ],
        "default": [
            {
                "question": f"Qual é um conceito fundamental em {topic}?",
                "alternatives": [
                    {"letter": "a", "text": f"Entender os princípios básicos de {topic}"},
                    {"letter": "b", "text": "Ignorar a documentação"},
                    {"letter": "c", "text": "Copiar código sem entender"},
                    {"letter": "d", "text": "Pular os fundamentos"},
                    {"letter": "e", "text": "Não praticar"}
                ],
                "correct": "a",
                "explanation": f"É essencial entender os princípios básicos de {topic} antes de avançar para conceitos mais complexos."
            }
        ]
    }
    
    # Determine which template set to use
    topic_lower = topic.lower()
    if "python" in topic_lower:
        question_set = templates["python"]
    elif "javascript" in topic_lower:
        question_set = templates["javascript"]
    else:
        question_set = templates["default"]
    
    questions = []
    for i in range(count):
        template_idx = i % len(question_set)
        template = question_set[template_idx]
        
        question = {
            "id": i + 1,
            "question": template["question"],
            "alternatives": template["alternatives"],
            "correct_answer": template["correct"],
            "explanation": template["explanation"]
        }
        questions.append(question)
    
    return questions

# Pydantic schemas for trilhas personalizadas
class TrilhaPersonalizadaRequest(BaseModel):
    """Request model for creating personalized learning paths"""
    user_id: int = Field(..., description="ID do usuário")
    topic: str = Field(..., min_length=5, max_length=500, description="Tópico que deseja aprender")
    difficulty: str = Field(..., description="Nível de dificuldade: iniciante, intermediario, avancado")

class QuizSessionRequest(BaseModel):
    """Request model for starting a quiz session"""
    user_id: int = Field(..., description="ID do usuário")
    module_id: int = Field(..., description="ID do módulo/conteúdo")

class QuizAnswerRequest(BaseModel):
    """Request model for submitting quiz answers"""
    user_id: int = Field(..., description="ID do usuário")
    question_id: int = Field(..., description="ID da questão")
    selected_answer: str = Field(..., pattern="^[abcde]$", description="Resposta selecionada (a, b, c, d, e)")

@router.post("/create", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_trilha_personalizada(request: TrilhaPersonalizadaRequest):
    """
    Criar uma nova trilha de aprendizado personalizada usando IA.
    
    - **user_id**: ID do usuário que está criando a trilha
    - **topic**: Tópico que o usuário deseja aprender (ex: "conceitos fundamentais da linguagem Python")
    - **difficulty**: Nível de dificuldade (iniciante, intermediario, avancado)
    
    O sistema irá:
    1. Gerar estrutura da trilha usando Lua business logic
    2. Criar módulos de aprendizado com quizzes
    3. Usar IA (Gemini) para gerar questões personalizadas
    4. Inscrever automaticamente o usuário na trilha
    """
    try:
        from data_access.repositories.trilha_repository import TrilhaRepository
        from data_access.repositories.usuario_repository import UsuarioRepository
        
        trilha_repo = TrilhaRepository()
        usuario_repo = UsuarioRepository()
        
        # Verificar se o usuário existe
        usuario = await usuario_repo.get_by_id(request.user_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Timestamp atual
        import time
        current_time = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Gerar estrutura da trilha
        difficulty_labels = {
            "iniciante": "Fundamentos",
            "intermediario": "Intermediário",
            "avancado": "Avançado"
        }
        
        # Map difficulty to database format
        difficulty_map = {
            "iniciante": "beginner",
            "intermediario": "intermediate",
            "avancado": "advanced"
        }
        
        modules_count = {
            "iniciante": 3,
            "intermediario": 4,
            "avancado": 5
        }
        
        # Melhorar/corrigir o título da trilha (versão simples + LLM como fallback)
        def improve_title_simple(topic):
            """Correções básicas de títulos comuns"""
            corrections = {
                'phyton': 'Python',
                'pyton': 'Python', 
                'python': 'Python',
                'java script': 'JavaScript',
                'javascript': 'JavaScript',
                'html': 'HTML',
                'css': 'CSS',
                'react': 'React',
                'vue': 'Vue.js',
                'angular': 'Angular',
                'node': 'Node.js',
                'nodejs': 'Node.js',
                'basico': 'Básico',
                'básico': 'Básico',
                'avancado': 'Avançado',
                'avançado': 'Avançado',
                'intermediario': 'Intermediário',
                'intermediário': 'Intermediário',
                'fundamentos': 'Fundamentos',
                'conceitos': 'Conceitos',
                'introducao': 'Introdução',
                'introdução': 'Introdução'
            }
            
            improved = topic.lower()
            for wrong, correct in corrections.items():
                improved = improved.replace(wrong, correct)
            
            # Capitalizar primeira letra de cada palavra importante
            words = improved.split()
            capitalized_words = []
            for word in words:
                if word.lower() in ['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'com', 'em', 'na', 'no']:
                    capitalized_words.append(word.lower())
                else:
                    capitalized_words.append(word.capitalize())
            
            return ' '.join(capitalized_words)
        
        # Aplicar correções básicas
        improved_topic = improve_title_simple(request.topic)
        
        # Tentar usar LLM para melhorias adicionais
        try:
            if gemini_client:  # Verificar se cliente existe
                improved_title_prompt = f"""Melhore este título de curso: "{improved_topic}"

Regras:
- Mantenha conciso (máximo 40 caracteres)
- Use termos técnicos corretos
- Não inclua nível de dificuldade

Responda APENAS o título melhorado:"""
                
                llm_result = await gemini_client.generate_content(improved_title_prompt)
                if llm_result and len(llm_result.strip()) > 0:
                    clean_title = llm_result.strip().replace('"', '').replace("'", "")
                    if len(clean_title) <= 50:  # Verificar tamanho razoável
                        improved_topic = clean_title
                        print(f"Título melhorado pela LLM: {improved_topic}")
        except Exception as e:
            print(f"LLM não disponível, usando correções básicas: {e}")
        
        trilha_title = f"{improved_topic} - {difficulty_labels.get(request.difficulty, 'Básico')}"
        print(f"Título final: {trilha_title}")
        
        # Criar trilha no banco de dados
        db_difficulty = difficulty_map.get(request.difficulty, "beginner")
        trilha_db_data = {
            "titulo": trilha_title,
            "dificuldade": db_difficulty,
            "criador_id": request.user_id  # Associar ao usuário criador
        }
        
        trilha = await trilha_repo.create(trilha_db_data)
        if not trilha:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao criar trilha no banco de dados"
            )
        
        trilha_id = trilha.id
        
        # Criar módulos como conteúdos (sem gerar questões ainda - serão geradas quando o usuário iniciar)
        modules = []
        for i in range(modules_count.get(request.difficulty, 3)):
            conteudo_data = {
                "titulo": f"Módulo {i+1}: {improved_topic}",
                "tipo": "quiz",
                "material": f"Aprenda os conceitos do módulo {i+1}"
            }
            conteudo = await trilha_repo.add_conteudo_to_trilha(trilha_id, conteudo_data)
            if conteudo:
                modules.append({
                    "id": conteudo.id,
                    "titulo": conteudo.titulo,
                    "descricao": conteudo.material,
                    "ordem": i + 1,
                    "questions_count": 10  # Questões serão geradas quando o módulo for iniciado
                })
        
        # Inscrever o usuário na trilha automaticamente
        from business.learning.content_delivery import ContentDelivery
        content_delivery = ContentDelivery()
        enrollment_result = await content_delivery.enroll_user_in_trilha(request.user_id, trilha_id)
        
        # Registrar atividade inicial para contar o streak
        if modules and len(modules) > 0:
            from data_access.repositories.desempenho_repository import DesempenhoRepository
            desempenho_repo = DesempenhoRepository()
            # Registrar progresso inicial no primeiro módulo (5% para indicar que começou)
            await desempenho_repo.update_progress(
                user_id=request.user_id,
                conteudo_id=modules[0]["id"],
                progresso=5,
                tempo_estudo=1  # 1 minuto inicial
            )
        
        # Preparar dados da trilha criada
        trilha_data = {
            "id": trilha_id,
            "titulo": trilha_title,
            "descricao": f"Trilha personalizada sobre {request.topic} para nível {request.difficulty}",
            "dificuldade": request.difficulty,
            "categoria": "programming",
            "modules": modules,
            "estimated_duration": len(modules) * 30,
            "total_questions": len(modules) * 10,
            "enrollment": enrollment_result if enrollment_result.get("success") else {
                "success": False,
                "error": "Falha ao inscrever usuário"
            }
        }
        
        return APIResponse(
            success=True,
            message="Trilha personalizada criada com sucesso!",
            data=trilha_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/user/{user_id}/check-active", response_model=APIResponse)
async def check_user_active_trilhas(user_id: int):
    """
    Verificar se o usuário tem trilhas ativas.
    
    - **user_id**: ID do usuário
    
    Retorna informação sobre trilhas ativas do usuário para decidir se deve
    mostrar opção "criar nova trilha" ou "continuar trilha existente".
    """
    try:
        from data_access.repositories.trilha_repository import TrilhaRepository
        from data_access.repositories.usuario_repository import UsuarioRepository
        from data_access.repositories.desempenho_repository import DesempenhoRepository
        
        trilha_repo = TrilhaRepository()
        usuario_repo = UsuarioRepository()
        desempenho_repo = DesempenhoRepository()
        
        # Verificar se o usuário existe
        usuario = await usuario_repo.get_by_id(user_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Buscar trilhas onde o usuário está inscrito
        usuario_with_trilhas = await usuario_repo.get_with_trilhas(user_id)
        
        # Map difficulty to Portuguese
        difficulty_map = {
            "beginner": "iniciante",
            "intermediate": "intermediario",
            "advanced": "avancado"
        }
        
        active_trilhas = []
        if usuario_with_trilhas and usuario_with_trilhas.trilhas:
            for trilha in usuario_with_trilhas.trilhas:
                # Calcular progresso da trilha
                progress_data = await desempenho_repo.get_user_trilha_progress(user_id, trilha.id)
                progress = progress_data.get("overall_progress", 0) if progress_data else 0
                
                active_trilhas.append({
                    "id": trilha.id,
                    "titulo": trilha.titulo,
                    "progress": progress
                })
        
        result = {
            "success": True,
            "has_active_trilhas": len(active_trilhas) > 0,
            "active_trilhas": active_trilhas,
            "count": len(active_trilhas)
        }
        
        return APIResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking user active trilhas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/trilha/{trilha_id}/details", response_model=APIResponse)
async def get_trilha_details(trilha_id: int):
    """
    Get detailed information about a specific trilha.
    """
    try:
        from data_access.repositories.trilha_repository import TrilhaRepository
        
        trilha_repo = TrilhaRepository()
        
        # Buscar trilha no banco de dados
        trilha = await trilha_repo.get_by_id(trilha_id)
        if not trilha:
            raise HTTPException(status_code=404, detail="Trilha não encontrada")
        
        # Buscar trilha com conteúdos
        trilha_with_content = await trilha_repo.get_with_conteudos(trilha_id)
        trilha_with_users = await trilha_repo.get_with_usuarios(trilha_id)
        trilha_stats = await trilha_repo.get_trilha_statistics(trilha_id)
        
        # Map difficulty to Portuguese
        difficulty_map = {
            "beginner": "iniciante",
            "intermediate": "intermediario",
            "advanced": "avancado"
        }
        
        # Preparar módulos
        modules = []
        if trilha_with_content:
            for i, conteudo in enumerate(trilha_with_content.conteudos):
                module = {
                    "id": conteudo.id,
                    "titulo": conteudo.titulo,
                    "descricao": conteudo.material or f"Aprenda os conceitos fundamentais do módulo {i+1}",
                "ordem": i + 1,
                "questions_count": 10,
                "estimated_duration": 15
            }
            modules.append(module)
        
        # Dados detalhados da trilha
        detailed_trilha = {
            "id": trilha.id,
            "titulo": trilha.titulo,
            "descricao": f"Trilha personalizada criada",
            "dificuldade": difficulty_map.get(trilha.dificuldade, trilha.dificuldade),
            "categoria": "programming",
            "modules_count": len(modules),
            "enrollment_count": len(trilha_with_users.usuarios) if trilha_with_users else 0,
            "completion_rate": trilha_stats.get("completion_rate", 0) if trilha_stats else 0,
            "created_at": trilha.created_at.isoformat() if trilha.created_at else None,
            "modules": modules,
            "estimated_duration": len(modules) * 15,
            "total_questions": len(modules) * 10,
            "enrollment": {
                "enrollment_count": len(trilha_with_users.usuarios) if trilha_with_users else 0,
                "completion_rate": trilha_stats.get("completion_rate", 0) if trilha_stats else 0
            }
        }
        
        return APIResponse(
            success=True,
            message="Detalhes da trilha carregados com sucesso",
            data=detailed_trilha
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting trilha details: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.delete("/trilha/{trilha_id}/delete", response_model=APIResponse)
async def delete_trilha(trilha_id: int):
    """
    Delete a specific trilha.
    """
    try:
        from data_access.repositories.trilha_repository import TrilhaRepository
        
        trilha_repo = TrilhaRepository()
        
        # Verificar se a trilha existe
        trilha = await trilha_repo.get_by_id(trilha_id)
        if not trilha:
                raise HTTPException(
                    status_code=404, 
                    detail="Trilha não encontrada"
                )
        
        # Deletar a trilha do banco de dados
        deleted = await trilha_repo.delete(trilha_id)
        
        if not deleted:
            raise HTTPException(
                status_code=500,
                detail="Falha ao excluir trilha"
                )
        
        return APIResponse(
            success=True,
            message="Trilha excluída com sucesso",
            data={"trilha_id": trilha_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting trilha: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/user/{user_id}/created", response_model=APIResponse)
async def get_user_created_trilhas(user_id: int):
    """
    Obter trilhas criadas pelo usuário.
    
    - **user_id**: ID do usuário
    
    Retorna todas as trilhas personalizadas criadas pelo usuário.
    """
    try:
        from data_access.repositories.trilha_repository import TrilhaRepository
        from data_access.repositories.usuario_repository import UsuarioRepository
        from data_access.repositories.desempenho_repository import DesempenhoRepository
        
        trilha_repo = TrilhaRepository()
        usuario_repo = UsuarioRepository()
        desempenho_repo = DesempenhoRepository()
        
        # LOG: Verificar qual user_id está sendo buscado
        print(f"=== DEBUG: get_user_created_trilhas ===")
        print(f"Buscando trilhas para user_id: {user_id}")
        
        # Verificar se o usuário existe
        usuario = await usuario_repo.get_by_id(user_id)
        if not usuario:
            print(f"ERRO: Usuário {user_id} não encontrado!")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        print(f"Usuário encontrado: ID={usuario.id}, Email={usuario.email}, Nome={usuario.nome}")
        
        # Buscar trilhas criadas pelo usuário
        trilhas = await trilha_repo.get_by_criador(user_id)
        
        # LOG: Quantas trilhas foram encontradas
        print(f"Trilhas encontradas no banco: {len(trilhas)}")
        sys.stdout.flush()
        if trilhas:
            print("Detalhes das trilhas:")
            sys.stdout.flush()
            try:
                for t in trilhas:
                    try:
                        print(f"  - ID={t.id}, Titulo={t.titulo}, criador_id={t.criador_id}")
                        sys.stdout.flush()
                    except Exception as e:
                        print(f"  - ERRO ao imprimir detalhes da trilha: {e}, tipo: {type(t)}")
                        sys.stdout.flush()
            except Exception as e:
                print(f"ERRO ao iterar trilhas: {e}")
                sys.stdout.flush()
        else:
            print("Nenhuma trilha encontrada para este usuário")
            sys.stdout.flush()
        
        difficulty_map = {
            "beginner": "iniciante",
            "intermediate": "intermediario",
            "advanced": "avancado"
        }
        
        # Preparar lista de trilhas com informações adicionais
        trilhas_list = []
        for trilha in trilhas:
            # Contar módulos (conteúdos)
            trilha_with_content = await trilha_repo.get_with_conteudos(trilha.id)
            modules_count = len(trilha_with_content.conteudos) if trilha_with_content else 0
            
            # Contar inscrições
            trilha_with_users = await trilha_repo.get_with_usuarios(trilha.id)
            enrollment_count = len(trilha_with_users.usuarios) if trilha_with_users else 0
            
            # Calcular taxa de conclusão (simplificado)
            trilha_stats = await trilha_repo.get_trilha_statistics(trilha.id)
            completion_rate = trilha_stats.get("completion_rate", 0) if trilha_stats else 0
            
            trilha_data = {
                "id": trilha.id,
                "titulo": trilha.titulo,
                "descricao": f"Trilha personalizada criada por você",
                "dificuldade": difficulty_map.get(trilha.dificuldade, trilha.dificuldade),
                "categoria": "programming",
                "modules_count": modules_count,
                "enrollment_count": enrollment_count,
                "completion_rate": completion_rate,
                "created_at": trilha.created_at.isoformat() if trilha.created_at else None
            }
            trilhas_list.append(trilha_data)
        
        print(f"Retornando {len(trilhas_list)} trilhas para o frontend")
        print("===================================")
        
        result = {
            "success": True,
            "trilhas": trilhas_list,
            "total": len(trilhas_list)
        }
        
        return APIResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user created trilhas: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/quiz/start", response_model=APIResponse)
async def start_quiz_session(request: QuizSessionRequest):
    """
    Iniciar uma sessão de quiz para um módulo.
    
    - **user_id**: ID do usuário
    - **module_id**: ID do módulo/conteúdo
    
    Inicia uma nova sessão de quiz ou retoma uma sessão existente.
    """
    try:
        lua_engine = get_lua_engine()
        
        result = lua_engine.lua.eval("""
            local quiz_manager = require('lua_core.business.quiz_manager')
            return quiz_manager.start_quiz_session
        """)(request.user_id, request.module_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to start quiz session")
            )
        
        return APIResponse(
            success=True,
            message=result.get("message", "Quiz session started"),
            data=result["session"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/quiz/session/{session_id}/question", response_model=APIResponse)
async def get_current_question(session_id: int, user_id: int):
    """
    Obter a questão atual de uma sessão de quiz.
    
    - **session_id**: ID da sessão de quiz
    - **user_id**: ID do usuário (para verificação de autorização)
    
    Retorna a questão atual e informações da sessão.
    """
    try:
        lua_engine = get_lua_engine()
        
        result = lua_engine.lua.eval("""
            local quiz_manager = require('lua_core.business.quiz_manager')
            return quiz_manager.get_current_question
        """)(session_id, user_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get current question")
            )
        
        return APIResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/quiz/session/{session_id}/answer", response_model=APIResponse)
async def submit_quiz_answer(session_id: int, request: QuizAnswerRequest):
    """
    Submeter resposta para uma questão do quiz.
    
    - **session_id**: ID da sessão de quiz
    - **user_id**: ID do usuário
    - **question_id**: ID da questão
    - **selected_answer**: Resposta selecionada (a, b, c, d, e)
    
    Processa a resposta e retorna se está correta, explicação e próximos passos.
    """
    try:
        lua_engine = get_lua_engine()
        
        answer_data = {
            "user_id": request.user_id,
            "question_id": request.question_id,
            "selected_answer": request.selected_answer
        }
        
        result = lua_engine.lua.eval("""
            local quiz_manager = require('lua_core.business.quiz_manager')
            return quiz_manager.submit_answer
        """)(session_id, request.user_id, answer_data)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to submit answer")
            )
        
        return APIResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/quiz/session/{session_id}/results", response_model=APIResponse)
async def get_quiz_results(session_id: int, user_id: int):
    """
    Obter resultados finais de uma sessão de quiz completada.
    
    - **session_id**: ID da sessão de quiz
    - **user_id**: ID do usuário
    
    Retorna estatísticas completas do quiz: acertos, erros, tempo, nota.
    """
    try:
        lua_engine = get_lua_engine()
        
        result = lua_engine.lua.eval("""
            local quiz_manager = require('lua_core.business.quiz_manager')
            return quiz_manager.get_quiz_results
        """)(session_id, user_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get quiz results")
            )
        
        return APIResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/quiz/user/{user_id}/history", response_model=APIResponse)
async def get_user_quiz_history(user_id: int, limit: int = 10):
    """
    Obter histórico de quizzes do usuário.
    
    - **user_id**: ID do usuário
    - **limit**: Número máximo de sessões a retornar (padrão: 10)
    
    Retorna histórico de sessões de quiz com resultados.
    """
    try:
        lua_engine = get_lua_engine()
        
        result = lua_engine.lua.eval("""
            local quiz_manager = require('lua_core.business.quiz_manager')
            return quiz_manager.get_user_quiz_history
        """)(user_id, limit)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get quiz history")
            )
        
        return APIResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

def create_default_questions(topic: str, module_title: str) -> List[dict]:
    """
    Criar questões padrão caso a IA falhe.
    
    Args:
        topic: Tópico da trilha
        module_title: Título do módulo
        
    Returns:
        Lista de questões padrão
    """
    default_questions = []
    
    for i in range(1, 11):  # 10 questões
        question = {
            "pergunta": f"Questão {i} sobre {module_title} relacionada a {topic}",
            "alternativas": {
                "a": f"Primeira opção sobre {topic}",
                "b": f"Segunda opção sobre {topic}",
                "c": f"Terceira opção sobre {topic}",
                "d": f"Quarta opção sobre {topic}",
                "e": f"Quinta opção sobre {topic}"
            },
            "resposta_correta": "a",
            "explicacao": f"Esta é a explicação para a questão {i} sobre {module_title}."
        }
        default_questions.append(question)
    
    return default_questions

