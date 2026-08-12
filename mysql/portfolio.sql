-- =============================================================================
-- Heaven · Portfólio de projetos — MySQL
-- =============================================================================
-- Rode uma vez no seu MySQL (phpMyAdmin, Workbench, HeidiSQL ou linha de comando):
--
--   mysql -u USUARIO -p NOME_DO_BANCO < portfolio.sql
--
-- Compatível com MySQL 5.7+ e MariaDB 10.2+.
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- IMPORTANTE — diferença para o Supabase:
-- O MySQL não tem RLS (regra de permissão por linha). Quem protege os dados aqui
-- é a API, não o banco. Ou seja: a senha do MySQL vive SÓ no servidor, e o
-- navegador nunca fala com o banco direto. Se a credencial aparecer no front,
-- qualquer visitante apaga seu portfólio inteiro.
-- =============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS portfolio_projetos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  slug          VARCHAR(60)  NOT NULL COMMENT 'identificador curto; aparece nos cliques',
  cliente       VARCHAR(120) NOT NULL COMMENT 'nome grande do card',
  segmento      VARCHAR(160) NULL     COMMENT 'ex.: Moda praia · Paulista/PE',
  titulo        VARCHAR(240) NULL     COMMENT 'o que foi entregue',
  resumo        TEXT         NULL     COMMENT '2 a 3 linhas',

  -- Etiquetas do card. JSON em MySQL 5.7+; se seu servidor for mais antigo,
  -- troque por TEXT e guarde separado por vírgula (a API já trata os dois).
  entregas      JSON         NULL,

  url           VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'demo no ar; vazio = "em preparação"',
  cover         VARCHAR(500) NULL              COMMENT 'imagem de capa; nulo = capa gerada',
  cor_1         VARCHAR(9)   NOT NULL DEFAULT '#1b2233',
  cor_2         VARCHAR(9)   NOT NULL DEFAULT '#3b9eff',
  tipo          VARCHAR(60)  NOT NULL DEFAULT 'Projeto entregue',
  ano           VARCHAR(9)   NULL,

  publicado     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '0 = rascunho, some da página pública',
  ordem         INT          NOT NULL DEFAULT 0 COMMENT 'menor aparece primeiro',

  criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_portfolio_slug (slug),
  KEY idx_portfolio_listagem (publicado, ordem, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- Primeiro projeto: a demo Marévia.
-- `url` vazio de propósito — o card mostra "Em preparação" até você colar o
-- link da Vercel, sem prometer o que ainda não está no ar.
-- =============================================================================
INSERT INTO portfolio_projetos
  (slug, cliente, segmento, titulo, resumo, entregas, url, cor_1, cor_2, tipo, ano, ordem)
VALUES (
  'marevia',
  'Marévia',
  'Moda praia e fitness · Paulista/PE',
  'Uma IA vendendo no WhatsApp — e o painel que mostra qual anúncio virou venda',
  'Operação de mil conversas por dia no WhatsApp, R$ 98 mil por mês em anúncio e nenhuma forma de saber qual criativo gerou qual venda. O sistema fecha esse buraco: o agente atende, consulta estoque e gera o Pix; a venda volta carimbada no anúncio de origem.',
  '["Atendimento com IA","Atribuição de anúncio","Admin e estoque","Loja com checkout"]',
  '',
  '#0B3B3C',
  '#D1416A',
  'Protótipo de demonstração',
  '2026',
  0
)
ON DUPLICATE KEY UPDATE slug = slug;  -- já existe? não faz nada


-- =============================================================================
-- Usuário do painel.
-- A senha NUNCA é gravada em texto puro: guardamos o hash.
-- Para gerar o hash, use um destes (a API valida qualquer um dos dois):
--
--   PHP:   php -r "echo password_hash('SUA_SENHA', PASSWORD_BCRYPT), PHP_EOL;"
--   Node:  npx -y bcrypt-cli hash 'SUA_SENHA'
--
-- Depois troque o valor abaixo e rode o INSERT.
-- =============================================================================
CREATE TABLE IF NOT EXISTS portfolio_usuarios (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(160) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt — nunca a senha em texto',
  nome       VARCHAR(120) NULL,
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portfolio_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Descomente e troque o hash depois de gerar:
-- INSERT INTO portfolio_usuarios (email, senha_hash, nome)
-- VALUES ('contato.heavenmkt@gmail.com', '$2y$10$COLE_SEU_HASH_AQUI', 'Juan')
-- ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash);


-- =============================================================================
-- Conferir:
--   SELECT slug, cliente, publicado, url FROM portfolio_projetos ORDER BY ordem;
-- =============================================================================
