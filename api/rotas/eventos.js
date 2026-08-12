/* ===========================================================================
 * Tracking de acessos — substitui a escrita direta no Supabase.
 *
 * POST /api/eventos          público  → grava visita ou clique
 * GET  /api/stats/diarios    logado   → agregado por dia/página/link
 * GET  /api/stats/origens    logado   → agregado por origem do tráfego
 *
 * O IP nunca é gravado em claro: guardamos o sha256 do IP + um sal do .env.
 * Serve pra medir sem armazenar dado pessoal identificável.
 * =========================================================================== */
'use strict';

const express = require('express');
const crypto = require('crypto');
const { q } = require('../db');
const { exigirLogin } = require('../auth');

const router = express.Router();

const corta = (v, n) => (v == null ? null : String(v).slice(0, n));

function hashIp(req) {
  const sal = process.env.IP_SALT;
  if (!sal) return null;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  if (!ip) return null;
  return crypto.createHash('sha256').update(sal + ip).digest('hex');
}

/* --------------------------- Gravar evento -------------------------------- */
router.post('/eventos', async (req, res) => {
  // Tracking nunca pode derrubar a página nem devolver erro visível:
  // responde 204 sempre e engole a falha no log.
  try {
    const b = req.body || {};
    const tipo = b.tipo === 'click' || b.kind === 'click' ? 'click' : 'visit';

    await q(
      `INSERT INTO eventos (tipo, slug, destino, caminho, referer, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo,
        corta(b.slug, 80),
        corta(b.destino || b.destination, 500),
        corta(b.caminho || b.path, 200),
        corta(b.referer, 500),
        corta(req.headers['user-agent'], 400),
        hashIp(req),
      ]
    );
  } catch (e) {
    console.error('[eventos] falha ao gravar:', e.message);
  }
  res.status(204).end();
});

/* ------------------------------ Agregados --------------------------------- */
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function periodo(req) {
  const de = DATA.test(req.query.de || '') ? req.query.de : null;
  const ate = DATA.test(req.query.ate || '') ? req.query.ate : null;
  if (!de || !ate) return null;
  return { de, ate };
}

/* Mesmas chaves que o painel já consumia do Supabase (day/kind/path/slug/total),
   pra troca no admin.js ficar mínima. */
router.get('/stats/diarios', exigirLogin, async (req, res, next) => {
  try {
    const p = periodo(req);
    if (!p) return res.status(400).json({ erro: 'periodo_invalido' });

    const linhas = await q(
      `SELECT dia AS day, tipo AS kind, caminho AS path, slug, total
         FROM eventos_diarios
        WHERE dia BETWEEN ? AND ?`,
      [p.de, p.ate]
    );
    res.json(linhas);
  } catch (e) {
    next(e);
  }
});

router.get('/stats/origens', exigirLogin, async (req, res, next) => {
  try {
    const p = periodo(req);
    if (!p) return res.status(400).json({ erro: 'periodo_invalido' });

    const linhas = await q(
      `SELECT dia AS day, origem AS source, total
         FROM eventos_origens
        WHERE dia BETWEEN ? AND ?`,
      [p.de, p.ate]
    );
    res.json(linhas);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
