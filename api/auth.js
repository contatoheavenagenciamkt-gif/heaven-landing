/* ===========================================================================
 * Autenticação do painel — substitui o Supabase Auth.
 *
 * Como funciona:
 *   1. login confere a senha contra o hash bcrypt guardado no banco;
 *   2. gera um token aleatório de 32 bytes e devolve num cookie httpOnly;
 *   3. o banco guarda só o SHA-256 do token. Se o banco vazar, ninguém entra
 *      com o que está gravado lá.
 *
 * httpOnly significa que JavaScript da página não lê o cookie — então um XSS
 * não rouba a sessão. Por isso não usamos localStorage aqui.
 * =========================================================================== */
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { q } = require('./db');

const COOKIE = 'heaven_sessao';
const DIAS = Number(process.env.SESSAO_DIAS) || 7;

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

/* --- Freio de força bruta ---------------------------------------------------
 * Em memória de propósito: some no restart, e é o suficiente para um painel de
 * um usuário. Se um dia virar multiusuário, troque por tabela ou Redis. */
const tentativas = new Map();
const LIMITE = 8;
const JANELA_MS = 15 * 60 * 1000;

function podeTentar(ip) {
  const reg = tentativas.get(ip);
  if (!reg) return true;
  if (Date.now() - reg.desde > JANELA_MS) {
    tentativas.delete(ip);
    return true;
  }
  return reg.n < LIMITE;
}

function registrarFalha(ip) {
  const reg = tentativas.get(ip);
  if (!reg || Date.now() - reg.desde > JANELA_MS) tentativas.set(ip, { n: 1, desde: Date.now() });
  else reg.n += 1;
}

const limparFalhas = (ip) => tentativas.delete(ip);

/* --- Sessão ---------------------------------------------------------------- */
async function criarSessao(res, usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + DIAS * 86400000);

  await q('INSERT INTO sessoes (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)', [
    usuarioId,
    hashToken(token),
    expira,
  ]);

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DIAS * 86400000,
    path: '/',
  });
}

async function encerrarSessao(req, res) {
  const token = req.cookies?.[COOKIE];
  if (token) await q('DELETE FROM sessoes WHERE token_hash = ?', [hashToken(token)]);
  res.clearCookie(COOKIE, { path: '/' });
}

async function usuarioDaSessao(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;

  const linhas = await q(
    `SELECT u.id, u.email, u.nome
       FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expira_em > NOW() AND u.ativo = 1
      LIMIT 1`,
    [hashToken(token)]
  );
  return linhas[0] || null;
}

/** Middleware: barra qualquer rota de escrita sem sessão válida. */
async function exigirLogin(req, res, next) {
  try {
    const usuario = await usuarioDaSessao(req);
    if (!usuario) return res.status(401).json({ erro: 'nao_autenticado' });
    req.usuario = usuario;
    next();
  } catch (e) {
    next(e);
  }
}

async function autenticar(email, senha) {
  const linhas = await q(
    'SELECT id, email, nome, senha_hash FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1',
    [String(email || '').trim().toLowerCase()]
  );
  const u = linhas[0];

  // Compara mesmo sem usuário: o tempo de resposta não denuncia se o e-mail existe.
  const hash = u ? u.senha_hash : '$2a$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalidoinv';
  const ok = await bcrypt.compare(String(senha || ''), hash);
  if (!u || !ok) return null;

  await q('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?', [u.id]);
  return { id: u.id, email: u.email, nome: u.nome };
}

/** Limpeza de sessões vencidas — chamada de vez em quando pelo servidor. */
const limparSessoesVencidas = () => q('DELETE FROM sessoes WHERE expira_em < NOW()');

module.exports = {
  COOKIE,
  autenticar,
  criarSessao,
  encerrarSessao,
  usuarioDaSessao,
  exigirLogin,
  podeTentar,
  registrarFalha,
  limparFalhas,
  limparSessoesVencidas,
};
