-- =============================================================================
-- Heaven · banco completo em MySQL (substitui o Supabase)
-- =============================================================================
-- Rode uma vez na sua VPS:
--
--   mysql -u root -p < schema.sql
--
-- Compatível com MySQL 5.7+ e MariaDB 10.2+.
-- Idempotente: pode rodar de novo sem perder dado.
--
-- DIFERENÇA CRÍTICA PARA O SUPABASE
-- O Supabase protegia os dados no próprio banco (RLS): por isso a chave anon
-- podia ficar exposta no navegador sem risco. MySQL não tem isso. Aqui quem
-- protege é a API. Regra que não se quebra:
--
--   a senha do MySQL vive SÓ no servidor, em variável de ambiente.
--   O navegador NUNCA fala com o banco — só com a API.
--
-- Se a credencial do banco aparecer em qualquer arquivo dentro de /admin,
-- /portfolio ou na raiz do site, qualquer visitante lê e apaga tudo.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS heaven
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE heaven;


-- =============================================================================
-- 1. USUÁRIOS DO PAINEL  (substitui o Supabase Auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(160) NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL COMMENT 'bcrypt — nunca a senha em texto',
  nome        VARCHAR(120) NULL,
  ativo       TINYINT(1)   NOT NULL DEFAULT 1,
  ultimo_acesso TIMESTAMP  NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- Sessões do painel. Guardamos só o hash do token: se o banco vazar, ninguém
-- entra com o que está gravado aqui.
CREATE TABLE IF NOT EXISTS sessoes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL COMMENT 'sha256 do token do cookie',
  expira_em   TIMESTAMP    NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessoes_token (token_hash),
  KEY idx_sessoes_expira (expira_em),
  CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 2. PORTFÓLIO
-- =============================================================================
CREATE TABLE IF NOT EXISTS portfolio_projetos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug          VARCHAR(60)  NOT NULL COMMENT 'identificador curto; aparece nos cliques',
  cliente       VARCHAR(120) NOT NULL,
  segmento      VARCHAR(160) NULL     COMMENT 'ex.: Moda praia · Paulista/PE',
  titulo        VARCHAR(240) NULL,
  resumo        TEXT         NULL,
  entregas      TEXT         NULL     COMMENT 'etiquetas separadas por vírgula',
  url           VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'vazio = card "em preparação"',
  cover         VARCHAR(500) NULL,
  cor_1         VARCHAR(9)   NOT NULL DEFAULT '#1b2233',
  cor_2         VARCHAR(9)   NOT NULL DEFAULT '#3b9eff',
  tipo          VARCHAR(60)  NOT NULL DEFAULT 'Projeto entregue',
  ano           VARCHAR(9)   NULL,
  publicado     TINYINT(1)   NOT NULL DEFAULT 1,
  ordem         INT          NOT NULL DEFAULT 0 COMMENT 'menor aparece primeiro',
  criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portfolio_slug (slug),
  KEY idx_portfolio_listagem (publicado, ordem, criado_em)
) ENGINE=InnoDB;

INSERT INTO portfolio_projetos
  (slug, cliente, segmento, titulo, resumo, entregas, url, cor_1, cor_2, tipo, ano, ordem)
VALUES (
  'marevia',
  'Marévia',
  'Moda praia e fitness · Paulista/PE',
  'Uma IA vendendo no WhatsApp — e o painel que mostra qual anúncio virou venda',
  'Operação de mil conversas por dia no WhatsApp, R$ 98 mil por mês em anúncio e nenhuma forma de saber qual criativo gerou qual venda. O sistema fecha esse buraco: o agente atende, consulta estoque e gera o Pix; a venda volta carimbada no anúncio de origem.',
  'Atendimento com IA,Atribuição de anúncio,Admin e estoque,Loja com checkout',
  '',
  '#0B3B3C', '#D1416A',
  'Protótipo de demonstração',
  '2026',
  0
) ON DUPLICATE KEY UPDATE slug = slug;


-- =============================================================================
-- 3. TRACKING DE ACESSOS  (substitui linkbio_events)
-- =============================================================================
CREATE TABLE IF NOT EXISTS eventos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo        ENUM('visit','click') NOT NULL,
  slug        VARCHAR(80)  NULL COMMENT 'card clicado; nulo em visit',
  destino     VARCHAR(500) NULL,
  caminho     VARCHAR(200) NULL COMMENT 'ex.: /, /linkbio, /portfolio',
  referer     VARCHAR(500) NULL,
  user_agent  VARCHAR(400) NULL,
  ip_hash     CHAR(64)     NULL COMMENT 'sha256 do IP + sal; não guardamos IP puro',
  ocorreu_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_eventos_tipo_tempo (tipo, ocorreu_em),
  KEY idx_eventos_caminho (caminho, ocorreu_em),
  KEY idx_eventos_slug (slug, ocorreu_em)
) ENGINE=InnoDB;

