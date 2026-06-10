<div align="center">
  <h1 style="color: #2F9E41;">SCAVRE</h1>
  <p><strong>Sistema de Controle de Acesso e Voucher Escolar | IFB</strong></p>

  ![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-2F9E41?style=for-the-badge)
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
  ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)
</div>

---

## 📖 Sobre o Projeto

O **SCAVRE** é uma solução Full-Stack desenvolvida para modernizar e auditar o fornecimento de refeições institucionais. Através de validação biométrica e controle de catracas, o sistema elimina fraudes, automatiza repasses financeiros para a empresa terceirizada (Cantina) e gera protocolos criptografados para a gestão do contrato.

---

## 🏗️ Arquitetura do Sistema (Padrão MVC Adaptado)

O projeto segue uma arquitetura baseada nos princípios do **MVC (Model-View-Controller)**, adaptada para o ecossistema moderno de APIs RESTful:

*   **View (Visão):** A interface do usuário é totalmente desacoplada, construída em React/Vite. Ela é responsável por renderizar os dados e capturar as interações dos perfis (Operador, Gestor, Fiscal, etc.).
*   **Controller (Controlador):** O backend construído em Python com **FastAPI** recebe as requisições HTTP da View, processa as regras de negócio (ex: verificar se o aluno já almoçou hoje) e orquestra a comunicação.
*   **Model (Modelo):** Gerenciado pelo banco de dados e ORM, é a camada de dados brutos, onde as estruturas de `Alunos`, `Ocorrências` e `Configurações` estão definidas.

---

## 📊 Diagrama de Entidade-Relacionamento (MER)

O esquema abaixo ilustra como as entidades se relacionam no banco de dados para garantir a rastreabilidade do consumo e controle de ocorrências.

```mermaid
erDiagram
    ALUNO ||--o{ REFEICAO : "consome"
    ALUNO ||--o{ OCORRENCIA : "registra"
    
    ALUNO {
        int id PK
        string nome
        string matricula
        string curso
        string turma
        string foto_url
        string hex_code_biometria
    }
    
    REFEICAO {
        int id PK
        int aluno_id FK
        datetime data_hora
        string metodo "biometria | manual"
    }
    
    OCORRENCIA {
        int id PK
        int aluno_id FK
        string descricao
        datetime data_hora
    }
    
    CONFIGURACAO {
        int id PK
        float valor_refeicao
        time horario_inicio
        time horario_fim
    }
    
    PROTOCOLO_AUDITORIA {
        string chave PK
        string mes_referencia
        int total_refeicoes
        float valor_liquidado
    }

