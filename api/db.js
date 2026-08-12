/* ===========================================================================
 * Conexão com o MySQL.
 *
 * Pool, não conexão única: o site tem tracking em cada pageview, e uma conexão
 * só viraria fila na primeira rajada de tráfego.
 *
 * A senha vem de variável de ambiente e nunca do código. Se você se pegar
 * escrevendo a senha aqui, pare — este arquivo vai pro git.
 * =========================================================================== */
'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'heaven',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'local',
  dateStrings: ['DATE'], // datas voltam 'YYYY-MM-DD', sem fuso atrapalhando
});

/** Consulta simples. Sempre com placeholders — nunca concatene SQL. */
async function q(sql, params = []) {
  const [linhas] = await pool.execute(sql, params);
  return linhas;
}

/** Testa a conexão no boot: melhor falhar alto do que servir 500 silencioso. */
async function conferir() {
  const c = await pool.getConnection();
  try {
    await c.ping();
  } finally {
    c.release();
  }
}

module.exports = { pool, q, conferir };
