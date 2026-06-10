/* ===========================================================================
 * Link na Bio — render dos cards + tracking de clique.
 * A VISITA é contada pelo /track.js (pageview automático). Aqui só renderizamos
 * os cards e contamos o CLIQUE em cada um.
 *
 * COMO EDITAR OS LINKS: mexa só no array LINKS abaixo. Cada item:
 *   slug  -> identificador curto e único (aparece no painel /admin)
 *   img   -> caminho da imagem (coloque o arquivo em /assets e referencie aqui)
 *   alt   -> texto alternativo (acessibilidade)
 *   href  -> destino do clique (https://... ou caminho interno)
 *   newTab-> abrir em nova aba? (padrão: true para links externos)
 * =========================================================================== */
const LINKS = [
  {
    slug: "agencia",
    img: "/assets/linkbio-agencia.jpg",
    alt: "Pare de fazer tudo sozinho — conheça a Heaven Agência",
    href: "/",
    newTab: false,
  },
  {
    slug: "mentoria",
    img: "/assets/linkbio-mentoria.jpg",
    alt: "Aprenda tudo que sua empresa precisa para crescer",
    href: "/em-breve/",
    newTab: false,
  },
  {
    slug: "whatsapp",
    img: "/assets/linkbio-whatsapp.jpg",
    alt: "Ficou com alguma dúvida? Fale comigo no WhatsApp",
    href: "https://wa.me/558196526901?text=Ol%C3%A1!%20Fiquei%20com%20uma%20d%C3%BAvida%20e%20gostaria%20de%20falar%20com%20voc%C3%AA.",
  },
];

function trackClick(slug, destination) {
  if (window.HeavenTrack) window.HeavenTrack.event("click", { slug: slug, destination: destination });
}

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

    a.addEventListener("click", () => trackClick(link.slug, link.href));
    wrap.appendChild(a);
  });
}

document.addEventListener("DOMContentLoaded", renderLinks);
