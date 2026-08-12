/* ===========================================================================
 * PM2 — mantém a API de pé e sobe sozinha depois de reboot.
 *
 * A VPS já usa PM2 para os outros projetos, então a API entra no mesmo padrão:
 * aparece no `pm2 list` junto com o resto e o `pm2 startup` que já está ativo
 * cuida do boot. Por isso não usamos systemd aqui.
 *
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save
 *   pm2 logs heaven-api
 * =========================================================================== */
module.exports = {
  apps: [
    {
      name: 'heaven-api',
      script: 'server.js',
      cwd: '/var/www/heaven/api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      // Reinicia se passar disso: protege os outros projetos da máquina
      // caso a API vaze memória algum dia.
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: '/root/.pm2/logs/heaven-api-out.log',
      error_file: '/root/.pm2/logs/heaven-api-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
