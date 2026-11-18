// Gallery: snap carousel with arrows, drag, keyboard and optional autoplay, plus a full-screen viewer.

export function initGallery(section, { reduced }) {
  const track = section.querySelector("[data-track]");
  const items = [...section.querySelectorAll(".gallery__item")];
  if (!track || !items.length) return;

  const step = () => (items[0].getBoundingClientRect().width || 300) + parseFloat(getComputedStyle(track).columnGap || "16");
  const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduced ? "auto" : "smooth" });
  section.querySelector("[data-prev]")?.addEventListener("click", () => go(-1));
  section.querySelector("[data-next]")?.addEventListener("click", () => go(1));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  // Drag to scroll with the mouse (touch already scrolls natively).
  let down = null;
  let moved = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    down = { x: e.clientX, left: track.scrollLeft };
    moved = false;
  });
  addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 5) {
      moved = true;
      track.classList.add("is-dragging");
      track.scrollLeft = down.left - dx;
    }
  });
  addEventListener("pointerup", () => {
    if (!down) return;
    down = null;
    track.classList.remove("is-dragging");
  });

  if (section.hasAttribute("data-autoplay") && !reduced) {
    let paused = false;
    section.addEventListener("pointerenter", () => (paused = true));
    section.addEventListener("pointerleave", () => (paused = false));
    setInterval(() => {
      if (paused || document.hidden) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      if (atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
      else go(1);
    }, 4200);
  }

  const dlg = section.querySelector("[data-lightbox]");
  if (!dlg || typeof dlg.showModal !== "function") return;
  const big = dlg.querySelector("[data-lb-img]");
  const cap = dlg.querySelector("[data-lb-cap]");
  let at = 0;
  const show = (i) => {
    at = (i + items.length) % items.length;
    const img = items[at].querySelector("img");
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    cap.textContent = items[at].querySelector("figcaption")?.textContent ?? "";
    big.style.animation = "none";
    void big.offsetWidth;
    big.style.animation = "";
  };
  section.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (!open) return;
    if (moved) {
      moved = false;
      return;
    }
    show(Number(open.dataset.open));
    dlg.showModal();
  });
  dlg.querySelector("[data-close]")?.addEventListener("click", () => dlg.close());
  dlg.querySelector("[data-lb-prev]")?.addEventListener("click", () => show(at - 1));
  dlg.querySelector("[data-lb-next]")?.addEventListener("click", () => show(at + 1));
  dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(at + 1);
    if (e.key === "ArrowLeft") show(at - 1);
  });
  let sx = 0;
  dlg.addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
  dlg.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });
}
