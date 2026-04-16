from sqlalchemy import Column, Integer, String, Text
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    caregiver_email = Column(String, nullable=True)
    mood_history = Column(Text, default="[]") 
    daily_quests = Column(Text, default="[]")
