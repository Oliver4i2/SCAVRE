from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session, relationship
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, extract
from typing import List, Optional
from datetime import datetime, timedelta, date
from jose import JWTError, jwt
from passlib.context import CryptContext
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os, random, uuid, csv, io

# Imports do ReportLab para construção de PDFs
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

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

# --- TABELAS DE AUDITORIA, CONFIGURAÇÃO E ACESSO ---
class AccessLog(models.Base):
    __tablename__ = "access_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    data_hora = Column(DateTime, default=datetime.now)
    metodo = Column(String) 
    student = relationship("Student")

class Ocorrencia(models.Base):
    __tablename__ = "ocorrencias"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    descricao = Column(String)
    data_hora = Column(DateTime, default=datetime.now)
    student = relationship("Student")

class SystemConfig(models.Base):
    __tablename__ = "system_config"
    id = Column(Integer, primary_key=True, index=True)
    valor_refeicao = Column(Float, default=6.50)
    horario_inicio = Column(String, default="11:30")
    horario_fim = Column(String, default="14:00")

class ValidacaoMes(models.Base):
    __tablename__ = "validacoes"
    id = Column(Integer, primary_key=True, index=True)
    mes_ano = Column(String) 
    protocolo = Column(String, unique=True) 
    total_refeicoes = Column(Integer)
    valor_total = Column(Float)
    data_geracao = Column(DateTime, default=datetime.now)

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
class GoogleLoginRequest(BaseModel): token: str; portal: Optional[str] = "fiscal" 
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
class ConfigUpdate(BaseModel): valor_refeicao: float; horario_inicio: str; horario_fim: str
class ValidacaoCreate(BaseModel): mes_ano: str; total_refeicoes: int; valor_total: float

# --- ROTAS DE UTILIZADORES E AUTENTICAÇÃO ---

@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first(): 
        raise HTTPException(status_code=400, detail="E-mail já registado")
    novo = models.User(nome=user.nome, email=user.email, role=user.role, hashed_password=hash_password(user.password))
    db.add(novo); db.commit(); db.refresh(novo)
    return novo

@app.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)): 
    return db.query(models.User).all()

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
        if not user:
            role_to_set = data.portal if data.portal in ["admin", "fiscal"] else "fiscal"
            user = models.User(nome=idinfo.get('name', 'Usuário Google'), email=email, role=role_to_set, hashed_password=hash_password("senha_impossivel_google_12345"))
            db.add(user); db.commit(); db.refresh(user)
        return {"access_token": create_access_token(data={"sub": user.email, "role": user.role}), "role": user.role, "nome": user.nome}
    except Exception: raise HTTPException(status_code=500, detail="Erro no login Google")

# --- CONFIGURAÇÕES DO SISTEMA ---
@app.get("/config")
def get_config(db: Session = Depends(get_db)):
    cfg = db.query(SystemConfig).first()
    if not cfg:
        cfg = SystemConfig()
        db.add(cfg); db.commit(); db.refresh(cfg)
    return cfg

@app.post("/config")
def update_config(dados: ConfigUpdate, db: Session = Depends(get_db)):
    cfg = db.query(SystemConfig).first()
    if not cfg: cfg = SystemConfig(); db.add(cfg)
    cfg.valor_refeicao = dados.valor_refeicao
    cfg.horario_inicio = dados.horario_inicio
    cfg.horario_fim = dados.horario_fim
    db.commit(); return cfg

# --- LÓGICA DA CATRACA e WEBSOCKET ---
@app.websocket("/ws/refeicoes")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await manager.connect(websocket)
    try:
        total_inicial = db.query(models.Student).filter(models.Student.ultimo_almoco == date.today()).count()
        await websocket.send_text(str(total_inicial))
        while True: await websocket.receive_text()
    except WebSocketDisconnect: manager.disconnect(websocket)

