ACESSE O PROJETO AQUI:https://oliver4i2.github.io/SCAVRE/
<img width="1272" height="122" alt="SCAVRE" src="https://github.com/user-attachments/assets/ff8fe3fb-c144-4739-9e3c-767f1c1c7c71" />

# SCAVRE

# Sistema de Controle de Acesso e Voucher de Refeição Escolar
Sistema web para controle de acesso e monitoramento de voucher de refeição em escolas públicas, utilizando identificação biométrica como principal mecanismo de validação, garantindo que cada estudante tenha direito a uma única refeição por dia, com renovação automática, fallback manual com confirmação visual por foto, e geração de relatórios detalhados para pagamento baseado em consumo real, atendendo a múltiplos perfis de usuário com permissões específicas.
<img width="1272" height="122" alt="SCAVRE" src="https://github.com/user-attachments/assets/ff8fe3fb-c144-4739-9e3c-767f1c1c7c71" />

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
<div align="center">
  
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
  ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)

</div>
