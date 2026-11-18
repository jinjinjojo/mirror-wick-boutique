// Animated backgrounds on one fixed canvas behind the page. Colors come from the theme's CSS variables.
// Effects: swirl, starfield, aurora, pixelstars, paper, dust, bubbles, coderain, synthgrid, fireflies.

function parseColor(c, fallback = [255, 255, 255]) {
  c = (c || "").trim();
  let m = c.match(/^#([0-9a-f]{3})$/i);
  if (m) return m[1].split("").map((x) => parseInt(x + x, 16));
  m = c.match(/^#([0-9a-f]{6})/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = c.match(/rgba?\(([^)]+)\)/i);
  if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number);
  return fallback;
}
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
const rand = (a, b) => a + Math.random() * (b - a);

const EFFECTS = {
  starfield(g, C) {
    let stars = [];
    return {
      init(w, h) {
        stars = Array.from({ length: Math.min(420, Math.round((w * h) / 4200)) }, () => ({
          x: rand(0, w),
          y: rand(0, h),
          z: rand(0.2, 1),
          t: rand(0, 6.28),
        }));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        for (const s of stars) {
          s.x -= dt * 0.006 * s.z;
          if (s.x < -2) s.x = w + 2;
          const a = 0.25 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(t / 700 + s.t));
          g.fillStyle = rgba(s.z > 0.93 ? C.accent : C.fg, a);
          const r = s.z * 1.3;
          g.fillRect(s.x, s.y, r, r);
        }
      },
    };
  },

  swirl(g, C) {
    let stars = [];
    let motes = [];
    let cx = 0;
    let cy = 0;
    const spawn = (w, h, anywhere) => {
      const R = Math.hypot(w, h) * 0.55;
      return { a: rand(0, 6.283), r: anywhere ? rand(40, R) : rand(R * 0.7, R), s: rand(0.00006, 0.00018), size: rand(0.6, 2.2), hue: Math.random() };
    };
    return {
      init(w, h) {
        cx = w * 0.5;
        cy = h * 0.46;
        stars = Array.from({ length: Math.min(260, Math.round((w * h) / 7000)) }, () => ({ x: rand(0, w), y: rand(0, h), z: rand(0.2, 1), t: rand(0, 6.28) }));
        motes = Array.from({ length: Math.min(340, Math.round((w * h) / 5200)) }, () => spawn(w, h, true));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        glow.addColorStop(0, rgba(C.accent2, 0.1));
        glow.addColorStop(0.35, rgba(C.accent2, 0.045));
        glow.addColorStop(1, rgba(C.accent2, 0));
        g.fillStyle = glow;
        g.fillRect(0, 0, w, h);
        for (const s of stars) {
          const a = 0.18 + 0.5 * s.z * (0.6 + 0.4 * Math.sin(t / 900 + s.t));
          g.fillStyle = rgba(C.fg, a);
          g.fillRect(s.x, s.y, s.z * 1.2, s.z * 1.2);
        }
        g.globalCompositeOperation = "lighter";
        for (const m of motes) {
          m.a += m.s * dt * (1 + 260 / (m.r + 30));
          m.r -= dt * 0.012 * (1 + 120 / (m.r + 20));
          if (m.r < 14) Object.assign(m, spawn(w, h, false));
          const x = cx + Math.cos(m.a) * m.r;
          const y = cy + Math.sin(m.a) * m.r * 0.62;
          const fade = Math.min(1, m.r / 160);
          const col = m.hue > 0.82 ? C.accent : m.hue > 0.55 ? C.accent2 : C.fg;
          g.fillStyle = rgba(col, 0.55 * fade);
          g.beginPath();
          g.arc(x, y, m.size * (0.5 + fade * 0.5), 0, 6.283);
          g.fill();
        }
        g.globalCompositeOperation = "source-over";
      },
    };
  },

  aurora(g, C) {
    let blobs = [];
    return {
      init(w, h) {
        blobs = [C.accent, C.accent2, C.accent, C.accent2].map((c, i) => ({ c, px: rand(0, 6.28), py: rand(0, 6.28), sx: rand(0.00005, 0.00012), sy: rand(0.00004, 0.0001), r: Math.max(w, h) * rand(0.32, 0.5), i }));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        g.globalCompositeOperation = "lighter";
        for (const b of blobs) {
          const x = w * (0.5 + 0.42 * Math.sin(t * b.sx + b.px));
          const y = h * (0.35 + 0.3 * Math.sin(t * b.sy + b.py));
          const grad = g.createRadialGradient(x, y, 0, x, y, b.r);
          grad.addColorStop(0, rgba(b.c, 0.16));
          grad.addColorStop(1, rgba(b.c, 0));
          g.fillStyle = grad;
          g.fillRect(0, 0, w, h);
        }
        g.globalCompositeOperation = "source-over";
      },
    };
  },

  pixelstars(g, C, { mode }) {
    let px = [];
    const size = 4;
    const ink = mode === "light" ? C.fg : [255, 255, 255];
    return {
      init(w, h) {
        px = Array.from({ length: Math.min(220, Math.round((w * h) / 9000)) }, () => ({ x: Math.floor(rand(0, w / size)) * size, y: Math.floor(rand(0, h / size)) * size, t: rand(0, 6.28), sp: rand(0.6, 1.6), big: Math.random() > 0.85 }));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        for (const p of px) {
          const a = Math.max(0, Math.sin(t / 600 * p.sp + p.t));
          if (a < 0.05) continue;
          g.fillStyle = rgba(p.big ? C.accent : ink, (mode === "light" ? 0.35 : 0.7) * a);
          g.fillRect(p.x, p.y, size, size);
          if (p.big && a > 0.6) {
            g.fillRect(p.x - size, p.y, size, size);
            g.fillRect(p.x + size, p.y, size, size);
            g.fillRect(p.x, p.y - size, size, size);
            g.fillRect(p.x, p.y + size, size, size);
          }
        }
      },
    };
  },

  paper(g, C) {
    let bits = [];
    const tones = ["#FFFFFF", "#FAF6EA", "#FFE14D", "#F3EDDC"];
    const make = (w, h, top) => ({ x: rand(0, w), y: top ? rand(-h * 0.2, -20) : rand(0, h), w: rand(8, 22), h: rand(10, 28), r: rand(0, 6.28), vr: rand(-0.0012, 0.0012), vy: rand(0.012, 0.032), sway: rand(0, 6.28), c: tones[(Math.random() * tones.length) | 0] });
    return {
      init(w, h) {
        bits = Array.from({ length: Math.min(40, Math.round((w * h) / 42000)) }, () => make(w, h, false));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        for (const b of bits) {
          b.y += b.vy * dt;
          b.r += b.vr * dt;
          const x = b.x + Math.sin(t / 1400 + b.sway) * 26;
          if (b.y > h + 30) Object.assign(b, make(w, h, true));
          g.save();
          g.translate(x, b.y);
          g.rotate(b.r);
          g.shadowColor = "rgba(0,0,0,0.12)";
          g.shadowBlur = 6;
          g.shadowOffsetY = 2;
          g.fillStyle = b.c;
          g.globalAlpha = 0.75;
          g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
          g.restore();
        }
      },
    };
  },

  dust(g, C) {
    let motes = [];
    const make = (w, h, bottom) => ({ x: rand(0, w), y: bottom ? h + rand(0, 40) : rand(0, h), r: Math.random() > 0.9 ? rand(6, 16) : rand(0.8, 2.4), vy: rand(0.006, 0.02), ph: rand(0, 6.28), f: rand(0.4, 1) });
    return {
      init(w, h) {
        motes = Array.from({ length: Math.min(120, Math.round((w * h) / 12000)) }, () => make(w, h, false));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        for (const m of motes) {
          m.y -= m.vy * dt;
          if (m.y < -20) Object.assign(m, make(w, h, true));
          const x = m.x + Math.sin(t / 2200 + m.ph) * 18;
          const a = (m.r > 5 ? 0.06 : 0.45) * m.f * (0.6 + 0.4 * Math.sin(t / 500 + m.ph));
          const grad = g.createRadialGradient(x, m.y, 0, x, m.y, m.r * 2);
          grad.addColorStop(0, rgba(C.accent, a));
          grad.addColorStop(1, rgba(C.accent, 0));
          g.fillStyle = grad;
          g.beginPath();
          g.arc(x, m.y, m.r * 2, 0, 6.283);
          g.fill();
        }
      },
    };
  },

  bubbles(g, C) {
    let bs = [];
    const cols = [C.accent, C.accent2, C.up];
    const make = (w, h, bottom) => ({ x: rand(0, w), y: bottom ? h + rand(20, 120) : rand(0, h), r: rand(8, 42), vy: rand(0.015, 0.045), ph: rand(0, 6.28), c: cols[(Math.random() * cols.length) | 0] });
    return {
      init(w, h) {
        bs = Array.from({ length: Math.min(36, Math.round((w * h) / 36000)) }, () => make(w, h, false));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        for (const b of bs) {
          b.y -= b.vy * dt;
          if (b.y < -60) Object.assign(b, make(w, h, true));
          const x = b.x + Math.sin(t / 1600 + b.ph) * 20;
          g.fillStyle = rgba(b.c, 0.12);
          g.strokeStyle = rgba(b.c, 0.35);
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(x, b.y, b.r, 0, 6.283);
          g.fill();
          g.stroke();
          g.fillStyle = "rgba(255,255,255,0.55)";
          g.beginPath();
          g.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.18, 0, 6.283);
          g.fill();
        }
      },
    };
  },

  coderain(g, C) {
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789$ABCDEF";
    let cols = [];
    const fs = 16;
    return {
      init(w, h) {
        cols = Array.from({ length: Math.ceil(w / fs) }, () => ({ y: rand(-h, 0), v: rand(0.05, 0.14) }));
        g.clearRect(0, 0, w, h);
      },
      frame(t, dt, w, h) {
        g.fillStyle = rgba(C.bg, 0.12);
        g.fillRect(0, 0, w, h);
        g.font = `${fs}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono") || "monospace"}`;
        cols.forEach((c, i) => {
          c.y += c.v * dt;
          if (c.y > h + rand(0, 400)) c.y = rand(-200, 0);
          const ch = chars[(Math.random() * chars.length) | 0];
          g.fillStyle = rgba(C.accent, 0.85);
          g.fillText(ch, i * fs, c.y);
          g.fillStyle = rgba(C.accent, 0.25);
          g.fillText(chars[(Math.random() * chars.length) | 0], i * fs, c.y - fs);
        });
      },
    };
  },

  synthgrid(g, C) {
    let stars = [];
    return {
      init(w, h) {
        stars = Array.from({ length: 120 }, () => ({ x: rand(0, w), y: rand(0, h * 0.55), z: rand(0.3, 1) }));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        const horizon = h * 0.62;
        for (const s of stars) {
          g.fillStyle = rgba(C.fg, 0.25 * s.z);
          g.fillRect(s.x, s.y, 1.4 * s.z, 1.4 * s.z);
        }
        const sunR = Math.min(w, h) * 0.2;
        const sx = w * 0.5;
        const sy = horizon - sunR * 0.55;
        const sun = g.createLinearGradient(0, sy - sunR, 0, sy + sunR);
        sun.addColorStop(0, rgba(C.accent2, 0.9));
        sun.addColorStop(1, rgba(C.accent, 0.9));
        g.save();
        g.beginPath();
        g.arc(sx, sy, sunR, 0, 6.283);
        g.clip();
        g.fillStyle = sun;
        g.fillRect(sx - sunR, sy - sunR, sunR * 2, sunR * 2);
        g.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 7; i++) {
          const yy = sy + sunR * (0.1 + i * 0.14);
          g.fillRect(sx - sunR, yy, sunR * 2, 2 + i * 1.4);
        }
        g.restore();
        const glow = g.createRadialGradient(sx, sy, sunR * 0.6, sx, sy, sunR * 2.4);
        glow.addColorStop(0, rgba(C.accent2, 0.25));
        glow.addColorStop(1, rgba(C.accent2, 0));
        g.fillStyle = glow;
        g.fillRect(0, 0, w, horizon);
        g.fillStyle = rgba(C.bg, 0.9);
        g.fillRect(0, horizon, w, h - horizon);
        g.strokeStyle = rgba(C.accent2, 0.55);
        g.lineWidth = 1;
        const off = (t * 0.00035) % 1;
        for (let i = 0; i < 18; i++) {
          const p = (i + off) / 18;
          const y = horizon + (h - horizon) * p * p;
          g.globalAlpha = p;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
        }
        g.globalAlpha = 1;
        for (let i = -20; i <= 20; i++) {
          g.beginPath();
          g.moveTo(sx + i * 18, horizon);
          g.lineTo(sx + i * w * 0.09, h);
          g.stroke();
        }
      },
    };
  },

  fireflies(g, C) {
    let flies = [];
    return {
      init(w, h) {
        flies = Array.from({ length: Math.min(90, Math.round((w * h) / 16000)) }, () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-0.02, 0.02), vy: rand(-0.02, 0.02), ph: rand(0, 6.28), r: rand(1.2, 2.8) }));
      },
      frame(t, dt, w, h) {
        g.clearRect(0, 0, w, h);
        g.globalCompositeOperation = "lighter";
        for (const f of flies) {
          f.vx += rand(-0.0006, 0.0006) * dt;
          f.vy += rand(-0.0006, 0.0006) * dt;
          f.vx = Math.max(-0.04, Math.min(0.04, f.vx));
          f.vy = Math.max(-0.04, Math.min(0.04, f.vy));
          f.x = (f.x + f.vx * dt + w) % w;
          f.y = (f.y + f.vy * dt + h) % h;
          const a = Math.max(0, Math.sin(t / 900 + f.ph));
          const grad = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7);
          grad.addColorStop(0, rgba(C.accent, 0.9 * a));
          grad.addColorStop(0.25, rgba(C.accent, 0.3 * a));
          grad.addColorStop(1, rgba(C.accent, 0));
          g.fillStyle = grad;
          g.fillRect(f.x - f.r * 7, f.y - f.r * 7, f.r * 14, f.r * 14);
        }
        g.globalCompositeOperation = "source-over";
      },
    };
  },
};

export const EFFECT_NAMES = Object.keys(EFFECTS);

export function startFx(canvas, name, { reduced } = {}) {
  const make = EFFECTS[name];
  if (!make) return () => {};
  const g = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const C = {
    accent: parseColor(css.getPropertyValue("--accent")),
    accent2: parseColor(css.getPropertyValue("--accent-2")),
    fg: parseColor(css.getPropertyValue("--fg")),
    bg: parseColor(css.getPropertyValue("--bg"), [0, 0, 0]),
    up: parseColor(css.getPropertyValue("--up")),
  };
  const fx = make(g, C, { mode: document.documentElement.dataset.mode });
  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.init(w, h);
  };
  resize();
  let raf = 0;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(64, now - last);
    last = now;
    fx.frame(now, dt, w, h);
    raf = requestAnimationFrame(loop);
  };
  if (reduced) {
    fx.frame(0, 16, w, h);
  } else {
    raf = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
  }
  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (innerWidth === w && Math.abs(innerHeight - h) < 160) return;
      resize();
      if (reduced) fx.frame(0, 16, w, h);
    }, 150);
  });
  return () => cancelAnimationFrame(raf);
}
