/* ===========================================================================
 * Portfólio — leitura pública e CRUD do painel.
 *
 * GET  /api/portfolio            público  → só os publicados
 * GET  /api/admin/portfolio      logado   → todos, inclusive rascunho
 * POST /api/admin/portfolio      logado   → cria
 * PUT  /api/admin/portfolio/:id  logado   → edita
 * DEL  /api/admin/portfolio/:id  logado   → exclui
 * =========================================================================== */
'use strict';

const express = require('express');
const { q } = require('../db');
const { exigirLogin } = require('../auth');

const router = express.Router();

/** entregas é TEXT separado por vírgula no banco; vira array na API. */
function paraFora(linha) {
  return {
    id: String(linha.id),
    slug: linha.slug,
    cliente: linha.cliente,
    segmento: linha.segmento,
    titulo: linha.titulo,
    resumo: linha.resumo,
    entregas: linha.entregas ? String(linha.entregas).split(',').map((s) => s.trim()).filter(Boolean) : [],
    url: linha.url || '',
    cover: linha.cover,
    cor_1: linha.cor_1,
    cor_2: linha.cor_2,
    tipo: linha.tipo,
    ano: linha.ano,
    publicado: !!linha.publicado,
    ordem: linha.ordem,
  };
}

const COR = /^#[0-9a-fA-F]{3,8}$/;

function paraDentro(c) {
  const slug = String(c.slug || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const entregas = Array.isArray(c.entregas)
    ? c.entregas
    : String(c.entregas || '').split(',');

  return {
    slug,
    cliente: String(c.cliente || '').trim().slice(0, 120),
    segmento: (c.segmento || null) && String(c.segmento).trim().slice(0, 160),
    titulo: (c.titulo || null) && String(c.titulo).trim().slice(0, 240),
    resumo: (c.resumo || null) && String(c.resumo).trim().slice(0, 4000),
    entregas: entregas.map((s) => String(s).trim()).filter(Boolean).slice(0, 8).join(','),
    url: String(c.url || '').trim().slice(0, 500),
    cover: (c.cover || null) && String(c.cover).trim().slice(0, 500),
    cor_1: COR.test(c.cor_1 || '') ? c.cor_1 : '#1b2233',
    cor_2: COR.test(c.cor_2 || '') ? c.cor_2 : '#3b9eff',
    tipo: String(c.tipo || 'Projeto entregue').slice(0, 60),
    ano: (c.ano || null) && String(c.ano).trim().slice(0, 9),
    publicado: c.publicado ? 1 : 0,
    ordem: Number.isFinite(Number(c.ordem)) ? Number(c.ordem) : 0,
  };
}

const CAMPOS = 'id, slug, cliente, segmento, titulo, resumo, entregas, url, cover, cor_1, cor_2, tipo, ano, publicado, ordem';

/* ------------------------------ Público ----------------------------------- */
router.get('/portfolio', async (req, res, next) => {
  try {
    const linhas = await q(
      `SELECT ${CAMPOS} FROM portfolio_projetos
        WHERE publicado = 1
        ORDER BY ordem ASC, criado_em DESC`
    );
    res.json(linhas.map(paraFora));
  } catch (e) {
    next(e);
  }
});

/* ------------------------------- Painel ----------------------------------- */
router.get('/admin/portfolio', exigirLogin, async (req, res, next) => {
  try {
    const linhas = await q(
      `SELECT ${CAMPOS} FROM portfolio_projetos ORDER BY ordem ASC, criado_em DESC`
    );
    res.json(linhas.map(paraFora));
  } catch (e) {
    next(e);
  }
});

router.post('/admin/portfolio', exigirLogin, async (req, res, next) => {
  try {
    const d = paraDentro(req.body || {});
    if (!d.cliente) return res.status(400).json({ erro: 'cliente_obrigatorio' });
    if (!d.slug) return res.status(400).json({ erro: 'slug_obrigatorio' });

    const r = await q(
      `INSERT INTO portfolio_projetos
         (slug, cliente, segmento, titulo, resumo, entregas, url, cover, cor_1, cor_2, tipo, ano, publicado, ordem)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.slug, d.cliente, d.segmento, d.titulo, d.resumo, d.entregas, d.url, d.cover,
       d.cor_1, d.cor_2, d.tipo, d.ano, d.publicado, d.ordem]
    );
    res.status(201).json({ id: String(r.insertId) });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'slug_duplicado' });
    next(e);
  }
});

router.put('/admin/portfolio/:id', exigirLogin, async (req, res, next) => {
  try {
    const d = paraDentro(req.body || {});
    if (!d.cliente) return res.status(400).json({ erro: 'cliente_obrigatorio' });
    if (!d.slug) return res.status(400).json({ erro: 'slug_obrigatorio' });

    const r = await q(
      `UPDATE portfolio_projetos SET
         slug=?, cliente=?, segmento=?, titulo=?, resumo=?, entregas=?, url=?, cover=?,
         cor_1=?, cor_2=?, tipo=?, ano=?, publicado=?, ordem=?
       WHERE id = ?`,
      [d.slug, d.cliente, d.segmento, d.titulo, d.resumo, d.entregas, d.url, d.cover,
       d.cor_1, d.cor_2, d.tipo, d.ano, d.publicado, d.ordem, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ erro: 'nao_encontrado' });
    res.json({ ok: true });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'slug_duplicado' });
    next(e);
  }
});

router.delete('/admin/portfolio/:id', exigirLogin, async (req, res, next) => {
  try {
    const r = await q('DELETE FROM portfolio_projetos WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ erro: 'nao_encontrado' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
