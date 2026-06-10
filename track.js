/* ===========================================================================
 * Heaven · tracking de acessos do SITE INTEIRO (heavenagencia.com).
 *
 * Incluir em qualquer página com:  <script src="/track.js" defer></script>
 * - Registra automaticamente uma VISITA (pageview) por carregamento, com o
 *   caminho da página (path) e a origem (referer) — assim o /admin separa quem
 *   veio do /linkbio, quem entrou direto no site e de onde (Google, Instagram…).
 * - Expõe window.HeavenTrack.event(kind, extra) para eventos extras (ex.: clique
 *   nos cards do link na bio).
 *
 * Grava direto no Supabase do CRM (PostgREST + chave anon, pública por design).
 * `keepalive` garante o envio mesmo quando o clique já está saindo da página.
 * =========================================================================== */
(function () {
  var SUPABASE_URL = "https://mkhiykxsfbcbybxhqlkj.supabase.co";
  var ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raGl5a3hzZmJjYnlieGhxbGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODE3MTUsImV4cCI6MjA5MzE1NzcxNX0.6RfFBkjZ-TSpXkGzH0hbUzDE_5l1hi7s8tS3yczCWDI";

  // Normaliza o caminho: remove barra final (mantém "/") para não duplicar
  // "/linkbio" e "/linkbio/" nas estatísticas.
  function currentPath() {
    var p = (location.pathname || "/").replace(/\/+$/, "");
    return p === "" ? "/" : p;
  }

  function event(kind, extra) {
    if (!kind) return;
    try {
      var body = {
        kind: kind,
        path: currentPath(),
        referer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      };
      if (extra) for (var k in extra) body[k] = extra[k];

      fetch(SUPABASE_URL + "/rest/v1/linkbio_events", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: ANON,
          Authorization: "Bearer " + ANON,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
      }).catch(function () {});
    } catch (e) {
      /* tracking nunca pode atrapalhar a página */
    }
  }

  window.HeavenTrack = { event: event, supabaseUrl: SUPABASE_URL, anonKey: ANON };

  // Pageview automático.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { event("visit"); });
  } else {
    event("visit");
  }
})();
