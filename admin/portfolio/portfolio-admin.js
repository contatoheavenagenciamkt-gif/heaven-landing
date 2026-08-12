/* ===========================================================================
 * Heaven · /admin/portfolio — cadastro dos projetos do portfólio.
 *
 * Fala com a API da VPS (/api). A sessão é um cookie httpOnly criado no login:
 * o JavaScript desta página não lê o cookie, então um XSS não rouba o acesso.
 * Nenhuma credencial de banco passa perto do navegador.
 *
 * Tabela: portfolio_projetos (ver mysql/schema.sql)
 * =========================================================================== */
const $ = (id) => document.getElementById(id);

let projetos = [];
let editandoId = null;

/* ------------------------------- API -------------------------------------- */
async function api(caminho, opcoes = {}) {
  const r = await fetch('/api' + caminho, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  if (r.status === 401) {
    mostrarGate();
    throw new Error('nao_autenticado');
  }

  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw Object.assign(new Error(dados?.erro || 'erro'), { codigo: dados?.erro, status: r.status });
  return dados;
}

/* ------------------------------- Login ------------------------------------ */
async function tryLogin() {
  $('g-err').classList.add('hidden');
  $('g-btn').disabled = true;
  $('g-btn').textContent = 'Entrando…';

  try {
    await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('g-email').value.trim(), senha: $('g-pass').value }),
    });
    abrirPainel();
  } catch (e) {
    $('g-err').textContent =
      e.codigo === 'muitas_tentativas'
        ? 'Muitas tentativas. Espere 15 minutos.'
        : 'E-mail ou senha incorretos.';
    $('g-err').classList.remove('hidden');
  } finally {
    $('g-btn').disabled = false;
    $('g-btn').textContent = 'Entrar';
  }
}

function mostrarGate() {
  $('gate').classList.remove('hidden');
  $('painel').classList.add('hidden');
}

function abrirPainel() {
  $('gate').classList.add('hidden');
  $('painel').classList.remove('hidden');
  carregar();
}

/* ------------------------------ Utilidades -------------------------------- */
function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acento
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function msg(texto, cor) {
  $('form-msg').textContent = texto || '';
  $('form-msg').style.color = cor || 'var(--text-dim)';
}

/* ------------------------------ Carregar ---------------------------------- */
async function carregar() {
  $('state').textContent = 'Carregando…';
  try {
    projetos = await api('/admin/portfolio');
    $('setup').classList.add('hidden');
    $('state').textContent = '';
    render();
  } catch (e) {
    if (e.message === 'nao_autenticado') return;
    // Tabela ausente ou banco fora: a API devolve 500 e o aviso de setup ajuda.
    $('setup').classList.remove('hidden');
    $('state').textContent = '';
    $('lista').innerHTML = '';
    $('contador').textContent = '';
  }
}

/* ------------------------------- Render ----------------------------------- */
function render() {
  const publicados = projetos.filter((p) => p.publicado).length;
  $('contador').textContent = projetos.length
    ? `${projetos.length} ${projetos.length === 1 ? 'projeto' : 'projetos'} · ${publicados} publicado${publicados === 1 ? '' : 's'}`
    : '';

  if (!projetos.length) {
    $('lista').innerHTML =
      '<div class="vazio"><strong>Nenhum projeto cadastrado.</strong>' +
      'Clique em “Novo projeto” pra publicar o primeiro. Ele aparece na hora em /portfolio/.</div>';
    return;
  }

  $('lista').innerHTML = projetos
    .map((p) => {
      const noAr = !!(p.url && p.url.trim());
      const badges =
        `<span class="badge ${noAr ? 'live' : 'soon'}">${noAr ? 'No ar' : 'Em preparação'}</span>` +
        (p.publicado ? '' : '<span class="badge off">Rascunho</span>') +
        (p.tipo ? `<span class="badge">${esc(p.tipo)}</span>` : '') +
        `<span class="badge">${esc(p.slug)}</span>`;

      return `
        <article class="item">
          <div class="swatch" style="background:linear-gradient(135deg, ${esc(p.cor_1 || '#1b2233')}, ${esc(p.cor_2 || '#3b9eff')})"></div>
          <div>
            <p class="seg">${esc(p.segmento || '—')}</p>
            <h3>${esc(p.cliente)}</h3>
            ${p.titulo ? `<p class="tit">${esc(p.titulo)}</p>` : ''}
            ${noAr ? `<a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>` : ''}
            <div class="badges">${badges}</div>
          </div>
          <div class="col-acoes">
            ${noAr ? `<button class="btn sm" data-acao="copiar" data-id="${p.id}">Copiar link</button>` : ''}
            <button class="btn sm" data-acao="publicar" data-id="${p.id}">${p.publicado ? 'Despublicar' : 'Publicar'}</button>
            <button class="btn sm" data-acao="editar" data-id="${p.id}">Editar</button>
            <button class="btn sm danger" data-acao="excluir" data-id="${p.id}">Excluir</button>
          </div>
        </article>`;
    })
    .join('');
}

