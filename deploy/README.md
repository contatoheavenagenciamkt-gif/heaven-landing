# Deploy na VPS

Ubuntu/Debian, com nginx servindo o site e repassando `/api` para uma API Node que
fala com o MySQL. Do zero, em uns 20 minutos.

```
internet ──▶ nginx :443 ──┬──▶ arquivos do site   (/var/www/heaven)
                          └──▶ /api/* ──▶ node :3001 ──▶ mysql :3306
```

O MySQL e o Node só escutam em `localhost`. Quem fala com a internet é o nginx.

---

## 1. Instalar o que falta

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Confira: `node -v` (>= 18), `nginx -v`, `mysql --version`.

Se o MySQL é novo, rode `sudo mysql_secure_installation`.

## 2. Clonar o site

```bash
sudo mkdir -p /var/www
sudo git clone https://github.com/contatoheavenagenciamkt-gif/heaven-landing.git /var/www/heaven
sudo chown -R www-data:www-data /var/www/heaven
```

Repositório privado: o `git clone` vai pedir usuário e um **token** (não a senha da
conta). Gere em GitHub → Settings → Developer settings → Personal access tokens,
com permissão apenas de leitura em repositório.

## 3. Criar o banco

```bash
sudo mysql < /var/www/heaven/mysql/schema.sql
```

Crie o usuário da API — **troque a senha**:

```bash
sudo mysql -e "CREATE USER IF NOT EXISTS 'heaven_api'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE';
GRANT SELECT, INSERT, UPDATE, DELETE ON heaven.* TO 'heaven_api'@'localhost';
FLUSH PRIVILEGES;"
```

A API não entra como root, e o usuário dela não pode criar nem apagar tabela. Se um
dia algo escapar pela API, o estrago para no dado — não na estrutura.

## 4. Configurar a API

```bash
cd /var/www/heaven/api
sudo -u www-data npm install --omit=dev
sudo -u www-data cp .env.example .env
sudo -u www-data nano .env
```

Preencha `DB_PASSWORD` com a senha do passo 3 e gere o `IP_SALT`:

```bash
openssl rand -hex 32
```

Trave o arquivo — ele tem a senha do banco:

```bash
sudo chmod 600 /var/www/heaven/api/.env
sudo chown www-data:www-data /var/www/heaven/api/.env
```

## 5. Subir a API

```bash
sudo cp /var/www/heaven/deploy/heaven-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now heaven-api
sudo systemctl status heaven-api
```

Testar:

```bash
curl http://127.0.0.1:3001/api/saude     # {"ok":true}
```

Se falhar: `sudo journalctl -u heaven-api -n 50`. O erro mais comum é senha do
banco errada no `.env` — a API diz isso no log e sai, de propósito, em vez de
servir 500 silencioso.

## 6. Configurar o nginx

```bash
sudo cp /var/www/heaven/deploy/nginx.conf /etc/nginx/sites-available/heavenagencia
sudo ln -sf /etc/nginx/sites-available/heavenagencia /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS

Aponte o DNS do domínio para o IP da VPS **antes** deste passo.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d heavenagencia.com -d www.heavenagencia.com
```

O certbot reescreve o nginx.conf com o HTTPS e renova sozinho.

## 8. Fechar o que não deve ficar aberto

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

**A porta 3306 não entra nessa lista.** O MySQL só é acessado de dentro da própria
máquina; abrir 3306 para a internet é o caminho mais curto para perder o banco.

## 9. Criar seu login do painel

```bash
cd /var/www/heaven/api
node scripts/hash.js 'sua-senha-de-pelo-menos-10-caracteres'
```

Copie o hash e:

```bash
sudo mysql heaven -e "INSERT INTO usuarios (email, senha_hash, nome)
VALUES ('contato.heavenagenciamkt@gmail.com', 'COLE_O_HASH_AQUI', 'Juan')
ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash);"
```

Use **aspas simples** em volta da senha. Sem elas o shell interpreta `$` e `!`, e
você grava uma senha diferente da que digitou.

---

## Conferir se ficou tudo de pé

| Endereço | Esperado |
|---|---|
| `https://heavenagencia.com` | Landing carregando |
| `https://heavenagencia.com/api/saude` | `{"ok":true}` |
| `https://heavenagencia.com/portfolio/` | Card da Marévia |
| `https://heavenagencia.com/admin/` | Tela de login; entra com o usuário do passo 9 |
| `https://heavenagencia.com/admin/portfolio/` | Lista com a Marévia |

**Teste o funil antes de anunciar.** Abra `/forms/`, preencha até o fim e confira:

```bash
sudo mysql heaven -e "SELECT id, nome, whatsapp, faturamento, qualificacao, criado_em FROM leads ORDER BY id DESC LIMIT 5;"
```

Se não aparecer nada, **não desligue o Supabase ainda** — investigue primeiro.
Lead perdido não volta.

## Atualizar depois de um push

```bash
cd /var/www/heaven
sudo -u www-data git pull
sudo -u www-data npm install --omit=dev --prefix api   # só se package.json mudou
sudo systemctl restart heaven-api                      # só se a api/ mudou
```

Mudança apenas de HTML, CSS ou JS do front não precisa reiniciar nada.

## Backup

Sem isso, um dia ruim apaga o portfólio e os leads:

```bash
sudo mysqldump heaven | gzip > /root/heaven-$(date +%F).sql.gz
```

Coloque no cron: `sudo crontab -e`

```
0 3 * * * mysqldump heaven | gzip > /root/backup/heaven-$(date +\%F).sql.gz
```

Guarde uma cópia **fora da VPS**. Backup que mora no mesmo servidor não é backup.
