from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Cantina API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    google_token: str

class UserCreate(BaseModel):
    nome: str
    email: str
    role: str

@app.post("/auth/login")
def login(dados: LoginRequest):
    if dados.email == "operador@escola.com" and dados.password == "senha123":
        return {"access_token": "fake-jwt-token-operador", "role": "operador"}
    raise HTTPException(status_code=401, detail="Credenciais inválidas")

@app.post("/auth/google")
def google_login(dados: GoogleAuthRequest):
    return {"access_token": "fake-jwt-token-google", "role": "fiscal"}

def verify_token(token: str = "Header Auth"):
    return True

@app.get("/users")
def list_users(is_authorized: bool = Depends(verify_token)):
    return [{"id": 1, "nome": "João (Operador)", "role": "operador"}]

@app.post("/users")
def create_user(user: UserCreate, is_authorized: bool = Depends(verify_token)):
    return {"status": "Usuário criado", "dados": user}
