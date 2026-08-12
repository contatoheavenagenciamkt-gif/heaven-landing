/* ===========================================================================
 * Login do painel.
 *
 * POST /api/auth/login   { email, senha }  → cria a sessão (cookie httpOnly)
 * POST /api/auth/logout                    → encerra
 * GET  /api/auth/eu                        → quem está logado (ou 401)
 * =========================================================================== */
'use strict';

const express = require('express');
const {
  autenticar,
  criarSessao,
  encerrarSessao,
  usuarioDaSessao,
  podeTentar,
  registrarFalha,
  limparFalhas,
} = require('../auth');

const router = express.Router();

const ipDe = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'desconhecido';

router.post('/auth/login', async (req, res, next) => {
  try {
    const ip = ipDe(req);
    if (!podeTentar(ip)) {
      return res.status(429).json({ erro: 'muitas_tentativas' });
    }

    const { email, senha } = req.body || {};
    const usuario = await autenticar(email, senha);

    if (!usuario) {
      registrarFalha(ip);
      // Mensagem única de propósito: não dizemos se o erro foi o e-mail ou a
      // senha, pra não confirmar quais e-mails existem.
      return res.status(401).json({ erro: 'credenciais_invalidas' });
    }

    limparFalhas(ip);
    await criarSessao(res, usuario.id);
    res.json({ usuario });
  } catch (e) {
    next(e);
  }
});

router.post('/auth/logout', async (req, res, next) => {
  try {
    await encerrarSessao(req, res);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/auth/eu', async (req, res, next) => {
  try {
    const usuario = await usuarioDaSessao(req);
    if (!usuario) return res.status(401).json({ erro: 'nao_autenticado' });
    res.json({ usuario });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
