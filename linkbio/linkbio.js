/* ===========================================================================
 * Link na Bio — render dos cards + tracking de acessos.
 *
 * COMO EDITAR OS LINKS: mexa só no array LINKS abaixo. Cada item:
 *   slug  -> identificador curto e único (aparece no painel de números)
 *   img   -> caminho da imagem (coloque o arquivo em assets/ e referencie aqui)
 *   alt   -> texto alternativo (acessibilidade)
 *   href  -> destino do clique (https://... ou link interno)
 *   newTab-> abrir em nova aba? (true/false) — padrão true para links externos
 * =========================================================================== */
const LINKS = [
  {
    slug: "agencia",
    img: "../assets/linkbio-agencia.jpg",
    alt: "Pare de fazer tudo sozinho — conheça a Heaven Agência",
    href: "/",
    newTab: false,
  },
  {
    slug: "mentoria",
    img: "../assets/linkbio-mentoria.jpg",
    alt: "Aprenda tudo que sua empresa precisa para crescer",
    href: "/em-breve/",
    newTab: false,
  },
  {
    slug: "whatsapp",
    img: "../assets/linkbio-whatsapp.jpg",
    alt: "Ficou com alguma dúvida? Fale comigo no WhatsApp",
    href: "https://wa.me/558196526901?text=Ol%C3%A1!%20Fiquei%20com%20uma%20d%C3%BAvida%20e%20gostaria%20de%20falar%20com%20voc%C3%AA.",
  },
];

/* ---------------------------------------------------------------------------
 * Tracking: o site é estático, então cada evento é gravado direto no Supabase
 * (PostgREST) com a chave anon. `keepalive` garante o envio mesmo quando o
 * clique já está navegando para fora da página.
 * ------------------------------------------------------------------------- */
const CFG = window.LINKBIO_CONFIG || {};

function track(kind, extra) {
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return; // ainda não configurado
  try {
    fetch(`${CFG.SUPABASE_URL}/rest/v1/linkbio_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: CFG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        kind,
        path: "/linkbio",
        referer: document.referrer || null,
        user_agent: navigator.userAgent || null,
        ...extra,
      }),
    }).catch(() => {});
  } catch (_) {
    /* tracking nunca pode atrapalhar a navegação */
  }
}

/* ---------------------------------------------------------------------------
 * Render dos cards a partir do array LINKS (mesmo padrão do carousel em app.js).
 * ------------------------------------------------------------------------- */
function renderLinks() {
  const wrap = document.getElementById("linkbio-links");
  if (!wrap) return;

  if (!LINKS.length) {
    wrap.innerHTML = '<p class="lb-empty">Em breve.</p>';
    return;
  }

  LINKS.forEach((link, i) => {
    const a = document.createElement("a");
    a.className = "lb-card";
    a.href = link.href;
    a.setAttribute("aria-label", link.alt || link.slug);
    const external = /^https?:\/\//.test(link.href);
    const newTab = link.newTab !== undefined ? link.newTab : external;
    if (newTab) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }

    const img = document.createElement("img");
    img.className = "lb-img";
    img.src = link.img;
    img.alt = link.alt || "";
    img.loading = i === 0 ? "eager" : "lazy";
    img.decoding = "async";
    a.appendChild(img);

    // Conta o clique (keepalive garante o envio mesmo navegando para fora).
    a.addEventListener("click", () => {
      track("click", { slug: link.slug, destination: link.href });
    });

    wrap.appendChild(a);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderLinks();
  track("visit"); // conta uma visita por carregamento real da página
});
