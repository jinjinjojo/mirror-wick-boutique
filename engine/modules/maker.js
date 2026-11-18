// Meme maker: pick a template, edit its text boxes, drag text and stickers, download a PNG, post it.
// Templates come from the section config (text boxes with position/size in 0..1 units of the image).

const FONT_CSS = "https://fonts.googleapis.com/css2?family=Anton&display=swap";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function wrap(g, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function initMaker(section, { data }) {
  let cfg;
  try {
    cfg = JSON.parse(section.dataset.maker);
  } catch {
    return;
  }
  if (!cfg.templates?.length) return;
  if (!document.querySelector(`link[href="${FONT_CSS}"]`)) {
    document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: FONT_CSS }));
  }
  const families = [...new Set(cfg.templates.flatMap((t) => (t.texts ?? []).map((b) => b.font || "Anton")))];
  await Promise.all(families.map((f) => document.fonts?.load?.(`64px "${f}"`).catch(() => {})));

  const canvas = section.querySelector(".maker__canvas");
  const stage = section.querySelector(".maker__stage");
  const fields = section.querySelector("[data-fields]");
  const g = canvas.getContext("2d");
  const state = { tpl: 0, img: null, texts: [], stickers: [] };
  const stickerImgs = await Promise.all((cfg.stickers ?? []).map((src) => loadImage(src).catch(() => null)));

  async function useTemplate(i) {
    const t = cfg.templates[i];
    let im;
    try {
      im = await loadImage(t.src);
    } catch {
      return false;
    }
    state.tpl = i;
    state.img = im;
    const ratio = state.img.naturalHeight / state.img.naturalWidth || 1;
    canvas.width = 1080;
    canvas.height = Math.round(1080 * Math.min(1.5, Math.max(0.5, ratio)));
    stage.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    state.texts = t.texts.map((b) => ({ ...b, value: b.default }));
    state.stickers = [];
    section.querySelectorAll("[data-tpl]").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.tpl) === i));
    fields.innerHTML = "";
    state.texts.forEach((b, j) => {
      const label = document.createElement("label");
      label.className = "maker__field";
      const span = document.createElement("span");
      span.className = "maker__label";
      span.textContent = b.label;
      const input = document.createElement("input");
      input.type = "text";
      input.value = b.value;
      input.maxLength = 120;
      input.addEventListener("input", () => {
        state.texts[j].value = input.value;
        draw();
      });
      label.append(span, input);
      fields.append(label);
    });
    draw();
    return true;
  }

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    g.clearRect(0, 0, W, H);
    if (state.img) {
      const r = Math.max(W / state.img.naturalWidth, H / state.img.naturalHeight);
      const w = state.img.naturalWidth * r;
      const h = state.img.naturalHeight * r;
      g.drawImage(state.img, (W - w) / 2, (H - h) / 2, w, h);
    }
    for (const s of state.stickers) {
      const size = s.scale * W;
      g.drawImage(s.img, s.x * W - size / 2, s.y * H - size / 2, size, (size * s.img.naturalHeight) / s.img.naturalWidth);
    }
    for (const b of state.texts) {
      const text = b.uppercase ? b.value.toUpperCase() : b.value;
      if (!text.trim()) continue;
      const size = b.size * W;
      g.save();
      g.translate(b.x * W, b.y * H);
      g.rotate(((b.rotate || 0) * Math.PI) / 180);
      g.font = `${Math.round(size)}px "${b.font}", Impact, "Arial Black", sans-serif`;
      g.textAlign = b.align;
      g.textBaseline = "middle";
      g.lineJoin = "round";
      const lines = wrap(g, text, b.w * W);
      const lh = size * 1.05;
      lines.forEach((line, k) => {
        const y = (k - (lines.length - 1) / 2) * lh;
        if (b.stroke) {
          g.strokeStyle = b.stroke;
          g.lineWidth = size * 0.14;
          g.strokeText(line, 0, y);
        }
        g.fillStyle = b.color;
        g.fillText(line, 0, y);
      });
      g.restore();
    }
    const mark = `$${cfg.ticker}${cfg.site ? ` · ${cfg.site.replace(/^https?:\/\//, "")}` : ""}`;
    g.font = `600 ${Math.round(W * 0.022)}px system-ui, sans-serif`;
    g.textAlign = "right";
    g.textBaseline = "bottom";
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.lineWidth = W * 0.004;
    g.strokeText(mark, W - W * 0.02, H - W * 0.015);
    g.fillText(mark, W - W * 0.02, H - W * 0.015);
  }

  // Dragging text boxes and stickers.
  let drag = null;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  canvas.addEventListener("pointerdown", (e) => {
    const p = pos(e);
    const hits = [
      ...state.stickers.map((s) => ({ o: s, d: Math.hypot(s.x - p.x, s.y - p.y), r: s.scale / 2 })),
      ...state.texts.map((t) => ({ o: t, d: Math.hypot((t.x - p.x) * 1, (t.y - p.y) * 2), r: 0.18 })),
    ].filter((h) => h.d < h.r);
    hits.sort((a, b) => a.d - b.d);
    if (!hits.length) return;
    drag = { o: hits[0].o, dx: hits[0].o.x - p.x, dy: hits[0].o.y - p.y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = pos(e);
    drag.o.x = Math.min(1, Math.max(0, p.x + drag.dx));
    drag.o.y = Math.min(1, Math.max(0, p.y + drag.dy));
    draw();
  });
  canvas.addEventListener("pointerup", () => (drag = null));
  canvas.addEventListener("dblclick", (e) => {
    const p = pos(e);
    const i = state.stickers.findIndex((s) => Math.hypot(s.x - p.x, s.y - p.y) < s.scale / 2);
    if (i >= 0) {
      state.stickers.splice(i, 1);
      draw();
    }
  });

  section.addEventListener("click", async (e) => {
    const tpl = e.target.closest("[data-tpl]");
    if (tpl) return useTemplate(Number(tpl.dataset.tpl));
    const st = e.target.closest("[data-sticker]");
    if (st) {
      const img = stickerImgs[Number(st.dataset.sticker)];
      if (img) {
        state.stickers.push({ img, x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.5 + (Math.random() - 0.5) * 0.3, scale: 0.26 });
        draw();
      }
      return;
    }
    if (e.target.closest("[data-reset]")) return useTemplate(state.tpl);
    if (e.target.closest("[data-download]")) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: `${cfg.ticker.toLowerCase()}-meme.png` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
      return;
    }
    if (e.target.closest("[data-share]")) {
      const text = `Made a $${cfg.ticker} meme${cfg.site ? ` at ${cfg.site}` : ""}`;
      window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  });

  for (let i = 0; i < cfg.templates.length; i++) {
    if (await useTemplate(i)) {
      section.classList.add("is-ready");
      break;
    }
  }
  void data;
}
