ACESSE O PROJETO AQUI:https://oliver4i2.github.io/SCAVRE/
<img width="1272" height="122" alt="SCAVRE" src="https://github.com/user-attachments/assets/ff8fe3fb-c144-4739-9e3c-767f1c1c7c71" />

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

flowchart LR
    %% Atores
    Operador([📟 Operador / Catraca])
    Empresa([🏢 Empresa / Cantina])
    Fiscal([👮 Fiscal de Contrato])
    Gestor([🧑‍🏫 Gestão Educacional])

    %% Casos de Uso
    ValidarAcesso(Validar Acesso Físico)
    RegistrarOcorrencia(Registrar Ocorrência)
    AcompanharDash(Visualizar Faturamento)
    HomologarMes(Emitir Protocolo de Baixa)
    GerirAlunos(Cadastrar/Atualizar Alunos)
    Exportar(Gerar Relatórios Oficiais)

    %% Conexões
    Operador --> ValidarAcesso
    Operador --> RegistrarOcorrencia

    Empresa --> AcompanharDash

    Fiscal --> HomologarMes
    Fiscal --> Exportar

    Gestor --> GerirAlunos
    Gestor --> Exportar

Descrição dos Casos de Uso:
Validar Acesso Físico: O Operador recebe a leitura biométrica, e o sistema checa instantaneamente na base se o discente é válido e se ainda possui cota diária disponível.

Registrar Ocorrência: O Operador aponta pendências de disciplina na ficha do aluno diretamente no momento de passar pela catraca.

Visualizar Faturamento: A Cantina acompanha em tempo real quantas refeições foram servidas e a estimativa do valor a receber na semana.

Emitir Protocolo de Baixa: O Fiscal encerra o ciclo mensal, travando a base de dados do período e gerando uma chave única (hash) que autoriza o pagamento institucional.

Gerenciar Alunos: O Gestor mantêm a base atualizada, gerindo turmas e fotos de identificação.

Gerar Relatórios: Extração de PDFs e planilhas CSV para as auditorias governamentais.

💻 Como executar o projeto localmente
Para rodar o SCAVRE na sua máquina, você precisará ter o Node.js (para o Frontend) e o Python 3+ (para o Backend) instalados.

1. Clonar o Repositório
git clone [https://github.com/SeuUsuario/SCAVRE.git](https://github.com/SeuUsuario/SCAVRE.git)
cd SCAVRE

2. Configurar o Backend (Python/FastAPI)
Abra um terminal e acesse a pasta do servidor:
cd backend
# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows use: venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor localmente
uvicorn main:app --reload --port 8000
O backend estará respondendo em http://localhost:8000.

3. Configurar o Frontend (React/Vite)
Abra um novo terminal, acesse a pasta da interface web e configure o pacote de dependências:
cd frontend

# Instale as dependências do React
npm install

# Inicialize o servidor de desenvolvimento Vite
npm run dev
O frontend abrirá no seu navegador, geralmente em http://localhost:5173.

Dicas para esse README:

Onde tem SeuUsuario no bloco de "Clonar o Repositório", coloque o seu usuário do GitHub.

No final, já adicionei a assinatura com o seu nome e seu curso para dar o crédito da autoria e mostrar o seu foco em Ciência da Computação.

Quando você fizer o commit e subir pro GitHub, os blocos ali onde diz ````mermaid vão se transformar automaticamente em gráficos lindos e desenhados direto na página principal do projeto!
