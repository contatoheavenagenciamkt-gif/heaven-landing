# Link na Bio + Tracking do site — `heavenagencia.com`

Página de links (`/linkbio`) + **tracking de acessos do site inteiro** com painel
próprio em `/admin`. O front é estático; os números são gravados no **MySQL da VPS**
através da API em `/api`.

## Arquivos

| Arquivo | O quê |
|---|---|
| `/track.js` | Tracker do **site inteiro** (pageview automático + `HeavenTrack.event`). Incluído em todas as páginas públicas. |
| `linkbio/index.html` | A página pública `/linkbio`. |
| `linkbio/linkbio.js` | **Onde você edita os links** (array `LINKS`) + clique. |
| `admin/index.html` · `admin/admin.js` | Painel de acessos em `/admin` (login + dashboard). |
| `em-breve/index.html` | Página "em breve". |
| `mysql/schema.sql` | Banco. Rodar uma vez na VPS. |
| `api/` | A API que grava e lê os números. |

## Setup (uma vez)

Está tudo em **[deploy/README.md](../deploy/README.md)**: rodar o `mysql/schema.sql`,
subir a API e apontar o nginx. Nenhuma chave fica no navegador — quem tem a senha do
banco é o servidor.

## Editar os links do /linkbio

Mexa só no array `LINKS` em `linkbio/linkbio.js`. Imagens em `/assets`, caminhos absolutos:

```js
{ slug: "whatsapp", img: "/assets/meu-card.jpg", alt: "Fale no WhatsApp", href: "https://wa.me/55..." }
```

> ⚠️ Sempre use caminhos **absolutos** (`/assets/...`, `/linkbio/...`). Caminhos
> relativos quebram quando o servidor serve a página sem barra final.

## Painel `/admin`

`heavenagencia.com/admin` — login com e-mail e senha. Mostra, por período (Hoje, 7/30
dias, mês, ou personalizado) e por dia/mês:
- Visitas do site, acessos pelo **Link na Bio** vs **diretos na home**, cliques por link;
- Visitas **por página** e **origem do tráfego** (Google, Instagram, direto) — útil pra SEO.

A senha fica no MySQL como **hash bcrypt**, nunca em texto e nunca no código. O login
devolve um cookie `httpOnly`, que o JavaScript da página não consegue ler — então um XSS
não rouba a sessão. O painel lê apenas **views agregadas** (contagens); o IP do visitante
é guardado só como hash, nunca em claro.
