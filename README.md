<<https://oliver4i2.github.io/SCAVRE/>>
<div align="center">
  <h1 style="color: #2F9E41;">SCAVRE</h1>
  <p><strong>Sistema de Controle de Acesso e Voucher Escolar | IFB</strong></p>

  ![Status](https://img.shields.io/badge/Status-Concluído-success?style=for-the-badge)
  ![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![Python](https://img.shields.io/badge/Linguagem-Python_3-3776AB?style=for-the-badge&logo=python&logoColor=white)
  ![SQLite/Postgres](https://img.shields.io/badge/Database-SQLAlchemy-4169E1?style=for-the-badge&logo=sqlite&logoColor=white)
</div>

---

## 📖 Visão Geral e Contextualização do Problema

No Instituto Federal de Brasília (IFB), o fornecimento de refeições aos estudantes através de auxílios e vouchers enfrenta desafios operacionais crônicos comuns a instituições públicas. O controle de acesso manual aos refeitórios é suscetível a falhas de segurança e fraudes, como o **consumo duplicado da cota diária** por um mesmo aluno, empréstimo indevido de credenciais e gargalos que geram filas extensas. 

Além do aspecto físico, o desafio estende-se à esfera administrativa: o processo de **auditoria e fechamento financeiro no fim do mês** para realizar o repasse do pagamento à empresa terceirizada (Cantina) é complexo, burocrático e passível de erros humanos.

---

## 🎯 Objetivos da Solução Desenvolvida

O **SCAVRE** nasce para solucionar essas dores através de uma plataforma integrada de hardware e software, tendo como principais objetivos:

1. **Erradicação de Fraudes:** Integrar leitores biométricos instalados nas catracas físicas ao ecossistema web, garantindo que o benefício seja intransferível e bloqueando automaticamente tentativas de consumo duplicado no mesmo dia.
2. **Alta Performance Operacional:** Reduzir o tempo de fila com validações biométricas em milissegundos e fornecer feedback visual instantâneo para o operador.
3. **Transparência e Auditoria:** Automatizar o processo de repasse financeiro, permitindo que a fiscalização audite refeição por refeição e gere protocolos de fechamento baseados em dados reais, criptografados e imutáveis.
4. **Governança Unificada:** Centralizar o gerenciamento de alunos, acompanhamento de faturamento da empresa contratada e livro de ocorrências disciplinares em uma única plataforma (Single Page Application).

---

## 🚀 Principais Decisões Técnicas Adotadas

A engenharia do SCAVRE foi guiada pelos princípios de escalabilidade, segurança e experiência do usuário (UX):

* **Arquitetura Desacoplada (Frontend/Backend):** Optou-se por isolar a camada de visualização (React) da camada de regras de negócio (FastAPI). Isso permite que o sistema escale de forma independente e que novos hardwares (como diferentes modelos de catraca) sejam plugados à API sem alterar o frontend.
* **Comunicação em Tempo Real via WebSockets:** Para que os painéis da cantina atualizem o faturamento e as refeições servidas instantaneamente a cada giro da catraca, adotamos WebSockets, eliminando a necessidade de *long-polling* excessivo no banco de dados.
* **Padrão MVC e ORM (Object-Relational Mapping):** Utilização do SQLAlchemy para mapear as entidades (Alunos, Refeições, Ocorrências). Isso garante integridade referencial, previne ataques de SQL Injection e facilita uma futura migração fluida de SQLite para PostgreSQL em ambiente de produção pesada.
* **Controle de Acesso Baseado em Perfis (RBAC):** O sistema não possui uma "tela genérica". A interface se transmuta dinamicamente entregando módulos diferentes dependendo se o usuário é Operador, Gestor, Fiscal ou Empresa, garantindo o "princípio do menor privilégio".
* **Design System (Glassmorphism e Responsividade):** Para combater a fadiga visual de operadores que olham para o sistema o dia todo, a interface adotou tons institucionais suaves, profundidade em multicamadas (sombras) e feedback contínuo (spinners, cores semânticas para erro/sucesso).

---

## 🛠️ Tecnologias Utilizadas

### Camada Cliente (Frontend)
* **React.js 18** (Biblioteca para construção de interfaces de usuário)
* **Vite** (Build tool super-rápido de nova geração)
* **Recharts** (Construção de painéis analíticos e gráficos responsivos)
* **Google OAuth 2.0** (Federação de identidades e autenticação corporativa segura)
* **CSS Nativo Avançado** (Animações, transições e variáveis de sistema)

### Camada Servidor e Dados (Backend)
* **Python 3** (Linguagem base)
* **FastAPI** (Framework web assíncrono de alta performance)
* **SQLAlchemy** (Mapeamento Objeto-Relacional)
* **Uvicorn** (Servidor ASGI ultrarrápido)
* **ReportLab / CSV** (Motores de exportação e geração de documentos de auditoria)

---

## 🏗️ Arquitetura e Modelagem de Dados

### Diagrama de Entidade-Relacionamento (DER)
```mermaid
erDiagram
    ALUNO ||--o{ REFEICAO : "realiza"
    ALUNO ||--o{ OCORRENCIA : "recebe"
    
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
