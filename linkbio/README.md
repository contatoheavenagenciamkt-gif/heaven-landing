# Link na Bio + Tracking do site — `heavenagencia.com`

Página de links (`/linkbio`) + **tracking de acessos do site inteiro** com painel
próprio em `/admin`. Site estático; os números são gravados no **Supabase do CRM**
(projeto `mkhiykxsfbcbybxhqlkj`, o mesmo do funil `/forms/`).

## Arquivos

| Arquivo | O quê |
|---|---|
| `/track.js` | Tracker do **site inteiro** (pageview automático + `HeavenTrack.event`). Incluído em todas as páginas públicas. |
| `linkbio/index.html` | A página pública `/linkbio`. |
| `linkbio/linkbio.js` | **Onde você edita os links** (array `LINKS`) + clique. |
| `admin/index.html` · `admin/admin.js` | Painel de acessos em `/admin` (login + dashboard). |
| `em-breve/index.html` | Página "em breve". |
| `supabase/linkbio_tracking.sql` | SQL a rodar no Supabase do CRM (tabela + views). |

## Setup (uma vez)

1. **Banco:** Supabase do CRM (`mkhiykxsfbcbybxhqlkj`) → SQL Editor → rode
   `supabase/linkbio_tracking.sql` (idempotente, pode rodar de novo a cada atualização).
2. Pronto — a chave anon já está embutida no `/track.js` e no `admin/admin.js`
   (é pública por design).

## Editar os links do /linkbio

Mexa só no array `LINKS` em `linkbio/linkbio.js`. Imagens em `/assets`, caminhos absolutos:

```js
{ slug: "whatsapp", img: "/assets/meu-card.jpg", alt: "Fale no WhatsApp", href: "https://wa.me/55..." }
```

> ⚠️ Sempre use caminhos **absolutos** (`/assets/...`, `/linkbio/...`). Caminhos
> relativos quebram quando a Vercel serve a página sem barra final.

## Painel `/admin`

`heavenagencia.com/admin` — login (e-mail + senha). Mostra, por período (Hoje, 7/30
dias, mês, ou personalizado) e por dia/mês:
- Visitas do site, acessos pelo **Link na Bio** vs **diretos na home**, cliques por link;
- Visitas **por página** e **origem do tráfego** (Google, Instagram, direto) — útil pra SEO.

A senha fica só como **hash SHA-256** no código; e o painel lê apenas **views agregadas**
(contagens, sem dado pessoal). Para travar de verdade o acesso aos números, dá pra migrar
a leitura para uma Edge Function autenticada depois.
