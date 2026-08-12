/* ===========================================================================
 * Leads do funil /forms/ — substitui a Edge Function lead-webhook.
 *
 * POST /api/leads         público  → grava ou atualiza o lead da sessão
 * GET  /api/admin/leads   logado   → lista para conferência
 *
 * Duas decisões que valem explicar:
 *
 * 1. UPSERT por session_id. O funil dispara várias vezes durante o
 *    preenchimento (e mais uma no abandono, via sendBeacon). Sem isso, um único
 *    visitante viraria cinco leads na sua lista.
 *
 * 2. Guardamos o JSON cru em payload_bruto. Se algum campo do funil não estiver
 *    mapeado nas colunas, ele continua recuperável — em migração de lead, o
 *    barato sai caro.
 * =========================================================================== */
'use strict';

const express = require('express');
const { q } = require('../db');
const { exigirLogin } = require('../auth');

const router = express.Router();

const corta = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));

/** 'sim'/'nao'/true/false → 1/0/null */
function paraBool(v) {
  if (v === true || v === 'sim' || v === 'true' || v === 1) return 1;
  if (v === false || v === 'nao' || v === 'false' || v === 0) return 0;
  return null;
}

router.post('/leads', async (req, res) => {
  // Igual ao tracking: o funil nunca pode quebrar por causa da API.
  // Responde 204 sempre; a falha vai pro log do servidor.
  try {
    const b = req.body || {};
    const a = b.answers || {};

    const sessao = corta(b.session_id || b.sessao, 64);
    const telefone = corta(String(b.phone || a.celular || '').replace(/\D/g, ''), 40);

    const dados = {
      sessao,
      nome: corta(b.name || a.nome, 160),
      whatsapp: telefone,
      email: corta(b.email || a.email, 160),
      empresa: corta(b.company || a.empresa, 160),
      faturamento: corta(b.revenue || a.faturamento, 60),
      aceita_minimo: paraBool(b.agree_minimum ?? a.aceita_minimo),
      qualificacao: corta(b.qualified ?? a.qualificado, 40),
      motivo: corta(b.reason || a.motivo, 120),
      status: corta(b.status, 40),
      origem: corta(b.source || b.tag, 60) || 'google_ads',
      completo: b.status === 'concluido' || b.qualified != null ? 1 : 0,
      pagina: corta(b.page_url, 500),
      referer: corta(b.referrer, 500),
      user_agent: corta(req.headers['user-agent'], 400),
      payload_bruto: JSON.stringify(b).slice(0, 60000),
    };

    if (sessao) {
      // Upsert: o mesmo visitante atualiza a própria linha.
      // COALESCE segura o que já veio: um envio parcial posterior não apaga
      // um campo que o visitante já tinha preenchido.
      await q(
        `INSERT INTO leads
           (sessao, nome, whatsapp, email, empresa, faturamento, aceita_minimo,
            qualificacao, motivo, status, origem, completo, pagina, referer, user_agent, payload_bruto)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           nome          = COALESCE(VALUES(nome), nome),
           whatsapp      = COALESCE(VALUES(whatsapp), whatsapp),
           email         = COALESCE(VALUES(email), email),
           empresa       = COALESCE(VALUES(empresa), empresa),
           faturamento   = COALESCE(VALUES(faturamento), faturamento),
           aceita_minimo = COALESCE(VALUES(aceita_minimo), aceita_minimo),
           qualificacao  = COALESCE(VALUES(qualificacao), qualificacao),
           motivo        = COALESCE(VALUES(motivo), motivo),
           status        = COALESCE(VALUES(status), status),
           completo      = GREATEST(completo, VALUES(completo)),
           payload_bruto = VALUES(payload_bruto)`,
        [dados.sessao, dados.nome, dados.whatsapp, dados.email, dados.empresa,
         dados.faturamento, dados.aceita_minimo, dados.qualificacao, dados.motivo,
         dados.status, dados.origem, dados.completo, dados.pagina, dados.referer,
         dados.user_agent, dados.payload_bruto]
      );
    } else {
      await q(
        `INSERT INTO leads
           (nome, whatsapp, email, empresa, faturamento, aceita_minimo, qualificacao,
            motivo, status, origem, completo, pagina, referer, user_agent, payload_bruto)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [dados.nome, dados.whatsapp, dados.email, dados.empresa, dados.faturamento,
         dados.aceita_minimo, dados.qualificacao, dados.motivo, dados.status,
         dados.origem, dados.completo, dados.pagina, dados.referer,
         dados.user_agent, dados.payload_bruto]
      );
    }
  } catch (e) {
    console.error('[leads] falha ao gravar:', e.message);
  }
  res.status(204).end();
});

/* --------------------------- Conferência ---------------------------------- */
router.get('/admin/leads', exigirLogin, async (req, res, next) => {
  try {
    const limite = Math.min(Number(req.query.limite) || 100, 500);
    const linhas = await q(
      `SELECT id, sessao, nome, whatsapp, email, empresa, faturamento,
              aceita_minimo, qualificacao, motivo, status, origem, completo, criado_em
         FROM leads
        ORDER BY criado_em DESC
        LIMIT ${limite}`
    );
    res.json(linhas);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
