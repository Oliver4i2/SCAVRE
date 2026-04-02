# SCAVRE

# Sistema de Controle de Acesso e Voucher de Refeição Escolar
Sistema web para controle de acesso e monitoramento de voucher de refeição em escolas públicas, utilizando identificação biométrica como principal mecanismo de validação, garantindo que cada estudante tenha direito a uma única refeição por dia, com renovação automática, fallback manual com confirmação visual por foto, e geração de relatórios detalhados para pagamento baseado em consumo real, atendendo a múltiplos perfis de usuário com permissões específicas.

## 🎯 Objetivo
Sistema web para controle e monitoramento de refeições em escolas públicas utilizando identificação biométrica. O sistema garante o direito a uma única refeição diária por estudante, oferece fallback manual com auditoria visual e gera relatórios precisos para pagamento baseado em consumo real.

## 🛠 Tecnologias
* **Backend:** Python 3, FastAPI, SQLAlchemy (SQL), JWT, Google OAuth.
* **Frontend:** React, Vite.
* **Integrações:** Leitor Biométrico Local (via Hex Code).

## 🚀 Como Executar Localmente (Codespaces)

### Backend
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 🔐 Perfis de Acesso
* **Operador/Empresa/Gestão:** Autenticação via Senha.
* **Fiscal/Admin:** Autenticação via Google OAuth.
