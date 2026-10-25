/* ============================================================
   main.js — ثلاثة أقسام مستقلة، كل واحد يمكن تعديله أو حذفه:
   1) اللغة   2) قائمة الهاتف   3) الدخول والحركة
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- 1) اللغة ---------- */
  const LANGS = window.NOSTA_LANGS, codes = Object.keys(LANGS);
  const root = document.documentElement;
  const original = {};                       // نحفظ النص العربي من الصفحة نفسها
  $$("[data-i18n],[data-i18n-html]").forEach(el => {
    const html = el.hasAttribute("data-i18n-html");
    original[el.dataset.i18n || el.dataset.i18nHtml] = html ? el.innerHTML : el.textContent;
  });
  LANGS.ar.t = original;

  function setLang(code) {
    const L = LANGS[code]; if (!L) return;
    root.lang = code; root.dir = L.dir; document.title = L.title;
    $$("[data-i18n]").forEach(el => { const v = L.t[el.dataset.i18n]; if (v != null) el.textContent = v; });
    $$("[data-i18n-html]").forEach(el => { const v = L.t[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
    const next = codes[(codes.indexOf(code) + 1) % codes.length];
    $("#lang-toggle").textContent = LANGS[next].label;
    $("#lang-toggle").dataset.next = next;
    store.set("nosta-lang", code);
  }
  $("#lang-toggle").addEventListener("click", e => setLang(e.currentTarget.dataset.next));
  const saved = store.get("nosta-lang");
  const guess = (navigator.language || "ar").slice(0, 2);
  setLang(LANGS[saved] ? saved : (LANGS[guess] ? guess : "ar"));

  /* ---------- 2) قائمة الهاتف ---------- */
  const burger = $("#burger"), menu = $("#menu");
  const closeMenu = () => { document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", "false"); };
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("a", menu).forEach(a => a.addEventListener("click", closeMenu));
  addEventListener("keydown", e => e.key === "Escape" && closeMenu());

  /* ---------- 3) الدخول والحركة ---------- */
  function start() {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");           // يشغّل حركة الهيرو في CSS
    setTimeout(() => $(".intro") && $(".intro").remove(), 1200);
  }
  const minWait = new Promise(r => setTimeout(r, 1700));
  const loaded = new Promise(r => document.readyState === "complete" ? r() : addEventListener("load", r));
  Promise.all([minWait, loaded]).then(start);
  setTimeout(start, 4000);                              // احتياط إذا تأخر شيء

  const io = "IntersectionObserver" in window && new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .15 });
  $$("[data-reveal]").forEach((el, i) => {
    el.style.setProperty("--d", (i % 3) * 90 + "ms");
    io ? io.observe(el) : el.classList.add("in");
  });

  /* ---------- 4) تجربة الزجاج عند الطلب ---------- */
  const yes = $("#try-yes"), body = $("#try-body");
  if (yes) yes.addEventListener("click", () => {
    const open = body.hidden;                           // الضغطة الثانية تُخفي التجربة
    body.hidden = !open;
    yes.setAttribute("aria-expanded", open);
    $(".try").classList.toggle("open", open);
    if (open) {
      requestAnimationFrame(() => window.NostaGlass && window.NostaGlass.init());
      setTimeout(() => body.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  });
})();
