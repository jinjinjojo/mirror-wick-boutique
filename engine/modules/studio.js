// Owner-only design panel: open the site with ?studio. Switch theme, background effect, cursor and accent
// colors live, preview the launched state, then copy the settings into coin.config.js.

const EFFECTS = ["swirl", "starfield", "aurora", "pixelstars", "paper", "dust", "bubbles", "coderain", "synthgrid", "fireflies", "none"];
const CURSORS = ["glow", "trail", "none"];

export async function openStudio({ data }) {
  let themes = {};
  try {
    themes = await (await fetch("engine/themes/index.json")).json();
  } catch {}
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const state = {
    theme: data.theme,
    effect: data.look?.effect ?? "none",
    cursor: data.look?.cursor ?? "none",
    accent: css.getPropertyValue("--accent").trim(),
    accent2: css.getPropertyValue("--accent-2").trim(),
  };
  const toHex = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#ffffff");

  const panel = document.createElement("aside");
  panel.className = "studio";
  panel.innerHTML = `
    <button type="button" class="studio__close" aria-label="Close studio">✕</button>
    <h2>Studio</h2>
    <label>Theme<select data-k="theme">${Object.entries(themes).map(([id, t]) => `<option value="${id}">${t.label} (${t.mode})</option>`).join("")}</select></label>
    <div class="studio__row">
      <label>Effect<select data-k="effect">${EFFECTS.map((e) => `<option>${e}</option>`).join("")}</select></label>
      <label>Cursor<select data-k="cursor">${CURSORS.map((e) => `<option>${e}</option>`).join("")}</select></label>
    </div>
    <div class="studio__row">
      <label>Accent<input type="color" data-k="accent" value="${toHex(state.accent)}"></label>
      <label>Accent 2<input type="color" data-k="accent2" value="${toHex(state.accent2)}"></label>
    </div>
    ${data.launched ? "" : '<button type="button" data-act="launched">Preview the launched state</button>'}
    <label>Paste into coin.config.js<textarea readonly data-out></textarea></label>
    <button type="button" data-act="copy">Copy settings</button>`;
  document.body.append(panel);
  panel.querySelector('[data-k="theme"]').value = state.theme;
  panel.querySelector('[data-k="effect"]').value = state.effect;
  panel.querySelector('[data-k="cursor"]').value = state.cursor;

  let stopFx = null;
  const out = panel.querySelector("[data-out]");
  const render = () => {
    out.value = `theme: "${state.theme}",\nlook: { effect: "${state.effect}", cursor: "${state.cursor}", accent: "${state.accent}", accent2: "${state.accent2}" },`;
  };

  async function applyTheme(id) {
    const t = themes[id];
    if (!t) return;
    const link = document.querySelector('link[href*="engine/themes/"]');
    const next = link.cloneNode();
    next.href = `engine/themes/${id}.css`;
    next.onload = () => link.remove();
    link.after(next);
    if (t.fontsUrl && !document.querySelector(`link[href="${t.fontsUrl}"]`)) {
      document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: t.fontsUrl }));
    }
    root.dataset.theme = id;
    root.dataset.mode = t.mode;
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-2");
    await new Promise((r) => setTimeout(r, 120));
    const cs = getComputedStyle(root);
    state.accent = cs.getPropertyValue("--accent").trim();
    state.accent2 = cs.getPropertyValue("--accent-2").trim();
    panel.querySelector('[data-k="accent"]').value = toHex(state.accent);
    panel.querySelector('[data-k="accent2"]').value = toHex(state.accent2);
    state.effect = t.effect;
    state.cursor = t.cursor;
    panel.querySelector('[data-k="effect"]').value = t.effect;
    panel.querySelector('[data-k="cursor"]').value = t.cursor;
    await restartFx();
  }

  async function restartFx() {
    const old = document.querySelector("[data-fx]");
    const fresh = old.cloneNode();
    old.replaceWith(fresh);
    stopFx?.();
    root.dataset.effect = state.effect;
    root.dataset.cursor = state.cursor;
    if (state.effect !== "none") {
      const { startFx } = await import("./fx.js");
      stopFx = startFx(fresh, state.effect, { reduced: false });
    }
  }

  panel.addEventListener("input", async (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    state[k] = e.target.value;
    if (k === "theme") await applyTheme(e.target.value);
    if (k === "effect") await restartFx();
    if (k === "cursor") root.dataset.cursor = state.cursor;
    if (k === "accent") root.style.setProperty("--accent", state.accent);
    if (k === "accent2") root.style.setProperty("--accent-2", state.accent2);
    render();
  });
  panel.addEventListener("click", async (e) => {
    if (e.target.closest(".studio__close")) panel.remove();
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "copy") {
      out.select();
      try {
        await navigator.clipboard.writeText(out.value);
      } catch {}
    }
    if (act === "launched") location.href = `preview-launched.html?studio`;
  });
  render();
}
