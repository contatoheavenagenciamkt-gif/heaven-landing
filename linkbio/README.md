# Link na Bio — `heavenagencia.com/linkbio`

Página de links (estilo link-in-bio) + tracking de **visitas** e **cliques por link**,
com painel próprio. Tudo estático; os números são gravados no **Supabase do CRM**
(mesmo projeto que o funil `/forms/` usa).

## Arquivos

| Arquivo | O quê |
|---|---|
| `index.html` | A página pública (`/linkbio/`). |
| `linkbio.js` | **Onde você edita os links** (array `LINKS`) + tracking. |
| `config.js`  | URL do Supabase + chave anon + senha opcional do painel. |
| `stats.html` / `stats.js` | Painel de acessos (`/linkbio/stats.html`). |
| `../supabase/linkbio_tracking.sql` | SQL a rodar **uma vez** no Supabase do CRM. |

## Setup (uma vez)

1. **Banco:** no Supabase do CRM (`mkhiykxsfbcbybxhqlkj`) → SQL Editor → cole e rode
   `supabase/linkbio_tracking.sql`.
2. **Chave:** Project Settings → API → copie a **`anon public`** e cole em
   `config.js` → `SUPABASE_ANON_KEY`. (É pública por natureza, não é segredo.)
3. *(Opcional)* defina `STATS_PASSWORD` em `config.js` para proteger o painel.
4. Deploy (commit + push). A página fica em `heavenagencia.com/linkbio`.

## Editar os links

Mexa só no array `LINKS` em `linkbio.js`. Coloque as imagens em `../assets/` e aponte:

```js
{ slug: "whatsapp", img: "../assets/meu-card.webp", alt: "Fale no WhatsApp", href: "https://wa.me/55..." }
```

- `slug` é o nome que aparece no painel — curto e único.
- `href` pode ser link externo (abre em nova aba) ou interno como `/forms/`.

## Ver os números

Abra `heavenagencia.com/linkbio/stats.html`: visitas e cliques do mês, cliques por
link e histórico mensal. Os dados são só **contagens agregadas** (a view
`linkbio_monthly`), sem nenhum dado pessoal.

> Endurecimento opcional: se quiser que nem as contagens fiquem públicas, dá pra
> trocar a leitura por uma Edge Function protegida por token (como a `lead-webhook`).
