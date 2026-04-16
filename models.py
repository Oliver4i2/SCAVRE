from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, nullable=True)
    role = Column(String)
    is_active = Column(Boolean, default=True)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    matricula = Column(String, unique=True, index=True)
    curso = Column(String)
    turma = Column(String)
    foto_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    operator_id = Column(Integer, ForeignKey("users.id"))
    tipo_acesso = Column(String)
    motivo_manual = Column(String, nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow)
    fiscal_validation_id = Column(Integer, nullable=True)

    student = relationship("Student")
    operator = relationship("User")
