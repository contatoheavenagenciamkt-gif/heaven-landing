/* ===========================================================================
 * Painel de acessos (/admin) — LOGIN REAL contra a API da VPS.
 *
 * Segurança: NENHUMA credencial no front. A senha vive no MySQL como hash
 * bcrypt; aqui o usuário digita e-mail/senha, a API confere e devolve um cookie
 * httpOnly. Esta página não consegue ler o cookie, então um XSS não rouba a
 * sessão — e a senha do banco nunca sai do servidor.
 * =========================================================================== */
const $ = (id) => document.getElementById(id);
const PATH_LABELS = {
  "/": "Home (site)",
  "/linkbio": "Link na Bio",
  "/forms": "Funil",
  "/em-breve": "Em breve",
  "/portfolio": "Portfólio",
};

async function api(caminho, opcoes = {}) {
  const r = await fetch("/api" + caminho, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (r.status === 401) { showGate(); throw new Error("nao_autenticado"); }
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw Object.assign(new Error(dados?.erro || "erro"), { codigo: dados?.erro });
  return dados;
}

/* ------------------------------- Login ------------------------------------ */
async function tryLogin() {
  $("g-err").classList.add("hidden");
  $("g-btn").disabled = true;
  $("g-btn").textContent = "Entrando…";
  try {
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("g-email").value.trim(), senha: $("g-pass").value }),
    });
    showDash();
  } catch (e) {
    $("g-err").textContent =
      e.codigo === "muitas_tentativas"
        ? "Muitas tentativas. Espere 15 minutos."
        : "E-mail ou senha incorretos.";
    $("g-err").classList.remove("hidden");
  } finally {
    $("g-btn").disabled = false;
    $("g-btn").textContent = "Entrar";
  }
}

function bindGate() {
  $("g-btn").addEventListener("click", tryLogin);
  $("g-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  $("g-email").addEventListener("keydown", (e) => { if (e.key === "Enter") $("g-pass").focus(); });
}

function showGate() {
  $("gate").classList.remove("hidden");
  $("dash").classList.add("hidden");
}
function showDash() {
  $("gate").classList.add("hidden");
  $("dash").classList.remove("hidden");
  initControls();
  setPeriod("30d");
}

/* --------------------------- Datas / período ------------------------------ */
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

let state = { from: null, to: null, gran: "auto" };

function setPeriod(key) {
  const now = new Date();
  let from = now, to = now;
  if (key === "today") { from = now; to = now; }
  else if (key === "7d") { from = addDays(now, -6); to = now; }
  else if (key === "30d") { from = addDays(now, -29); to = now; }
  else if (key === "month") { from = new Date(now.getFullYear(), now.getMonth(), 1); to = now; }
  else if (key === "lastmonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  state.from = ymd(from); state.to = ymd(to);
  $("from").value = state.from; $("to").value = state.to;
  highlightPeriod(key);
  load();
}
function highlightPeriod(key) {
  document.querySelectorAll("#periods .btn").forEach((b) => b.classList.toggle("active", b.dataset.k === key));
}

let controlsReady = false;
function initControls() {
  if (controlsReady) return;
  controlsReady = true;
  const periods = [["today","Hoje"],["7d","7 dias"],["30d","30 dias"],["month","Este mês"],["lastmonth","Mês passado"]];
  $("periods").innerHTML = periods.map(([k, l]) => `<button class="btn sm" data-k="${k}">${l}</button>`).join("");
  document.querySelectorAll("#periods .btn").forEach((b) => b.addEventListener("click", () => setPeriod(b.dataset.k)));

  const grans = [["auto","Auto"],["day","Por dia"],["month","Por mês"]];
  $("grans").innerHTML = grans.map(([k, l]) => `<button class="btn sm" data-g="${k}">${l}</button>`).join("");
  document.querySelectorAll("#grans .btn").forEach((b) =>
    b.addEventListener("click", () => {
      state.gran = b.dataset.g;
      document.querySelectorAll("#grans .btn").forEach((x) => x.classList.toggle("active", x === b));
      load();
    }));
  document.querySelector('#grans .btn[data-g="auto"]').classList.add("active");

  $("apply").addEventListener("click", () => {
    if (!$("from").value || !$("to").value) return;
    state.from = $("from").value; state.to = $("to").value;
    highlightPeriod(""); load();
  });
  $("logout").addEventListener("click", async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch (e) { /* segue */ }
    location.reload();
  });
}

/* ------------------------------ Fetch ------------------------------------- */
let chart = null;

async function load() {
  const { from, to } = state;
  $("range-label").textContent = `Período: ${br(from)} a ${br(to)}`;
  $("state").textContent = "Carregando…";

  let daily, sources;
  try {
    const p = `?de=${from}&ate=${to}`;
    [daily, sources] = await Promise.all([api("/stats/diarios" + p), api("/stats/origens" + p)]);
  } catch (e) {
    if (e.message === "nao_autenticado") return;
    $("state").textContent =
      "Não consegui carregar. Confira se a API está de pé na VPS (systemctl status heaven-api) e se o mysql/schema.sql já foi rodado.";
    return;
  }
  daily = daily || [];
  sources = sources || [];

  const visit = daily.filter((r) => r.kind === "visit");
  const click = daily.filter((r) => r.kind === "click");
  const sumT = (rows) => rows.reduce((s, r) => s + Number(r.total), 0);
  $("c-site").textContent = sumT(visit);
  $("c-link").textContent = sumT(visit.filter((r) => r.path === "/linkbio"));
  $("c-home").textContent = sumT(visit.filter((r) => r.path === "/"));
  $("c-clicks").textContent = sumT(click);

  renderRanked("t-pages", groupSum(visit, "path"), (k) => PATH_LABELS[k] || k, false);
  renderRanked("t-links", groupSum(click.filter((r) => r.slug), "slug"), (k) => k, true);
  renderRanked("t-sources", groupSum(sources, "source"), (k) => k, false);
  drawChart(visit, from, to);

  $("state").textContent = daily.length ? "" : "Sem acessos neste período ainda.";
}

function groupSum(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) || 0) + Number(r.total));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function renderRanked(tbodyId, entries, labelFn, green) {
  const max = entries.reduce((m, [, v]) => Math.max(m, v), 0) || 1;
  $(tbodyId).innerHTML = entries.length
    ? entries.map(([k, v]) => `<tr>
        <td class="pathtag">${esc(labelFn(k))}</td>
        <td><div class="bar ${green ? "green" : ""}"><i style="width:${Math.round((v / max) * 100)}%"></i></div></td>
        <td class="num">${v}</td></tr>`).join("")
    : `<tr><td colspan="3" class="muted">Sem dados.</td></tr>`;
}

