from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date
from jose import JWTError, jwt
from passlib.context import CryptContext
import os, csv, io

from database import engine, get_db
import models

# --- CONFIGURAÇÕES ---
SECRET_KEY = "sua_chave_secreta_super_segura_aqui"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- UTILITÁRIOS ---
def hash_password(password: str): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- SEGURANÇA: O "SEGURANÇA DA PORTA" ---
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    exception = HTTPException(status_code=401, detail="Token inválido ou expirado")
    if not authorization or not authorization.startswith("Bearer "):
        raise exception
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise exception
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None: raise exception
        return user
    except JWTError:
        raise exception

# --- INICIALIZAÇÃO ---
models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="SCAVRE API")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- SCHEMAS ---
from pydantic import BaseModel
class LoginRequest(BaseModel): email: str; password: str
class UserCreate(BaseModel): nome: str; email: str; password: str; role: str
class UserResponse(BaseModel): id: int; nome: str; email: str; role: str
    class Config: from_attributes = True
class FingerprintSchema(BaseModel): hex_code: str
    class Config: from_attributes = True
class StudentResponse(BaseModel): id: int; nome: str; matricula: str; curso: str; turma: str; foto_url: str | None; is_active: bool; fingerprints: List[FingerprintSchema] = []
    class Config: from_attributes = True

# --- ROTAS DE ACESSO ---
@app.post("/auth/login")
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == dados.email).first()
    if not user or not verify_password(dados.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    return {"access_token": create_access_token(data={"sub": user.email, "role": user.role}), "role": user.role}

# --- GESTÃO DE USUÁRIOS (PROTEGIDA) ---
@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    if current.role != "admin": raise HTTPException(status_code=403, detail="Apenas admins criam usuários")
    novo = models.User(nome=user.nome, email=user.email, role=user.role, hashed_password=hash_password(user.password))
    db.add(novo); db.commit(); db.refresh(novo)
    return novo

# --- LÓGICA DA CATRACA (O CORAÇÃO) ---
@app.post("/meals/check-in")
def check_in_meal(data: FingerprintSchema, db: Session = Depends(get_db)):
    # 1. Identifica o aluno pela digital
    fp = db.query(models.Fingerprint).filter(models.Fingerprint.hex_code == data.hex_code).first()
    if not fp: raise HTTPException(status_code=404, detail="Digital não reconhecida")
    
    student = fp.student
    hoje = date.today()
    
    # 2. Verifica se já comeu hoje (Lógica de duplicidade)
    already_eaten = db.query(models.Meal).filter(
        models.Meal.student_id == student.id,
        models.Meal.data_hora >= datetime.combine(hoje, datetime.min.time())
    ).first()
    
    if already_eaten:
        return {"status": "NEGADO", "message": f"{student.nome} já realizou a refeição hoje!", "foto": student.foto_url}
    
    # 3. Registra a refeição
    nova_refeicao = models.Meal(student_id=student.id, tipo_acesso="BIOMETRIA")
    db.add(nova_refeicao); db.commit()
    
    return {"status": "CONFIRMADO", "message": f"Bom apetite, {student.nome}!", "foto": student.foto_url}

# --- ESTUDANTES (MANTIDAS COM PROTEÇÃO) ---
@app.post("/students", response_model=StudentResponse)
async def create_student(nome: str = Form(...), matricula: str = Form(...), curso: str = Form(...), turma: str = Form(...), foto: UploadFile = File(...), db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    ext = foto.filename.split(".")[-1]; file_path = f"static/avatars/{matricula}.{ext}"
    with open(file_path, "wb") as b: b.write(await foto.read())
    novo = models.Student(nome=nome, matricula=matricula, curso=curso, turma=turma, foto_url=f"/{file_path}")
    db.add(novo); db.commit(); db.refresh(novo); return novo

@app.get("/students", response_model=List[StudentResponse])
def list_students(search: str = None, db: Session = Depends(get_db)):
    q = db.query(models.Student)
    if search: q = q.filter((models.Student.nome.ilike(f"%{search}%")) | (models.Student.matricula.ilike(f"%{search}%")))
    return q.all()

@app.post("/students/{student_id}/fingerprints")
def add_fingerprint(student_id: int, data: FingerprintSchema, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if len(student.fingerprints) >= 3: raise HTTPException(status_code=400, detail="Limite atingido")
    db.add(models.Fingerprint(student_id=student_id, hex_code=data.hex_code)); db.commit(); return {"message": "Sucesso"}