# Heaven Agência — Landing Page + Funil

Landing page institucional + funil de captura conversacional para a Heaven Agência de Marketing.

## Estrutura

```
.
├── index.html          # Landing principal
├── styles.css          # Estilos compartilhados (LP + funil)
├── app.js              # Carousel + reveal animations + nav
├── assets/             # Imagens (CEO, método, slides do carousel, logo)
└── forms/
    └── index.html      # Funil conversacional (chat-style) com webhook integrado
```

## Como rodar localmente

Não precisa de build. Qualquer servidor estático funciona:

```bash
npx serve -l 5500 .
```

Acesse:
- **Landing:** http://localhost:5500/
- **Funil:** http://localhost:5500/forms/

## Funil de captura

O funil em `/forms/` é um chat conversacional que coleta:

1. Nome
2. WhatsApp (com máscara)
3. E-mail
4. Nome da empresa
5. Faturamento mensal (5 opções)
6. **(condicional)** Aceite do investimento mínimo (R$ 1.600/mês) — só aparece pra leads de R$ 5k–R$ 20k

### Roteamento por faturamento

| Faturamento | Resultado |
|---|---|
| Até R$ 5.000 | Não qualificado |
| R$ 5.000 – R$ 20.000 | Pergunta sobre R$ 1.600 mínimo |
| R$ 30.000 – R$ 50.000 | Qualificado (24h) |
| R$ 50.000 – R$ 100.000 | Qualificado (24h) |
| Acima de R$ 100.000 | Ultra qualificado (24h) |

### Webhook

Cada lead é enviado uma única vez ao webhook do CRM (Supabase Edge Function), tagado como `google_ads`. Em caso de abandono, o `sendBeacon` garante o envio dos dados parciais.

## Deploy

Projeto 100% estático. Pode ser hospedado em Vercel, Netlify, Cloudflare Pages, GitHub Pages ou qualquer CDN.
