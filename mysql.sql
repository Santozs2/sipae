-- SIPAE | Alocação docente
-- Compatível com MySQL 8.0.16+ (InnoDB, CHECK, JSON e triggers).
-- Execute no cliente mysql: SOURCE C:/caminho/para/coordenador-alocacoes/mysql.sql
-- O script cria o banco e as sete tabelas do DER, sem apagar alocações existentes.
-- A carga inicial é repetível: registros de catálogo já existentes são preservados.

CREATE DATABASE IF NOT EXISTS sipae_alocacoes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE sipae_alocacoes;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS curso (
  id_curso INT UNSIGNED NOT NULL,
  tipo ENUM('CT', 'CAI') NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  PRIMARY KEY (id_curso),
  KEY idx_curso_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS professor (
  id_professor INT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  atuacao ENUM('CT', 'CAI') NOT NULL,
  habilitado TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_professor),
  KEY idx_professor_atuacao (atuacao),
  CONSTRAINT chk_professor_habilitado CHECK (habilitado IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ambiente (
  id_ambiente INT UNSIGNED NOT NULL,
  identificacao VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_ambiente),
  UNIQUE KEY uq_ambiente_identificacao (identificacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS unidade_curricular (
  id_unidade VARCHAR(32) NOT NULL,
  id_curso INT UNSIGNED NOT NULL,
  nome VARCHAR(255) NOT NULL,
  semestres JSON NOT NULL,
  carga_horaria SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_unidade),
  KEY idx_unidade_curso (id_curso),
  CONSTRAINT fk_unidade_curso FOREIGN KEY (id_curso)
    REFERENCES curso (id_curso) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_unidade_carga CHECK (carga_horaria > 0),
  CONSTRAINT chk_unidade_semestres CHECK (JSON_TYPE(semestres) = 'ARRAY' AND JSON_LENGTH(semestres) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS alocacao (
  id_alocacao BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_professor INT UNSIGNED NOT NULL,
  id_curso INT UNSIGNED NOT NULL,
  confirmado_coordenacao TINYINT UNSIGNED NOT NULL DEFAULT 0,
  data_salva DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  data_edicao DATETIME(3) NULL,
  PRIMARY KEY (id_alocacao),
  KEY idx_alocacao_professor (id_professor),
  KEY idx_alocacao_curso (id_curso),
  KEY idx_alocacao_data (data_salva),
  CONSTRAINT fk_alocacao_professor FOREIGN KEY (id_professor)
    REFERENCES professor (id_professor) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_alocacao_curso FOREIGN KEY (id_curso)
    REFERENCES curso (id_curso) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_alocacao_confirmada CHECK (confirmado_coordenacao IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS alocacao_unidade (
  id_alocacao BIGINT UNSIGNED NOT NULL,
  id_unidade VARCHAR(32) NOT NULL,
  PRIMARY KEY (id_alocacao, id_unidade),
  KEY idx_alocacao_unidade_unidade (id_unidade),
  CONSTRAINT fk_item_alocacao FOREIGN KEY (id_alocacao)
    REFERENCES alocacao (id_alocacao) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_item_unidade FOREIGN KEY (id_unidade)
    REFERENCES unidade_curricular (id_unidade) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

-- Triggers garantem as regras entre tabelas que CHECK não consegue expressar.
DROP TRIGGER IF EXISTS trg_alocacao_bi;
DROP TRIGGER IF EXISTS trg_alocacao_bu;
DROP TRIGGER IF EXISTS trg_item_bi;
DROP TRIGGER IF EXISTS trg_item_bu;
DROP TRIGGER IF EXISTS trg_local_bi;
DROP TRIGGER IF EXISTS trg_local_bu;
DROP TRIGGER IF EXISTS trg_professor_bu;
DROP TRIGGER IF EXISTS trg_curso_bu;

DELIMITER $$

CREATE TRIGGER trg_alocacao_bi BEFORE INSERT ON alocacao
FOR EACH ROW
BEGIN
  DECLARE v_atuacao VARCHAR(3);
  DECLARE v_tipo VARCHAR(3);
  DECLARE v_habilitado TINYINT UNSIGNED;

  SELECT atuacao, habilitado INTO v_atuacao, v_habilitado
    FROM professor WHERE id_professor = NEW.id_professor;
  SELECT tipo INTO v_tipo FROM curso WHERE id_curso = NEW.id_curso;

  IF v_atuacao IS NULL OR v_tipo IS NULL OR v_atuacao <> v_tipo THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor e curso precisam ter a mesma atuacao (CT ou CAI)';
  END IF;
  IF v_habilitado = 1 AND NEW.confirmado_coordenacao <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor com habilitado 1 exige confirmacao da coordenacao';
  END IF;
END$$

CREATE TRIGGER trg_alocacao_bu BEFORE UPDATE ON alocacao
FOR EACH ROW
BEGIN
  DECLARE v_atuacao VARCHAR(3);
  DECLARE v_tipo VARCHAR(3);
  DECLARE v_habilitado TINYINT UNSIGNED;

  SELECT atuacao, habilitado INTO v_atuacao, v_habilitado
    FROM professor WHERE id_professor = NEW.id_professor;
  SELECT tipo INTO v_tipo FROM curso WHERE id_curso = NEW.id_curso;

  IF v_atuacao IS NULL OR v_tipo IS NULL OR v_atuacao <> v_tipo THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor e curso precisam ter a mesma atuacao (CT ou CAI)';
  END IF;
  IF v_habilitado = 1 AND NEW.confirmado_coordenacao <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor com habilitado 1 exige confirmacao da coordenacao';
  END IF;
  IF EXISTS (
    SELECT 1 FROM alocacao_unidade au
    JOIN unidade_curricular uc ON uc.id_unidade = au.id_unidade
    WHERE au.id_alocacao = OLD.id_alocacao AND uc.id_curso <> NEW.id_curso
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Remova as unidades antigas antes de trocar o curso';
  END IF;
  IF EXISTS (
    SELECT 1 FROM alocacao_unidade propria
    JOIN alocacao_unidade outra ON outra.id_unidade = propria.id_unidade
      AND outra.id_alocacao <> OLD.id_alocacao
    JOIN alocacao_ambiente local_proprio ON local_proprio.id_alocacao = OLD.id_alocacao
    JOIN alocacao_ambiente local_outro ON local_outro.id_alocacao = outra.id_alocacao
      AND local_outro.id_ambiente = local_proprio.id_ambiente
    JOIN alocacao a2 ON a2.id_alocacao = outra.id_alocacao
    WHERE propria.id_alocacao = OLD.id_alocacao
      AND a2.id_professor = NEW.id_professor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor, unidade e ambiente ja possuem outra alocacao';
  END IF;
  SET NEW.data_edicao = CURRENT_TIMESTAMP(3);
END$$

CREATE TRIGGER trg_item_bi BEFORE INSERT ON alocacao_unidade
FOR EACH ROW
BEGIN
  DECLARE v_curso INT UNSIGNED;
  DECLARE v_professor INT UNSIGNED;
  DECLARE v_curso_unidade INT UNSIGNED;

  SELECT id_curso, id_professor
    INTO v_curso, v_professor
    FROM alocacao WHERE id_alocacao = NEW.id_alocacao;
  SELECT id_curso INTO v_curso_unidade
    FROM unidade_curricular WHERE id_unidade = NEW.id_unidade;

  IF v_curso IS NULL OR v_curso_unidade IS NULL OR v_curso <> v_curso_unidade THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unidade curricular nao pertence ao curso da alocacao';
  END IF;
  IF EXISTS (
    SELECT 1 FROM alocacao_unidade au
    JOIN alocacao a2 ON a2.id_alocacao = au.id_alocacao
    JOIN alocacao_ambiente local_proprio ON local_proprio.id_alocacao = NEW.id_alocacao
    JOIN alocacao_ambiente local_outro ON local_outro.id_alocacao = au.id_alocacao
      AND local_outro.id_ambiente = local_proprio.id_ambiente
    WHERE au.id_unidade = NEW.id_unidade
      AND a2.id_professor = v_professor
      AND au.id_alocacao <> NEW.id_alocacao
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor, unidade e ambiente ja possuem outra alocacao';
  END IF;
END$$

CREATE TRIGGER trg_item_bu BEFORE UPDATE ON alocacao_unidade
FOR EACH ROW
BEGIN
  DECLARE v_curso INT UNSIGNED;
  DECLARE v_professor INT UNSIGNED;
  DECLARE v_curso_unidade INT UNSIGNED;

  SELECT id_curso, id_professor
    INTO v_curso, v_professor
    FROM alocacao WHERE id_alocacao = NEW.id_alocacao;
  SELECT id_curso INTO v_curso_unidade
    FROM unidade_curricular WHERE id_unidade = NEW.id_unidade;

  IF v_curso IS NULL OR v_curso_unidade IS NULL OR v_curso <> v_curso_unidade THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unidade curricular nao pertence ao curso da alocacao';
  END IF;
  IF EXISTS (
    SELECT 1 FROM alocacao_unidade au
    JOIN alocacao a2 ON a2.id_alocacao = au.id_alocacao
    JOIN alocacao_ambiente local_proprio ON local_proprio.id_alocacao = NEW.id_alocacao
    JOIN alocacao_ambiente local_outro ON local_outro.id_alocacao = au.id_alocacao
      AND local_outro.id_ambiente = local_proprio.id_ambiente
    WHERE au.id_unidade = NEW.id_unidade
      AND a2.id_professor = v_professor
      AND NOT (au.id_alocacao = OLD.id_alocacao AND au.id_unidade = OLD.id_unidade)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor, unidade e ambiente ja possuem outra alocacao';
  END IF;
END$$

CREATE TRIGGER trg_local_bi BEFORE INSERT ON alocacao_ambiente
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM alocacao_unidade propria
    JOIN alocacao a1 ON a1.id_alocacao = propria.id_alocacao
    JOIN alocacao_unidade outra ON outra.id_unidade = propria.id_unidade
      AND outra.id_alocacao <> propria.id_alocacao
    JOIN alocacao a2 ON a2.id_alocacao = outra.id_alocacao
      AND a2.id_professor = a1.id_professor
    JOIN alocacao_ambiente local_outro ON local_outro.id_alocacao = outra.id_alocacao
      AND local_outro.id_ambiente = NEW.id_ambiente
    WHERE propria.id_alocacao = NEW.id_alocacao
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor, unidade e ambiente ja possuem outra alocacao';
  END IF;
END$$

CREATE TRIGGER trg_local_bu BEFORE UPDATE ON alocacao_ambiente
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM alocacao_unidade propria
    JOIN alocacao a1 ON a1.id_alocacao = propria.id_alocacao
    JOIN alocacao_unidade outra ON outra.id_unidade = propria.id_unidade
      AND outra.id_alocacao <> propria.id_alocacao
    JOIN alocacao a2 ON a2.id_alocacao = outra.id_alocacao
      AND a2.id_professor = a1.id_professor
    JOIN alocacao_ambiente local_outro ON local_outro.id_alocacao = outra.id_alocacao
      AND local_outro.id_ambiente = NEW.id_ambiente
    WHERE propria.id_alocacao = NEW.id_alocacao
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Professor, unidade e ambiente ja possuem outra alocacao';
  END IF;
END$$

CREATE TRIGGER trg_professor_bu BEFORE UPDATE ON professor
FOR EACH ROW
BEGIN
  IF OLD.atuacao <> NEW.atuacao AND EXISTS (
    SELECT 1 FROM alocacao WHERE id_professor = OLD.id_professor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nao altere a atuacao de professor com alocacoes';
  END IF;
  IF OLD.habilitado = 0 AND NEW.habilitado = 1 AND EXISTS (
    SELECT 1 FROM alocacao
    WHERE id_professor = OLD.id_professor AND confirmado_coordenacao = 0
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Confirme as alocacoes antes de mudar habilitado para 1';
  END IF;
END$$

CREATE TRIGGER trg_curso_bu BEFORE UPDATE ON curso
FOR EACH ROW
BEGIN
  IF OLD.tipo <> NEW.tipo AND EXISTS (
    SELECT 1 FROM alocacao WHERE id_curso = OLD.id_curso
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nao altere o tipo de curso com alocacoes';
  END IF;
END$$

DELIMITER ;

-- Carga inicial: catálogos presentes em data.js. IDs são preservados.
-- BEGIN CARGA GERADA

INSERT IGNORE INTO curso (id_curso, tipo, titulo) VALUES
  (1, 'CAI', 'Eletricista Industrial'),
  (2, 'CAI', 'Mecânico de Automóveis Leves'),
  (3, 'CAI', 'Mecânico de Manutenção de Máquinas Agrícolas e Veículos Pesados'),
  (4, 'CAI', 'Mecânico de Usinagem'),
  (5, 'CAI', 'Soldador'),
  (6, 'CT', 'Administração'),
  (7, 'CT', 'Desenvolvimento de Sistemas'),
  (8, 'CT', 'Eletroeletrônica'),
  (9, 'CT', 'Eletromecânica'),
  (10, 'CT', 'Mecatrônica');

INSERT IGNORE INTO professor (id_professor, nome, atuacao, habilitado) VALUES
  (1, 'MARIA LUIZA PEREIRA BELLO', 'CT', 1),
  (2, 'JOAO MACIEL RAMOS', 'CT', 1),
  (3, 'WELCIO VITOR BASTOS', 'CAI', 0),
  (4, 'HUMBERTO NOGUEIRA RODRIGUES', 'CT', 1),
  (5, 'VANDA PERPETUO PELACANI COSEQUI', 'CAI', 0),
  (6, 'ISMAEL DE OLIVEIRA', 'CT', 1),
  (7, 'MARLON ANDRE PONTEL GENOVA', 'CAI', 1),
  (8, 'JOSE HENRIQUE DA CRUZ', 'CAI', 1),
  (9, 'MARCIO RIBEIRO DE SOUZA', 'CAI', 0),
  (10, 'EVERTON FERNANDO DA SILVA CARDENAS', 'CAI', 0),
  (11, 'EMERSON MARCELO DA SILVA', 'CAI', 0),
  (12, 'VILSON DA ROCHA PINA', 'CAI', 0),
  (13, 'RODRIGO DA SILVA GARCIA', 'CAI', 0),
  (14, 'REGINA ROBLES PASCHOAL', 'CAI', 0),
  (15, 'TAIS GUZZO VENTURA LIMA HABER', 'CT', 1),
  (16, 'LEANDRO SOARES DOS SANTOS', 'CAI', 1),
  (17, 'ROBERTO AVEIRO', 'CT', 1),
  (18, 'ELVIS SANTOS GARCIA', 'CAI', 1),
  (19, 'ROGERIO SABADIN BAZAN', 'CAI', 0),
  (20, 'DANIEL MEIRELES DO REGO', 'CT', 1),
  (21, 'TIAGO LINO PEREIRA', 'CAI', 1),
  (22, 'DANILO JOSE DE MATTOS PETINELLI', 'CAI', 1),
  (23, 'NATHAN DE MATOS ONHA FERREIRA', 'CT', 0),
  (24, 'RAFAEL GARCIA LOPES', 'CAI', 1),
  (25, 'BRUNO RIBEIRO SIQUEIRA', 'CT', 0),
  (26, 'VITOR LEITE DE ALMEIDA', 'CAI', 1),
  (27, 'LUCAS ANTONIO ALVES DE GODOI', 'CT', 1),
  (28, 'RODRIGO ATTIQUE SANTANA', 'CT', 0),
  (29, 'FELIPE FERNANDES CALIXTO', 'CT', 1),
  (30, 'MURILO HENRIQUE COLODETE', 'CAI', 1),
  (31, 'NATANAEL DOUGLAS HORACIO ALVES', 'CT', 0),
  (32, 'THADEU PARAMO MELEIRO', 'CAI', 0),
  (33, 'ALEXANDRE MENDONCA CINTRA', 'CT', 1),
  (34, 'LUCAS LOPES FERREIRA CANDIDO', 'CT', 0),
  (35, 'SAULO DE DEUS LOPES', 'CT', 0),
  (36, 'JONATAN THIAGO MONTE', 'CT', 0),
  (37, 'DEDYLON ANTONIO GARCIA', 'CT', 0),
  (38, 'MURILO DE SOUZA MATTOS', 'CAI', 0),
  (39, 'MARCOS MICHEL DE SOUZA', 'CT', 0),
  (40, 'RODOLFO BARBOSA RODRIGUES', 'CT', 0),
  (41, 'PAULO ROBERTO DE BIAGE AZEVEDO', 'CAI', 0),
  (42, 'FABIANO ASSUNCAO SANTOS', 'CAI', 1),
  (43, 'JERRY FABIANO SCHUINDT CASIMIRO', 'CAI', 0),
  (44, 'JOSE PATRICIO DE OLIVEIRA JUNIOR', 'CT', 0),
  (45, 'LUANA PEREZ LEAL', 'CT', 0),
  (46, 'LEONARDO TRETTEL TILLINGER', 'CT', 1),
  (47, 'GUILHERME MANZATO SANTO', 'CAI', 0),
  (48, 'GUILHERME HENRIQUE GIROLLI', 'CT', 0),
  (49, 'ALLAN SANTOS ALVARES DE LIMA', 'CT', 0),
  (50, 'EDUARDO HENRIQUE DA SILVA', 'CT', 1),
  (51, 'DEIVID VICENT DE ALMEIDA COSTA', 'CAI', 0),
  (52, 'EDINELSON BRAZ', 'CAI', 0),
  (53, 'CELSO ACACIO FILHO', 'CAI', 0),
  (54, 'ADOIL JOSE DA COSTA JUNIOR', 'CT', 0),
  (55, 'LEONARDO LUIZ DA SILVA', 'CAI', 0),
  (56, 'FERNANDO BISPO DOS SANTOS', 'CAI', 0),
  (57, 'REUESLEI CASSIO FERREIRA DE OLIVEIRA', 'CAI', 0),
  (58, 'JEFERSON FERREIRA DOS SANTOS', 'CT', 1),
  (59, 'WILSON QUEIROZ RIBEIRO', 'CT', 0),
  (60, 'RAFHAEL RODRIGO DOS SANTOS', 'CT', 0),
  (61, 'JOSE ALBERTO CORREA DE SOUZA FILHO', 'CT', 0),
  (62, 'RICARDO DELGADO DE SOUZA', 'CT', 0),
  (63, 'ANDRE LUIS BORSATO SANCHEZ', 'CT', 0),
  (64, 'RIRLEY AUGUSTO NERY EVANGELISTA', 'CAI', 1),
  (65, 'SAMUEL HONORATO', 'CT', 0),
  (66, 'ELIAS HENRIQUE FUSTER FUENTEALBA', 'CAI', 0),
  (67, 'PEDRO COLTRO DO CARMO', 'CT', 0),
  (68, 'JULIA NOSKI RIBEIRO', 'CT', 0),
  (69, 'ERIK ESTEVAN ANDRADE DOS SANTOS', 'CAI', 0),
  (70, 'JOAO LUIS BURLINA', 'CAI', 0),
  (71, 'SUELI DA SILVA REZENDE NASCIMENTO', 'CAI', 0),
  (72, 'ALDELEIA GARCIA FRASONI', 'CAI', 0),
  (73, 'BERNARDO', 'CT', 0);

INSERT IGNORE INTO ambiente (id_ambiente, identificacao) VALUES
  (1, 'Metrologia'),
  (2, 'Costura'),
  (3, 'C1'),
  (4, 'C2'),
  (5, 'C3'),
  (6, 'C4'),
  (7, 'C5'),
  (8, 'Automação Residencial'),
  (9, 'Máquinas Elétricas'),
  (10, 'CLP'),
  (11, 'Automação'),
  (12, 'TI1'),
  (13, 'TI1 e TI2'),
  (14, 'TI2'),
  (15, 'TI3'),
  (16, 'Simulador Solda'),
  (17, 'Robotica'),
  (18, 'Redes'),
  (19, 'Oficina Ar Condicionado'),
  (20, 'Oficina Instalações Elétricas 01'),
  (21, 'Oficina Instalações Elétricas 02'),
  (22, 'Oficina Soldagem'),
  (23, 'Oficina Tornearia'),
  (24, 'Oficina Ajustagem'),
  (25, 'Oficina CNC'),
  (26, 'Oficina Leves'),
  (27, 'Oficina Pesados');

INSERT IGNORE INTO unidade_curricular (id_unidade, id_curso, nome, semestres, carga_horaria) VALUES
  ('c6-r3', 6, 'Linguagens em Multimeios', '[1]', 60),
  ('c6-r4', 6, 'Organização e Estrutura Empresarial', '[1,2]', 75),
  ('c6-r5', 6, 'Ferramentas Digitais para o Mercado de Trabalho', '[1]', 60),
  ('c6-r6', 6, 'Performance Pessoal e Profissional', '[1]', 60),
  ('c6-r7', 6, 'Tendências e Inovações', '[4]', 75),
  ('c6-r8', 6, 'Comunicação Estratégica Corporativa', '[1,2]', 150),
  ('c6-r9', 6, 'Capital Humano e Desenvolvimento de Talentos', '[2,3]', 195),
  ('c6-r10', 6, 'Finanças Integradas', '[3,4]', 180),
  ('c6-r11', 6, 'Logística Integrada e Sustentável', '[2,3]', 150),
  ('c6-r12', 6, 'Aprimoramento de Processos', '[3,4]', 195),
  ('c7-r18', 7, 'Fundamentos de Programação Orientada a Objeto', '[1,2]', 180),
  ('c7-r19', 7, 'Sistemas Operacionais', '[1]', 75),
  ('c7-r20', 7, 'Hardware e Redes', '[1]', 75),
  ('c7-r21', 7, 'Linguagem de Marcação', '[1]', 75),
  ('c7-r22', 7, 'Programação Web Front-End', '[2]', 75),
  ('c7-r23', 7, 'Banco de Dados', '[3]', 75),
  ('c7-r24', 7, 'Programação Web Back-End', '[2,3]', 180),
  ('c7-r25', 7, 'Interface para Dispositivos Móveis', '[3]', 75),
  ('c7-r26', 7, 'Programação para Dispositivos Móveis', '[3]', 90),
  ('c7-r27', 7, 'Requisitos e Modelagem de Software', '[4]', 45),
  ('c7-r28', 7, 'Testes de Software', '[4]', 30),
  ('c7-r29', 7, 'Projetos', '[4]', 225),
  ('c8-r35', 8, 'Fundamentos da Eletroeletrônica', '[1]', 120),
  ('c8-r36', 8, 'Ferramentas Digitais para o Mercado de Trabalho', '[1]', 60),
  ('c8-r37', 8, 'Implementação de Sistemas Eletroeletrônicos Prediais', '[1]', 120),
  ('c8-r38', 8, 'Linguagens em Multimeios', '[2]', 60),
  ('c8-r39', 8, 'Performance Pessoal e Profissional', '[2]', 60),
  ('c8-r40', 8, 'Implementação de Sistemas Eletroeletrônicos Industriais', '[2]', 120),
  ('c8-r41', 8, 'Implementação de Sistemas Eletrônicos Industriais', '[2]', 60),
  ('c8-r42', 8, 'Processos de Implementação de Sistemas Eletroeletrônicos', '[3]', 45),
  ('c8-r43', 8, 'Manutenção de Sistemas Eletroeletrônicos Prediais', '[3]', 60),
  ('c8-r44', 8, 'Manutenção de Sistemas Eletroeletrônicos Industriais', '[3]', 90),
  ('c8-r45', 8, 'Manutenção de Sistemas Eletrônicos Industriais', '[3]', 60),
  ('c8-r46', 8, 'Supervisão da Manutenção de Sistemas Eletroeletrônicos', '[3]', 45),
  ('c8-r47', 8, 'Projeto de Sistemas Eletroeletrônicos Prediais', '[4]', 90),
  ('c8-r48', 8, 'Projeto de Sistemas Eletroeletrônicos Industriais', '[4]', 120),
  ('c8-r49', 8, 'Projeto de Circuitos Eletrônicos Industriais', '[4]', 90),
  ('c9-r55', 9, 'Leitura e interpretação de desenho técnico', '[1]', 45),
  ('c9-r56', 9, 'Controle dimensional', '[1]', 45),
  ('c9-r57', 9, 'Cálculo técnico', '[1]', 60),
  ('c9-r58', 9, 'Fundamentos da eletromecânica', '[1]', 75),
  ('c9-r59', 9, 'Técnicas de usinagem em máquinas convencionais', '[1]', 75),
  ('c9-r60', 9, 'Fundamentos da hidráulica e pneumática', '[2]', 45),
  ('c9-r61', 9, 'Sistemas eletroeletrônicos aplicados a eletromecânica', '[2]', 105),
  ('c9-r62', 9, 'Sistemas mecânicos aplicados a eletromecânica', '[2]', 105),
  ('c9-r63', 9, 'Gestão de processos da eletromecânica', '[2]', 45),
  ('c9-r64', 9, 'Linguagem em multimeios', '[3]', 60),
  ('c9-r65', 9, 'Manufatura digital', '[3]', 75),
  ('c9-r66', 9, 'Integração de conjuntos eletromecânicos', '[3]', 105),
  ('c9-r67', 9, 'Automação aplicada a eletromecânica', '[3]', 60),
  ('c9-r68', 9, 'Ferramentas digitais para o mercado de trabalho', '[4]', 60),
  ('c9-r69', 9, 'Performance pessoal e profissional', '[4]', 60),
  ('c9-r70', 9, 'Manutenção de sistemas eletromecânicos', '[4]', 105),
  ('c9-r71', 9, 'Projetos eletromecânicos', '[4]', 75),
  ('c10-r77', 10, 'Comunicação em Multimeios', '[1]', 45),
  ('c10-r78', 10, 'Eletroeletrônica Aplicada a Sistemas Automatizados', '[1]', 105),
  ('c10-r80', 10, 'Mecânica Aplicada a Sistemas Automatizados', '[1]', 120),
  ('c10-r81', 10, 'Lógica de Programação', '[1]', 30),
  ('c10-r82', 10, 'Sistemas Eletropneumática e Eletrohidráulica', '[2]', 75),
  ('c10-r83', 10, 'Elementos Eletroeletrônicos e Acionamentos', '[2]', 105),
  ('c10-r84', 10, 'Processos Mecânicos', '[2]', 75),
  ('c10-r85', 10, 'Controladores Lógicos Programáveis', '[3]', 150),
  ('c10-r86', 10, 'Sistemas Embarcados', '[2,3]', 135),
  ('c10-r87', 10, 'Tecnologia de Produção Mecânica', '[3]', 60),
  ('c10-r88', 10, 'Integração de Sistemas Automatizados', '[4]', 150),
  ('c10-r89', 10, 'Gestão da Manutenção de Sistemas Mecatrônicos', '[4]', 60),
  ('c10-r90', 10, 'Projetos Mecatrônicos', '[4]', 90),
  ('c2-r3', 2, 'Letramento Digital', '[1]', 80),
  ('c2-r4', 2, 'Fundamentos da Mecânica Automotiva', '[1]', 120),
  ('c2-r5', 2, 'Cálculos Aplicados à Automotiva', '[1]', 40),
  ('c2-r6', 2, 'Fundamentos da Eletroeletrônica Automotiva', '[1]', 80),
  ('c2-r7', 2, 'Processos de Soldagem Aplicados à Automotiva', '[1]', 80),
  ('c2-r8', 2, 'Desenvolvimento Profissional e Comunicação', '[2]', 80),
  ('c2-r9', 2, 'Manutenção em Sistemas de Suspensão, Direção e Freios de Veículos Leves', '[2]', 120),
  ('c2-r10', 2, 'Manutenção em Sistemas de Carga e Partida de Veículos Leves', '[2]', 80),
  ('c2-r11', 2, 'Manutenção em Sistemas de Sinalização e Iluminação de Veículos Leves', '[2]', 40),
  ('c2-r12', 2, 'Manutenção em Sistemas Eletroeletrônicos Embarcados de Veículos Leves', '[2,3]', 200),
  ('c2-r13', 2, 'Manutenção em Sistema de Climatização de Veículos Leves', '[3]', 80),
  ('c2-r14', 2, 'Manutenção em Sistema de Transmissão Mecânica de Veículos Leves', '[3]', 200),
  ('c2-r15', 2, 'Manutenção em Sistemas Mecânicos de Motores Ciclo Otto', '[4]', 240),
  ('c2-r16', 2, 'Manutenção em Sistemas de Gerenciamento Eletrônico do Motor de Veículos Leves', '[4]', 160),
  ('c1-r22', 1, 'Desenvolvimento Profissional e Comunicação', '[1]', 80),
  ('c1-r23', 1, 'Letramento Digital', '[1]', 80),
  ('c1-r24', 1, 'Fundamentos da Eletroeletrônica', '[1]', 120),
  ('c1-r25', 1, 'Fundamentos de Sistemas Eletroeletrônicos Industriais', '[1]', 120),
  ('c1-r26', 1, 'Montagem de Infraestrutura Eletroeletrônica', '[2]', 80),
  ('c1-r27', 1, 'Montagem e Instalação de Sistemas Eletroeletrônicos Industriais', '[2]', 120),
  ('c1-r28', 1, 'Integração de Sistemas Eletroeletrônicos Industriais', '[2]', 120),
  ('c1-r29', 1, 'Manutenção e Controle de Sistemas Eletroeletrônicos Industriais', '[2]', 80),
  ('c3-r35', 3, 'Fundamentos da Mecânica Automotiva', '[1]', 120),
  ('c3-r36', 3, 'Fundamentos da Eletroeletrônica Automotiva', '[1]', 80),
  ('c3-r37', 3, 'Cálculos Aplicados à Automotiva', '[1]', 40),
  ('c3-r38', 3, 'Letramento Digital', '[1]', 80),
  ('c3-r39', 3, 'Processos de Soldagem Aplicados à Automotiva', '[1]', 80),
  ('c3-r40', 3, 'Desenvolvimento Profissional e Comunicação', '[2]', 80),
  ('c3-r41', 3, 'Hidráulica Móbil', '[2]', 80),
  ('c3-r42', 3, 'Manutenção em Sistemas de Suspensão, Direção e Freios de Máquinas Agrícolas e Veículos Pesados', '[2]', 240),
  ('c3-r43', 3, 'Manutenção em Sistemas de Transmissão de Máquinas Agrícolas e Veículos Pesados', '[3]', 200),
  ('c3-r44', 3, 'Manutenção em Sistemas Hidráulicos e Implementos de Tratores e Colhedoras', '[3]', 160),
  ('c3-r45', 3, 'Manutenção em Motores de Máquinas Agrícolas e Veículos Pesados', '[3,4]', 200);

INSERT IGNORE INTO unidade_curricular (id_unidade, id_curso, nome, semestres, carga_horaria) VALUES
  ('c3-r46', 3, 'Manutenção em Sistemas Eletroeletrônicos de Máquinas Agrícolas e Veículos Pesados', '[4]', 240),
  ('c5-r52', 5, 'Desenvolvimento Pessoal e Comunicação', '[1]', 80),
  ('c5-r53', 5, 'Letramento Digital', '[1]', 80),
  ('c5-r54', 5, 'Leitura e Interpretação de Desenho Técnico', '[1]', 40),
  ('c5-r55', 5, 'Ciências Aplicadas', '[1]', 40),
  ('c5-r56', 5, 'Fundamentos de Soldagem', '[1]', 160),
  ('c5-r57', 5, 'Processos Manuais de Soldagem', '[2]', 160),
  ('c5-r58', 5, 'Processos Semiautomáticos de Soldagem', '[2]', 160),
  ('c5-r59', 5, 'Soldagem Robotizada', '[2]', 40),
  ('c5-r60', 5, 'Controle de Qualidade', '[2]', 40),
  ('c4-r71', 4, 'Controle Dimensional', '[3]', 80),
  ('c4-r72', 4, 'Usinagem em Máquinas Convencionais', '[3,4]', 400),
  ('c4-r73', 4, 'Usinagem em Máquinas a CNC', '[3,4]', 320);
