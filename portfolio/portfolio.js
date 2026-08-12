/* ===========================================================================
 * Heaven · Portfólio — renderização da página pública.
 *
 * Fonte dos dados, nesta ordem:
 *   1. API da VPS (/api/portfolio) — é o que o /admin/portfolio edita. A API
 *      devolve ao visitante SÓ os projetos publicados.
 *   2. Se a API não responder, cai no arquivo local /portfolio/projetos.js.
 *      A página nunca fica em branco por causa de servidor fora do ar.
 *
 * Projeto sem `url` vira card "em preparação": não abre e não engana ninguém.
 * =========================================================================== */
(function () {
  var grid = document.getElementById('pf-grid');
  if (!grid) return;

  var API = '/api/portfolio';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Normaliza os dois formatos (banco e arquivo local) num só. */
  function normalizar(p) {
    return {
      slug: p.slug || '',
      cliente: p.cliente || '',
      segmento: p.segmento || '',
      titulo: p.titulo || '',
      resumo: p.resumo || '',
      entregas: p.entregas || [],
      url: (p.url || '').trim(),
      cover: p.cover || null,
      cores: p.cores || [p.cor_1 || '#1b2233', p.cor_2 || '#3b9eff'],
      tipo: p.tipo || '',
      ano: p.ano || '',
    };
  }

  function capa(p) {
    var chipTipo = p.tipo ? '<span class="pf-chip-tipo">' + esc(p.tipo) + '</span>' : '';
    var live = !!p.url;
    var chipStatus =
      '<span class="pf-chip-status ' + (live ? 'live' : 'soon') + '">' +
      '<i class="pf-dot"></i>' + (live ? 'No ar' : 'Em preparação') +
      '</span>';

    var arte;
    if (p.cover) {
      arte =
        '<img src="' + esc(p.cover) + '" alt="Capa do projeto ' + esc(p.cliente) +
        '" loading="lazy" decoding="async" />';
    } else {
      arte =
        '<div class="pf-cover-art" style="--c1:' + esc(p.cores[0]) + ';--c2:' + esc(p.cores[1] || p.cores[0]) + '">' +
        '<span>' + esc(p.cliente) + '</span></div>';
    }

    return '<div class="pf-cover">' + arte + chipTipo + chipStatus + '</div>';
  }

  function cartao(p, i) {
    var live = !!p.url;

    var chips = (p.entregas || [])
      .slice(0, 5)
      .map(function (e) { return '<li>' + esc(e) + '</li>'; })
      .join('');

    var botao = live
      ? '<a class="pf-btn" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' +
        'Abrir demo' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a>'
      : '<span class="pf-btn" aria-disabled="true">Demo em preparação</span>';

    // Copiar o link é o gesto principal: a página existe pra ser enviada.
    var copiar = live
      ? '<button class="pf-copy" type="button" data-url="' + esc(p.url) + '">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        'Copiar link</button>'
      : '';

    return (
      '<article class="pf-card pf-anim' + (live ? ' is-live' : '') + '"' +
        ' data-slug="' + esc(p.slug || p.cliente) + '"' +
        ' style="--d:' + (260 + i * 90) + 'ms">' +
        capa(p) +
        '<div class="pf-body">' +
          (p.segmento ? '<p class="pf-seg">' + esc(p.segmento) + '</p>' : '') +
          '<h2 class="pf-cliente">' + esc(p.cliente) + '</h2>' +
          (p.titulo ? '<p class="pf-titulo">' + esc(p.titulo) + '</p>' : '') +
          (p.resumo ? '<p class="pf-resumo">' + esc(p.resumo) + '</p>' : '') +
          (chips ? '<ul class="pf-chips">' + chips + '</ul>' : '') +
        '</div>' +
        '<div class="pf-foot">' +
          '<span class="pf-ano">' + esc(p.ano) + '</span>' +
          copiar +
          botao +
        '</div>' +
      '</article>'
    );
  }

  function pintar(lista) {
    if (!lista.length) {
      grid.innerHTML =
        '<div class="pf-empty">' +
        '<strong>Nenhum projeto publicado ainda.</strong>' +
        'Cadastre o primeiro em <code>/admin/portfolio/</code>.' +
        '</div>';
      return;
    }
    grid.innerHTML = lista.map(normalizar).map(cartao).join('');
  }

  /* Busca na API da VPS. Sem SDK e sem credencial: a página pública fica leve. */
  fetch(API, { headers: { Accept: 'application/json' } })
    .then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(function (dados) {
      // API respondeu mas está vazia: o arquivo local ainda pode ter conteúdo.
      if (Array.isArray(dados) && dados.length) return pintar(dados);
      pintar(window.HEAVEN_PROJETOS || []);
    })
    .catch(function () {
      // API fora do ar — a página não pode cair junto na frente de um cliente.
      pintar(window.HEAVEN_PROJETOS || []);
    });

  /* Copiar link, com retorno visual e fallback pra navegador antigo. */
  grid.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.pf-copy');
    if (!btn) return;

    var url = btn.getAttribute('data-url');
    var original = btn.innerHTML;

    function ok() {
      btn.classList.add('ok');
      btn.textContent = 'Link copiado';
      setTimeout(function () {
        btn.classList.remove('ok');
        btn.innerHTML = original;
      }, 1800);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(ok).catch(function () {});
    } else {
      var t = document.createElement('textarea');
      t.value = url;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { /* silencioso */ }
      document.body.removeChild(t);
    }
  });

  /* Registra no /admin qual projeto foi aberto.
     Usa { slug, destination } — é o formato que a tabela "Cliques por link"
     agrupa. Prefixo 'portfolio-' pra não misturar com os cliques do linkbio. */
  grid.addEventListener('click', function (ev) {
    var link = ev.target.closest('a.pf-btn');
    if (!link || !window.HeavenTrack) return;
    var card = link.closest('.pf-card');
    var slug = card ? card.getAttribute('data-slug') : 'desconhecido';
    window.HeavenTrack.event('click', {
      slug: 'portfolio-' + slug,
      destination: link.getAttribute('href'),
    });
  });
})();
