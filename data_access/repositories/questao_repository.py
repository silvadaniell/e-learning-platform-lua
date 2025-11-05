from typing import List, Optional
from sqlalchemy.orm import Session
from data_access.repositories.base_repository import BaseRepository
from infrastructure.database.models import Questao

class QuestaoRepository(BaseRepository[Questao]):
    def __init__(self, db_session: Session = None):
        super().__init__(Questao, db_session)
    
    async def get_by_conteudo_id(self, conteudo_id: int) -> List[Questao]:
        try:
            db = self.get_db()
            return db.query(Questao).filter(
                Questao.conteudo_id == conteudo_id
            ).order_by(Questao.ordem).all()
        except Exception as e:
            print(f"Error getting questions for conteudo {conteudo_id}: {e}")
            return []
    
    async def create_batch(self, questions_data: List[dict]) -> List[Questao]:
        try:
            db = self.get_db()
            questions = []
            
            for question_data in questions_data:
                question = Questao(**question_data)
                db.add(question)
                questions.append(question)
            
            db.commit()
            
            for question in questions:
                db.refresh(question)
            
            return questions
        except Exception as e:
            db.rollback()
            print(f"Error creating batch questions: {e}")
            return []
    
    async def count_by_conteudo_id(self, conteudo_id: int) -> int:
        try:
            db = self.get_db()
            return db.query(Questao).filter(Questao.conteudo_id == conteudo_id).count()
        except Exception as e:
            print(f"Error counting questions for conteudo {conteudo_id}: {e}")
            return 0

