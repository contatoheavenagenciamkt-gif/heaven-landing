# Portfólio

Página de envio direto: **fora do menu e fora do Google** (`noindex, nofollow`).
Ninguém chega nela navegando — só quem recebe o link de você.

```
heavenagencia.com/portfolio/
```

## Como publicar um projeto

Pelo painel, sem mexer em código:

```
heavenagencia.com/admin/portfolio/
```

Mesmo login do `/admin`. Lá você **cadastra, edita, publica, despublica e exclui**.
O que você salva aparece na hora em `/portfolio/`.

Também dá pra chegar pelo botão **Portfólio** no topo do `/admin`.

### Antes da primeira vez

Rode uma vez o arquivo `supabase/portfolio.sql` no SQL Editor do Supabase
(projeto `mkhiykxsfbcbybxhqlkj`, o mesmo do funil e do tracking). Ele cria a
tabela, as permissões e já deixa a Marévia cadastrada.

Enquanto o SQL não rodar, o `/admin/portfolio/` mostra um aviso explicando isso —
não quebra.

## O que cada campo faz

| Campo | Efeito no card |
|---|---|
| **Nome do cliente** | O nome grande. Também vira a arte da capa quando não há imagem. |
| **Identificador** | Nome curto que aparece no `/admin` na tabela de cliques. Preenche sozinho. |
| **Segmento e praça** | Linha pequena em cima do nome. |
| **O que foi entregue** | Uma linha, na linguagem de quem compra. |
| **Resumo** | Duas ou três linhas. Fale do problema, não da tecnologia. |
| **Etiquetas** | Separadas por vírgula. Até 5 aparecem. |
| **Link da demo** | **Vazio = card "Em preparação"**, cinza e não clicável. |
| **Cores da capa** | As duas cores da marca do cliente. Só valem se não houver imagem. |
| **Imagem de capa** | Opcional. Jogue em `/assets/` e aponte o caminho. |
| **Posição** | Menor aparece primeiro. |
| **Publicado** | Desmarcado, some da página pública mas continua no painel. |

Duas coisas resolvem sozinhas: **link vazio** vira "Em preparação" — serve pra
deixar o projeto listado antes de estar no ar sem prometer o que não existe. E
**sem imagem de capa**, a arte é gerada com as cores do cliente, então já fica
apresentável.

## O botão "Copiar link"

Cada card no ar tem um, e o painel também. É o gesto principal: você abre, copia o
link do projeto e cola no WhatsApp do prospect.

## Medição

A visita entra no `/admin` normalmente, no caminho `/portfolio`. Cada clique em
"Abrir demo" vira um clique com slug `portfolio-<identificador>` na tabela
**Cliques por link** — dá pra saber qual case o pessoal realmente abre.

Opcional: pra o `/admin` mostrar "Portfólio" em vez de `/portfolio` cru na tabela
"Por página", adicione uma entrada em `PATH_LABELS` no topo de `admin/admin.js`:

```js
const PATH_LABELS = { "/": "Home (site)", "/linkbio": "Link na Bio", "/forms": "Funil", "/em-breve": "Em breve", "/portfolio": "Portfólio" };
```

## Arquivos

| Arquivo | Para quê |
|---|---|
| `portfolio/index.html` | Estrutura e estilo da página pública. |
| `portfolio/portfolio.js` | Busca no Supabase e monta os cards. |
| `portfolio/projetos.js` | **Reserva.** Só é usado se o banco não responder. |
| `admin/portfolio/` | O painel de cadastro. |
| `supabase/portfolio.sql` | A tabela e as permissões. Rode uma vez. |

O `projetos.js` existe como rede de segurança: se o Supabase cair ou a tabela
ainda não existir, a página mostra o que estiver ali em vez de ficar em branco na
frente de um cliente.
