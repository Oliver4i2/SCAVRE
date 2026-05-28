from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date
from jose import JWTError, jwt
from passlib.context import CryptContext
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os, csv, io, random

from database import engine, get_db
import models

# --- CONFIGURAÇÕES ---
SECRET_KEY = "sua_chave_secreta_super_segura_aqui"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
GOOGLE_CLIENT_ID = "879431588451-320u19m4iff56p1i1r0488a0m82u2mic.apps.googleusercontent.com"

def hash_password(password: str): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    exception = HTTPException(status_code=401, detail="Token inválido ou expirado")
    if not authorization or not authorization.startswith("Bearer "): raise exception
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

class ConnectionManager:
    def __init__(self): self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket): await websocket.accept(); self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket): self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try: await connection.send_text(message)
            except: pass
manager = ConnectionManager()

# --- SCHEMAS ---
class LoginRequest(BaseModel): email: str; password: str
class GoogleLoginRequest(BaseModel): 
    token: str
    portal: Optional[str] = "fiscal" # Diz se quem tá logando clicou em Admin ou Fiscal

class UserCreate(BaseModel): nome: str; email: str; password: str; role: str
class UserResponse(BaseModel):
    id: int; nome: str; email: str; role: str
    class Config: from_attributes = True

class FingerprintSchema(BaseModel):
    hex_code: str
    class Config: from_attributes = True

class StudentResponse(BaseModel):
    id: int; nome: str; matricula: str; curso: str; turma: str; foto_url: Optional[str] = None; is_active: bool; fingerprints: List[FingerprintSchema] = []
    class Config: from_attributes = True

class BiometriaVerify(BaseModel): hex_code: Optional[str] = None; matricula: Optional[str] = None
class OcorrenciaCreate(BaseModel): descricao: str

# --- ROTAS DE ACESSO ---
@app.post("/auth/login")
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == dados.email).first()
    if not user or not verify_password(dados.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    return {"access_token": create_access_token(data={"sub": user.email, "role": user.role}), "role": user.role, "nome": user.nome}

@app.post("/auth/google")
def google_auth(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(data.token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']
        user = db.query(models.User).filter(models.User.email == email).first()
        
        # Se não existe no banco, cria como o portal que ele clicou. 
        # (Isso ajuda você a logar como Admin na primeira vez!)
        if not user:
            role_to_set = data.portal if data.portal in ["admin", "fiscal"] else "fiscal"
            senha_google = hash_password("senha_impossivel_google_12345") 
            user = models.User(nome=idinfo.get('name', 'Usuário Google'), email=email, role=role_to_set, hashed_password=senha_google)
            db.add(user)
            db.commit(); db.refresh(user)
        
        # SE ELE JÁ EXISTE NO BANCO, RESPEITA O CARGO QUE O ADMIN DEU A ELE!
        
        token = create_access_token(data={"sub": user.email, "role": user.role})
        return {"access_token": token, "role": user.role, "nome": user.nome}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno ao salvar usuário do Google")

@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    novo = models.User(nome=user.nome, email=user.email, role=user.role, hashed_password=hash_password(user.password))
    db.add(novo); db.commit(); db.refresh(novo)
    return novo

@app.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

# --- LÓGICA DA CATRACA ---
@app.websocket("/ws/refeicoes")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await manager.connect(websocket)
    try:
        hoje = date.today()
        total_inicial = db.query(models.Student).filter(models.Student.ultimo_almoco == hoje).count()
        await websocket.send_text(str(total_inicial))
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/stats/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    dias = ["Seg", "Ter", "Qua", "Qui", "Sex"]
    grafico = [{"dia": d, "refeicoes": random.randint(150, 350)} for d in dias]
    hoje = date.today()
    total_hoje_real = db.query(models.Student).filter(models.Student.ultimo_almoco == hoje).count()
    grafico[-1]["refeicoes"] = total_hoje_real 
    total_semana = sum(g["refeicoes"] for g in grafico)
    valor_por_prato = 6.50
    return {"grafico_semanal": grafico, "faturamento_semana": total_semana * valor_por_prato, "media_diaria": total_semana // len(dias), "total_semana": total_semana, "valor_prato": valor_por_prato}

@app.get("/catraca/stats")
def get_catraca_stats(db: Session = Depends(get_db)):
    hoje = date.today()
    return {"total_hoje": db.query(models.Student).filter(models.Student.ultimo_almoco == hoje).count()}

@app.post("/catraca/verificar")
async def verificar_acesso(dados: BiometriaVerify, db: Session = Depends(get_db)):
    aluno_encontrado = None
    if dados.hex_code:
        alunos = db.query(models.Student).all()
        for aluno in list(alunos):
            for digital in aluno.fingerprints:
                if digital.hex_code == dados.hex_code:
                    aluno_encontrado = aluno; break
            if aluno_encontrado: break
    elif dados.matricula:
        aluno_encontrado = db.query(models.Student).filter(models.Student.matricula == dados.matricula).first()

    if not aluno_encontrado: raise HTTPException(status_code=404, detail="Estudante não identificado.")
    if getattr(aluno_encontrado, 'is_active', True) == False: return {"status": "inativo", "aluno": {"nome": aluno_encontrado.nome}}
    
    hoje = date.today()
    if getattr(aluno_encontrado, 'ultimo_almoco', None) == hoje: return {"status": "ja_almocou", "aluno": {"nome": aluno_encontrado.nome}}

    aluno_encontrado.ultimo_almoco = hoje
    db.commit()

    total_hoje = db.query(models.Student).filter(models.Student.ultimo_almoco == hoje).count()
    await manager.broadcast(str(total_hoje))

    return {"status": "liberado", "aluno": { "id": aluno_encontrado.id, "nome": aluno_encontrado.nome, "matricula": aluno_encontrado.matricula, "curso": aluno_encontrado.curso, "turma": aluno_encontrado.turma, "foto_url": aluno_encontrado.foto_url }}

@app.post("/students/{student_id}/ocorrencias")
def registrar_ocorrencia(student_id: int, dados: OcorrenciaCreate, db: Session = Depends(get_db)):
    print(f"\n🚨 [OCORRÊNCIA REGISTRADA] Estudante ID {student_id}: {dados.descricao}")
    return {"status": "sucesso"}

@app.post("/students", response_model=StudentResponse)
async def create_student(nome: str = Form(...), matricula: str = Form(...), curso: str = Form(...), turma: str = Form(...), foto: UploadFile = File(...), db: Session = Depends(get_db)):
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
def add_fingerprint(student_id: int, data: FingerprintSchema, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    db.add(models.Fingerprint(student_id=student_id, hex_code=data.hex_code)); db.commit(); return {"message": "Sucesso"}