-- Agregados que o /admin lê. São VIEWs, iguais em espírito às do Supabase:
-- o painel nunca toca no evento cru.
CREATE OR REPLACE VIEW eventos_diarios AS
SELECT
  DATE(ocorreu_em)                    AS dia,
  tipo,
  COALESCE(caminho, '(desconhecido)') AS caminho,
  slug,
  COUNT(*)                            AS total
FROM eventos
GROUP BY dia, tipo, caminho, slug;

CREATE OR REPLACE VIEW eventos_origens AS
SELECT
  DATE(ocorreu_em) AS dia,
  CASE
    WHEN referer IS NULL OR referer = '' THEN '(direto)'
    ELSE LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(referer, '://', -1), '/', 1), ':', 1))
  END              AS origem,
  COUNT(*)         AS total
FROM eventos
WHERE tipo = 'visit'
GROUP BY dia, origem;


-- =============================================================================
-- 4. LEADS DO FUNIL  (substitui a Edge Function lead-webhook)
-- =============================================================================
-- Só entra em uso se você decidir migrar o funil também. A tabela fica pronta
-- de qualquer jeito — criar tabela vazia não custa nada e não quebra nada.
CREATE TABLE IF NOT EXISTS leads (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sessao        VARCHAR(64)  NULL COMMENT 'agrupa envios parciais do mesmo visitante',
  nome          VARCHAR(160) NULL,
  whatsapp      VARCHAR(40)  NULL,
  email         VARCHAR(160) NULL,
  empresa       VARCHAR(160) NULL,
  faturamento   VARCHAR(60)  NULL,
  aceita_minimo TINYINT(1)   NULL COMMENT 'aceite do investimento mínimo',
  qualificacao  VARCHAR(40)  NULL COMMENT 'nao_qualificado, qualificado, ultra',
  origem        VARCHAR(60)  NULL DEFAULT 'google_ads',
  motivo        VARCHAR(120) NULL COMMENT 'por que caiu nessa qualificacao',
  status        VARCHAR(40)  NULL COMMENT 'iniciado, concluido…',
  completo      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '0 = abandonou no meio',
  pagina        VARCHAR(500) NULL,
  referer       VARCHAR(500) NULL,
  user_agent    VARCHAR(400) NULL,
  -- Copia crua do que o funil enviou. Migracao de lead sem isso e aposta:
  -- se algum campo ficar de fora do mapeamento, ele continua recuperavel aqui.
  payload_bruto TEXT         NULL,
  criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_leads_sessao (sessao),
  KEY idx_leads_criado (criado_em),
  KEY idx_leads_qualificacao (qualificacao, criado_em)
) ENGINE=InnoDB;


-- =============================================================================
-- 5. USUÁRIO DO BANCO PARA A API
-- =============================================================================
-- A API não entra como root. Crie um usuário só dela, com permissão só no que
-- precisa. Troque a senha antes de rodar.
--
--   CREATE USER IF NOT EXISTS 'heaven_api'@'localhost' IDENTIFIED BY 'TROQUE_ESTA_SENHA';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON heaven.* TO 'heaven_api'@'localhost';
--   FLUSH PRIVILEGES;
--
-- 'localhost' de propósito: se a API roda na mesma VPS, o MySQL não precisa
-- aceitar conexão de fora. Mantenha a porta 3306 fechada no firewall.


-- =============================================================================
-- 6. CRIAR SEU LOGIN DO PAINEL
-- =============================================================================
-- Gere o hash bcrypt da sua senha (na VPS, com a API já instalada):
--
--   node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" 'SUA_SENHA'
--
-- Depois:
--
--   INSERT INTO usuarios (email, senha_hash, nome)
--   VALUES ('contato.heavenagenciamkt@gmail.com', '$2a$10$COLE_O_HASH', 'Juan')
--   ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash);


-- =============================================================================
-- Conferir:
--   USE heaven;
--   SHOW TABLES;
--   SELECT slug, cliente, publicado FROM portfolio_projetos;
-- =============================================================================
