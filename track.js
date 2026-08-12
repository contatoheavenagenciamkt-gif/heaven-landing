/* ===========================================================================
 * Heaven · tracking de acessos do SITE INTEIRO (heavenagencia.com).
 *
 * Incluir em qualquer página com:  <script src="/track.js" defer></script>
 * - Registra automaticamente uma VISITA (pageview) por carregamento, com o
 *   caminho da página (path) e a origem (referer) — assim o /admin separa quem
 *   veio do /linkbio, quem entrou direto no site e de onde (Google, Instagram…).
 * - Expõe window.HeavenTrack.event(kind, extra) para eventos extras (ex.: clique
 *   nos cards do link na bio e do portfólio).
 *
 * Grava na API da própria VPS (/api/eventos), que escreve no MySQL. Nenhuma
 * credencial no navegador: quem tem a senha do banco é o servidor.
 * `keepalive` garante o envio mesmo quando o clique já está saindo da página.
 * =========================================================================== */
(function () {
  var API = "/api/eventos";

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
        tipo: kind,
        caminho: currentPath(),
        referer: document.referrer || null,
      };
      if (extra) {
        if (extra.slug) body.slug = extra.slug;
        if (extra.destination) body.destino = extra.destination;
        if (extra.destino) body.destino = extra.destino;
      }

      fetch(API, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(function () {});
    } catch (e) {
      /* tracking nunca pode atrapalhar a página */
    }
  }

  window.HeavenTrack = { event: event };

  // Pageview automático.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { event("visit"); });
  } else {
    event("visit");
  }
})();
