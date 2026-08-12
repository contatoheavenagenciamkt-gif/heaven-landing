/* ===========================================================================
 * Heaven · /admin/portfolio — cadastro dos projetos do portfólio.
 *
 * Mesmo login do /admin (Supabase Auth). Nenhuma credencial no front: a chave
 * anon é pública por design e não escreve nada sem sessão — a política de RLS
 * só libera insert/update/delete para 'authenticated'.
 *
 * Tabela: public.portfolio_projetos (ver supabase/portfolio.sql)
 * =========================================================================== */
const SUPABASE_URL = "https://mkhiykxsfbcbybxhqlkj.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raGl5a3hzZmJjYnlieGhxbGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODE3MTUsImV4cCI6MjA5MzE1NzcxNX0.6RfFBkjZ-TSpXkGzH0hbUzDE_5l1hi7s8tS3yczCWDI";

const sb = window.supabase.createClient(SUPABASE_URL, ANON);
const $ = (id) => document.getElementById(id);

let projetos = [];
let editandoId = null;

/* ------------------------------- Login ------------------------------------ */
async function tryLogin() {
  $("g-err").classList.add("hidden");
  $("g-btn").disabled = true;
  $("g-btn").textContent = "Entrando…";
  const { error } = await sb.auth.signInWithPassword({
    email: $("g-email").value.trim(),
    password: $("g-pass").value,
  });
  $("g-btn").disabled = false;
  $("g-btn").textContent = "Entrar";
  if (error) {
    $("g-err").textContent = "E-mail ou senha incorretos.";
    $("g-err").classList.remove("hidden");
    return;
  }
  abrirPainel();
}

function mostrarGate() {
  $("gate").classList.remove("hidden");
  $("painel").classList.add("hidden");
}

function abrirPainel() {
  $("gate").classList.add("hidden");
  $("painel").classList.remove("hidden");
  carregar();
}

/* ------------------------------ Utilidades -------------------------------- */
function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acento
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function msg(texto, cor) {
  $("form-msg").textContent = texto || "";
  $("form-msg").style.color = cor || "var(--text-dim)";
}

/* ------------------------------ Carregar ---------------------------------- */
async function carregar() {
  $("state").textContent = "Carregando…";
  const { data, error } = await sb
    .from("portfolio_projetos")
    .select("*")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: false });

  if (error) {
    // 42P01 = tabela não existe: quase sempre o SQL ainda não foi rodado.
    const faltaTabela = /relation .* does not exist/i.test(error.message || "") || error.code === "42P01";
    $("setup").classList.toggle("hidden", !faltaTabela);
    $("state").textContent = faltaTabela ? "" : "Erro ao carregar: " + error.message;
    $("lista").innerHTML = "";
    $("contador").textContent = "";
    return;
  }

  $("setup").classList.add("hidden");
  $("state").textContent = "";
  projetos = data || [];
  render();
}

/* ------------------------------- Render ----------------------------------- */
function render() {
  const publicados = projetos.filter((p) => p.publicado).length;
  $("contador").textContent = projetos.length
    ? `${projetos.length} ${projetos.length === 1 ? "projeto" : "projetos"} · ${publicados} publicado${publicados === 1 ? "" : "s"}`
    : "";

  if (!projetos.length) {
    $("lista").innerHTML =
      '<div class="vazio"><strong>Nenhum projeto cadastrado.</strong>' +
      'Clique em “Novo projeto” pra publicar o primeiro. Ele aparece na hora em /portfolio/.</div>';
    return;
  }

  $("lista").innerHTML = projetos
    .map((p) => {
      const noAr = !!(p.url && p.url.trim());
      const badges =
        `<span class="badge ${noAr ? "live" : "soon"}">${noAr ? "No ar" : "Em preparação"}</span>` +
        (p.publicado ? "" : '<span class="badge off">Rascunho</span>') +
        (p.tipo ? `<span class="badge">${esc(p.tipo)}</span>` : "") +
        `<span class="badge">${esc(p.slug)}</span>`;

      return `
        <article class="item">
          <div class="swatch" style="background:linear-gradient(135deg, ${esc(p.cor_1 || "#1b2233")}, ${esc(p.cor_2 || "#3b9eff")})"></div>
          <div>
            <p class="seg">${esc(p.segmento || "—")}</p>
            <h3>${esc(p.cliente)}</h3>
            ${p.titulo ? `<p class="tit">${esc(p.titulo)}</p>` : ""}
            ${noAr ? `<a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>` : ""}
            <div class="badges">${badges}</div>
          </div>
          <div class="col-acoes">
            ${noAr ? `<button class="btn sm" data-acao="copiar" data-id="${p.id}">Copiar link</button>` : ""}
            <button class="btn sm" data-acao="publicar" data-id="${p.id}">${p.publicado ? "Despublicar" : "Publicar"}</button>
            <button class="btn sm" data-acao="editar" data-id="${p.id}">Editar</button>
            <button class="btn sm danger" data-acao="excluir" data-id="${p.id}">Excluir</button>
          </div>
        </article>`;
    })
    .join("");
}

