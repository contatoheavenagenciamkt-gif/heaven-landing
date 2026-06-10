/* ===========================================================================
 * Painel de acessos do /linkbio. Lê apenas a view agregada linkbio_monthly
 * (contagens por mês/tipo/slug — sem dado pessoal) via PostgREST + chave anon.
 * =========================================================================== */
const CFG = window.LINKBIO_CONFIG || {};

const $ = (id) => document.getElementById(id);

/* ---- Gate de senha opcional (apenas um obstáculo leve) ---- */
function boot() {
  const pass = (CFG.STATS_PASSWORD || "").trim();
  if (!pass) return reveal();

  // já validou nesta sessão?
  if (sessionStorage.getItem("lb_stats_ok") === "1") return reveal();

  $("gate").classList.remove("hidden");
  const submit = () => {
    if ($("gate-pass").value === pass) {
      sessionStorage.setItem("lb_stats_ok", "1");
      $("gate").classList.add("hidden");
      reveal();
    } else {
      $("gate-err").classList.remove("hidden");
    }
  };
  $("gate-btn").addEventListener("click", submit);
  $("gate-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
}

function reveal() {
  $("panel").classList.remove("hidden");
  loadStats();
}

/* ---- Carrega e renderiza ---- */
async function loadStats() {
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
    $("state").textContent =
      "Configure a SUPABASE_ANON_KEY em config.js e rode o SQL no Supabase do CRM.";
    return;
  }

  let rows;
  try {
    const res = await fetch(
      `${CFG.SUPABASE_URL}/rest/v1/linkbio_monthly?select=month,kind,slug,total&order=month.desc`,
      {
        headers: {
          apikey: CFG.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = await res.json();
  } catch (e) {
    $("state").textContent = `Não consegui carregar os dados (${e.message}). Confira a chave anon e se o SQL foi aplicado.`;
    return;
  }

  if (!rows.length) {
    $("state").textContent = "Ainda não há acessos registrados. Abra /linkbio e clique nos links para gerar dados.";
    return;
  }

  const months = [...new Set(rows.map((r) => r.month))].sort().reverse();
  const current = months[0];
  const fmtMonth = (m) => {
    const d = new Date(m + "T00:00:00Z");
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
      .format(d)
      .replace(".", "");
  };

  // --- Cartões do mês atual ---
  const visitsMonth = sum(rows, (r) => r.kind === "visit" && r.month === current);
  const clicksMonth = sum(rows, (r) => r.kind === "click" && r.month === current);
  $("c-visits").textContent = visitsMonth;
  $("c-clicks").textContent = clicksMonth;
  $("c-ctr").textContent = visitsMonth ? Math.round((clicksMonth / visitsMonth) * 100) + "%" : "—";

  // --- Cliques por link (slug) ---
  const slugs = new Map(); // slug -> { month, total }
  for (const r of rows) {
    if (r.kind !== "click" || !r.slug) continue;
    const e = slugs.get(r.slug) || { month: 0, total: 0 };
    e.total += Number(r.total);
    if (r.month === current) e.month += Number(r.total);
    slugs.set(r.slug, e);
  }
  const linkRows = [...slugs.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxTotal = linkRows.reduce((m, [, e]) => Math.max(m, e.total), 0) || 1;
  $("t-links").innerHTML = linkRows.length
    ? linkRows
        .map(
          ([slug, e]) => `
        <tr>
          <td class="slug">${escapeHtml(slug)}</td>
          <td><div class="bar"><i style="width:${Math.round((e.total / maxTotal) * 100)}%"></i></div></td>
          <td class="num">${e.month}</td>
          <td class="num">${e.total}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" style="color:var(--text-dim)">Nenhum clique ainda.</td></tr>`;

  // --- Por mês (últimos 12) ---
  $("t-months").innerHTML = months
    .slice(0, 12)
    .map((m) => {
      const v = sum(rows, (r) => r.kind === "visit" && r.month === m);
      const c = sum(rows, (r) => r.kind === "click" && r.month === m);
      return `<tr><td>${fmtMonth(m)}</td><td class="num">${v}</td><td class="num">${c}</td></tr>`;
    })
    .join("");

  $("state").textContent = "";
}

function sum(rows, pred) {
  return rows.reduce((s, r) => (pred(r) ? s + Number(r.total) : s), 0);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