@app.get("/stats/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    cfg = db.query(SystemConfig).first()
    valor_prato = cfg.valor_refeicao if cfg else 6.50
    dias = ["Seg", "Ter", "Qua", "Qui", "Sex"]
    grafico = [{"dia": d, "refeicoes": random.randint(150, 350)} for d in dias]
    grafico[-1]["refeicoes"] = db.query(models.Student).filter(models.Student.ultimo_almoco == date.today()).count()
    total_semana = sum(g["refeicoes"] for g in grafico)
    return {"grafico_semanal": grafico, "faturamento_semana": total_semana * valor_prato, "media_diaria": total_semana // len(dias), "total_semana": total_semana, "valor_prato": valor_prato}

@app.post("/catraca/verificar")
async def verificar_acesso(dados: BiometriaVerify, db: Session = Depends(get_db)):
    aluno_encontrado, metodo_usado = None, ""
    if dados.hex_code:
        metodo_usado = "biometria"
        for aluno in db.query(models.Student).all():
            for digital in aluno.fingerprints:
                if digital.hex_code == dados.hex_code: aluno_encontrado = aluno; break
            if aluno_encontrado: break
    elif dados.matricula:
        metodo_usado = "manual"
        aluno_encontrado = db.query(models.Student).filter(models.Student.matricula == dados.matricula).first()

    if not aluno_encontrado: raise HTTPException(status_code=404, detail="Não identificado.")
    if getattr(aluno_encontrado, 'ultimo_almoco', None) == date.today(): return {"status": "ja_almocou", "aluno": {"id": aluno_encontrado.id, "nome": aluno_encontrado.nome}}

    aluno_encontrado.ultimo_almoco = date.today()
    db.add(AccessLog(student_id=aluno_encontrado.id, metodo=metodo_usado, data_hora=datetime.now()))
    db.commit()
    await manager.broadcast(str(db.query(models.Student).filter(models.Student.ultimo_almoco == date.today()).count()))
    return {"status": "liberado", "aluno": { "id": aluno_encontrado.id, "nome": aluno_encontrado.nome, "matricula": aluno_encontrado.matricula, "foto_url": aluno_encontrado.foto_url }}

@app.get("/relatorios/diario")
def get_relatorio_diario(db: Session = Depends(get_db)):
    logs = db.query(AccessLog).filter(AccessLog.data_hora >= datetime.combine(date.today(), datetime.min.time())).order_by(AccessLog.data_hora.desc()).all()
    return [{"id": l.id, "hora": l.data_hora.strftime("%H:%M:%S"), "metodo": l.metodo, "nome": l.student.nome, "matricula": l.student.matricula} for l in logs]

# --- MOTORES DE EXPORTAÇÃO (CSV E PDF) ---
def obter_logs_filtrados(db: Session, tipo: str, filtro_valor: str):
    query = db.query(AccessLog).join(models.Student)
    if tipo == "diario":
        alvo = datetime.strptime(filtro_valor, "%Y-%m-%d").date() if filtro_valor else date.today()
        query = query.filter(AccessLog.data_hora >= datetime.combine(alvo, datetime.min.time()), AccessLog.data_hora <= datetime.combine(alvo, datetime.max.time()))
    elif tipo == "mensal":
        ano, mes = map(int, filtro_valor.split("-")) if filtro_valor else (date.today().year, date.today().month)
        query = query.filter(extract('year', AccessLog.data_hora) == ano, extract('month', AccessLog.data_hora) == mes)
    elif tipo == "estudante":
        query = query.filter(models.Student.matricula == filtro_valor)
    return query.order_by(AccessLog.data_hora.asc()).all()

@app.get("/relatorios/exportar/csv")
def exportar_csv(tipo: str, filtro: Optional[str] = None, db: Session = Depends(get_db)):
    logs = obter_logs_filtrados(db, tipo, filtro)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Data/Hora", "Nome do Aluno", "Matrícula", "Curso", "Turma", "Método de Acesso", "Valor Subsídio"])
    for l in logs:
        writer.writerow([l.data_hora.strftime("%d/%m/%Y %H:%M:%S"), l.student.nome, l.student.matricula, l.student.curso, l.student.turma, l.metodo.upper(), "6,50"])
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=scavre_relatorio_{tipo}.csv"
    return response

@app.get("/relatorios/exportar/pdf")
def exportar_pdf(tipo: str, filtro: Optional[str] = None, db: Session = Depends(get_db)):
    logs = obter_logs_filtrados(db, tipo, filtro)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#2F9E41'), spaceAfter=10)
    meta_style = ParagraphStyle('MetaStyle', parent=styles['Normal'], fontSize=10, spaceAfter=20)
    
    story.append(Paragraph("SCAVRE - INSTITUTO FEDERAL DE BRASÍLIA", title_style))
    story.append(Paragraph(f"Relatório de Consumo e Auditoria | Escopo: {tipo.upper()} ({filtro or 'Atual'})", meta_style))
    
    data_tabela = [["Data/Hora", "Nome", "Matrícula", "Curso/Turma", "Método", "Valor"]]
    for l in logs:
        data_tabela.append([l.data_hora.strftime("%d/%m/%Y %H:%M"), l.student.nome[:25], l.student.matricula, f"{l.student.curso} - {l.student.turma}"[:20], l.metodo.upper(), "R$ 6,50"])
        
    t = Table(data_tabela, colWidths=[95, 130, 65, 120, 80, 55])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2F9E41')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    story.append(t)
    doc.build(story)
    response = Response(content=buffer.getvalue(), media_type="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename=scavre_relatorio_{tipo}.pdf"
    return response

# --- OCORRÊNCIAS E FECHAMENTOS ---
@app.post("/students/{student_id}/ocorrencias")
def registrar_ocorrencia(student_id: int, dados: OcorrenciaCreate, db: Session = Depends(get_db)):
    db.add(Ocorrencia(student_id=student_id, descricao=dados.descricao, data_hora=datetime.now()))
    db.commit(); return {"status": "sucesso"}

@app.get("/ocorrencias")
def listar_ocorrencias(db: Session = Depends(get_db)):
    ocs = db.query(Ocorrencia).order_by(Ocorrencia.data_hora.desc()).all()
    return [{"id": o.id, "data_hora": o.data_hora.strftime("%d/%m/%Y %H:%M"), "descricao": o.descricao, "nome": o.student.nome, "matricula": o.student.matricula} for o in ocs]

@app.post("/validacao/fechar")
def fechar_mes(dados: ValidacaoCreate, db: Session = Depends(get_db)):
    protocolo_gerado = f"SCAVRE-{dados.mes_ano.replace('-','')}-{str(uuid.uuid4())[:6].upper()}"
    val = ValidacaoMes(mes_ano=dados.mes_ano, protocolo=protocolo_gerado, total_refeicoes=dados.total_refeicoes, valor_total=dados.valor_total)
    db.add(val); db.commit(); return {"protocolo": protocolo_gerado}

@app.get("/validacao/historico")
def historico_validacao(db: Session = Depends(get_db)):
    vals = db.query(ValidacaoMes).order_by(ValidacaoMes.data_geracao.desc()).all()
    return [{"mes": v.mes_ano, "protocolo": v.protocolo, "total": v.total_refeicoes, "valor": v.valor_total, "data": v.data_geracao.strftime("%d/%m/%Y")} for v in vals]

# --- GESTÃO DE ESTUDANTES ---
@app.get("/students", response_model=List[StudentResponse])
def list_students(search: str = None, db: Session = Depends(get_db)):
    q = db.query(models.Student)
    if search: q = q.filter((models.Student.nome.ilike(f"%{search}%")) | (models.Student.matricula.ilike(f"%{search}%")))
    return q.all()

@app.post("/students", response_model=StudentResponse)
async def create_student(nome: str = Form(...), matricula: str = Form(...), curso: str = Form(...), turma: str = Form(...), foto: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = foto.filename.split(".")[-1]; file_path = f"static/avatars/{matricula}.{ext}"
    with open(file_path, "wb") as b: b.write(await foto.read())
    novo = models.Student(nome=nome, matricula=matricula, curso=curso, turma=turma, foto_url=f"/{file_path}")
    db.add(novo); db.commit(); db.refresh(novo); return novo

# NOVO: ROTA PARA ATUALIZAR ESTUDANTE EXISTENTE
@app.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(student_id: int, nome: str = Form(...), matricula: str = Form(...), curso: str = Form(...), turma: str = Form(...), foto: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
    aluno = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not aluno: raise HTTPException(status_code=404, detail="Estudante não encontrado")
    
    aluno.nome = nome
    aluno.matricula = matricula
    aluno.curso = curso
    aluno.turma = turma
    
    if foto:
        ext = foto.filename.split(".")[-1]
        file_path = f"static/avatars/{matricula}.{ext}"
        with open(file_path, "wb") as b: b.write(await foto.read())
        aluno.foto_url = f"/{file_path}"
        
    db.commit()
    db.refresh(aluno)
    return aluno

@app.post("/students/{student_id}/fingerprints")
def add_fingerprint(student_id: int, data: FingerprintSchema, db: Session = Depends(get_db)):
    db.add(models.Fingerprint(student_id=student_id, hex_code=data.hex_code)); db.commit(); return {"message": "Sucesso"}