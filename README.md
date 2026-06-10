
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

O **SCAVRE** é uma solução Full-Stack desenvolvida para modernizar, gerenciar e auditar o fornecimento de refeições institucionais no IFB. Integrando leitores biométricos instalados nas catracas físicas ao ecossistema web, o sistema elimina fraudes de duplicidade de consumo, simplifica o apontamento de ocorrências e automatiza o processo de repasse financeiro para a empresa terceirizada (Cantina) por meio de chaves de auditoria criptografadas.

---

## 🏗️ Arquitetura do Sistema (Padrão MVC Adaptado)

O projeto adota o padrão arquitetural **MVC (Model-View-Controller)** de forma desacoplada, otimizando a manutenção do código e isolando as regras de negócio da interface visual:

```mermaid
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
