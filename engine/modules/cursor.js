// Cursor effects for fine pointers: "glow" (soft light that follows the pointer) or "trail" (sparkles).

export function startCursor(kind) {
  if (kind === "glow") {
    const el = document.querySelector("[data-cursor]");
    if (!el) return;
    let x = -999;
    let y = -999;
    let cx = x;
    let cy = y;
    addEventListener("pointermove", (e) => {
      x = e.clientX;
      y = e.clientY;
      el.classList.add("is-on");
    }, { passive: true });
    document.addEventListener("pointerleave", () => el.classList.remove("is-on"));
    const tick = () => {
      cx += (x - cx) * 0.14;
      cy += (y - cy) * 0.14;
      el.style.setProperty("--cx", `${cx.toFixed(1)}px`);
      el.style.setProperty("--cy", `${cy.toFixed(1)}px`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return;
  }
  if (kind === "trail") {
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#fff";
    let last = 0;
    addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - last < 28) return;
      last = now;
      const s = document.createElement("span");
      const size = 4 + Math.random() * 6;
      Object.assign(s.style, {
        position: "fixed",
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
        width: `${size}px`,
        height: `${size}px`,
        background: accent,
        pointerEvents: "none",
        zIndex: 240,
        clipPath: "polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)",
      });
      document.body.append(s);
      s.animate(
        [
          { transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 },
          { transform: `translate(${(Math.random() - 0.5) * 40 - 50}%, ${Math.random() * 60 - 20}%) scale(0.2) rotate(90deg)`, opacity: 0 },
        ],
        { duration: 700, easing: "ease-out" },
      ).onfinish = () => s.remove();
    }, { passive: true });
  }
}
