/* ===========================================================================
 * Gera o hash bcrypt de uma senha, pra você cadastrar seu login no painel.
 *
 *   node scripts/hash.js 'sua-senha-aqui'
 *
 * Copie o resultado e rode no MySQL:
 *
 *   INSERT INTO usuarios (email, senha_hash, nome)
 *   VALUES ('seu@email.com', 'O_HASH_AQUI', 'Seu Nome')
 *   ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash);
 *
 * Use aspas simples em volta da senha no terminal — sem elas, caracteres como
 * $ e ! são interpretados pelo shell e você grava outra senha sem perceber.
 * =========================================================================== */
'use strict';

const bcrypt = require('bcryptjs');

const senha = process.argv[2];

if (!senha) {
  console.error("uso: node scripts/hash.js 'sua-senha'");
  process.exit(1);
}
if (senha.length < 10) {
  console.error('senha muito curta — use pelo menos 10 caracteres.');
  process.exit(1);
}

console.log(bcrypt.hashSync(senha, 10));
