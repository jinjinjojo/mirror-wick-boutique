// Core interactions: reveal on scroll, split headlines, magnetic buttons, tilt cards, parallax, scroll progress,
// nav (scrolled state, scroll spy, mobile sheet), copy contract, "soon" placeholders, announcement, countdown,
// toasts, confetti and a Konami-code easter egg.

import { countdownText } from "./format.js";

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(message, iconSvg = "") {
  const box = document.querySelector("[data-toasts]");
  if (!box) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = iconSvg;
  el.append(message);
  box.append(el);
  setTimeout(() => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 320);
  }, 2400);
}

const CHECK = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>';
const CLOCK = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

export function confetti(x, y, { count = 70, colors } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const css = getComputedStyle(document.documentElement);
  const palette = colors ?? [css.getPropertyValue("--accent"), css.getPropertyValue("--accent-2"), css.getPropertyValue("--up"), "#ffffff"].map((c) => c.trim()).filter(Boolean);
  const c = document.createElement("canvas");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  Object.assign(c.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 260 });
  document.body.append(c);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const v = 6 + Math.random() * 9;
    return {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: palette[(Math.random() * palette.length) | 0],
      life: 0,
    };
  });
  let raf = 0;
  const tick = () => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of parts) {
      p.life++;
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      if (p.y < innerHeight + 40 && p.life < 220) alive++;
      g.save();
      g.globalAlpha = Math.max(0, 1 - p.life / 220);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.color;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 8)));
      g.restore();
    }
    if (alive) raf = requestAnimationFrame(tick);
    else c.remove();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function splitWords(el) {
  let wi = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(" ");
            continue;
          }
          const outer = document.createElement("span");
          outer.className = "split-w";
          const inner = document.createElement("span");
          inner.textContent = part;
          inner.style.setProperty("--wi", wi++);
          outer.append(inner);
          frag.append(outer);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.matches("img, .eyes-glyph, svg, br")) {
        walk(child);
      }
    }
  };
  walk(el);
  el.classList.add("is-split");
}

function splitChars(el) {
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  let ci = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        // Letters are grouped per word in an unbreakable wrapper, so lines only ever break between words.
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(part);
            continue;
          }
          const word = document.createElement("span");
          word.className = "split-word";
          word.setAttribute("aria-hidden", "true");
          for (const ch of part) {
            const s = document.createElement("span");
            s.className = "split-c";
            s.textContent = ch;
            s.style.setProperty("--ci", ci++);
            word.append(s);
          }
          frag.append(word);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.matches("br")) {
        if (child.matches("img, .eyes-glyph")) {
          child.classList.add("split-c");
          child.style.setProperty("--ci", ci++);
        } else walk(child);
      }
    }
  };
  walk(el);
  el.classList.add("is-split");
}

function initReveal({ reduced }) {
  const root = document.documentElement;
  $$("[data-split]").forEach((el) => (el.dataset.split === "chars" ? splitChars(el) : splitWords(el)));
  // The hero headline animates on load, on a timer: it never waits for the scroll observer.
  $$('[data-split="chars"]').forEach((el) => setTimeout(() => el.classList.add("is-in", "is-in-now"), reduced ? 0 : 60));
  const show = (el) => {
    el.classList.add("is-in");
    const kick = () => {
      if (el.matches("[data-split]")) el.classList.add("is-in-now");
      el.querySelectorAll("[data-split]").forEach((s) => s.classList.add("is-in-now"));
    };
    root.classList.contains("reveal-on") ? requestAnimationFrame(kick) : kick();
  };
  const targets = $$("[data-reveal], [data-split]:not([data-split='chars'])");
  if (reduced || !("IntersectionObserver" in window)) return targets.forEach(show);
  let first = true;
  const io = new IntersectionObserver((entries) => {
    // Show what's already on screen before switching hiding on, so nothing visible ever blinks out.
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      show(e.target);
      io.unobserve(e.target);
    }
    if (first) {
      first = false;
      root.classList.add("reveal-on");
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
}

function initPointerFx({ reduced, finePointer }) {
  if (reduced || !finePointer) return;
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
    });
  });
  $$("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${(px - 0.5) * 7}deg`);
      el.style.setProperty("--rx", `${(0.5 - py) * 7}deg`);
      el.style.setProperty("--gx", `${px * 100}%`);
      el.style.setProperty("--gy", `${py * 100}%`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
}

function initScroll({ reduced }) {
  const bar = document.querySelector("[data-progress]");
  const nav = document.querySelector("[data-nav]");
  const para = reduced ? [] : $$("[data-parallax]");
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar?.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    nav?.classList.toggle("is-scrolled", y > 8);
    for (const el of para) el.style.setProperty("--py", `${(y * Number(el.dataset.parallax || 0.05)).toFixed(1)}px`);
  };
  addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function initNav() {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  const burger = nav.querySelector("[data-burger]");
  const sheet = nav.querySelector("[data-sheet]");
  const setOpen = (open) => {
    if (!sheet) return;
    sheet.hidden = !open;
    nav.classList.toggle("is-open", open);
    burger?.setAttribute("aria-expanded", String(open));
  };
  burger?.addEventListener("click", () => setOpen(sheet.hidden));
  sheet?.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
  addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));

  const links = new Map($$("[data-spy]", nav).map((a) => [a.dataset.spy, a]));
  if (!links.size || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.remove("is-active"));
      links.get(e.target.id)?.classList.add("is-active");
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((_, id) => {
    const sec = document.getElementById(id);
    if (sec) io.observe(sec);
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand?.("copy");
    ta.remove();
    return !!ok;
  }
}

