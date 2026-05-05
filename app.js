/* ============ NAV scroll ============ */
const nav = document.getElementById('nav');
const onScroll = () => {
  if (window.scrollY > 30) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ============ Reveal on scroll ============ */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* Failsafe: anything in viewport on first paint becomes visible immediately */
requestAnimationFrame(() => {
  document.querySelectorAll('.reveal').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('in');
    }
  });
});

/* After 1.2s, force-reveal anything still hidden — guarantees user never sees a blank page */
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200) el.classList.add('in');
  });
}, 1200);

/* ============ CAROUSEL ============ */
const slidesData = [
  { desktop: 'assets/slide-1.webp', mobile: 'assets/slide-mobile-1.webp', alt: 'Serviço Heaven 1' },
  { desktop: 'assets/slide-2.webp', mobile: 'assets/slide-mobile-2.webp', alt: 'Serviço Heaven 2' },
  { desktop: 'assets/slide-3.webp', mobile: 'assets/slide-mobile-3.webp', alt: 'Serviço Heaven 3' },
  { desktop: 'assets/slide-4.webp', mobile: 'assets/slide-mobile-4.webp', alt: 'Serviço Heaven 4' },
  { desktop: 'assets/slide-5.webp', mobile: 'assets/slide-mobile-5.webp', alt: 'Serviço Heaven 5' },
  { desktop: 'assets/slide-6.webp', mobile: 'assets/slide-mobile-6.webp', alt: 'Serviço Heaven 6' },
  { desktop: 'assets/slide-7.webp', mobile: 'assets/slide-mobile-7.webp', alt: 'Serviço Heaven 7' }
];

const track = document.getElementById('track');
const dotsWrap = document.getElementById('dots');
slidesData.forEach((s, i) => {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const loading = i === 0 ? 'eager' : 'lazy';
  slide.innerHTML = `
    <picture class="slide-picture">
      <source media="(max-width: 760px)" srcset="${s.mobile}" />
      <img class="slide-image" src="${s.desktop}" alt="${s.alt}" loading="${loading}" />
    </picture>
  `;
  track.appendChild(slide);

  const dot = document.createElement('button');
  dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
  dot.setAttribute('aria-label', `Slide ${i+1}`);
  dot.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(dot);
});

let cur = 0;
const total = slidesData.length;
const goTo = (i) => {
  cur = (i + total) % total;
  track.style.transform = `translateX(-${cur * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, idx) => {
    d.classList.toggle('active', idx === cur);
  });
};
document.querySelector('.carousel-arrow.prev').addEventListener('click', () => goTo(cur - 1));
document.querySelector('.carousel-arrow.next').addEventListener('click', () => goTo(cur + 1));

/* keyboard nav for carousel */
document.getElementById('carousel').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goTo(cur - 1);
  if (e.key === 'ArrowRight') goTo(cur + 1);
});

/* method node hover -> highlight related arrow (simple polish) */
document.querySelectorAll('.method-node').forEach(node => {
  node.addEventListener('mouseenter', () => {
    document.querySelector('.method-svg-arrows').style.opacity = '1';
  });
});