/* ------------------------------ Formulário -------------------------------- */
function abrirForm(projeto) {
  editandoId = projeto ? projeto.id : null;
  $("form-titulo").textContent = projeto ? `Editando ${projeto.cliente}` : "Novo projeto";
  $("f-cliente").value = projeto ? projeto.cliente || "" : "";
  $("f-slug").value = projeto ? projeto.slug || "" : "";
  $("f-segmento").value = projeto ? projeto.segmento || "" : "";
  $("f-titulo").value = projeto ? projeto.titulo || "" : "";
  $("f-resumo").value = projeto ? projeto.resumo || "" : "";
  $("f-entregas").value = projeto ? (projeto.entregas || []).join(", ") : "";
  $("f-url").value = projeto ? projeto.url || "" : "";
  $("f-tipo").value = projeto ? projeto.tipo || "Projeto entregue" : "Projeto entregue";
  $("f-ano").value = projeto ? projeto.ano || "" : String(new Date().getFullYear());
  $("f-ordem").value = projeto ? projeto.ordem ?? 0 : projetos.length;
  $("f-cor1").value = projeto ? projeto.cor_1 || "#1b2233" : "#1b2233";
  $("f-cor2").value = projeto ? projeto.cor_2 || "#3b9eff" : "#3b9eff";
  $("f-cover").value = projeto ? projeto.cover || "" : "";
  $("f-publicado").checked = projeto ? !!projeto.publicado : true;

  msg("");
  $("form").classList.remove("hidden");
  $("form").scrollIntoView({ behavior: "smooth", block: "start" });
  $("f-cliente").focus();
}

function fecharForm() {
  editandoId = null;
  $("form").classList.add("hidden");
  msg("");
}

async function salvar(ev) {
  ev.preventDefault();

  const cliente = $("f-cliente").value.trim();
  const slug = slugify($("f-slug").value || cliente);
  if (!cliente) return msg("Preencha o nome do cliente.", "var(--danger)");
  if (!slug) return msg("Preencha o identificador.", "var(--danger)");

  const registro = {
    slug,
    cliente,
    segmento: $("f-segmento").value.trim() || null,
    titulo: $("f-titulo").value.trim() || null,
    resumo: $("f-resumo").value.trim() || null,
    entregas: $("f-entregas")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    url: $("f-url").value.trim(),
    cover: $("f-cover").value.trim() || null,
    cor_1: $("f-cor1").value,
    cor_2: $("f-cor2").value,
    tipo: $("f-tipo").value,
    ano: $("f-ano").value.trim() || null,
    ordem: Number($("f-ordem").value) || 0,
    publicado: $("f-publicado").checked,
  };

  $("salvar").disabled = true;
  msg("Salvando…");

  const { error } = editandoId
    ? await sb.from("portfolio_projetos").update(registro).eq("id", editandoId)
    : await sb.from("portfolio_projetos").insert(registro);

  $("salvar").disabled = false;

  if (error) {
    const duplicado = /duplicate key|unique/i.test(error.message || "");
    msg(duplicado ? `Já existe um projeto com o identificador “${slug}”.` : "Erro: " + error.message, "var(--danger)");
    return;
  }

  fecharForm();
  await carregar();
}

/* -------------------------------- Ações ----------------------------------- */
async function acao(ev) {
  const btn = ev.target.closest("button[data-acao]");
  if (!btn) return;

  const projeto = projetos.find((p) => p.id === btn.dataset.id);
  if (!projeto) return;

  if (btn.dataset.acao === "editar") return abrirForm(projeto);

  if (btn.dataset.acao === "copiar") {
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(projeto.url);
      btn.textContent = "Copiado";
      btn.classList.add("ok");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("ok");
      }, 1600);
    } catch (e) {
      /* navegador sem permissão de clipboard — silencioso */
    }
    return;
  }

  if (btn.dataset.acao === "publicar") {
    btn.disabled = true;
    const { error } = await sb
      .from("portfolio_projetos")
      .update({ publicado: !projeto.publicado })
      .eq("id", projeto.id);
    btn.disabled = false;
    if (error) return ($("state").textContent = "Erro: " + error.message);
    return carregar();
  }

  if (btn.dataset.acao === "excluir") {
    // Exclusão é irreversível e não tem lixeira — por isso confirma pelo nome.
    if (!window.confirm(`Excluir “${projeto.cliente}” do portfólio?\n\nIsso não tem desfazer.`)) return;
    btn.disabled = true;
    const { error } = await sb.from("portfolio_projetos").delete().eq("id", projeto.id);
    btn.disabled = false;
    if (error) return ($("state").textContent = "Erro: " + error.message);
    if (editandoId === projeto.id) fecharForm();
    return carregar();
  }
}

/* -------------------------------- Início ---------------------------------- */
(async function init() {
  $("g-btn").addEventListener("click", tryLogin);
  $("g-pass").addEventListener("keydown", (e) => e.key === "Enter" && tryLogin());
  $("g-email").addEventListener("keydown", (e) => e.key === "Enter" && $("g-pass").focus());

  $("novo").addEventListener("click", () => abrirForm(null));
  $("cancelar").addEventListener("click", fecharForm);
  $("form").addEventListener("submit", salvar);
  $("lista").addEventListener("click", acao);
  $("logout").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });

  // Preenche o identificador a partir do nome, até o usuário editar à mão.
  $("f-cliente").addEventListener("input", () => {
    if (editandoId) return;
    if ($("f-slug").dataset.tocado) return;
    $("f-slug").value = slugify($("f-cliente").value);
  });
  $("f-slug").addEventListener("input", () => ($("f-slug").dataset.tocado = "1"));

  const { data } = await sb.auth.getSession();
  if (data && data.session) abrirPainel();
  else mostrarGate();
})();
