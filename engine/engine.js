// Memecoin site engine: browser entry. Everything here enhances a page that already works without JS.
import { initUI } from "./modules/ui.js";

const root = document.documentElement;
const data = (() => {
  try {
    return JSON.parse(document.getElementById("coin-data")?.textContent || "{}");
  } catch {
    return {};
  }
})();
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || data.look?.motion === "reduced";
const finePointer = matchMedia("(pointer: fine)").matches;


/** Run cb once the element is within `margin` of the viewport. */
export function whenNear(el, cb, margin = "700px") {
  if (!("IntersectionObserver" in window)) return cb();
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      cb();
    }
  }, { rootMargin: margin });
  io.observe(el);
}

const ctx = { data, reduced, finePointer, whenNear };

async function boot() {
  const loader = document.querySelector("[data-loader]");
  const loading = loader ? import("./modules/loader.js").then((m) => m.runLoader(loader, ctx)) : Promise.resolve();

  initUI(ctx);

  const fxCanvas = document.querySelector("[data-fx]");
  if (fxCanvas && data.look?.effect && data.look.effect !== "none") {
    import("./modules/fx.js").then((m) => m.startFx(fxCanvas, data.look.effect, ctx)).catch(console.error);
  }
  if (finePointer && !reduced && data.look?.cursor && data.look.cursor !== "none") {
    import("./modules/cursor.js").then((m) => m.startCursor(data.look.cursor, ctx)).catch(console.error);
  }
  if (document.querySelector("[data-eyes], [data-eyes-map]")) {
    import("./modules/eyes.js").then((m) => m.startEyes(ctx)).catch(console.error);
  }

  let live = null;
  const needLive = document.querySelector("[data-stats], [data-world]");
  if (needLive) {
    const { createLive } = await import("./modules/live.js");
    live = createLive({ mint: data.contract || "", pair: data.pair || "" });
    live.start();
    ctx.live = live;
  }
  document.querySelectorAll("[data-stats]").forEach((el) => import("./modules/stats.js").then((m) => m.bindStats(el, live)));
  document.querySelectorAll("[data-chart]").forEach((el) => whenNear(el, () => import("./modules/chart.js").then((m) => m.mountChart(el))));
  document.querySelectorAll("[data-gallery]").forEach((el) => import("./modules/gallery.js").then((m) => m.initGallery(el, ctx)));
  document.querySelectorAll("[data-maker]").forEach((el) => whenNear(el, () => import("./modules/maker.js").then((m) => m.initMaker(el, ctx))));
  document.querySelectorAll("[data-world]").forEach((el) => whenNear(el, () => import("./modules/world-mount.js").then((m) => m.mountWorldSection(el, ctx)), "400px"));

  if (/[?&]studio\b/.test(location.search)) import("./modules/studio.js").then((m) => m.openStudio(ctx));
  await loading;
}

boot().catch((e) => {
  console.error(e);
  document.querySelector("[data-loader]")?.classList.add("is-done");
});
