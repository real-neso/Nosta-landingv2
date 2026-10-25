/* ============================================================
   glass.js — صندوق الزجاج التفاعلي (يبدأ فقط عند ضغط زر "نعم، جرّبه") (انكسار حقيقي بدون مكتبات)
   الفكرة: Canvas يرسم خريطة إزاحة لحواف الصندوق → فلتر SVG بثلاث
   قنوات لونية (تشتت الضوء) → backdrop-filter: url(#...).
   الانكسار الكامل يعمل في Chromium فقط، وغيره يرى تمويهًا فقط.
   لتغيير القيم الافتراضية عدّل DEFAULTS، ولتغيير شكل الحافة عدّل edgeProfile.
   ============================================================ */
window.NostaGlass = { init: function () {            // تُستدعى مرة واحدة عند ضغط "نعم"
  if (window.NostaGlass.done) return; window.NostaGlass.done = true;
  const box = document.getElementById("gbox"), stage = document.getElementById("stage");
  if (!box || !stage) return;

  const DEFAULTS = { amount: 45, height: 30, ca: 0.5, opacity: 0.12, size: 260 };
  const RADIUS = 32;                                   // نفس border-radius في CSS
  const edgeProfile = t => t * t;                      // t=1 عند الحافة، 0 عند نهاية الميل
  const state = { ...DEFAULTS };

  const ua = navigator.userAgent;
  const supported = /Chrome\//.test(ua) && !/CriOS|FxiOS|iPhone|iPad/.test(ua);

  /* فلتر SVG */
  const holder = document.createElement("div");
  holder.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="lg" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feImage id="lg-map" x="0" y="0" width="260" height="170" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap id="lg-r" in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dr"/>
    <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
    <feDisplacementMap id="lg-g" in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dg"/>
    <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>
    <feDisplacementMap id="lg-b" in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="db"/>
    <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/>
    <feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter></svg>`;
  document.body.appendChild(holder.firstChild);
  const $f = id => document.getElementById(id);

  /* خريطة الإزاحة: 128 = لا إزاحة، R=x، G=y */
  function buildMap(w, h, bevel) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d"), img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + .5 - w / 2, py = y + .5 - h / 2;
      const qx = Math.abs(px) - (w / 2 - RADIUS), qy = Math.abs(py) - (h / 2 - RADIUS);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const depth = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - RADIUS);
      let dx = 0, dy = 0;
      if (depth >= 0 && depth < bevel) {
        const m = edgeProfile(1 - depth / bevel);
        let nx, ny;
        if (ox > 0 || oy > 0) { const l = Math.hypot(ox, oy); nx = Math.sign(px) * ox / l; ny = Math.sign(py) * oy / l; }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
        dx = -nx * m; dy = -ny * m;                    // نحو الداخل
      }
      const i = (y * w + x) * 4;
      d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  let lastKey = "", raf = 0;
  function apply() {
    raf = 0;
    box.style.setProperty("--o", state.opacity);
    box.style.setProperty("--w", state.size + "px");
    if (!supported) { box.style.backdropFilter = box.style.webkitBackdropFilter = "blur(10px) saturate(1.4)"; return; }
    const w = box.offsetWidth, h = box.offsetHeight, key = w + "x" + h + "x" + state.height;
    if (key !== lastKey && w && h) {
      const url = buildMap(w, h, state.height), m = $f("lg-map");
      m.setAttribute("width", w); m.setAttribute("height", h);
      m.setAttribute("href", url); m.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
      lastKey = key;
    }
    $f("lg-r").setAttribute("scale", state.amount * (1 + state.ca * .3));
    $f("lg-g").setAttribute("scale", state.amount);
    $f("lg-b").setAttribute("scale", state.amount * (1 - state.ca * .3));
    box.style.backdropFilter = box.style.webkitBackdropFilter = "url(#lg) blur(1.5px) saturate(1.4)";
  }
  const queue = () => raf || (raf = requestAnimationFrame(apply));

  /* أشرطة التحكم */
  document.querySelectorAll("#ctrls input").forEach(inp => {
    const k = inp.dataset.k, out = inp.parentNode.querySelector("output");
    inp.value = state[k]; out.textContent = state[k];
    if (!supported && ["amount", "height", "ca"].includes(k)) inp.disabled = true;
    inp.addEventListener("input", () => { state[k] = parseFloat(inp.value); out.textContent = inp.value; queue(); });
  });
  document.getElementById("lg-reset")?.addEventListener("click", () => {
    Object.assign(state, DEFAULTS);
    document.querySelectorAll("#ctrls input").forEach(i => { i.value = state[i.dataset.k]; i.parentNode.querySelector("output").textContent = i.value; });
    place(.5, .5); queue();
  });

  /* السحب (Move Box Position) */
  let fx = .5, fy = .5;
  function place(a, b) {
    fx = Math.min(1, Math.max(0, a)); fy = Math.min(1, Math.max(0, b));
    const mx = stage.clientWidth - box.offsetWidth, my = stage.clientHeight - box.offsetHeight;
    box.style.left = fx * mx + "px"; box.style.top = fy * my + "px";
  }
  let drag = null;
  box.addEventListener("pointerdown", e => {
    drag = { x: e.clientX - box.offsetLeft, y: e.clientY - box.offsetTop };
    box.setPointerCapture(e.pointerId); box.classList.add("drag");
  });
  box.addEventListener("pointermove", e => {
    if (!drag) return;
    const mx = stage.clientWidth - box.offsetWidth, my = stage.clientHeight - box.offsetHeight;
    place((e.clientX - drag.x) / mx, (e.clientY - drag.y) / my);
  });
  const end = () => { drag = null; box.classList.remove("drag"); };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);

  if (!supported) document.getElementById("glass-note").hidden = false;
  new ResizeObserver(() => { place(fx, fy); queue(); }).observe(box);
  new ResizeObserver(() => place(fx, fy)).observe(stage);
  place(.5, .5); queue();
} };