const SOON_MESSAGE = {
  buy: "Buying opens at launch. The contract goes up on this page first.",
  chart: "The chart goes live at launch.",
  dexscreener: "DexScreener goes live at launch.",
  birdeye: "Live at launch.",
  gmgn: "Live at launch.",
  solscan: "Live at launch.",
  pumpfun: "pump.fun page opens at launch.",
};

function initClicks({ data }) {
  document.addEventListener("click", async (e) => {
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      e.preventDefault();
      const ok = await copyText(copy.dataset.copy);
      if (ok) {
        copy.classList.add("is-copied");
        const label = copy.querySelector("span");
        const prev = label?.textContent;
        if (label) label.textContent = "Copied";
        toast("Contract address copied", CHECK);
        const r = copy.getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height / 2);
        setTimeout(() => {
          copy.classList.remove("is-copied");
          if (label && prev) label.textContent = prev;
        }, 1800);
      }
      return;
    }
    const soon = e.target.closest("[data-soon]");
    if (soon) {
      e.preventDefault();
      const kind = soon.dataset.soon;
      toast(SOON_MESSAGE[kind] ?? `${kind[0].toUpperCase()}${kind.slice(1)} opens at launch.`, CLOCK);
      return;
    }
    const dismiss = e.target.closest("[data-dismiss]");
    if (dismiss) {
      const bar = dismiss.closest("[data-announce]");
      bar?.classList.add("is-hidden");
      try {
        localStorage.setItem(`announce:${data.ticker}:${bar?.textContent.trim().slice(0, 60)}`, "1");
      } catch {}
      return;
    }
    const mascot = e.target.closest("[data-mascot]");
    if (mascot) {
      const r = mascot.getBoundingClientRect();
      mascot.animate([{ transform: "scale(1)" }, { transform: "scale(0.94) rotate(-2deg)" }, { transform: "scale(1.04) rotate(1deg)" }, { transform: "scale(1)" }], { duration: 520, easing: "cubic-bezier(.34,1.56,.64,1)" });
      confetti(r.left + r.width / 2, r.top + r.height * 0.4, { count: 36 });
    }
  });
  const bar = document.querySelector("[data-announce]");
  try {
    if (bar && localStorage.getItem(`announce:${data.ticker}:${bar.textContent.trim().slice(0, 60)}`)) bar.classList.add("is-hidden");
  } catch {}
}

function initCountdowns() {
  const els = $$("[data-countdown]");
  if (!els.length) return;
  const tick = () => {
    for (const el of els) {
      const out = el.querySelector("[data-countdown-text]");
      if (out) out.textContent = countdownText(Date.parse(el.dataset.countdown) - Date.now());
    }
  };
  tick();
  setInterval(tick, 1000);
}

function initKonami({ data }) {
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let i = 0;
  addEventListener("keydown", (e) => {
    i = e.key === code[i] ? i + 1 : e.key === code[0] ? 1 : 0;
    if (i < code.length) return;
    i = 0;
    const logo = data.images?.logo;
    for (let n = 0; n < 36; n++) {
      const el = document.createElement(logo ? "img" : "span");
      if (logo) el.src = logo;
      else el.textContent = "✦";
      const size = 28 + Math.random() * 46;
      Object.assign(el.style, {
        position: "fixed",
        left: `${Math.random() * 100}vw`,
        top: "-80px",
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 270,
        pointerEvents: "none",
        borderRadius: "12px",
      });
      document.body.append(el);
      el.animate(
        [{ transform: "translateY(0) rotate(0)" }, { transform: `translateY(${innerHeight + 160}px) rotate(${(Math.random() - 0.5) * 720}deg)` }],
        { duration: 2200 + Math.random() * 1800, delay: Math.random() * 900, easing: "cubic-bezier(.3,.1,.6,1)" },
      ).onfinish = () => el.remove();
    }
    toast(`$${data.ticker} mode unlocked`);
  });
}

export function initUI(ctx) {
  initReveal(ctx);
  initPointerFx(ctx);
  initScroll(ctx);
  initNav();
  initClicks(ctx);
  initCountdowns();
  initKonami(ctx);
}