/* ------------------------------ Formulário -------------------------------- */
function abrirForm(projeto) {
  editandoId = projeto ? projeto.id : null;
  $('form-titulo').textContent = projeto ? `Editando ${projeto.cliente}` : 'Novo projeto';
  $('f-cliente').value = projeto ? projeto.cliente || '' : '';
  $('f-slug').value = projeto ? projeto.slug || '' : '';
  $('f-segmento').value = projeto ? projeto.segmento || '' : '';
  $('f-titulo').value = projeto ? projeto.titulo || '' : '';
  $('f-resumo').value = projeto ? projeto.resumo || '' : '';
  $('f-entregas').value = projeto ? (projeto.entregas || []).join(', ') : '';
  $('f-url').value = projeto ? projeto.url || '' : '';
  $('f-tipo').value = projeto ? projeto.tipo || 'Projeto entregue' : 'Projeto entregue';
  $('f-ano').value = projeto ? projeto.ano || '' : String(new Date().getFullYear());
  $('f-ordem').value = projeto ? projeto.ordem ?? 0 : projetos.length;
  $('f-cor1').value = projeto ? projeto.cor_1 || '#1b2233' : '#1b2233';
  $('f-cor2').value = projeto ? projeto.cor_2 || '#3b9eff' : '#3b9eff';
  $('f-cover').value = projeto ? projeto.cover || '' : '';
  $('f-publicado').checked = projeto ? !!projeto.publicado : true;

  msg('');
  $('form').classList.remove('hidden');
  $('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('f-cliente').focus();
}

function fecharForm() {
  editandoId = null;
  $('form').classList.add('hidden');
  msg('');
}

async function salvar(ev) {
  ev.preventDefault();

  const cliente = $('f-cliente').value.trim();
  const slug = slugify($('f-slug').value || cliente);
  if (!cliente) return msg('Preencha o nome do cliente.', 'var(--danger)');
  if (!slug) return msg('Preencha o identificador.', 'var(--danger)');

  const registro = {
    slug,
    cliente,
    segmento: $('f-segmento').value.trim(),
    titulo: $('f-titulo').value.trim(),
    resumo: $('f-resumo').value.trim(),
    entregas: $('f-entregas').value.split(',').map((s) => s.trim()).filter(Boolean),
    url: $('f-url').value.trim(),
    cover: $('f-cover').value.trim(),
    cor_1: $('f-cor1').value,
    cor_2: $('f-cor2').value,
    tipo: $('f-tipo').value,
    ano: $('f-ano').value.trim(),
    ordem: Number($('f-ordem').value) || 0,
    publicado: $('f-publicado').checked,
  };

  $('salvar').disabled = true;
  msg('Salvando…');

  try {
    if (editandoId) {
      await api('/admin/portfolio/' + encodeURIComponent(editandoId), {
        method: 'PUT',
        body: JSON.stringify(registro),
      });
    } else {
      await api('/admin/portfolio', { method: 'POST', body: JSON.stringify(registro) });
    }
    fecharForm();
    await carregar();
  } catch (e) {
    if (e.message === 'nao_autenticado') return;
    msg(
      e.codigo === 'slug_duplicado'
        ? `Já existe um projeto com o identificador “${slug}”.`
        : 'Não consegui salvar. Tente de novo.',
      'var(--danger)'
    );
  } finally {
    $('salvar').disabled = false;
  }
}

/* -------------------------------- Ações ----------------------------------- */
async function acao(ev) {
  const btn = ev.target.closest('button[data-acao]');
  if (!btn) return;

  const projeto = projetos.find((p) => String(p.id) === btn.dataset.id);
  if (!projeto) return;

  if (btn.dataset.acao === 'editar') return abrirForm(projeto);

  if (btn.dataset.acao === 'copiar') {
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(projeto.url);
      btn.textContent = 'Copiado';
      btn.classList.add('ok');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('ok');
      }, 1600);
    } catch (e) {
      /* navegador sem permissão de clipboard — silencioso */
    }
    return;
  }

  if (btn.dataset.acao === 'publicar') {
    btn.disabled = true;
    try {
      await api('/admin/portfolio/' + encodeURIComponent(projeto.id), {
        method: 'PUT',
        body: JSON.stringify({ ...projeto, publicado: !projeto.publicado }),
      });
      await carregar();
    } catch (e) {
      if (e.message !== 'nao_autenticado') $('state').textContent = 'Não consegui alterar.';
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (btn.dataset.acao === 'excluir') {
    // Exclusão é irreversível e não tem lixeira — por isso confirma pelo nome.
    if (!window.confirm(`Excluir “${projeto.cliente}” do portfólio?\n\nIsso não tem desfazer.`)) return;
    btn.disabled = true;
    try {
      await api('/admin/portfolio/' + encodeURIComponent(projeto.id), { method: 'DELETE' });
      if (editandoId === projeto.id) fecharForm();
      await carregar();
    } catch (e) {
      if (e.message !== 'nao_autenticado') $('state').textContent = 'Não consegui excluir.';
    } finally {
      btn.disabled = false;
    }
  }
}

/* -------------------------------- Início ---------------------------------- */
(async function init() {
  $('g-btn').addEventListener('click', tryLogin);
  $('g-pass').addEventListener('keydown', (e) => e.key === 'Enter' && tryLogin());
  $('g-email').addEventListener('keydown', (e) => e.key === 'Enter' && $('g-pass').focus());

  $('novo').addEventListener('click', () => abrirForm(null));
  $('cancelar').addEventListener('click', fecharForm);
  $('form').addEventListener('submit', salvar);
  $('lista').addEventListener('click', acao);
  $('logout').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* segue */ }
    location.reload();
  });

  // Preenche o identificador a partir do nome, até o usuário editar à mão.
  $('f-cliente').addEventListener('input', () => {
    if (editandoId) return;
    if ($('f-slug').dataset.tocado) return;
    $('f-slug').value = slugify($('f-cliente').value);
  });
  $('f-slug').addEventListener('input', () => ($('f-slug').dataset.tocado = '1'));

  // Já tem sessão? Entra direto.
  try {
    await api('/auth/eu');
    abrirPainel();
  } catch (e) {
    mostrarGate();
  }
})();
