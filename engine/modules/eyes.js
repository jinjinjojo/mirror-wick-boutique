// Eyes that follow the pointer and blink: the {eyes} headline glyph and eyes laid over a mascot image
// (config: mascot.eyes = [{ x, y, w, h, rotate }] in percent of the image). Hovering the mascot for two
// seconds gets a slow blink back, which is how cats say they trust you.

export function startEyes({ reduced }) {
  const groups = [];

  document.querySelectorAll("[data-eyes]").forEach((el) => groups.push({ el, eyes: [...el.querySelectorAll(".eye")] }));

  document.querySelectorAll("[data-eyes-map]").forEach((mascot) => {
    let map = [];
    try {
      map = JSON.parse(mascot.dataset.eyesMap);
    } catch {
      return;
    }
    const layer = document.createElement("div");
    layer.className = "mascot-eyes";
    for (const e of map) {
      const eye = document.createElement("span");
      eye.className = "eye";
      Object.assign(eye.style, { left: `${e.x}%`, top: `${e.y}%`, width: `${e.w ?? 9}%`, height: `${e.h ?? 5}%`, rotate: `${e.rotate ?? 0}deg` });
      const pupil = document.createElement("span");
      pupil.className = "pupil";
      eye.append(pupil);
      layer.append(eye);
    }
    mascot.append(layer);
    const group = { el: mascot, eyes: [...layer.children] };
    groups.push(group);

    let dwell = 0;
    mascot.addEventListener("pointerenter", () => {
      dwell = setTimeout(() => blink(group, 900), 2000);
    });
    mascot.addEventListener("pointerleave", () => clearTimeout(dwell));
  });

  if (!groups.length) return;

  function blink(group, ms = 140) {
    for (const eye of group.eyes) {
      eye.style.transition = `transform ${ms / 2}ms ease-in`;
      eye.style.setProperty("--blink", "0.08");
    }
    setTimeout(() => {
      for (const eye of group.eyes) eye.style.setProperty("--blink", "1");
    }, ms / 2 + (ms > 300 ? 500 : 20));
  }

  if (!reduced) {
    const schedule = (group) => setTimeout(() => {
      blink(group);
      if (Math.random() < 0.25) setTimeout(() => blink(group), 260);
      schedule(group);
    }, 2600 + Math.random() * 4200);
    groups.forEach(schedule);
  }

  let px = innerWidth / 2;
  let py = innerHeight / 3;
  let queued = false;
  const update = () => {
    queued = false;
    for (const g of groups) {
      for (const eye of g.eyes) {
        const r = eye.getBoundingClientRect();
        if (!r.width) continue;
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 300);
        const pupil = eye.firstElementChild;
        pupil?.style.setProperty("--ex", `${((dx / d) * r.width * 0.26 * reach).toFixed(2)}px`);
        pupil?.style.setProperty("--ey", `${((dy / d) * r.height * 0.16 * reach).toFixed(2)}px`);
      }
    }
  };
  addEventListener("pointermove", (e) => {
    px = e.clientX;
    py = e.clientY;
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  addEventListener("scroll", () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}
