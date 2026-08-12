/* ===========================================================================
 * Heaven · API do site
 *
 * Escuta só em 127.0.0.1. Quem fala com a internet é o nginx, que repassa
 * /api/* pra cá. Assim o Node nunca fica exposto direto e o HTTPS é problema
 * do nginx, não deste processo.
 *
 * Rodar:  npm start          (produção, via systemd)
 *         npm run dev        (local, com reload)
 * =========================================================================== */
'use strict';

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');

const { conferir } = require('./db');
const { limparSessoesVencidas } = require('./auth');

const app = express();

// nginx é quem enxerga o IP real do visitante.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// text/plain junto de propósito: navigator.sendBeacon, usado pelo funil quando
// o visitante abandona a página, às vezes chega com esse tipo. Sem isso o lead
// de abandono entraria vazio.
app.use(express.json({ limit: '128kb', type: ['application/json', 'text/plain'] }));
app.use(cookieParser());

// Cabeçalhos de segurança básicos, sem dependência extra.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  // A API nunca deve ser cacheada: o painel leria dado velho.
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Saúde — usada pelo deploy pra saber se subiu.
app.get('/api/saude', (req, res) => res.json({ ok: true }));

app.use('/api', require('./rotas/auth'));
app.use('/api', require('./rotas/portfolio'));
app.use('/api', require('./rotas/eventos'));
app.use('/api', require('./rotas/leads'));

app.use('/api', (req, res) => res.status(404).json({ erro: 'rota_inexistente' }));

// Último recurso: registra o erro de verdade no log e devolve genérico ao
// cliente. Detalhe de erro de banco não vai pro navegador.
app.use((err, req, res, next) => {
  console.error('[erro]', req.method, req.originalUrl, '-', err.message);
  res.status(500).json({ erro: 'erro_interno' });
});

const PORT = Number(process.env.PORT) || 3025;
const HOST = process.env.HOST || '127.0.0.1';

(async () => {
  try {
    await conferir();
    console.log('[api] MySQL conectado');
  } catch (e) {
    console.error('[api] nao conectei no MySQL:', e.message);
    console.error('[api] confira DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no .env');
    process.exit(1);
  }

  app.listen(PORT, HOST, () => console.log(`[api] ouvindo em http://${HOST}:${PORT}`));

  // Faxina de sessões vencidas: agora e a cada 12h.
  limparSessoesVencidas().catch(() => {});
  setInterval(() => limparSessoesVencidas().catch(() => {}), 12 * 60 * 60 * 1000);
})();

// systemd manda SIGTERM no restart; sair limpo evita conexão pendurada.
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
