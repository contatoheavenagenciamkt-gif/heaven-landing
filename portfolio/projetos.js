/* ===========================================================================
 * Heaven · Portfólio — LISTA DE RESERVA.
 *
 * O portfólio de verdade é cadastrado em /admin/portfolio/ e vive no Supabase.
 * Este arquivo só entra em ação quando o banco não responde ou a tabela ainda
 * não foi criada — pra a página não ficar em branco na frente de um cliente.
 *
 * Ou seja: no dia a dia você NÃO precisa editar isto. Use o painel.
 *
 * Campos:
 *   slug       Identificador curto e único. É o que aparece no /admin na
 *              tabela de cliques, então use algo legível: 'marevia'.
 *   cliente    Nome que aparece grande no card.
 *   segmento   Uma linha: o que a empresa vende e onde fica.
 *   titulo     O que foi entregue, na linguagem de quem compra.
 *   resumo     2 a 3 linhas. Fale do problema, não da tecnologia.
 *   entregas   Até 5 etiquetas curtas. Vira a lista de chips do card.
 *   url        Link da demo no ar. DEIXE VAZIO ('') enquanto não subiu —
 *              o card vira "em preparação" sozinho e não fica clicável.
 *   cover      Caminho de uma imagem de capa (ex.: '/assets/case-x.webp').
 *              Deixe null para usar a capa gerada com as cores abaixo.
 *   cores      [cor1, cor2] da marca do cliente — pinta a capa gerada.
 *   tipo       Etiqueta do canto: 'Protótipo', 'Projeto entregue'…
 *   ano        Aparece no rodapé do card.
 * =========================================================================== */

window.HEAVEN_PROJETOS = [
  {
    slug: 'marevia',
    cliente: 'Marévia',
    segmento: 'Moda praia e fitness · Paulista/PE',
    titulo: 'Uma IA vendendo no WhatsApp — e o painel que mostra qual anúncio virou venda',
    resumo:
      'Operação de mil conversas por dia no WhatsApp, R$ 98 mil por mês em anúncio e nenhuma forma de saber qual criativo gerou qual venda. O sistema fecha esse buraco: o agente atende, consulta estoque e gera o Pix; a venda volta carimbada no anúncio de origem.',
    entregas: [
      'Atendimento com IA',
      'Atribuição de anúncio',
      'Admin e estoque',
      'Loja com checkout',
    ],
    url: '',
    cover: null,
    cores: ['#0B3B3C', '#D1416A'],
    tipo: 'Protótipo de demonstração',
    ano: '2026',
  },
];
