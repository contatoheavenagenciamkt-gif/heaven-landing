# Heaven Agência — Landing Page + Funil

Landing page institucional + funil de captura conversacional para a Heaven Agência de Marketing.

## Estrutura

```
.
├── index.html          # Landing principal
├── styles.css          # Estilos compartilhados (LP + funil)
├── app.js              # Carousel + reveal animations + nav
├── track.js            # Tracking de acessos (envia para a API)
├── assets/             # Imagens (CEO, método, slides do carousel, logo)
├── forms/              # Funil conversacional (chat-style)
├── linkbio/            # Link na bio do @juan.oliver_
├── portfolio/          # Página de portfólio (não listada, enviada por link)
├── admin/              # Painel: acessos + cadastro do portfólio
├── api/                # API Node (MySQL) — roda na VPS
├── mysql/schema.sql    # Banco: rodar uma vez na VPS
└── deploy/             # nginx + systemd
```

O front é estático. O que exige servidor é a `api/` — ver **[deploy/README.md](deploy/README.md)**.

## Como rodar localmente

**Só o site** (sem painel nem portfólio dinâmico):

```bash
npx serve -l 5500 .
```

**Com a API**, para testar login, portfólio e leads:

```bash
cd api && npm install && cp .env.example .env   # preencha o .env
npm run dev                                     # sobe em :3001
```

Acesse:
- **Landing:** http://localhost:5500/
- **Funil:** http://localhost:5500/forms/
- **Portfólio:** http://localhost:5500/portfolio/
- **Painel:** http://localhost:5500/admin/

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

### Para onde vai o lead

`POST /api/leads`, na própria VPS, gravando na tabela `leads` do MySQL. Mesma origem
do site: sem token no front, sem CORS. Em caso de abandono, o `sendBeacon` envia os
dados parciais.

Os envios são agrupados por `session_id`: o funil dispara várias vezes durante o
preenchimento, e sem esse agrupamento um visitante viraria cinco leads. Cada envio
completa o registro sem apagar o que já tinha sido preenchido, e o JSON cru fica
guardado em `payload_bruto`.

## Deploy

O site é estático, mas o painel, o portfólio e a captura de lead dependem da `api/`.
Tudo roda numa VPS com nginx + Node + MySQL — passo a passo em
**[deploy/README.md](deploy/README.md)**.
