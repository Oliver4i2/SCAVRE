Markdown
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

O **SCAVRE** é uma solução Full-Stack desenvolvida para modernizar, gerenciar e auditar o fornecimento de refeições institucionais no IFB. O sistema elimina fraudes de duplicidade de consumo, simplifica o apontamento de ocorrências e automatiza o processo de repasse financeiro para a empresa terceirizada (Cantina) por meio de chaves de auditoria criptografadas.

### 🔄 Fluxo de Operação Biométrico
O diagrama de sequência abaixo ilustra a comunicação em tempo real (milissegundos) entre o hardware físico e as camadas de software no momento em que um aluno passa pela catraca:

```mermaid
sequenceDiagram
    participant A as 🧑‍🎓 Aluno
    participant C as 📟 Catraca (Hardware)
    participant B as ⚙️ API FastAPI (Backend)
    participant F as 💻 Terminal React (Frontend)
    
    A->>C: Posiciona o dedo no Leitor Biométrico
    C->>B: Envia Código HEX via WebSocket/HTTP
    
    Note over B: Consulta no Banco de Dados: <br/>1. Aluno existe?<br/>2. Tem cota diária disponível?
    
    alt Acesso Autorizado
        B-->>C: Retorna Comando Liberar (Verde)
        B-->>F: Atualiza Painel de Refeições (+1)
        F-->>F: Renderiza Foto e Nome na Tela
    else Acesso Negado (Já consumiu cota)
        B-->>C: Retorna Comando Bloquear (Vermelho)
        B-->>F: Exibe Alerta: "Voucher já utilizado"
    end
🏗️ Arquitetura do Sistema (Padrão MVC Adaptado)
O projeto adota o padrão arquitetural MVC (Model-View-Controller) de forma desacoplada, otimizando a manutenção do código e isolando as regras de negócio da interface visual:

Snippet de código
graph TD
    subgraph CLIENT_SIDE [Camada de Visão - Front-end]
        View[React.js SPA / Vite]
    end
    
    subgraph SERVER_SIDE [Camada de Controle - Back-end]
        Controller[FastAPI REST API]
    end
    
    subgraph DATA_SIDE [Camada de Modelo - Banco de Dados]
        Model[Modelos SQLAlchemy / PostgreSQL]
    end

    %% Fluxo de comunicação
    Hardware[Leitor Biométrico / Catraca] -->|Envia HEX Code| View
    View -->|Requisições HTTP / WebSockets| Controller
    Controller -->|Orquestra Regras de Negócio| Model
    Model -->|Retorna Query/Dados| Controller
    Controller -->|Responde JSON / Estado| View
Detalhamento das Camadas:
View (Visão): Construída em React.js com empacotamento Vite. É a interface de usuário reativa que se adapta dinamicamente com base no perfil logado.

Controller (Controlador): Desenvolvido em Python com FastAPI. Funciona como o cérebro do sistema, expondo endpoints REST e processando validações complexas.

Model (Modelo): A fundação de persistência do sistema. Define o esquema relacional das tabelas e lida diretamente com o armazenamento seguro.

📊 Diagrama de Entidade-Relacionamento (DER)
O modelo relacional do banco de dados foi projetado para garantir alto desempenho nas consultas de validação e rastreabilidade total para auditorias financeiras.

Snippet de código
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
👤 Diagrama de Casos de Uso
O mapeamento de Casos de Uso descreve o escopo de atuação e as permissões de cada ator dentro da plataforma (Controle de Acesso Baseado em Perfis - RBAC).

Snippet de código
flowchart LR
    subgraph ATORES [Perfis de Acesso]
        O((Operador / Catraca))
        E((Empresa / Cantina))
        F((Fiscal de Contrato))
        G((Gestor Educacional))
    end

    subgraph CASOS_DE_USO [Ações do Sistema]
        C1([Validar Acesso Físico])
        C2([Registrar Ocorrência Técnica])
        C3([Visualizar Faturamento Semanal])
        C4([Homologar Mês e Emitir Protocolo])
        C5([Gerenciar Base de Alunos])
        C6([Exportar Relatórios Oficiais])
    end

    %% Relacionamentos
    O --> C1
    O --> C2
    E --> C3
    F --> C4
    F --> C6
    G --> C5
    G --> C6
💻 Como executar o projeto localmente
Para erguer todo o ecossistema do SCAVRE na sua máquina de forma rápida e segura, siga o fluxo de instalação abaixo:

Snippet de código
flowchart TD
    A[📦 Clonar Repositório Git] --> B{Qual ambiente inicializar?}
    
    B -->|1. Servidor API| C[Acessar pasta /backend]
    C --> D[Criar e Ativar Virtual Env]
    D --> E[pip install -r requirements.txt]
    E --> F([🚀 uvicorn main:app --reload --port 8000])
    
    B -->|2. Interface Web| G[Acessar pasta /frontend]
    G --> H[npm install]
    H --> I([🚀 npm run dev])
    
    F -.-> J((✅ Sistema Operante Localmente))
    I -.-> J
Passos Detalhados no Terminal:
1. Clone o projeto:

Bash
git clone [https://github.com/Oliver4i2/SCAVRE.git](https://github.com/Oliver4i2/SCAVRE.git)
cd SCAVRE
2. Inicie o Backend (Python):

Bash
cd backend
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
3. Inicie o Frontend (React):
Abra um novo terminal na pasta raiz do projeto e digite:

Bash
cd frontend
npm install
npm run dev
