📊 Diagrama de Entidade-Relacionamento (DER / MER)
O modelo relacional do banco de dados foi projetado para garantir alto desempenho nas consultas de validação na catraca e rastreabilidade total para auditorias financeiras.

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
