# Deploy — heavenagencia.com

**Já está no ar.** Este documento descreve o que existe hoje na VPS, não um plano.

```
internet ──▶ nginx :443 ──┬──▶ /var/www/heaven        (site estático)
                          └──▶ /api/* ──▶ node :3025 ──▶ heaven-mysql :3308
```

## A máquina é compartilhada

A VPS `72.61.27.105` roda **outros 6 projetos**. Cada decisão abaixo existe para não
encostar neles:

| Item | Escolha | Por quê |
|---|---|---|
| Porta da API | **3025** | A 3001 já era do `atendeai` — usá-la o derrubaria |
| Processo | **PM2** | É a convenção da casa: os outros 6 apps rodam em PM2, com `pm2 startup` já ativo |
| MySQL | Container **`heaven-mysql`** em `127.0.0.1:3308` | O `mandanozap-mysql` ocupa a 3307 e é de outro dono |
| Firewall | **Não tocado** | O ufw já libera 22/80/443 e nada mais. `ufw enable` num servidor alheio é como cortar energia pra trocar lâmpada |
| Site default do nginx | **Não existe** | Nada a remover |

Antes de mexer no nginx foi guardado um backup em `/root/.heaven/nginx-antes-*.tar.gz`,
e o `nginx -t` roda antes de qualquer `reload`.

## Onde ficam as coisas

| Caminho | O quê |
|---|---|
| `/var/www/heaven` | O site e a API |
| `/var/www/heaven/api/.env` | Credenciais da API (chmod 600) |
| `/root/.heaven/credenciais` | Senhas do MySQL e do painel (chmod 600) |
| `/root/backup/` | Dump diário do banco, 30 dias |
| `/etc/nginx/sites-available/heavenagencia` | Config do site |

## Comandos do dia a dia

```bash
pm2 list                      # ver todos os apps da máquina
pm2 logs heaven-api           # log da nossa API
pm2 restart heaven-api        # reiniciar só a nossa
docker logs heaven-mysql      # log do banco
```

Entrar no banco:

```bash
source /root/.heaven/credenciais
docker exec -it heaven-mysql mysql -uroot -p"$MYSQL_ROOT" --default-character-set=utf8mb4 heaven
```

> **Sempre com `--default-character-set=utf8mb4`.** Sem isso o cliente do container
> assume latin-1 e grava `é` como `Ã©`. Aconteceu no primeiro deploy e só apareceu
> porque conferimos os bytes — na tela, os dois parecem iguais.

## Publicar uma alteração

O repositório é privado e a VPS não tem token do GitHub, então hoje o envio é por SCP.
Do Windows, com o Posh-SSH instalado:

```powershell
# empacota sem node_modules/.git e envia
Compress-Archive -Path * -DestinationPath heaven.zip
# envia para /root/heaven-tmp/ e extrai em /var/www/heaven
```

Depois, na VPS:

```bash
cd /var/www/heaven
pm2 restart heaven-api        # só se a pasta api/ mudou
```

Alteração só de HTML, CSS ou JS do front não precisa reiniciar nada.

**Para automatizar:** crie uma *deploy key* de leitura no repositório do GitHub,
coloque a chave privada em `/root/.ssh/`, e aí `git pull` passa a funcionar direto
na VPS.

## Backup

Roda todo dia às 03:15 por cron, guardando 30 dias em `/root/backup/`.

```bash
/root/.heaven/backup.sh       # rodar agora
ls -lh /root/backup/
```

Restaurar:

```bash
source /root/.heaven/credenciais
gunzip -c /root/backup/heaven-AAAA-MM-DD.sql.gz | \
  docker exec -i heaven-mysql mysql -uroot -p"$MYSQL_ROOT" --default-character-set=utf8mb4
```

> **O backup mora na mesma máquina que o banco.** Se a VPS morrer, os dois vão juntos.
> Leve uma cópia pra fora — Drive, S3, o que for.

## HTTPS

Certificado Let's Encrypt para `heavenagencia.com` e `www`, emitido pelo certbot que
já existia na máquina. Renova sozinho. Conferir:

```bash
certbot certificates | grep -A3 heavenagencia
```

## Conferir se está tudo de pé

```bash
curl -s https://heavenagencia.com/api/saude          # {"ok":true}
curl -s https://heavenagencia.com/api/portfolio      # deve trazer a Marévia
pm2 describe heaven-api | grep status
docker ps --filter name=heaven-mysql
```

Ver os leads que entraram:

```bash
source /root/.heaven/credenciais
docker exec heaven-mysql mysql -uroot -p"$MYSQL_ROOT" --default-character-set=utf8mb4 heaven \
  -e "SELECT id, nome, whatsapp, faturamento, qualificacao, criado_em FROM leads ORDER BY id DESC LIMIT 10;"
```

## Se precisar desfazer tudo

Remove só o que é da Heaven, sem tocar em nenhum outro projeto:

```bash
pm2 delete heaven-api && pm2 save
unlink /etc/nginx/sites-enabled/heavenagencia && nginx -t && systemctl reload nginx
docker stop heaven-mysql && docker container rm heaven-mysql
# o volume heaven-mysql-data sobrevive: os dados continuam lá até você removê-lo
```