/* ------------------------------ Gráfico ----------------------------------- */
function drawChart(visitRows, from, to) {
  const spanDays = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  let gran = state.gran;
  if (gran === "auto") gran = spanDays > 62 ? "month" : "day";
  $("chart-title").textContent =
    gran === "month" ? "Visitas por mês (site x Link na Bio)" : "Visitas por dia (site x Link na Bio)";

  const buckets = gran === "month" ? monthBuckets(from, to) : dayBuckets(from, to);
  const keyOf = (day) => (gran === "month" ? day.slice(0, 7) : day);
  const site = new Map(buckets.map((b) => [b, 0]));
  const link = new Map(buckets.map((b) => [b, 0]));
  for (const r of visitRows) {
    const k = keyOf(r.day);
    if (!site.has(k)) continue;
    site.set(k, site.get(k) + Number(r.total));
    if (r.path === "/linkbio") link.set(k, link.get(k) + Number(r.total));
  }
  const labels = buckets.map((b) => (gran === "month" ? brMonth(b) : br(b)));
  const data = {
    labels,
    datasets: [
      { label: "Site (total)", data: buckets.map((b) => site.get(b)), borderColor: "#3b9eff",
        backgroundColor: "rgba(59,158,255,.15)", tension: .3, fill: true, pointRadius: 2 },
      { label: "Link na Bio", data: buckets.map((b) => link.get(b)), borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,.12)", tension: .3, fill: true, pointRadius: 2 },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#a4abbc", boxWidth: 12, font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: "#6b7387", maxRotation: 0, autoSkip: true }, grid: { color: "rgba(255,255,255,.04)" } },
      y: { beginAtZero: true, ticks: { color: "#6b7387", precision: 0 }, grid: { color: "rgba(255,255,255,.06)" } },
    },
  };
  if (chart) chart.destroy();
  chart = new Chart($("chart"), { type: "line", data, options: opts });
}

function dayBuckets(from, to) {
  const out = []; let d = new Date(from + "T00:00:00"); const end = new Date(to + "T00:00:00");
  while (d <= end) { out.push(ymd(d)); d = addDays(d, 1); }
  return out;
}
function monthBuckets(from, to) {
  const out = []; let d = new Date(from.slice(0, 7) + "-01T00:00:00"); const end = new Date(to.slice(0, 7) + "-01T00:00:00");
  while (d <= end) { out.push(ymd(d).slice(0, 7)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
  return out;
}

/* ------------------------------ Utils ------------------------------------- */
function br(d) { const [y, m, dd] = d.split("-"); return `${dd}/${m}`; }
function brMonth(ym) {
  const [y, m] = ym.split("-");
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(Number(y), Number(m) - 1, 1)).replace(".", "");
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ------------------------------- Boot ------------------------------------- */
bindGate();
api("/auth/eu").then(showDash).catch(showGate);
