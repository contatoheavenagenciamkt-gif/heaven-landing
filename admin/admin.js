/* ===========================================================================
 * Painel de acessos (/admin). Login simples + dashboard completo lendo as views
 * agregadas (linkbio_daily, linkbio_sources_daily) via PostgREST + chave anon.
 *
 * Recortes: Hoje / 7 / 30 dias / Este mês / Mês passado / Personalizado, e
 * granularidade Dia ou Mês no gráfico. Mostra: visitas do site, acessos pelo
 * /linkbio vs diretos, cliques por link, visitas por página e origem (SEO).
 * =========================================================================== */
const SUPABASE_URL = "https://mkhiykxsfbcbybxhqlkj.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raGl5a3hzZmJjYnlieGhxbGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODE3MTUsImV4cCI6MjA5MzE1NzcxNX0.6RfFBkjZ-TSpXkGzH0hbUzDE_5l1hi7s8tS3yczCWDI";

// Acesso ao painel. A senha NÃO fica em texto: guardamos só o hash SHA-256.
const ADMIN_EMAIL = "edson.juan.oliversilva@gmail.com";
const ADMIN_PASS_HASH = "2a5812ce4fef7e120d7b158063601dc723cc8c8112af9383023cf8833b92cb75";

const $ = (id) => document.getElementById(id);
const PATH_LABELS = { "/": "Home (site)", "/linkbio": "Link na Bio", "/forms": "Funil", "/em-breve": "Em breve" };

/* ----------------------------- Login -------------------------------------- */
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tryLogin() {
  const email = $("g-email").value.trim().toLowerCase();
  const hash = await sha256($("g-pass").value);
  if (email === ADMIN_EMAIL && hash === ADMIN_PASS_HASH) {
    sessionStorage.setItem("heaven_admin_ok", "1");
    showDash();
  } else {
    $("g-err").classList.remove("hidden");
  }
}

function showGate() {
  $("gate").classList.remove("hidden");
  $("dash").classList.add("hidden");
  $("g-btn").addEventListener("click", tryLogin);
  $("g-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  $("g-email").addEventListener("keydown", (e) => { if (e.key === "Enter") $("g-pass").focus(); });
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
  state.from = ymd(from);
  state.to = ymd(to);
  $("from").value = state.from;
  $("to").value = state.to;
  highlightPeriod(key);
  load();
}

function highlightPeriod(key) {
  document.querySelectorAll("#periods .btn").forEach((b) => b.classList.toggle("active", b.dataset.k === key));
}

function initControls() {
  const periods = [
    ["today", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["month", "Este mês"], ["lastmonth", "Mês passado"],
  ];
  $("periods").innerHTML = periods.map(([k, l]) => `<button class="btn sm" data-k="${k}">${l}</button>`).join("");
  document.querySelectorAll("#periods .btn").forEach((b) => b.addEventListener("click", () => setPeriod(b.dataset.k)));

  const grans = [["auto", "Auto"], ["day", "Por dia"], ["month", "Por mês"]];
  $("grans").innerHTML = grans.map(([k, l]) => `<button class="btn sm" data-g="${k}">${l}</button>`).join("");
  document.querySelectorAll("#grans .btn").forEach((b) =>
    b.addEventListener("click", () => {
      state.gran = b.dataset.g;
      document.querySelectorAll("#grans .btn").forEach((x) => x.classList.toggle("active", x === b));
      load();
    }),
  );
  document.querySelector('#grans .btn[data-g="auto"]').classList.add("active");

  $("apply").addEventListener("click", () => {
    if (!$("from").value || !$("to").value) return;
    state.from = $("from").value;
    state.to = $("to").value;
    highlightPeriod("");
    load();
  });
  $("logout").addEventListener("click", () => {
    sessionStorage.removeItem("heaven_admin_ok");
    location.reload();
  });
}

/* ------------------------------ Fetch ------------------------------------- */
async function api(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

let chart = null;

async function load() {
  const { from, to } = state;
  $("range-label").textContent = `Período: ${br(from)} a ${br(to)}`;
  $("state").textContent = "Carregando…";

  let daily, sources;
  try {
    [daily, sources] = await Promise.all([
      api(`linkbio_daily?select=day,kind,path,slug,total&day=gte.${from}&day=lte.${to}`),
      api(`linkbio_sources_daily?select=day,source,total&day=gte.${from}&day=lte.${to}`),
    ]);
  } catch (e) {
    $("state").textContent =
      `Não consegui carregar (${e.message}). Rode o SQL atualizado (supabase/linkbio_tracking.sql) no Supabase do CRM e tente de novo.`;
    return;
  }

  // ----- Cartões -----
  const visit = daily.filter((r) => r.kind === "visit");
  const click = daily.filter((r) => r.kind === "click");
  const sumT = (rows) => rows.reduce((s, r) => s + Number(r.total), 0);
  $("c-site").textContent = sumT(visit);
  $("c-link").textContent = sumT(visit.filter((r) => r.path === "/linkbio"));
  $("c-home").textContent = sumT(visit.filter((r) => r.path === "/"));
  $("c-clicks").textContent = sumT(click);

  // ----- Por página -----
  renderRanked("t-pages", groupSum(visit, "path"), (k) => PATH_LABELS[k] || k, false);
  // ----- Cliques por link -----
  renderRanked("t-links", groupSum(click.filter((r) => r.slug), "slug"), (k) => k, true);
  // ----- Origens -----
  renderRanked("t-sources", groupSum(sources, "source"), (k) => k, false);

  // ----- Gráfico -----
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
    ? entries
        .map(
          ([k, v]) => `<tr>
            <td class="pathtag">${esc(labelFn(k))}</td>
            <td><div class="bar ${green ? "green" : ""}"><i style="width:${Math.round((v / max) * 100)}%"></i></div></td>
            <td class="num">${v}</td></tr>`,
        )
        .join("")
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
  const out = []; let d = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (d <= end) { out.push(ymd(d)); d = addDays(d, 1); }
  return out;
}
function monthBuckets(from, to) {
  const out = []; let d = new Date(from.slice(0, 7) + "-01T00:00:00");
  const end = new Date(to.slice(0, 7) + "-01T00:00:00");
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
if (sessionStorage.getItem("heaven_admin_ok") === "1") showDash();
else showGate();
