// Loader: the logo assembles from particles while fonts and hero images load, with a thin progress bar.
// Always short: at least 650 ms so it doesn't flash, at most 2.6 s so it never blocks the page.

function particlesFromImage(img, size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = Math.min(size / img.naturalWidth, size / img.naturalHeight) || 1;
  const w = img.naturalWidth * r;
  const h = img.naturalHeight * r;
  g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  let px;
  try {
    px = g.getImageData(0, 0, size, size).data;
  } catch {
    return [];
  }
  const out = [];
  const step = Math.max(2, Math.round(size / 70));
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const i = (y * size + x) * 4;
      if (px[i + 3] > 120) out.push({ tx: x, ty: y, col: `rgb(${px[i]},${px[i + 1]},${px[i + 2]})` });
    }
  }
  return out;
}

export async function runLoader(el, { reduced }) {
  const bar = el.querySelector("[data-loader-bar]");
  const mark = el.querySelector(".loader__mark");
  const img = mark?.querySelector("img");
  const canvas = el.querySelector("[data-loader-canvas]");
  const start = performance.now();
  let progress = 0.1;
  const set = (p) => {
    progress = Math.max(progress, p);
    bar?.parentElement?.style.setProperty("--lp", progress.toFixed(2));
    bar?.style.setProperty("--lp", progress.toFixed(2));
  };

  let stopParticles = () => {};
  let stopEarly = false;
  if (!reduced && img && canvas) {
    // A slow logo never holds the page: particles only run if it decodes quickly.
    await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 700))]);
    if (!img.complete || !img.naturalWidth) stopEarly = true;
    const size = 120;
    const pts = stopEarly ? [] : particlesFromImage(img, size);
    if (pts.length > 20) {
      mark.classList.add("has-particles");
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const box = size + 80;
      canvas.width = box * dpr;
      canvas.height = box * dpr;
      const g = canvas.getContext("2d");
      g.scale(dpr, dpr);
      const parts = pts.map((p) => {
        const a = Math.random() * Math.PI * 2;
        const d = 60 + Math.random() * 90;
        return { ...p, x: box / 2 + Math.cos(a) * d, y: box / 2 + Math.sin(a) * d, delay: Math.random() * 260 };
      });
      let raf = 0;
      const t0 = performance.now();
      const tick = (now) => {
        const t = now - t0;
        g.clearRect(0, 0, box, box);
        let done = true;
        for (const p of parts) {
          const k = Math.min(1, Math.max(0, (t - p.delay) / 700));
          const e = 1 - Math.pow(1 - k, 3);
          if (k < 1) done = false;
          const x = p.x + (p.tx + 40 - p.x) * e;
          const y = p.y + (p.ty + 40 - p.y) * e;
          g.fillStyle = p.col;
          g.globalAlpha = 0.35 + 0.65 * e;
          g.fillRect(x, y, 2, 2);
        }
        if (done) {
          mark.classList.add("is-formed");
          setTimeout(() => (canvas.style.opacity = "0"), 200);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stopParticles = () => cancelAnimationFrame(raf);
    }
  }

  const waits = [
    document.fonts?.ready?.then(() => set(0.45)),
    ...[...document.querySelectorAll('img[fetchpriority="high"]')].map((im) => (im.complete ? Promise.resolve() : im.decode().catch(() => {}))),
  ];
  const all = Promise.all(waits).then(() => set(0.85));
  const timeout = new Promise((r) => setTimeout(r, 2600));
  await Promise.race([all, timeout]);
  const elapsed = performance.now() - start;
  if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed));
  set(1);
  await new Promise((r) => setTimeout(r, reduced ? 0 : 260));
  el.classList.add("is-done");
  setTimeout(() => {
    stopParticles();
    el.remove();
  }, 900);
}
