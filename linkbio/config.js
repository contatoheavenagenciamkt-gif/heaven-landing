/* ===========================================================================
 * Configuração do tracking do /linkbio.
 *
 * A SUPABASE_ANON_KEY é PÚBLICA por natureza (vai no navegador) — não é segredo.
 * Pegue em: Supabase do CRM → Project Settings → API → "anon public".
 * (Projeto mkhiykxsfbcbybxhqlkj, o mesmo do funil /forms/.)
 * =========================================================================== */
window.LINKBIO_CONFIG = {
  SUPABASE_URL: "https://mkhiykxsfbcbybxhqlkj.supabase.co",

  // anon public key (mkhiykxsfbcbybxhqlkj) — pública por design, vai no navegador.
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raGl5a3hzZmJjYnlieGhxbGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODE3MTUsImV4cCI6MjA5MzE1NzcxNX0.6RfFBkjZ-TSpXkGzH0hbUzDE_5l1hi7s8tS3yczCWDI",

  // Senha simples para abrir o painel /linkbio/stats (apenas um obstáculo —
  // os números agregados não são sensíveis). Deixe vazio para não pedir senha.
  STATS_PASSWORD: "",
};
