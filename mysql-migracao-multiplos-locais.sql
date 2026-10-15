-- Execute uma vez somente se o banco foi criado pelo mysql.sql antigo,
-- que guardava um único id_ambiente diretamente em alocacao.
-- Faça backup antes. Depois execute o mysql.sql atualizado para recriar os triggers.
USE sipae_alocacoes;

DROP TRIGGER IF EXISTS trg_alocacao_bi;
DROP TRIGGER IF EXISTS trg_alocacao_bu;
DROP TRIGGER IF EXISTS trg_item_bi;
DROP TRIGGER IF EXISTS trg_item_bu;
DROP TRIGGER IF EXISTS trg_local_bi;
DROP TRIGGER IF EXISTS trg_local_bu;
DROP TRIGGER IF EXISTS trg_professor_bu;
DROP TRIGGER IF EXISTS trg_curso_bu;

CREATE TABLE IF NOT EXISTS alocacao_ambiente (
  id_alocacao BIGINT UNSIGNED NOT NULL,
  id_ambiente INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_alocacao, id_ambiente),
  KEY idx_alocacao_ambiente_ambiente (id_ambiente),
  CONSTRAINT fk_local_alocacao FOREIGN KEY (id_alocacao)
    REFERENCES alocacao (id_alocacao) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_local_ambiente FOREIGN KEY (id_ambiente)
    REFERENCES ambiente (id_ambiente) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO alocacao_ambiente (id_alocacao, id_ambiente)
SELECT id_alocacao, id_ambiente FROM alocacao;

ALTER TABLE alocacao
  DROP FOREIGN KEY fk_alocacao_ambiente,
  DROP INDEX idx_alocacao_ambiente,
  DROP COLUMN id_ambiente;
